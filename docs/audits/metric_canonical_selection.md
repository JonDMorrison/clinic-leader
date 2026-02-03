# Canonical Metric Selection Engine

**Created:** 2026-02-03  
**Status:** ✅ Implemented

## Overview

The Canonical Metric Selection Engine deterministically selects the "authoritative" value for each metric+organization+period from multiple data sources. This eliminates ambiguity when the same metric has values from jane_pipe, legacy_workbook, manual entry, etc.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SELECTION ENGINE FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐                                                        │
│  │ metric_results   │ ◄── jane_pipe, legacy_workbook, manual, etc.          │
│  │ (raw data)       │                                                        │
│  └────────┬─────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │           compute_metric_canonical_results() RPC                      │   │
│  │                                                                       │   │
│  │  1. Validate caller (org admin OR service role)                       │   │
│  │  2. Check for precedence override                                     │   │
│  │  3. Gather candidates by source priority                              │   │
│  │  4. Filter by audit requirements                                      │   │
│  │  5. Select best candidate                                             │   │
│  │  6. Upsert canonical result                                           │   │
│  │  7. Log selection to audit table                                      │   │
│  │                                                                       │   │
│  └───────────────────────────────┬──────────────────────────────────────┘   │
│                                  │                                           │
│                                  ▼                                           │
│  ┌─────────────────────────┐    ┌─────────────────────────────────────┐     │
│  │ metric_canonical_results│    │ metric_selection_audit_log          │     │
│  │ (chosen values)         │    │ (complete trail)                    │     │
│  └─────────────────────────┘    └─────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Selection Algorithm

### Step 1: Authorization Check

```sql
-- Must be org admin OR service role
SELECT (
  is_same_team(_org_id) AND is_admin()
) OR (
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
) INTO _is_authorized;
```

### Step 2: Check Precedence Override

```sql
-- If org has explicit source preference, that takes priority
SELECT source, reason 
FROM metric_precedence_overrides
WHERE organization_id = _org_id
  AND metric_id = _metric_id
  AND period_type = _period_type;
```

### Step 3: Gather Candidates by Priority

Sources are evaluated in priority order (lower = higher priority):

| Source | Default Priority | Audit Required |
|--------|-----------------|----------------|
| `jane_pipe` | 10 | No |
| `jane` | 20 | No |
| `legacy_workbook` | 30 | **Yes** |
| `google_sheet` | 60 | No |
| `monthly_upload` | 70 | No |
| `pdf_import` | 75 | No |
| `csv_import` | 80 | No |
| `manual` | 90 | No |

### Step 4: Apply Audit Requirements

For sources with `requires_audit_pass = true`:

```sql
-- Check selection_meta.audit_status
_audit_status := COALESCE(_result_rec.selection_meta->>'audit_status', 'N/A');

-- Skip if audit required but not passed
IF _audit_required AND _audit_status NOT IN ('PASS', 'N/A') THEN
  CONTINUE;  -- Skip this candidate
END IF;
```

**Audit Status Values:**
- `PASS` - Audit completed and passed
- `FAIL` - Audit completed and failed
- `N/A` - Audit not applicable (e.g., jane_pipe data)

### Step 5: Select Best Candidate

The first valid candidate (meeting audit requirements) is chosen:

```sql
IF _has_override AND _source = _override_source THEN
  _reason := 'Organization override: ' || _override_source;
ELSE
  _reason := 'Highest priority allowed source (priority X): ' || _source;
END IF;
```

### Step 6: Upsert Canonical Result

```sql
INSERT INTO metric_canonical_results (...)
ON CONFLICT (organization_id, metric_id, period_type, period_start)
DO UPDATE SET ...;
```

### Step 7: Log to Audit Trail

```sql
INSERT INTO metric_selection_audit_log (
  candidate_sources,  -- All candidates considered
  chosen,             -- Selected candidate
  reason              -- Why it was chosen
);
```

## RPCs

### compute_metric_canonical_results()

Computes canonical result for a **single metric**.

```sql
SELECT compute_metric_canonical_results(
  _org_id := 'org-uuid',
  _metric_id := 'metric-uuid',
  _period_type := 'month',
  _period_start := '2026-01-01'
);
```

**Returns:**
```json
{
  "success": true,
  "metric_id": "uuid",
  "period_type": "month",
  "period_start": "2026-01-01",
  "chosen_source": "jane_pipe",
  "chosen_value": 1247,
  "candidate_count": 3,
  "reason": "Highest priority allowed source (priority 10): jane_pipe"
}
```

### compute_canonical_for_month()

Batch computes canonical results for **all monthly metrics** in an org.

```sql
SELECT compute_canonical_for_month(
  _org_id := 'org-uuid',
  _month_start := '2026-01-01'
);
```

