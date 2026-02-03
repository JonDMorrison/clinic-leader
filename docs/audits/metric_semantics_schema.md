# Metric Semantics Governance Schema

**Created:** 2026-02-03  
**Status:** ✅ Implemented

## Overview

The Metric Semantics Governance data layer provides a complete framework for:

1. **Canonical metric meaning** - Standardized definitions, units, and directionality
2. **Normalization rules** - How to normalize values for fair comparison (per_provider, per_1000_visits, etc.)
3. **Source policies** - Which data sources are allowed and their priority order
4. **Precedence overrides** - Organization-specific source preferences
5. **Canonical results** - Materialized "chosen" value per metric+period
6. **Audit trail** - Complete record of selection decisions

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           METRIC SEMANTICS LAYER                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌─────────────────────────┐    ┌────────────────┐  │
│  │ metric_definitions│    │ metric_normalization_   │    │ metric_source_ │  │
│  │                  │    │ rules                   │    │ policies       │  │
│  │ - canonical_name │    │ - normalization_type    │    │ - source       │  │
│  │ - unit           │    │ - multiplier            │    │ - priority     │  │
│  │ - higher_is_better│   │ - is_default            │    │ - requires_    │  │
│  │ - default_period │    │                         │    │   audit_pass   │  │
│  └────────┬─────────┘    └───────────┬─────────────┘    └───────┬────────┘  │
│           │                          │                          │           │
│           └──────────────────────────┼──────────────────────────┘           │
│                                      ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    select_canonical_metric_result()                   │   │
│  │  - Evaluates all source policies                                      │   │
│  │  - Applies org precedence overrides                                   │   │
│  │  - Checks audit pass requirements                                     │   │
│  │  - Returns chosen result with full justification                      │   │
│  └───────────────────────────────┬──────────────────────────────────────┘   │
│                                  ▼                                           │
│  ┌─────────────────────────┐    ┌─────────────────────────────────────┐     │
│  │ metric_canonical_results│◄───│ metric_selection_audit_log          │     │
│  │ (materialized choices)  │    │ (complete audit trail)              │     │
│  └─────────────────────────┘    └─────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tables

### 1. metric_definitions

Canonical semantic definitions for metrics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `metric_id` | uuid | References metrics(id), UNIQUE |
| `canonical_name` | text | Standard display name |
| `canonical_description` | text | Standard description |
| `unit` | text | 'count', 'currency', 'percent', 'ratio' |
| `higher_is_better` | boolean | Direction indicator (default: true) |
| `default_period_type` | text | 'week' or 'month' |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |

**Example Row:**
```json
{
  "id": "uuid-1",
  "metric_id": "uuid-metric-total-visits",
  "canonical_name": "Total Visits",
  "canonical_description": "Total patient visits across all providers",
  "unit": "count",
  "higher_is_better": true,
  "default_period_type": "month"
}
```

### 2. metric_normalization_rules

Rules for normalizing metric values.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `metric_id` | uuid | References metrics(id) |
| `normalization_type` | text | 'none', 'per_provider', 'per_1000_visits', 'per_new_patient', 'per_patient_panel' |
| `numerator_metric_id` | uuid | Optional numerator metric reference |
| `denominator_metric_id` | uuid | Optional denominator metric reference |
| `multiplier` | numeric | Multiplication factor (e.g., 1000) |
| `rounding_mode` | text | 'none', 'round', 'floor', 'ceil' |
| `decimals` | int | Decimal places (default: 2) |
| `is_default` | boolean | Only one default per metric |
| `created_at` | timestamptz | Creation timestamp |

**Constraints:**
- UNIQUE on (metric_id, normalization_type, numerator, denominator)
- Partial unique index: only one `is_default=true` per metric_id

**Example Row:**
```json
{
  "metric_id": "uuid-metric-total-production",
  "normalization_type": "per_provider",
  "multiplier": 1,
  "rounding_mode": "round",
  "decimals": 0,
  "is_default": true
}
```

### 3. metric_source_policies

Allowed data sources per metric with priority ordering.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `metric_id` | uuid | References metrics(id) |
| `source` | text | Source identifier (e.g., 'jane_pipe', 'legacy_workbook') |
| `is_allowed` | boolean | Whether source is allowed (default: true) |
| `priority` | int | Lower = higher priority (default: 100) |
| `requires_audit_pass` | boolean | Require audit verification (default: false) |
| `notes` | text | Optional notes |
| `created_at` | timestamptz | Creation timestamp |

**Constraints:**
- UNIQUE on (metric_id, source)

**Example Rows:**
```json
[
  {"source": "jane_pipe", "priority": 10, "requires_audit_pass": false},
  {"source": "jane", "priority": 20, "requires_audit_pass": false},
  {"source": "legacy_workbook", "priority": 30, "requires_audit_pass": true},
  {"source": "google_sheet", "priority": 60, "requires_audit_pass": false},
  {"source": "monthly_upload", "priority": 70, "requires_audit_pass": false},
  {"source": "pdf_import", "priority": 75, "requires_audit_pass": false},
  {"source": "csv_import", "priority": 80, "requires_audit_pass": false},
  {"source": "manual", "priority": 90, "requires_audit_pass": false}
]
```

### 4. metric_precedence_overrides

