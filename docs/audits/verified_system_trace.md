# Verified System Trace: Data → Scorecard → Issues → Meetings

**Audit Date:** 2026-02-02  
**Status:** ✅ Code-Verified

---

## STEP 1: Data → metric_results

### Routes Involved
- `/data` (Jane mode) → `src/pages/DataHomeRouter.tsx` → `DataMetricsTable.tsx`
- `/scorecard/update` (Manual weekly) → `src/pages/ScorecardUpdate.tsx`
- `/imports/monthly-report` (Legacy Lori workbook) → stores in `legacy_monthly_reports`

### Tables Involved
| Table | Purpose |
|-------|---------|
| `metric_results` | Time-series values for scorecard metrics |
| `legacy_monthly_reports` | Raw JSONB payload from Lori workbooks |

### Evidence: Manual Weekly Entry (ScorecardUpdate.tsx)

**File:** `src/pages/ScorecardUpdate.tsx` (lines 313-318)

```typescript
const { error } = await supabase
  .from("metric_results")
  .upsert(upserts, {
    onConflict: "metric_id,period_type,period_start",
  });
```

**Columns Set (lines 299-309):**
```typescript
return {
  ...(result?.id && { id: result.id }),
  metric_id: selectedMetricId,
  week_start: weekStart,
  period_start: weekStart,
  period_type: "weekly" as const,
  period_key: weekStart,
  value,
  source: "manual" as const,
  ...(reason && { note: reason }),
};
```

### Evidence: CSV Import (metricCsvImport.ts)

**File:** `src/lib/importers/metricCsvImport.ts` (lines 154-169)

```typescript
const { error: upsertError } = await supabase
  .from("metric_results")
  .upsert(
    {
      metric_id: metric.id,
      week_start: weekStart,
      period_start: weekStart,
      period_type: "weekly",
      period_key: periodKey,
      value: numericValue,
      source: source as "manual" | "jane",
    },
    {
      onConflict: "metric_id,period_type,period_start",
    }
  );
```

---

## STEP 2: metric_results → Scorecard

### Routes Involved
- `/scorecard` → `src/pages/Scorecard.tsx`
- `/scorecard/off-track` → `src/pages/ScorecardOffTrack.tsx`

### Tables Involved
| Table | Purpose |
|-------|---------|
| `metrics` | Metric definitions (name, target, direction, owner) |
| `metric_results` | Values per period |

### Evidence: Loading Metrics + Results (ScorecardOffTrack.tsx)

**File:** `src/lib/scorecard/metricStatus.ts` (lines 231-261)

```typescript
// Get metrics
let metricsQuery = supabase
  .from('metrics')
  .select('id, name, target, direction, unit, cadence, is_active, owner')
  .eq('organization_id', organizationId)
  .eq('is_active', true);

if (metricIds?.length) {
  metricsQuery = metricsQuery.in('id', metricIds);
}

const { data: metrics } = await metricsQuery;
if (!metrics?.length) return statusMap;

// Determine periods to fetch
let periods: string[];
if (periodKey) {
  periods = [`${periodKey}-01`];
} else {
  // Get last 3 months
  periods = Array.from({ length: 3 }, (_, i) => 
    format(startOfMonth(subMonths(new Date(), i)), 'yyyy-MM-dd')
  );
}

const { data: results } = await supabase
  .from('metric_results')
  .select('metric_id, value, period_start, period_key')
  .in('metric_id', metrics.map(m => m.id))
  .eq('period_type', 'monthly')
  .in('period_start', periods)
  .order('period_start', { ascending: false });
```

---

## STEP 3: Scorecard → Off-Track Detection

### Where Targets Come From
Targets are stored in the `metrics` table, column `target` (nullable number).

### Evidence: Off-Track Logic (metricStatus.ts)

**File:** `src/lib/scorecard/metricStatus.ts` (lines 86-199)

```typescript
export function metricStatus(
  metric: {
    target?: number | null;
    direction?: string | null;
    owner?: string | null;
  },
  resultForSelectedMonth: {
    value?: number | null;
  } | null | undefined,
  periodKey: string | null
): MetricStatusResult {
  const value = resultForSelectedMonth?.value ?? null;
  const target = metric.target ?? null;
  const rawDirection = metric.direction;
  const normalizedDirection = normalizeDirection(rawDirection);
  
  // PRIORITY 1: NEEDS_DATA
  if (value === null || value === undefined) {
    return { status: 'needs_data', ... };
  }
  
  // PRIORITY 2: NEEDS_TARGET
  if (target === null || normalizedDirection === null) {
    return { status: 'needs_target', ... };
  }
  
  // PRIORITY 3: NEEDS_OWNER
  if (owner === null || owner === '') {
    return { status: 'needs_owner', ... };
  }
  
  // PRIORITY 4: Evaluate ON_TRACK vs OFF_TRACK
  let isOnTrack = false;
  
  switch (normalizedDirection) {
    case 'higher_is_better':
      isOnTrack = value >= target;
      break;
    case 'lower_is_better':
      isOnTrack = value <= target;
      break;
    case 'exact':
      isOnTrack = value === target;
      break;
  }
  
  return {
    status: isOnTrack ? 'on_track' : 'off_track',
    ...
  };
}
```