**Returns:**
```json
{
  "success": true,
  "organization_id": "uuid",
  "month_start": "2026-01-01",
  "total_metrics": 12,
  "success_count": 11,
  "error_count": 1,
  "results": [
    {"metric_id": "...", "metric_name": "Total Visits", "result": {...}},
    ...
  ]
}
```

### compute_canonical_for_week()

Same as month but for **weekly metrics**.

```sql
SELECT compute_canonical_for_week(
  _org_id := 'org-uuid',
  _week_start := '2026-01-06'
);
```

## selection_meta Column

Added to `metric_results` table:

```sql
ALTER TABLE metric_results 
ADD COLUMN selection_meta jsonb NOT NULL DEFAULT '{}';
```

### Expected Values

**Jane Pipe Results:**
```json
{
  "audit_status": "N/A",
  "source_file": "patients_2026-01-01.csv",
  "ingested_at": "2026-01-15T10:00:00Z"
}
```

**Legacy Workbook Results (after audit):**
```json
{
  "audit_status": "PASS",
  "audit_date": "2026-01-20",
  "auditor_id": "user-uuid",
  "provenance": {
    "sheet": "Provider Summary",
    "cell": "D15",
    "raw_value": "1,247"
  }
}
```

**Manual Entry:**
```json
{
  "audit_status": "N/A",
  "entered_by": "user-uuid",
  "entered_at": "2026-01-18T14:30:00Z"
}
```

## Selection Examples

### Example 1: Jane Pipe Wins (Default)

**Scenario:** Org has jane_pipe and legacy_workbook data for same metric+period.

**metric_results:**
| source | value | audit_status |
|--------|-------|--------------|
| jane_pipe | 1247 | N/A |
| legacy_workbook | 1250 | PASS |

**Result:** jane_pipe selected (priority 10 < 30)

**Reason:** `"Highest priority allowed source (priority 10): jane_pipe"`

### Example 2: Override Forces Legacy

**Scenario:** Org has precedence override for legacy_workbook.

**metric_precedence_overrides:**
```json
{
  "source": "legacy_workbook",
  "reason": "Historical validation in progress"
}
```

**Result:** legacy_workbook selected despite lower priority

**Reason:** `"Organization override: legacy_workbook (Historical validation in progress)"`

### Example 3: Audit Failure Skips Source

**Scenario:** legacy_workbook has `requires_audit_pass = true` but audit failed.

**metric_results:**
| source | value | audit_status |
|--------|-------|--------------|
| legacy_workbook | 1250 | FAIL |
| manual | 1200 | N/A |

**Result:** manual selected (legacy_workbook skipped)

**Reason:** `"Highest priority allowed source (priority 90): manual"`

### Example 4: No Valid Candidates

**Scenario:** Only source is legacy_workbook with failed audit.

**metric_results:**
| source | value | audit_status |
|--------|-------|--------------|
| legacy_workbook | 1250 | FAIL |

**Result:** NULL value stored

**Reason:** `"No valid candidates: all sources failed audit requirements"`

## Integration Points

### 1. Legacy Workbook Import

After successful import, set audit status:

```typescript
// In legacyMetricBridge.ts
await supabase
  .from('metric_results')
  .update({
    selection_meta: {
      audit_status: auditResult.allPassed ? 'PASS' : 'FAIL',
      audit_date: new Date().toISOString(),
      ...provenance
    }
  })
  .eq('id', resultId);
```

### 2. Jane Pipe Ingestion

Set audit status to N/A:

```typescript
// In jane-kpi-rollup
const selection_meta = {
  audit_status: 'N/A',
  source_file: fileName,
  ingested_at: new Date().toISOString()
};
```

### 3. Scheduled Refresh

Call batch function on schedule:

```typescript
// In scheduled-kpi-rollup edge function
await supabase.rpc('compute_canonical_for_month', {
  _org_id: orgId,
  _month_start: monthStart
});
```

## Audit Trail

Every selection creates an audit log entry:

```sql
SELECT * FROM metric_selection_audit_log
WHERE organization_id = 'org-uuid'
  AND metric_id = 'metric-uuid'
ORDER BY created_at DESC;
```

**Example Entry:**
```json
{
  "candidate_sources": [
    {"source": "jane_pipe", "value": 1247, "priority": 10, "audit_status": "N/A"},
    {"source": "legacy_workbook", "value": 1250, "priority": 30, "audit_status": "PASS"}
  ],
  "chosen": {
    "id": "uuid",
    "source": "jane_pipe",
    "value": 1247
  },
  "reason": "Highest priority allowed source (priority 10): jane_pipe"
}
```

## Security

- RPCs are `SECURITY DEFINER` with explicit `search_path`
- Authorization check: org admin OR service role
- Canonical results table: read-only for clients
- Audit log: read-only for org admins

## Future Enhancements

1. **Conflict alerts**: Notify admins when sources diverge by >5%
2. **Confidence scoring**: Weight by source reliability
3. **Auto-refresh triggers**: Recompute on metric_results insert
4. **Historical backfill**: Batch process past periods
