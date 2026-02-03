# Intervention Intelligence System - Architecture Documentation

## Overview

The Intervention Intelligence system enables healthcare clinics to track cause-and-effect relationships between operational interventions and KPI outcomes. It provides automated risk detection, meeting integration, and AI-powered advisory insights.

## Data Model

### Core Tables

```
interventions
├── id (uuid, PK)
├── organization_id (uuid, FK → teams) - Multi-tenant isolation
├── title (text)
├── description (text, nullable)
├── intervention_type (enum: staffing, marketing, referral_outreach, etc.)
├── status (enum: planned, active, completed, abandoned)
├── expected_time_horizon_days (int, default 90)
├── start_date, end_date (date, nullable)
├── owner_user_id (uuid, FK → users, nullable)
├── created_by (uuid, required) - Audit trail
├── tags (text[])
├── confidence_level (int)
└── ai_summary (text, nullable)

intervention_metric_links
├── id (uuid, PK)
├── intervention_id (uuid, FK → interventions, CASCADE DELETE)
├── metric_id (uuid, FK → metrics, RESTRICT DELETE)
├── baseline_value (numeric, nullable)
├── baseline_period_start (date, nullable)
├── baseline_period_type (text)
├── expected_direction (enum: up, down, stable)
└── expected_magnitude_percent (numeric, nullable)

intervention_outcomes
├── id (uuid, PK)
├── intervention_id (uuid, FK → interventions, CASCADE DELETE)
├── metric_id (uuid, FK → metrics, RESTRICT DELETE)
├── evaluation_period_start, evaluation_period_end (date)
├── actual_delta_value (numeric, nullable)
├── actual_delta_percent (numeric, nullable)
├── confidence_score (int)
├── ai_summary (text, nullable) - Advisory insights
└── evaluated_at (timestamp)

issues.intervention_id (uuid, FK → interventions, SET NULL)
```

### Delete Behavior

| Relationship | On Delete |
|--------------|-----------|
| interventions → metric_links | CASCADE (links deleted with intervention) |
| interventions → outcomes | CASCADE (outcomes deleted with intervention) |
| interventions → issues | SET NULL (issues preserved, link cleared) |
| metrics → metric_links | RESTRICT (cannot delete metric if linked) |
| metrics → outcomes | RESTRICT (cannot delete metric if has outcomes) |

## Row-Level Security (RLS) Policies

### interventions table
- **SELECT**: `is_same_team(organization_id)` - All org members can view
- **INSERT**: `is_same_team(organization_id) AND created_by = auth.uid()` - Managers+ can create
- **UPDATE**: `is_same_team(organization_id) AND (is_admin() OR created_by = auth.uid())` - Admins or creators
- **DELETE**: `is_same_team(organization_id) AND is_admin()` - Admins only

### intervention_metric_links table
- **SELECT**: Via join to interventions `is_same_team(i.organization_id)`
- **INSERT**: `can_modify_intervention(intervention_id)` - Uses security definer function
- **UPDATE**: `can_modify_intervention(intervention_id)`
- **DELETE**: Admins only

### intervention_outcomes table
- **SELECT**: Via join to interventions
- **INSERT/UPDATE/DELETE**: Admins only (high-impact action)

## Permission Model

```typescript
// src/lib/interventions/permissions.ts

Permission Levels:
- Admin (owner, director): Full CRUD, delete, evaluate outcomes
- Leadership (manager): Create/edit interventions, view outcomes
- Staff: View only

Functions:
- canViewIntervention(roleData) → boolean
- canCreateIntervention(roleData) → boolean
- canEditIntervention(roleData, isCreator) → boolean
- canDeleteIntervention(roleData) → boolean
- canEvaluateOutcome(roleData) → boolean
- canLinkMetrics(roleData) → boolean
- canTriggerAutoIssue(roleData) → boolean
- canGenerateAIInsight(roleData) → boolean
- canViewMeetingSignals(roleData) → boolean
```

## Outcome Evaluation Algorithm

```
1. Identify linked metrics for intervention
2. For each metric:
   a. Get baseline_value from intervention_metric_links
   b. Get latest metric_result.value for the evaluation period
   c. Compute:
      - actual_delta_value = current - baseline
      - actual_delta_percent = (delta / baseline) * 100
   d. Store in intervention_outcomes
3. Update intervention status based on outcomes
```