**Key Comparison Logic (lines 169-182):**
```typescript
switch (normalizedDirection) {
  case 'higher_is_better':
    isOnTrack = value >= target;
    if (!isOnTrack) reasons.push('Value is below target.');
    break;
  case 'lower_is_better':
    isOnTrack = value <= target;
    if (!isOnTrack) reasons.push('Value is above target.');
    break;
  case 'exact':
    isOnTrack = value === target;
    if (!isOnTrack) reasons.push('Value does not match target exactly.');
    break;
}
```

---

## STEP 4: Off-Track → Issue Creation

### Issue Creation Paths

| Path | Component/File | Trigger |
|------|----------------|---------|
| **Manual (Issues page)** | `src/components/issues/NewIssueModal.tsx` | User clicks "New Issue" |
| **From Off-Track Metric** | `src/components/scorecard/CreateIssueFromMetricModal.tsx` | User clicks "Create Issue" on off-track metric |
| **From Rock** | `src/pages/RocksMonthlyReview.tsx` | User creates issue from blocked rock |
| **From Meeting** | `src/components/meetings/AddItemModal.tsx` | User adds issue during meeting |

### ⚠️ AUTOMATIC Issue Creation: **NOT IMPLEMENTED**

There is **no background trigger or edge function** that automatically creates issues when metrics go off-track. All issue creation requires explicit user action via UI.

**Proof:** The only edge function related to issues is `create-issue-from-alert/index.ts` which is invoked **manually** via a button click in the alerts UI, not triggered automatically.

### Evidence: CreateIssueFromMetricModal Insert

**File:** `src/components/scorecard/CreateIssueFromMetricModal.tsx` (lines 113-134)

```typescript
const createIssueMutation = useMutation({
  mutationFn: async () => {
    const { data, error } = await supabase
      .from('issues')
      .insert({
        organization_id: organizationId,
        title: title.trim(),
        context: context.trim() || null,
        priority: parseInt(priority),
        owner_id: ownerId && ownerId !== "_unassigned" ? ownerId : null,
        status: 'open',
        // Link to rock/metric/period if provided
        rock_id: rockId || null,
        metric_id: metric.id || null,
        period_key: periodKey || null,
        meeting_horizon: meetingHorizon,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  ...
});
```

### Issues Table Schema (Relevant Columns)

**File:** `src/integrations/supabase/types.ts` (lines 1732-1835)

```typescript
issues: {
  Row: {
    id: string
    organization_id: string
    title: string
    context: string | null
    priority: number
    status: "open" | "in_progress" | "solved"
    owner_id: string | null
    // LINKING FIELDS:
    metric_id: string | null      // FK → metrics.id
    rock_id: string | null        // FK → rocks.id
    meeting_id: string | null     // FK → meetings.id
    meeting_item_id: string | null // FK → meeting_items.id
    period_key: string | null     // e.g., "2026-01"
    created_from: string | null   // 'scorecard' | 'rock' | 'manual' | 'breakdown'
    meeting_horizon: string | null // 'weekly' | 'quarterly' | 'annual'
    ...
  }
  Relationships: [
    { foreignKeyName: "issues_metric_id_fkey", referencedRelation: "metrics" },
    { foreignKeyName: "issues_rock_id_fkey", referencedRelation: "rocks" },
    { foreignKeyName: "issues_meeting_id_fkey", referencedRelation: "meetings" },
    { foreignKeyName: "issues_meeting_item_id_fkey", referencedRelation: "meeting_items" },
  ]
}
```

---

## STEP 5: Issue → Meeting Agenda Auto-Population

### Routes Involved
- `/meetings/:id` → `src/pages/MeetingDetail.tsx`

### Tables Involved
| Table | Purpose |
|-------|---------|
| `meetings` | Meeting metadata (scheduled_for, status, type) |
| `meeting_items` | Agenda items with entity links |
| `issues` | Open issues pulled into agenda |

