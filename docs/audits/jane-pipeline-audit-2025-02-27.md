# Jane Data Pipeline — Full Technical Audit

**Date:** 2026-02-27  
**Scope:** Jane ingestion pipeline, KPI engine, clinic_insights, explain-clinic-insight

---

## 1. Data Flow (End-to-End)

```
Jane EMR
  │  nightly CSV export
  ▼
AWS S3 bucket
  │  S3 event notification
  ▼
jane-s3-webhook (edge function)
  │  fetches CSV, calls bulk-ingest-jane
  ▼
bulk-ingest-jane (edge function)
  │  PHI screening, account GUID locking, dedup, batch upsert
  ▼
Staging Tables
  ├── staging_appointments_jane
  ├── staging_payments_jane
  ├── staging_invoices_jane
  ├── staging_patients_jane
  └── staging_shifts_jane
  │
  ├──▶ jane-kpi-rollup (edge function)
  │       │  weekly + monthly + YTD rollups
  │       ▼
  │     metric_results + metric_breakdowns
  │
  └──▶ generate-clinic-insights (edge function)
          │  WoW operational insights (6 insight keys)
          ▼
        clinic_insights
          │
          ▼
        Dashboard UI (ClinicPulse component)
          │
          ▼
        explain-clinic-insight (edge function, on-demand)
```

---

## 2. Database Schema Overview

### Staging Tables

| Table | Primary Key | Key Columns | Purpose |
|---|---|---|---|
| `staging_appointments_jane` | `id` (UUID) | `organization_id`, `start_at`, `end_at`, `cancelled_at`, `no_show_at`, `first_visit`, `price`, `staff_member_guid`, `patient_guid` | Raw appointment data from Jane |
| `staging_payments_jane` | `id` (UUID) | `organization_id`, `amount`, `received_at`, `payment_type`, `payer_type` | Payment transactions |
| `staging_invoices_jane` | `id` (UUID) | `organization_id`, `subtotal`, `amount_paid`, `invoiced_at`, `staff_member_guid` | Invoice records |
| `staging_patients_jane` | `id` (UUID) | `organization_id`, patient demographics | Patient master (PHI-screened) |
| `staging_shifts_jane` | `id` (UUID) | `organization_id`, `start_at`, `end_at`, `staff_member_guid` | Provider shift/availability data |

### Analytics Tables

| Table | Primary Key | Key Columns | Purpose |
|---|---|---|---|
| `metrics` | `id` (UUID) | `import_key`, `name`, `unit`, `direction` | Metric definitions (e.g. "cancellation_rate") |
| `metric_results` | `id` (UUID) | `metric_id`, `organization_id`, `period_start`, `period_type`, `value` | Computed KPI values per period |
| `metric_breakdowns` | `id` (UUID) | `metric_result_id`, `dimension`, `dimension_value`, `value` | Dimensional slices (by clinician, location, discipline) |
| `tracked_dimensions` | `id` (UUID) | `organization_id`, `dimension`, `dimension_value` | Registered dimension values for an org |

### Insight Tables

| Table | Primary Key | Unique Constraint | Key Columns |
|---|---|---|---|
| `clinic_insights` | `id` (UUID) | `(clinic_guid, insight_key, period_start)` | `organization_id`, `severity`, `title`, `summary`, `value_primary`, `value_secondary`, `money_impact`, `data_json`, `period_end`, `run_id`, `computed_at` |

---

## 3. Jobs / Edge Functions

### `jane-s3-webhook`
- **Trigger:** AWS S3 event notification (nightly)
- **Inputs:** S3 bucket, key, event metadata
- **Outputs:** Calls `bulk-ingest-jane`
- **Tables modified:** None directly

### `bulk-ingest-jane`
- **Trigger:** Called by `jane-s3-webhook` or manually
- **Inputs:** CSV payload, `organization_id`, resource type
- **Outputs:** Upserted staging rows, `data_ingestion_ledger` entry, `file_ingest_log` entry
- **Tables modified:** `staging_*_jane`, `data_ingestion_ledger`, `file_ingest_log`
- **Key logic:** PHI field quarantine, account GUID verification against `bulk_analytics_connectors.locked_account_guid`, checksum dedup

### `jane-kpi-rollup`
- **Trigger:** Called post-ingest or by `scheduled-kpi-rollup`
- **Inputs:** `organization_id`, `period_type` (weekly | monthly)
- **Outputs:** Upserted metric results and breakdowns
- **Tables modified:** `metric_results`, `metric_breakdowns`
- **Key logic:** 9 KPIs computed from staging tables; weekly = Mon–Sun (UTC); monthly = calendar month; YTD computed during monthly runs

