
# Plan: Fix and Enhance AI Copilot

## Problem Summary

The Copilot is completely broken and poorly positioned. Here's what's wrong:

| Issue | Impact |
|-------|--------|
| **Wrong database tables** | The AI queries `kpis` (0 readings) instead of `metrics` (976 readings) |
| **No data returned** | AI says "I don't have enough information" because it literally has none |
| **Navigation clutter** | Copilot takes a dedicated nav slot when it could live inside the dashboard |
| **Disconnected experience** | The full-page `/copilot` route feels separate from the app flow |

---

## Solution Overview

Transform Copilot from a broken standalone page into an **embedded AI assistant** that actually works.

### What Changes

1. **Fix the data source** - Connect to the real `metrics`/`metric_results` tables
2. **Remove from sidebar** - Eliminate the dedicated nav slot
3. **Keep it on the dashboard** - The `CopilotWidget` already exists there; make it the primary experience
4. **Add a slide-out drawer** - For longer conversations, open a drawer (not a new page)
5. **Add more context** - Include VTO goals, core values, and recent activity

---

## Technical Changes

### 1. Fix the Edge Function Data Queries

**File:** `supabase/functions/ai-query-data/index.ts`

Replace the broken queries with correct ones:

```text
Before (line 32-45):
- Queries "kpis" table → 0 results
- Queries "kpi_readings" → 0 results

After:
- Query "metrics" table → 575 metrics
- Query "metric_results" → 976 readings
```

The fixed query will look like:
```typescript
const { data: metrics } = await supabase
  .from("metrics")
  .select(`
    name, target, unit, direction, category,
    owner:users!metrics_owner_fkey(full_name),
    metric_results(value, week_start, period_key)
  `)
  .eq("organization_id", team_id)
  .order("week_start", { foreignTable: "metric_results", ascending: false })
  .limit(4, { foreignTable: "metric_results" });
```

Also add:
- VTO context (long-term targets, current rocks)
- Core values (for culture-aware responses)
- Recent activity from `ai_logs` (for conversational memory)

### 2. Remove Copilot from Navigation

**File:** `src/components/layout/Sidebar.tsx`

Remove the Copilot nav item from line 43:
```typescript
// DELETE this line:
{ title: "Copilot", path: "/copilot", icon: Sparkles, roles: ["staff", "manager", "director", "owner"] },
```

This reduces sidebar clutter without removing functionality.

### 3. Enhance the Dashboard Widget

**File:** `src/components/dashboard/CopilotWidget.tsx`

Current widget is already good, but add:
- "Expand" button that opens a slide-out drawer for longer conversations
- Show conversation history within the drawer
- Persist last few messages in session state

### 4. Create a Copilot Drawer Component

**New File:** `src/components/ai/CopilotDrawer.tsx`

A sheet/drawer component that:
- Slides in from the right when expanded
- Contains the full chat interface (currently in `/copilot` page)
- Maintains conversation history during the session
- Can be triggered from the widget or a floating action button

### 5. Update the Copilot Page Route

**File:** `src/pages/Copilot.tsx`

Option A: Redirect `/copilot` to `/` (dashboard) with the drawer auto-opened  
Option B: Keep the page but have it render the same drawer component full-width

I recommend Option A for simplicity.

### 6. Improve Suggested Questions

**Files:** `src/pages/Copilot.tsx`, `src/components/dashboard/CopilotWidget.tsx`

Update the example questions to match actual data:
```typescript
const exampleQuestions = [
  "Which metrics are off track this month?",
  "What rocks are due in the next 30 days?",
  "Show me our team's open issues",
  "How are we tracking on our long-term goals?",
];
```

---

## Data Context Enhancement

The AI prompt will now include:

| Context | Source Table | Purpose |
|---------|--------------|---------|
| Metrics + Results | `metrics`, `metric_results` | "What's off track?" |
| Rocks | `rocks` | "Who needs help on rocks?" |
| Issues | `issues` | "What's blocking us?" |
| Todos | `todos` | "What's due soon?" |
| VTO Goals | `vto` | "Are we aligned to vision?" |
| Core Values | `org_core_values` | Culture-aware responses |

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/ai-query-data/index.ts` | Fix queries, add VTO/values context |
| `src/components/layout/Sidebar.tsx` | Remove Copilot nav item |
| `src/components/dashboard/CopilotWidget.tsx` | Add expand button, connect to drawer |
| `src/components/ai/CopilotDrawer.tsx` | New - slide-out chat panel |
| `src/pages/Copilot.tsx` | Redirect to dashboard or convert to drawer |
| `src/App.tsx` | Update route handling |

---

## User Experience After Implementation

1. **Dashboard loads** → Copilot widget visible with smart suggested questions
2. **Click a question** → Answer appears in the widget
3. **Click "Expand"** → Full conversation drawer slides in
4. **Continue chatting** → Full history, more space for responses
5. **Close drawer** → Back to dashboard, no navigation needed

The Copilot becomes a seamlessly integrated assistant rather than a disconnected feature.