### Evidence: Agenda Generator (agendaGenerator.ts)

**File:** `src/lib/meetings/agendaGenerator.ts` (lines 265-309)

```typescript
// Fetch open issues with priority
const { data: allIssues } = await supabase
  .from("issues")
  .select("id, title, context, priority, metric_id, period_key, created_at")
  .eq("organization_id", organizationId)
  .in("status", ["open", "in_progress"])
  .order("priority", { ascending: false })
  .order("created_at", { ascending: false })
  .limit(30);

// Prioritize: issues linked to off-track metrics > priority 1 > recent
const offTrackMetricIds = new Set(offTrackMetrics.map(m => m.id));
const scoredIssues = (allIssues || []).map(issue => {
  let score = 0;
  // Linked to off-track metric for selected period
  if (issue.metric_id && offTrackMetricIds.has(issue.metric_id) && issue.period_key === periodKey) {
    score += 100;
  }
  // High priority
  if (issue.priority === 1) score += 50;
  if (issue.priority === 2) score += 25;
  return { ...issue, score };
});

scoredIssues.sort((a, b) => b.score - a.score);
const topIssues = scoredIssues.slice(0, 8);

if (topIssues.length > 0) {
  for (const issue of topIssues) {
    itemsToInsert.push({
      organization_id: organizationId,
      meeting_id: meetingId,
      section: "issues",
      item_type: "issue",
      title: `Issue: ${issue.title}`,
      description: contextTruncated,
      source_ref_type: "issue",
      source_ref_id: issue.id,       // ← Links back to issues table
      sort_order: getSortOrder("issues"),
    });
  }
}
```

### Evidence: Meeting Items Insert (agendaGenerator.ts)

**File:** `src/lib/meetings/agendaGenerator.ts` (lines 365-367)

```typescript
const { error: insertError } = await supabase
  .from("meeting_items")
  .insert(itemsToInsert);
```

### meeting_items Table Schema

**File:** `src/integrations/supabase/types.ts` (lines 2150-2227)

```typescript
meeting_items: {
  Row: {
    id: string
    organization_id: string
    meeting_id: string           // FK → meetings.id
    section: string              // 'scorecard' | 'rocks' | 'issues' | 'todo' | ...
    item_type: string            // 'text' | 'metric' | 'rock' | 'issue'
    title: string
    description: string | null
    source_ref_type: string | null  // 'metric' | 'rock' | 'issue' | null
    source_ref_id: string | null    // UUID of linked entity
    sort_order: number
    discussed: boolean
    discussed_at: string | null
    is_deleted: boolean
    created_issue_id: string | null // If issue was created FROM this item
    ...
  }
}
```

---

## STEP 6: Meeting Agenda → IDS Resolution

### Where IDS Workflow Exists
- **Component:** `src/pages/MeetingDetail.tsx`
- **Issues section** shows items with `section: "issues"`
- Resolution means: `discussed: true` + `discussed_at: timestamp`

### Evidence: Issue Status Updates in Meeting

**File:** `src/pages/MeetingDetail.tsx` (lines 362-376)

```typescript
// Fetch issues created in this meeting
const { data: meetingIssues } = useQuery({
  queryKey: ["meeting-issues", meetingId],
  queryFn: async () => {
    if (!meetingId || !organizationId) return [];
    const { data, error } = await supabase
      .from("issues")
      .select("id, title, status, meeting_item_id")
      .eq("meeting_id", meetingId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  enabled: !!meetingId && !!organizationId,
});
```

### "Resolution" in Data Terms

| Field | Update |
|-------|--------|
| `meeting_items.discussed` | `true` |
| `meeting_items.discussed_at` | `new Date().toISOString()` |
| `issues.status` | `'solved'` (manual user action) |
| `issues.solved_at` | timestamp |

**Note:** Issue status change (solved) is a **separate user action**, not automatic on meeting item discussion.

---

## STEP 7: IDS Resolution → To-Dos

### Routes Involved
- `/meetings/:id` → `LiveTodoPanel.tsx` (embedded in meeting view)
- `/todos` (if exists as standalone page)

### Tables Involved
| Table | Purpose |
|-------|---------|
| `todos` | Action items with owner, due date |

### Evidence: Todo Insert (LiveTodoPanel.tsx)

**File:** `src/components/meetings/LiveTodoPanel.tsx` (lines 64-74)

