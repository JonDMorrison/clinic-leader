# E) Jane-Only Coupling

## Main File

**File:** `src/components/data/DataMetricsTable.tsx`

**NEEDS FULL READ** - Not provided in context. Path confirmed via DataHome.tsx import.

## Known Jane-Specific Elements from DataHome.tsx

### Jane Connector Query

```tsx
// Lines 28-43
const { data: janeConnector, isLoading: janeLoading } = useQuery({
  queryKey: ["jane-connector", currentUser?.team_id],
  queryFn: async () => {
    if (!currentUser?.team_id) return null;
    
    const { data } = await supabase
      .from("bulk_analytics_connectors")
      .select("*")
      .eq("organization_id", currentUser.team_id)
      .eq("source_system", "jane")  // <-- Jane-specific filter
      .maybeSingle();
    
    return data;
  },
  enabled: !!currentUser?.team_id,
});
```

### Jane Status Check

```tsx
// Lines 84-87
const isConnected = janeConnector?.status === "receiving_data" || 
  janeConnector?.status === "awaiting_first_file" || 
  janeConnector?.status === "active" || 
  janeConnector?.status === "awaiting_jane_setup";
```

### Jane-Specific Ingest Query

```tsx
// Lines 46-62
const { data: recentIngests } = useQuery({
  queryKey: ["recent-ingests", currentUser?.team_id],
  queryFn: async () => {
    if (!currentUser?.team_id) return [];
    
    const { data } = await supabase
      .from("file_ingest_log")
      .select("created_at, status")
      .eq("organization_id", currentUser.team_id)
      .eq("source_system", "jane")  // <-- Jane-specific filter
      .order("created_at", { ascending: false })
      .limit(1);
    
    return data || [];
  },
  enabled: !!currentUser?.team_id,
});
```

### Jane Sync Source Check

```tsx
// Line 77
const automated = metrics?.filter(m => m.sync_source === "jane_pipe").length || 0;
```

## Expected Jane-Specific Metrics (from memory context)

Based on `memory/features/jane-data-breakdown-and-ui-governance`:

> The /data page filters to 8 'Jane-safe' metrics with Clinician, Discipline, and Location breakdowns.

Expected metric keys (NEEDS VERIFICATION from DataMetricsTable.tsx):

1. `jane_total_visits`
2. `jane_new_patients`
3. `jane_cancelled_visits`
4. `jane_no_shows`
5. `jane_rescheduled_visits`
6. `jane_online_bookings`
7. `jane_revenue`
8. `jane_avg_visit_value`

## Breakdown Dimensions

From memory context:

- Clinician
- Discipline (normalized to snake_case, e.g., `'massage_therapy'`)
- Location

## IntegrationsBanner Component

**File:** `src/components/data/IntegrationsBanner.tsx`

```tsx
// Used in DataHome.tsx line 158
<IntegrationsBanner isConnected={isConnected} />
```

Displays connection status UI based on `isConnected` prop (Jane-derived).

## InlineMetricBreakdownPanel

**File:** `src/components/data/InlineMetricBreakdownPanel.tsx`

Referenced in memory as containing Jane-specific dimension logic.

**NEEDS FULL READ** for exact coupling details.
