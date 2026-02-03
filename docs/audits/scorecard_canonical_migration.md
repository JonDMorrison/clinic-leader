# Scorecard Canonical Migration

**Created:** 2026-02-03  
**Status:** ✅ Implemented

## Overview

The Scorecard now queries `metric_canonical_results` first (computed by the selection engine) and falls back to raw `metric_results` when canonical data hasn't been computed yet.

## Query Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SCORECARD QUERY FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. Fetch metrics (unchanged)                                               │
│                                                                              │
│   2. For each cadence (weekly/monthly):                                      │
│      ┌─────────────────────────────────────────────────────────────┐        │
│      │ fetchCanonicalMetricResults()                                │        │
│      │                                                              │        │
│      │ a) Query metric_canonical_results first                      │        │
│      │    - Has is_canonical=true, selection_reason, computed_at    │        │
│      │                                                              │        │
│      │ b) Find metric+period gaps not in canonical                  │        │
│      │                                                              │        │
│      │ c) Query raw metric_results for gaps                         │        │
│      │    - Mark with is_canonical=false                            │        │
│      │                                                              │        │
│      │ d) Return merged results + fallbackMetricIds list            │        │
│      └─────────────────────────────────────────────────────────────┘        │
│                                                                              │
│   3. Enrich metrics with canonical provenance fields                         │
│      - is_canonical: true/false                                              │
│      - selection_reason: "Highest priority source..."                        │
│      - using_fallback: true if any results are non-canonical                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Before (Raw Only)

```typescript
// Old approach: direct query to metric_results
const { data } = await supabase
  .from("metric_results")
  .select("*")
  .in("metric_id", metricIds)
  .in("week_start", weeks);
```

### After (Canonical First)

```typescript
// New approach: canonical first with fallback
import { fetchCanonicalMetricResults } from "@/hooks/useCanonicalMetricResults";

const { results, fallbackMetricIds } = await fetchCanonicalMetricResults({
  organizationId: orgId,
  metricIds: weeklyMetricIds,
  periodType: 'week',
  periodStarts: weeks,
});

// Log fallbacks for dev visibility
if (fallbackMetricIds.length > 0) {
  console.warn("[Scorecard] Using raw fallback:", fallbackMetricIds);
}
```

## Files Changed

| File | Changes |
|------|---------|
| `src/pages/Scorecard.tsx` | Updated main query to use `fetchCanonicalMetricResults()`. Added `is_canonical`, `selection_reason`, `using_fallback` fields. |
| `src/hooks/useCanonicalMetricResults.ts` | **NEW** - Hook for canonical-first queries with raw fallback. |
| `src/components/scorecard/MetricDetailsDrawer.tsx` | Added `CanonicalSelectionDebugPanel` for dev visibility. |
| `src/components/scorecard/CanonicalSelectionDebugPanel.tsx` | **NEW** - Dev panel showing candidates, chosen, and audit log. |

## Enriched Metric Fields

Each metric in the Scorecard now includes:

```typescript
{
  // ... existing fields ...
  
  // NEW: Canonical selection fields
  is_canonical: boolean | null,      // true if from canonical engine
  selection_reason: string | null,   // "Highest priority source (10): jane_pipe"
  using_fallback: boolean,           // true if ANY results are non-canonical
}
```

## Dev Debug Panel

In development mode, the `MetricDetailsDrawer` includes a **Canonical Selection Debug** panel:

- **Query Context**: Shows metric_id, period_type, period_start
- **Canonical Result**: Value, source, selection reason, computed timestamp
- **Candidates**: All metric_results rows for that period with audit status
- **Audit Log**: Full selection reasoning with candidate_sources JSON

### Screenshot Location

The panel appears at the bottom of the drawer with a purple border (dev-only).

## Fallback Behavior

When `metric_canonical_results` doesn't have data for a metric+period:

1. Console warning logged: `[Scorecard] Using raw fallback for metrics (canonical not computed): [...]`
2. Results marked with `is_canonical: false`
3. Metric enriched with `using_fallback: true`
4. Display unchanged (graceful degradation)

## Verification Steps

1. **Check Console**: Look for fallback warnings in dev mode
2. **Open Debug Panel**: Expand "DEV: Canonical Selection Debug" in metric drawer
3. **Compare Values**: Verify Sept–Dec monthly data matches synced values
4. **Jane Orgs**: Confirm no regression - jane_pipe should be preferred source

## Future Enhancements

1. **Badge on MetricCard**: Show visual indicator for fallback metrics
2. **Admin trigger**: Button to recompute canonical for all metrics
3. **Scheduled refresh**: Cron job to recompute after data sync
4. **Alert on divergence**: Notify when sources differ by >5%

## Migration Path

1. ✅ Canonical selection engine deployed (previous ticket)
2. ✅ Scorecard queries canonical first with fallback
3. ⏳ Trigger `compute_canonical_for_month()` after monthly imports
4. ⏳ Trigger `compute_canonical_for_week()` after weekly jane sync
5. ⏳ Eventually remove raw fallback when all orgs have canonical data