```typescript
const addMutation = useMutation({
  mutationFn: async () => {
    const { error } = await supabase.from("todos").insert({
      title: newTitle.trim(),
      owner_id: newOwnerId || null,
      due_date: newDueDate ? format(newDueDate, "yyyy-MM-dd") : null,
      organization_id: organizationId,
      meeting_id: meetingId,           // ← Links to meeting
    });
    if (error) throw error;
  },
  ...
});
```

### Evidence: Todo from Issue (ConvertToTodoModal.tsx)

**File:** `src/components/issues/ConvertToTodoModal.tsx` (lines 54-58)

```typescript
const { error } = await supabase.from("todos").insert({
  issue_id: issue.id,              // ← Links to issue
  organization_id: issue.organization_id,
  ...
});
```

### todos Table Schema

**File:** `src/integrations/supabase/types.ts` (lines 4330-4350)

```typescript
todos: {
  Row: {
    id: string
    title: string
    owner_id: string | null
    due_date: string | null
    done_at: string | null
    organization_id: string | null
    meeting_id: string | null      // FK → meetings.id
    issue_id: string | null        // FK → issues.id
    created_at: string
  }
}
```

---

## JUNCTION TABLES PROOF

### A) rock_metric_links

**File:** `src/integrations/supabase/types.ts` (lines 3302-3356)

```typescript
rock_metric_links: {
  Row: {
    id: string
    rock_id: string              // FK → rocks.id
    metric_id: string            // FK → metrics.id
    organization_id: string      // FK → teams.id
    created_by: string | null    // FK → users.id
    created_at: string
  }
  Relationships: [
    { foreignKeyName: "rock_metric_links_rock_id_fkey", referencedRelation: "rocks" },
    { foreignKeyName: "rock_metric_links_metric_id_fkey", referencedRelation: "metrics" },
    { foreignKeyName: "rock_metric_links_organization_id_fkey", referencedRelation: "teams" },
  ]
}
```

**Read/Write Code:** `src/lib/rocks/metricLinking.ts`

```typescript
// INSERT (lines 37-44)
const { error } = await supabase
  .from("rock_metric_links")
  .insert({
    rock_id: rockId,
    metric_id: metricId,
    organization_id: organizationId,
    created_by: userId || null,
  });

// SELECT (lines 222-234)
const { data: links, error } = await supabase
  .from("rock_metric_links")
  .select(`
    metric_id,
    metrics (id, name, target, direction, unit)
  `)
  .eq("rock_id", rockId);
```

**UI Usage:**
- `src/components/rocks/RealityGapBadge.tsx` - Shows off-track metrics linked to rock
- `src/components/rocks/RockAlignmentDialog.tsx` - Link/unlink metrics to rock

---

### B) meeting_items.source_ref_id

**Schema:** (already shown above in meeting_items)

```typescript
source_ref_type: string | null  // 'metric' | 'rock' | 'issue' | null
source_ref_id: string | null    // UUID of the linked entity
```

**Write Code:** `src/lib/meetings/agendaGenerator.ts` (lines 121-131)

```typescript
itemsToInsert.push({
  ...
  source_ref_type: "metric",
  source_ref_id: metric.id,
  ...
});
```

**Read Code:** `src/pages/MeetingDetail.tsx` (lines 154-156)

```typescript
const metricIds = (items || [])
  .filter((item) => item.item_type === "metric" && item.source_ref_id)
  .map((item) => item.source_ref_id as string);
```

**Resolution to Entity Types:**
- `source_ref_type === "metric"` → fetch from `metrics` table
- `source_ref_type === "rock"` → fetch from `rocks` table
- `source_ref_type === "issue"` → fetch from `issues` table

---

### C) issues.metric_id / issues.rock_id

**Schema:** (already shown above in issues)

```typescript
metric_id: string | null  // FK → metrics.id
rock_id: string | null    // FK → rocks.id
```

**Write Code (metric_id):** `src/components/scorecard/CreateIssueFromMetricModal.tsx` (lines 117-128)

```typescript
.insert({
  ...
  rock_id: rockId || null,
  metric_id: metric.id || null,
  period_key: periodKey || null,
  ...
})
```

**Write Code (rock_id):** `src/pages/RocksMonthlyReview.tsx` (lines 294-302)

```typescript
const { error } = await supabase.from("issues").insert({
  title,
  context: context || null,
  priority,
  organization_id: orgId,
  rock_id: rockId,           // ← Link to rock
  status: "open",
});
```

---

