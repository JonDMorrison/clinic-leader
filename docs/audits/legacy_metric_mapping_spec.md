# Legacy Metric Mapping Specification

**Created:** 2026-02-02
**Status:** ✅ Implemented

## Overview

This document specifies how Lori workbook data flows from `legacy_monthly_reports` into the main `metric_results` table, enabling Scorecard, off-track detection, and meeting agenda generation for Default (Legacy) mode organizations.

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  Excel Workbook     │────▶│ legacy_monthly_     │────▶│   metric_results    │
│  (Lori format)      │     │ reports (JSONB)     │     │   (time-series)     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
                                     │
                                     ▼
                            ┌─────────────────────┐
                            │   legacyMetricBridge│
                            │   (extractor logic) │
                            └─────────────────────┘
```

## Canonical Metric Keys

| metric_key | Display Name | Unit | Direction | Source Block |
|------------|--------------|------|-----------|--------------|
| `total_new_patients` | Total New Patients | count | higher_is_better | provider_table |
| `total_visits` | Total Patient Visits | count | higher_is_better | provider_table |
| `total_production` | Total Production ($) | currency | higher_is_better | provider_table |
| `total_charges` | Total Charges ($) | currency | higher_is_better | provider_table |
| `total_referrals` | Total Referrals | count | higher_is_better | referral_totals |
| `new_referrals` | New Referrals | count | higher_is_better | referral_totals |
| `reactivations` | Reactivations | count | higher_is_better | referral_totals |
| `discharges` | Discharges | count | lower_is_better | referral_totals |
| `top_referral_source_count` | Top Referral Source Count | count | higher_is_better | referral_sources |
| `referral_source_count` | Number of Referral Sources | count | higher_is_better | referral_sources |
| `pain_mgmt_new_patients` | Pain Management New Patients | count | higher_is_better | extra_blocks |
| `pain_mgmt_total_visits` | Pain Management Total Visits | count | higher_is_better | extra_blocks |

## Files

### `src/lib/legacy/legacyMetricMapping.ts`

Defines the mapping configuration:
- `LegacyMetricMapping` interface with extractor functions
- `LEGACY_METRIC_MAPPINGS` array of all canonical mappings
- Helper functions for safe value extraction
- `extractMetricsFromPayload()` - main extraction function

### `src/lib/legacy/legacyMetricBridge.ts`

Handles database operations:
- `ensureMetricsExist()` - creates metrics if missing
- `upsertMetricResults()` - writes to metric_results table
- `bridgeLegacyToMetricResults()` - main bridge function
- `bridgeMultipleMonths()` - batch processing
- `isLegacyDataMode()` - checks org data_mode

### `src/pages/ImportMonthlyReport.tsx`

Integration point:
- Calls bridge after successful Lori payload upsert
- Shows derived metrics summary in UI
- Only runs for `data_mode !== 'jane'` organizations

## Database Flow

### 1. Metrics Table (ensure/create)

```sql
-- For each mapping, check if metric exists
SELECT id FROM metrics 
WHERE organization_id = $org_id 
AND import_key = $metric_key;

-- If not found, insert new metric
INSERT INTO metrics (
  organization_id, name, import_key, unit, direction, target, cadence, is_active, category
) VALUES (
  $org_id, $display_name, $metric_key, $unit, $direction, $default_target, 'monthly', true, $category
);
```

### 2. Metric Results Upsert

```sql
INSERT INTO metric_results (
  organization_id, metric_id, value, period_type, period_start, period_key, week_start, source, note
) VALUES (
  $org_id, $metric_id, $value, 'monthly', '$period_key-01', $period_key, '$period_key-01', 'legacy_workbook', 'Derived from Lori workbook import'
) ON CONFLICT (metric_id, period_type, period_start) DO UPDATE SET value = EXCLUDED.value;
```

## Extractor Logic

Each extractor function receives the full `LegacyMonthPayload` and returns `number | null`:

```typescript
extractor: (payload) => {
  // Find the Total row in provider_table
  const totalRow = getTotalRow(payload.provider_table);
  if (!totalRow) return null;
  
  // Get the "New Patient" column index
  const colIdx = getColumnIndex(payload.provider_table.headers, "new patient");
  if (colIdx < 0) return null;
  
  // Extract and parse numeric value
  return parseNumeric(totalRow[colIdx]);
}
```

### Safety Rules

1. Never throw exceptions - return `null` on failure
2. Log warnings in dev mode only
3. Handle missing blocks gracefully
4. Parse currency/percentage symbols from values

## Scope Safety

The bridge only runs for organizations with `teams.data_mode !== 'jane'`:

```typescript
const isLegacy = await isLegacyDataMode(organizationId);
if (isLegacy) {
  // Run bridge
}
```

This ensures Jane-integrated clinics are never affected.

## UI Integration

After import, the user sees:

1. **Monthly payload results** - success/error per month
2. **Derived metrics summary** - table showing:
   - Metric name
   - Extracted value
   - Status (synced/skipped/error)

If metrics were created, a count is shown. A "View Scorecard" button appears if any metrics were synced.

## Verification

The `BridgeResult` object includes:
- `period_key` - month processed
- `metrics_ensured` - total metrics verified
- `metrics_created` - new metrics created
- `total_inserted` - values synced to metric_results
- `total_skipped` - values skipped (null extraction)
- `results[]` - per-metric detail

This data is available for logging and audit purposes.

## Future Enhancements

1. **Additional metrics** - Add more extractors as business needs evolve
2. **Custom mappings** - Allow org-specific mapping overrides
3. **Historical backfill** - Process existing legacy_monthly_reports
4. **Trend calculations** - Derive MoM change metrics
