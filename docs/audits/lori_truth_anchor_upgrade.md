# Lori Workbook Truth Anchor Upgrade

**Created:** 2026-02-02
**Purpose:** Enable verification of referral metrics for Scorecard sync

## Overview

Currently, referral metrics (`total_referrals`, `new_referrals`, `reactivations`, `discharges`) cannot be verified against the workbook because they require summing across multiple location columns. There is no single "Grand Total" cell that serves as the truth anchor.

This document describes a small, consistent modification to Lori's monthly workbook that will enable these metrics to become **VERIFIABLE** and sync to the Scorecard.

---

## Current Workbook Structure (UNVERIFIABLE)

The Referral Totals table currently looks like this:

| Category      | Location A | Location B | Location C |
|---------------|------------|------------|------------|
| New           | 45         | 32         | 28         |
| Reactivation  | 12         | 8          | 5          |
| Discharge     | 10         | 6          | 4          |
| **Total**     | 67         | 46         | 37         |

**Problem:** To get "Total New Referrals", we must sum across columns: 45 + 32 + 28 = 105. There is no single cell with "105" that we can verify against.

---

## Proposed Upgrade (VERIFIABLE)

Add a **"Grand Total"** column to the Referral Totals table:

| Category      | Location A | Location B | Location C | **Grand Total** |
|---------------|------------|------------|------------|-----------------|
| New           | 45         | 32         | 28         | **105**         |
| Reactivation  | 12         | 8          | 5          | **25**          |
| Discharge     | 10         | 6          | 4          | **20**          |
| **Total**     | 67         | 46         | 37         | **150**         |

---

## Implementation Rules

### Column Placement
- **Position:** Add "Grand Total" as the **rightmost column** after all location columns
- **Header:** Use exact text: `Grand Total` (case can vary)

### Row Requirements
Ensure these exact row labels exist (first column, case-insensitive):
- `New` or `New Referrals`
- `Reactivation` or `Reactivations`
- `Discharge` or `Discharges`
- `Total` or `Totals`

### Formula Requirements
Each "Grand Total" cell should contain a SUM formula across all location columns in that row:
```excel
=SUM(B2:D2)  // Example for New row if locations are in columns B, C, D
```

---

## Example Layout

```
|   A              |   B      |   C      |   D      |   E           |
|------------------|----------|----------|----------|---------------|
| Category         | PDX Main | Salem    | Tigard   | Grand Total   |
| New              | 45       | 32       | 28       | 105           |
| Reactivation     | 12       | 8        | 5        | 25            |
| Discharge        | 10       | 6        | 4        | 20            |
| Total            | 67       | 46       | 37       | 150           |
```

---

## After Implementation

Once the Grand Total column is added:

1. Update `legacyMetricMapping.ts` extractors to read from "Grand Total" column instead of summing
2. Move metrics from UNVERIFIABLE to VERIFIABLE in `legacy_metric_truth_map.md`
3. Audit will now produce PASS/FAIL with cell-level evidence
4. Metrics will sync to Scorecard

---

## Metrics Affected

| Metric Key        | Current Status | After Upgrade |
|-------------------|----------------|---------------|
| total_referrals   | UNVERIFIABLE   | VERIFIABLE    |
| new_referrals     | UNVERIFIABLE   | VERIFIABLE    |
| reactivations     | UNVERIFIABLE   | VERIFIABLE    |
| discharges        | UNVERIFIABLE   | VERIFIABLE    |

---

## Verification Test

After adding the Grand Total column:
1. Upload the updated workbook via `/imports/monthly-report`
2. Check audit results - referral metrics should show PASS (not UNVERIFIABLE)
3. Navigate to `/scorecard` - referral metrics should appear with values

---

## Notes

- This change is backward compatible - the importer will continue to work with old workbooks (referral metrics will remain UNVERIFIABLE)
- The Grand Total column only affects verification - it doesn't change how the data is displayed on `/data`
- Consider adding Grand Total to the Referral Sources table as well if you want `referral_source_count` to become verifiable