## SYSTEM FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DATA INGESTION LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐              │
│  │ Jane Bulk    │    │ CSV Import   │    │ Lori Workbook        │              │
│  │ S3 → ETL     │    │ UI Upload    │    │ Excel → JSONB        │              │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬───────────┘              │
│         │                   │                        │                          │
│         ▼                   ▼                        ▼                          │
│  ┌─────────────────────────────────┐    ┌─────────────────────────┐            │
│  │       metric_results            │    │  legacy_monthly_reports │            │
│  │  (period_type, period_key,      │    │  (JSONB payload)        │            │
│  │   metric_id, value, source)     │    │                         │            │
│  └─────────────┬───────────────────┘    └─────────────────────────┘            │
│                │                                                                │
└────────────────┼────────────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SCORECARD LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         metricStatus()                                   │   │
│  │  INPUT: metric (target, direction, owner) + result (value)              │   │
│  │  OUTPUT: 'on_track' | 'off_track' | 'needs_data' | 'needs_target'       │   │
│  └─────────────────────────────────────┬───────────────────────────────────┘   │
│                                        │                                        │
│              ┌─────────────────────────┼─────────────────────────┐              │
│              │                         │                         │              │
│              ▼                         ▼                         ▼              │
│  ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────────┐     │
│  │ /scorecard        │   │ /scorecard/off-   │   │ L10 Meeting Scorecard │     │
│  │ (Metric Grid)     │   │ track (Control)   │   │ Snapshot              │     │
│  └───────────────────┘   └─────────┬─────────┘   └───────────┬───────────┘     │
│                                    │                         │                  │
└────────────────────────────────────┼─────────────────────────┼──────────────────┘
                                     │                         │
                                     ▼                         ▼
                        ┌────────────────────────────────────────────┐
                        │           USER CLICKS "Create Issue"       │
                        │      CreateIssueFromMetricModal.tsx        │
                        │  (Sets: metric_id, period_key, rock_id)    │
                        └────────────────────────┬───────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ISSUES LAYER                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                            issues                                        │   │
│  │  id, title, status, priority, owner_id                                  │   │
│  │  metric_id → metrics.id (optional)                                      │   │
│  │  rock_id → rocks.id (optional)                                          │   │
│  │  meeting_id → meetings.id (optional)                                    │   │
│  │  period_key (e.g., "2026-01")                                           │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ generateL10Agenda() fetches
                                     │ .in("status", ["open", "in_progress"])
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           MEETINGS LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                            meetings                                      │   │
│  │  id, organization_id, scheduled_for, status, type, agenda_generated     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                     │                                           │
│                                     ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          meeting_items                                   │   │
│  │  id, meeting_id, section, item_type, title                              │   │
│  │  source_ref_type: 'metric' | 'rock' | 'issue'                           │   │
│  │  source_ref_id: UUID → resolves to entity                               │   │
│  │  discussed: boolean, discussed_at: timestamp                            │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                     │                                           │
│               IDS: User marks discussed=true                                    │
│                                     │                                           │
│                                     ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                              todos                                       │   │
│  │  id, title, owner_id, due_date, done_at                                 │   │
│  │  meeting_id → meetings.id                                               │   │
│  │  issue_id → issues.id (if converted from issue)                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## INTEGRATION POINTS SUMMARY

| Connection | Status | Evidence Location |
|------------|--------|-------------------|
| metric_results → Scorecard display | ✅ EXISTING | `metricStatus.ts`, `ScorecardOffTrack.tsx` |
| Scorecard → off-track detection | ✅ EXISTING | `metricStatus.ts` (lines 86-199) |
| Off-track → Issue (user clicks) | ✅ EXISTING | `CreateIssueFromMetricModal.tsx` |
| Off-track → Issue (auto trigger) | ❌ NOT IMPLEMENTED | No background function exists |
| Rock ↔ Metric bidirectional | ✅ EXISTING | `rock_metric_links` table, `metricLinking.ts` |
| Issue → Meeting agenda auto-pull | ✅ EXISTING | `agendaGenerator.ts` (lines 265-309) |
| Meeting item → IDS discussion | ✅ EXISTING | `discussed` column updates |
| IDS → To-do creation | ✅ EXISTING | `LiveTodoPanel.tsx` |
| Issue resolution → scorecard update | ❌ NOT IMPLEMENTED | No trigger exists |
| To-do completion → issue auto-close | ❌ NOT IMPLEMENTED | No trigger exists |

---

## GAPS IDENTIFIED

1. **No automatic issue creation** when metrics go off-track. All issue creation is manual.
2. **No automatic issue resolution** when linked metric returns to on-track.
3. **No automatic issue closure** when all linked to-dos are completed.
4. **Legacy data (`legacy_monthly_reports`)** is siloed from `metric_results` — no automatic mapping.