Organization-specific overrides for source precedence.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `organization_id` | uuid | References teams(id) |
| `metric_id` | uuid | References metrics(id) |
| `period_type` | text | 'week' or 'month' |
| `source` | text | Preferred source for this org |
| `reason` | text | Human-readable justification |
| `created_by` | uuid | User who created override |
| `created_at` | timestamptz | Creation timestamp |

**Constraints:**
- UNIQUE on (organization_id, metric_id, period_type)

**Use Case:**
An organization may prefer `legacy_workbook` over `jane_pipe` for historical reasons:

```json
{
  "organization_id": "org-uuid",
  "metric_id": "metric-uuid",
  "period_type": "month",
  "source": "legacy_workbook",
  "reason": "Historical data validation in progress; prefer verified workbook source"
}
```

### 5. metric_canonical_results

Materialized "chosen" result per metric+period.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `organization_id` | uuid | References teams(id) |
| `metric_id` | uuid | References metrics(id) |
| `period_type` | text | 'week' or 'month' |
| `period_start` | date | Period start date |
| `value` | numeric | Chosen value |
| `chosen_source` | text | Source of chosen value |
| `chosen_metric_result_id` | uuid | Original metric_results row ID |
| `selection_reason` | text | Human-readable selection reason |
| `selection_meta` | jsonb | Full selection metadata |
| `computed_at` | timestamptz | When selection was computed |

**Constraints:**
- UNIQUE on (organization_id, metric_id, period_type, period_start)

**Example Row:**
```json
{
  "organization_id": "org-uuid",
  "metric_id": "metric-uuid",
  "period_type": "month",
  "period_start": "2026-01-01",
  "value": 1247,
  "chosen_source": "jane_pipe",
  "selection_reason": "Highest priority source (10): jane_pipe",
  "selection_meta": {
    "candidates": [
      {"source": "jane_pipe", "value": 1247, "priority": 10},
      {"source": "legacy_workbook", "value": 1250, "priority": 30}
    ],
    "selected_at": "2026-02-03T10:00:00Z"
  }
}
```

### 6. metric_selection_audit_log

Complete audit trail of selection decisions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `organization_id` | uuid | Organization ID |
| `metric_id` | uuid | Metric ID |
| `period_type` | text | Period type |
| `period_start` | date | Period start date |
| `candidate_sources` | jsonb | All candidates considered |
| `chosen` | jsonb | Chosen candidate details |
| `reason` | text | Selection reason |
| `created_by` | uuid | User who triggered selection |
| `created_at` | timestamptz | When logged |

## Helper Functions

### get_canonical_source_priority()

Returns ordered list of sources for a metric+org+period:

```sql
SELECT * FROM get_canonical_source_priority(
  _metric_id := 'uuid-metric',
  _organization_id := 'uuid-org',
  _period_type := 'month'
);
```

Returns:
| source | priority | requires_audit_pass | is_override |
|--------|----------|---------------------|-------------|
| jane_pipe | 10 | false | false |
| legacy_workbook | 30 | true | false |

### select_canonical_metric_result()

Selects the canonical result for a metric+period:

```sql
SELECT * FROM select_canonical_metric_result(
  _organization_id := 'uuid-org',
  _metric_id := 'uuid-metric',
  _period_type := 'month',
  _period_start := '2026-01-01'
);
```

Returns:
| metric_result_id | value | source | selection_reason | selection_meta |
|------------------|-------|--------|------------------|----------------|
| uuid-result | 1247 | jane_pipe | Highest priority source (10): jane_pipe | {...} |

## Source Priority Reference

| Source | Default Priority | Notes |
|--------|-----------------|-------|
| `jane_pipe` | 10 | Jane bulk data pipeline (highest) |
| `jane` | 20 | Direct Jane API |
| `legacy_workbook` | 30 | Lori workbook import (requires audit) |
| `google_sheet` | 60 | Google Sheets sync |
| `monthly_upload` | 70 | Monthly Excel upload |
| `pdf_import` | 75 | PDF report extraction |
| `csv_import` | 80 | CSV file import |
| `manual` | 90 | Manual data entry (lowest) |

## RLS Policies

All tables have RLS enabled with:

- **SELECT**: Users can view data for their organization's metrics
- **ALL (admin)**: Admins can manage data for their organization's metrics

## Usage Patterns

### 1. Determine Canonical Value

```sql
-- Get the authoritative value for a metric+period
SELECT * FROM metric_canonical_results
WHERE organization_id = 'org-uuid'
  AND metric_id = 'metric-uuid'
  AND period_type = 'month'
  AND period_start = '2026-01-01';
```

### 2. Audit Source Selection

```sql
-- See all candidates that were considered
SELECT * FROM metric_selection_audit_log
WHERE organization_id = 'org-uuid'
  AND metric_id = 'metric-uuid'
  AND period_start = '2026-01-01';
```

### 3. Override Source Preference

```sql
-- Force an org to use legacy_workbook for a metric
INSERT INTO metric_precedence_overrides (
  organization_id, metric_id, period_type, source, reason, created_by
) VALUES (
  'org-uuid', 'metric-uuid', 'month', 'legacy_workbook',
  'Historical verification in progress', auth.uid()
);
```

## Future Enhancements

1. **Automatic refresh**: Scheduled job to recompute canonical results
2. **Conflict detection**: Alert when sources diverge significantly
3. **Quality scoring**: Factor source reliability into selection
4. **Trend analysis**: Track source preference changes over time