### `scheduled-kpi-rollup`
- **Trigger:** `pg_cron` at 2 AM UTC daily
- **Inputs:** None (discovers all active connectors)
- **Outputs:** Invokes `jane-kpi-rollup` for each org (weekly + monthly)
- **Tables modified:** Indirectly via `jane-kpi-rollup`

### `generate-clinic-insights`
- **Trigger:** Manual invocation (no cron yet)
- **Inputs:** `organization_id`
- **Outputs:** 6 insight rows for the latest completed week
- **Tables modified:** `clinic_insights`
- **Key logic:** America/Los_Angeles week boundaries; WoW comparison; deterministic severity assignment

### `explain-clinic-insight`
- **Trigger:** User clicks "Explain" button in ClinicPulse
- **Inputs:** `clinic_guid`, `insight_key`, `period_start` (+ JWT auth)
- **Outputs:** 3 AI-generated bullets (why, causes, action)
- **Tables modified:** None (read-only)
- **Key logic:** Rate-limited (5 req / 10 min per user+clinic); uses only aggregated fields; Gemini Flash via Lovable AI gateway

---

## 4. KPI Engine

### Metric Definitions
- Stored in `metrics` table with `import_key` (e.g. `jane.cancellation_rate`)
- `unit` (percent, currency, count), `direction` (up_good, down_good)

### Computation Flow
1. `jane-kpi-rollup` looks up metric IDs via `import_key`
2. Queries staging tables for the target period
3. Computes aggregate value → upserts into `metric_results`
4. Computes dimensional breakdowns (by `staff_member_guid` joined to tracked dimensions) → upserts into `metric_breakdowns`

### Period Logic
- **Weekly:** Monday 00:00:00 UTC → Sunday 23:59:59 UTC
- **Monthly:** 1st 00:00:00 UTC → last day 23:59:59 UTC
- **YTD:** Jan 1 → end of current month (computed during monthly rollup)

### Known 9 KPIs
`cancellation_rate`, `no_show_rate`, `new_patient_volume`, `revenue_collected`, `collection_rate`, `avg_revenue_per_visit`, `total_visits`, `utilization`, `patient_retention`

---

## 5. Clinic Insights System

### Why It Exists Alongside metric_results
- `metric_results` stores **absolute values** for trending/charting
- `clinic_insights` stores **interpreted, WoW operational signals** with severity, money impact, and narrative summaries
- Different audiences: metric_results → scorecard/charts; clinic_insights → pulse dashboard with actionable alerts

### Insight Keys

| Key | Source Tables | Calculation | Fields Written |
|---|---|---|---|
| `cancellation_rate_trend` | `staging_appointments_jane` | `cancelled_at` count / total, WoW delta | `value_primary` (CW%), `value_secondary` (PW%), `money_impact` (cancelled × avg price) |
| `no_show_rate_trend` | `staging_appointments_jane` | `no_show_at` count / total | `value_primary` (CW%), `value_secondary` (PW%) |
| `revenue_collected_trend` | `staging_payments_jane` | Sum of `amount`, WoW % change | `value_primary` (CW$), `value_secondary` (PW$), `money_impact` (delta$) |
| `new_patient_volume` | `staging_appointments_jane` | `first_visit=true` and not cancelled/no-show | `value_primary` (CW count), `value_secondary` (PW count) |
| `collection_gap` | `staging_invoices_jane` + `staging_payments_jane` | (collected / invoiced) × 100 | `value_primary` (rate%), `money_impact` (gap$) |
| `provider_utilization` | `staging_shifts_jane` + `staging_appointments_jane` | appt hours / shift hours × 100 | `value_primary` (utilization%) |

### Period Definition
- **Current week:** Latest completed Mon–Sun in America/Los_Angeles
- **Prior week:** The week before that

### Unique Constraint
`(clinic_guid, insight_key, period_start)` — ensures one insight per metric per week per clinic

### RLS Policies
- SELECT: `organization_id` must match user's org (via `auth.uid()` → `users` → `organization_id`)
- INSERT/UPDATE/DELETE: denied to `authenticated` role (only service role writes)

### Dashboard Retrieval
`ClinicPulse` component queries `clinic_insights` ordered by `period_start DESC`, limited to the user's organization, showing the most recent period.

---

## 6. Performance Considerations