## Dynamic Status Computation

```typescript
// src/lib/interventions/interventionStatus.ts

Status Flow:
- planned: Not yet started
- active: Within time horizon, executing
- at_risk: <14 days remaining, no positive delta
- overdue: Past horizon, no outcomes evaluated
- on_track: Any linked metric has positive delta
- completed: Manually marked complete
- abandoned: Manually marked abandoned
```

## Meeting Injection Rules

```typescript
// src/lib/interventions/meetingSignals.ts

Signal Types:
1. Overdue: horizon passed + no outcomes
2. At Risk: <14 days remaining + no positive delta  
3. Newly Successful: positive delta in last 30 days

Injection Logic:
- Only show to leadership roles (manager+)
- Add "Intervention Review" section to meeting prep
- Auto-create agenda items with deep links
- Items disappear when intervention completes
```

## Auto Issue Creation Safeguards

```typescript
// src/lib/interventions/failedInterventionDetection.ts

Creation Rules:
1. Only for overdue interventions
2. Must have evaluated outcomes
3. Must have negative or zero delta
4. Never for NO_DATA months
5. One issue per intervention (no duplicates)
6. Source marked as 'intervention_outcome'

Deduplication:
- Check issues.intervention_id before creating
- Skip if issue already exists
```

## AI Summary Limitations

The `ai_summary` field in intervention_outcomes stores **advisory-only** AI-generated insights:

- **Input**: Only deterministic data (baseline, current, delta, intervention type)
- **Output**: Advisory language ("may indicate", "suggests", "could be")
- **No Automation**: AI never triggers actions
- **No Hallucination**: Prompt explicitly restricts to provided data
- **Overwrite Protection**: Never replaces manually-entered notes

## Data Flow Diagram

```
[Metric Results] ←─────────┐
       ↓                   │
[Create Intervention]      │
       ↓                   │
[Link Metrics + Baseline]──┘
       ↓
[Time Passes / Data Collected]
       ↓
[Outcome Evaluation Engine]
       ↓
[Store Outcomes + AI Summary]
       ↓
┌──────┴──────┐
↓             ↓
[Meeting     [Auto Issue
 Signals]     Creation]
```

## Cross-Navigation

| From | To | Method |
|------|----|--------|
| Scorecard Metric | Intervention Detail | LinkedInterventionsPanel |
| Intervention Detail | Metric History | Quick link in linked metrics |
| Meeting Prep | Intervention Detail | Deep link in intervention signals |
| Intervention Detail | Related Issues | InterventionIssueLink component |
| Issue Detail | Intervention Detail | Link via intervention_id |

## Integrity Checks

```typescript
// src/lib/interventions/interventionIntegrityCheck.ts

Validations:
1. Links have baseline_period_start
2. Baseline exists in metric_results
3. Outcomes have corresponding links
4. No orphan outcomes
5. No duplicate issues per intervention
6. AI summaries don't overwrite manual notes
```

## Performance Optimizations

```typescript
// src/lib/interventions/loadInterventionFull.ts

Batched Queries:
1. Intervention base data
2. All related data in parallel:
   - Metric links
   - Outcomes  
   - Issues
   - Meeting items
3. Metric details + results batch
4. User info batch

This prevents N+1 queries and loads full intervention in 4 round trips.
```

## Error Handling

All mutations implement:
- Loading state indicators
- Success toast notifications
- Error toast with human-readable message
- Never silently fail
- Retry support for critical operations

## Testing

Development-only test harness at `src/dev/InterventionTestHarness.tsx`:
- Run integrity checks
- Detect meeting signals
- Detect failed interventions
- View violation details

## Remaining Risks / Technical Debt

1. **Baseline capture timing**: If metric data is sparse, baseline may be stale
2. **Concurrent evaluation**: Multiple evaluations could race
3. **AI rate limits**: High volume could hit Lovable AI limits
4. **Cascade deletes**: Deleting intervention removes all history
5. **Meeting item references**: `linked_intervention_id` column may not exist on all meeting_items

## Audit Events

All significant actions should log to `audit_log`:
- intervention.created
- intervention.updated
- intervention.deleted
- metric.linked
- metric.unlinked
- outcome.evaluated
- issue.auto_created
- ai_summary.generated
