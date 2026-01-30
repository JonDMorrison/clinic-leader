# B) metric_results Table Proof

## Table Schema (from types.ts)

**File:** `src/integrations/supabase/types.ts`

```typescript
metric_results: {
  Row: {
    created_at: string
    id: string
    metric_id: string
    note: string | null
    organization_id: string
    period_key: string | null
    period_start: string | null
    period_type: string | null
    source: string | null
    updated_at: string
    value: number
    week_start: string
  }
  Insert: {
    created_at?: string
    id?: string
    metric_id: string
    note?: string | null
    organization_id: string
    period_key?: string | null
    period_start?: string | null
    period_type?: string | null
    source?: string | null
    updated_at?: string
    value: number
    week_start: string
  }
  Update: {
    created_at?: string
    id?: string
    metric_id?: string
    note?: string | null
    organization_id?: string
    period_key?: string | null
    period_start?: string | null
    period_type?: string | null
    source?: string | null
    updated_at?: string
    value?: number
    week_start?: string
  }
  Relationships: [
    {
      foreignKeyName: "metric_results_metric_id_fkey"
      columns: ["metric_id"]
      isOneToOne: false
      referencedRelation: "metrics"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "metric_results_organization_id_fkey"
      columns: ["organization_id"]
      isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    },
  ]
}
```

## Key Columns for Monthly Support

| Column | Type | Purpose |
|--------|------|---------|
| `period_type` | `string \| null` | Values: `'weekly'` or `'monthly'` |
| `period_start` | `string \| null` | ISO date of period start |
| `period_key` | `string \| null` | Canonical key, e.g., `'2025-01'` for monthly |
| `week_start` | `string` | Legacy field, still required |
| `source` | `string \| null` | Tracks origin: `'jane_pipe'`, `'manual'`, etc. |

## Example Row Shape

```json
{
  "id": "uuid-redacted",
  "metric_id": "uuid-redacted",
  "organization_id": "uuid-redacted",
  "value": 127,
  "week_start": "2025-01-06",
  "period_type": "monthly",
  "period_start": "2025-01-01",
  "period_key": "2025-01",
  "source": "manual",
  "note": null,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

## Query Example from DataMetricsTable

**UNVERIFIED** - Need to read `src/components/data/DataMetricsTable.tsx` for exact query.

## Period Key Utility

**File:** `src/lib/periodKeys.ts` (if exists)

```typescript
// Expected format based on types
if (periodType === "monthly") return format(now, "yyyy-MM");
if (periodType === "weekly") return format(startOfWeek(now), "yyyy-MM-dd");
```
