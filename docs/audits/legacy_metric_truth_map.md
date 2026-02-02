# Legacy Metric Truth Map

**Created:** 2026-02-02
**Status:** ✅ Finalized for Phase 2

## Overview

This document defines the "truth reference" for each derived metric in the Lori workbook import. 
Only metrics with a **VERIFIABLE** truth reference are synced to the Scorecard.

## Verifiability Status

| Status | Definition | Scorecard Sync |
|--------|------------|----------------|
| **VERIFIABLE** | Has deterministic cell/row reference in workbook | ✅ Yes |
| **UNVERIFIABLE** | Computed/derived value without single-cell truth | ❌ No (informational only) |

---

## Metric Truth References

### Provider Production Metrics (from `provider_table`)

| metric_key | Display Name | Status | Truth Reference |
|------------|--------------|--------|-----------------|
| `total_new_patients` | Total New Patients | **VERIFIABLE** | `provider_table` → row where col[0] = "Total" → column containing "New Patient" |
| `total_visits` | Total Patient Visits | **VERIFIABLE** | `provider_table` → row where col[0] = "Total" → column containing "Total Visits" or "Visits" |
| `total_production` | Total Production ($) | **VERIFIABLE** | `provider_table` → row where col[0] = "Total" → column containing "Production" |
| `total_charges` | Total Charges ($) | **VERIFIABLE** | `provider_table` → row where col[0] = "Total" → column containing "Charges" |

**Evidence format:** `sheet_name`, `excel_row` (from provenance), `column_index`, `raw_value`

---

### Referral Metrics (from `referral_totals`)

| metric_key | Display Name | Status | Truth Reference |
|------------|--------------|--------|-----------------|
| `total_referrals` | Total Referrals | **UNVERIFIABLE** | Computed: SUM of all numeric columns in "Total" row. No single cell truth. |
| `new_referrals` | New Referrals | **UNVERIFIABLE** | Computed: SUM of all numeric columns in "New" row. No single cell truth. |
| `reactivations` | Reactivations | **UNVERIFIABLE** | Computed: SUM of all numeric columns in "Reactivation" row. No single cell truth. |
| `discharges` | Discharges | **UNVERIFIABLE** | Computed: SUM of all numeric columns in "Discharge" row. No single cell truth. |

**Note:** These metrics sum across multiple location columns. The workbook doesn't have a single "Total Referrals" cell that we can point to. They're shown on /data Executive Summary as informational but not synced to Scorecard.

---

### Referral Sources (from `referral_sources`)

| metric_key | Display Name | Status | Truth Reference |
|------------|--------------|--------|-----------------|
| `top_referral_source_count` | Top Referral Source Count | **UNVERIFIABLE** | Depends on row ordering; first non-Total row. Position-dependent, not label-based. |
| `referral_source_count` | Number of Referral Sources | **UNVERIFIABLE** | Computed: COUNT of non-empty, non-Total rows. No single cell truth. |

---

### Pain Management (from `extra_blocks`)

| metric_key | Display Name | Status | Truth Reference |
|------------|--------------|--------|-----------------|
| `pain_mgmt_new_patients` | Pain Management New Patients | **CONDITIONAL** | `extra_blocks[Pain Management]` → row where col[0] = "Total" → column containing "New" |
| `pain_mgmt_total_visits` | Pain Management Total Visits | **CONDITIONAL** | `extra_blocks[Pain Management]` → row where col[0] = "Total" → column containing "Total" or "Visits" |

**CRITICAL: Conditional Verifiability**
- These metrics are **VERIFIABLE** only when the Pain Management block exists in the workbook AND contains the truth anchor (Total row with numeric values).
- If the Pain Management block does NOT exist for a month, these metrics become **NEEDS_DEFINITION** and do NOT block sync.
- If the block exists but the extraction fails to find the values, the audit will show evidence fields indicating `pain_block_found=false`.

**Note:** Missing blocks are intentional for some months (e.g., if that clinic doesn't have pain management services). The audit handles this gracefully.

---

## Summary

| Category | Verifiable | Unverifiable | Total |
|----------|------------|--------------|-------|
| Provider Production | 4 | 0 | 4 |
| Referrals | 0 | 4 | 4 |
| Referral Sources | 0 | 2 | 2 |
| Pain Management | 2 | 0 | 2 |
| **Total** | **6** | **6** | **12** |

---

## Verification Logic

For **VERIFIABLE** metrics with a truth anchor, the audit:
1. Locates the exact row by label match (case-insensitive "Total")
2. Locates the exact column by header match (partial, case-insensitive)
3. Extracts the raw cell value (this becomes the "reference")
4. Compares to extractor output
5. Returns **PASS** if exact match (or ±1 for currency rounding)
6. Returns **FAIL** (blocks sync) if values mismatch or extractor returns null while reference exists

For **UNVERIFIABLE** metrics (computed values), the audit:
1. Does NOT attempt verification
2. Returns status = "UNVERIFIABLE" 
3. Does NOT block import
4. Does NOT sync to Scorecard

For **NEEDS_DEFINITION** metrics (no truth anchor found), the audit:
1. Checks if the expected block/row/column exists
2. If not found, sets `has_reference=false`
3. Returns status = "NEEDS_DEFINITION"
4. Does NOT block import (even if extracted_value is also null)
5. Shown as informational in the UI

### Blocking Rules

A metric **blocks sync** ONLY when ALL of these are true:
- `is_verifiable=true` (metric is in the verifiable set)
- `has_reference=true` (truth anchor exists in workbook)
- `status=FAIL` (extracted value doesn't match reference, or extractor returned null)

If `has_reference=false`, the metric becomes **NEEDS_DEFINITION** and cannot block.

---

## Future Enhancements

To make referral metrics verifiable:
1. Add a "Grand Total" column to the workbook that sums all locations
2. Update extractors to read that specific column
3. Change status to VERIFIABLE in this document
4. **See:** `docs/audits/lori_truth_anchor_upgrade.md` for detailed instructions

---

## Known Issues

### Lori Workbook Parser (as of 2026-02-02)

**FIXED Issues:**
- ✅ **Total Row Label**: Now handles "Total", "Totals", "Total Patient Visits", and subtotal rows
- ✅ **Subtotal Summing**: When grand total row has no data, extractors SUM subtotal rows (Chiro + Mid Level + Massage Therapist)
- ✅ **Revenue/Production**: Now checks "Revenue" column if "Production" not found
- ✅ **Audit FAIL on null**: VERIFIABLE metrics now FAIL if extractor returns null

**Remaining Issue:**
- **JSONB Array Nulls**: The provider_table rows stored in `legacy_monthly_reports.payload` have null values in column positions. This appears to be a Lori workbook parser issue when initially saving to the database. The raw Excel data has values, but they're not being correctly mapped to array positions.

**Root Cause**: The Lori workbook importer (`loriWorkbookImporter.ts`) needs investigation - the row arrays are storing nulls instead of actual cell values for numeric columns.
