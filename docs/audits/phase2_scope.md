# Phase 2: Legacy "Default" Data Mode — Scope Lock

**Status:** ✅ LOCKED  
**Date:** 2026-02-02

---

## Success Criteria (All Must Be True)

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Importing Lori workbook creates/updates `legacy_monthly_reports` AND upserts derived monthly values into `metric_results` | ✅ Implemented |
| 2 | `/scorecard` shows derived metrics for imported months | ✅ Implemented |
| 3 | `/scorecard/off-track` correctly computes status via `metricStatus.ts` | ✅ Implemented |
| 4 | Meeting agenda generator pulls Issues linked to off-track metrics | ✅ Existing |
| 5 | Data correctness provable: workbook value = extracted value (PASS/FAIL audit) | ✅ Implemented |

---

## Phase 2 Scope (ONLY)

### ✅ IN SCOPE

- **Org-level totals only** — No location/provider breakdown
- **Monthly cadence only** — `period_type = 'monthly'`
- **12 canonical KPIs** derived from Lori workbook:
  - `total_new_patients`
  - `total_visits`
  - `total_production`
  - `total_charges`
  - `total_referrals`
  - `referral_md`
  - `referral_patient`
  - `referral_marketing`
  - `referral_other`
  - `reactivations`
  - `discharges`
  - `total_collections`
- **Manual issue creation** via Scorecard "Create Issue" action
- **Audit verification** with cell-level provenance

### ❌ OUT OF SCOPE (Future Phases)

- Location-level breakdown (Phase 3+)
- Weekly cadence metrics
- Provider-level metrics
- Auto issue creation when metrics go off-track
- Auto issue closing when metrics recover
- Target auto-suggestion from historical data
- Trend analysis and forecasting

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PHASE 2 DATA FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

  Lori Workbook (.xlsx)
         │
         ▼
  ┌──────────────────┐
  │ loriWorkbook     │  Parse Excel with provenance
  │ Importer.ts      │  (sheet, row, col, raw_cells)
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ legacy_monthly_  │  Store raw JSONB payload
  │ reports          │  (organization_id, period_key)
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ legacyMetric     │  Extract 12 canonical KPIs
  │ Bridge.ts        │  Ensure metrics exist
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ metric_results   │  Upsert monthly values
  │                  │  source = 'legacy_workbook'
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Scorecard UI     │  Display metrics with targets
  │ /scorecard       │  Compute on/off-track status
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Off-Track View   │  Filter off-track metrics
  │ /scorecard/      │  Manual "Create Issue" action
  │ off-track        │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Issues           │  issues.metric_id links back
  │                  │  issues.period_key = YYYY-MM
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Meeting Agenda   │  Auto-populate from open issues
  │ Generator        │  meeting_items.source_ref_id
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ To-Dos           │  Created during IDS resolution
  │                  │  Links back to meeting_item
  └──────────────────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/legacy/legacyMetricMapping.ts` | 12 KPI definitions + extractors |
| `src/lib/legacy/legacyMetricBridge.ts` | Ensure metrics + upsert results |
| `src/lib/legacy/legacyMetricAudit.ts` | PASS/FAIL verification |
| `src/lib/importers/loriWorkbookImporter.ts` | Excel parsing with provenance |
| `src/pages/ImportMonthlyReport.tsx` | Import UI + bridge integration |
| `src/lib/scorecard/metricStatus.ts` | On/off-track computation |

---

## Constraints

1. **data_mode check**: Bridge only runs for orgs with `data_mode !== 'jane'`
2. **No auto-actions**: Issues are created manually by users
3. **Upsert conflict**: `metric_id, period_type, period_start`
4. **Source tagging**: All derived results have `source = 'legacy_workbook'`

---

## Verification

Run audit after import:
```typescript
import { auditDerivedMetrics } from '@/lib/legacy';

const report = auditDerivedMetrics('2025-11', payload);
// Returns PASS/FAIL per metric with cell-level evidence
```

---

**Phase 2 is LOCKED. Changes require explicit scope expansion approval.**