### Table Sizes (Estimated)
- Staging tables: ~1K–50K rows per org per table (depends on clinic size)
- `metric_results`: ~50–200 rows per org (9 metrics × periods)
- `clinic_insights`: ~6 rows per org per week

### Indexes
- Staging tables: composite on `(organization_id, start_at/received_at/invoiced_at)`
- `clinic_insights`: unique index on `(clinic_guid, insight_key, period_start)`
- `metric_results`: indexed on `(metric_id, organization_id, period_start, period_type)`

### Potential Slow Queries
- YTD queries in `jane-kpi-rollup` scan all rows for the calendar year — could be slow for large orgs
- `generate-clinic-insights` runs 8 parallel queries (4 tables × 2 weeks) — efficient but could hit connection limits under concurrency

### Staging Table Safety
- Safe to query directly for analytics (they are the source of truth)
- NOT safe to expose to end users (contain `patient_guid`, `staff_member_guid`)

---

## 7. Potential Risks & Tech Debt

### 🔴 Critical

1. **1000-Row Default Limit (jane-kpi-rollup)**
   - Supabase returns max 1000 rows by default
   - YTD queries for orgs with >1000 appointments/year will silently truncate
   - Fix: Add `.limit(100000)` or paginate

2. **Timezone Mismatch**
   - `jane-kpi-rollup` uses **UTC** boundaries
   - `generate-clinic-insights` uses **America/Los_Angeles** boundaries
   - Same data, different week windows → inconsistent numbers on dashboard
   - Fix: Standardize on America/Los_Angeles everywhere

### 🟡 Warning

3. **No Scheduled Trigger for generate-clinic-insights**
   - `scheduled-kpi-rollup` calls `jane-kpi-rollup` but NOT `generate-clinic-insights`
   - Insights become stale unless manually triggered
   - Fix: Add `generate-clinic-insights` call to `scheduled-kpi-rollup`

4. **Duplicated Week Boundary Logic**
   - `getLatestCompletedWeek()` / `getPriorWeek()` duplicated in:
     - `src/lib/weekBoundaries.ts` (frontend)
     - `generate-clinic-insights/index.ts` (edge function)
   - Risk: drift between copies
   - Fix: Accept as necessary (Deno vs browser), but add integration tests

5. **Revenue Breakdown Drift**
   - `jane-kpi-rollup` infers revenue dimensions from appointment staff_member_guid
   - If providers change locations, historical breakdowns become inaccurate
   - Fix: Snapshot dimension at ingestion time

### 🟢 Info

6. **Rate Limiter is In-Memory**
   - `explain-clinic-insight` uses in-memory rate limiting
   - Resets on every cold start / redeployment
   - Acceptable for current scale; consider DB-backed rate limiting if abuse occurs

---

## 8. Architecture Diagram

```
┌──────────┐    CSV     ┌──────────┐
│ Jane EMR │ ─────────▶ │  AWS S3  │
└──────────┘            └────┬─────┘
                             │ S3 event
                             ▼
                   ┌─────────────────────┐
                   │  jane-s3-webhook    │
                   └────────┬────────────┘
                            │
                            ▼
                   ┌─────────────────────┐
                   │  bulk-ingest-jane   │
                   │  (PHI screen, dedup)│
                   └────────┬────────────┘
                            │ upsert
                            ▼
              ┌───────────────────────────────┐
              │       STAGING TABLES          │
              │  appointments │ payments      │
              │  invoices     │ shifts        │
              │  patients                     │
              └───────┬──────────────┬────────┘
                      │              │
            ┌─────────▼──────┐  ┌────▼──────────────────┐
            │ jane-kpi-rollup│  │ generate-clinic-       │
            │ (weekly/monthly│  │ insights (WoW)         │
            │  /YTD)         │  └────┬──────────────────┘
            └───────┬────────┘       │
                    │                │
          ┌─────────▼──────┐  ┌──────▼─────────┐
          │ metric_results │  │ clinic_insights │
          │ metric_        │  └──────┬─────────┘
          │ breakdowns     │         │
          └───────┬────────┘         │
                  │                  │
                  ▼                  ▼
         ┌────────────────────────────────┐
         │        Dashboard UI           │
         │  Scorecard │ ClinicPulse      │
         └────────────┬───────────────────┘
                      │ on-demand
                      ▼
            ┌──────────────────────┐
            │ explain-clinic-      │
            │ insight (AI, Gemini) │
            └──────────────────────┘
```
