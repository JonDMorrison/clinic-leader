# D) Excel Import — UPDATED

**Status:** ✅ Enhanced with Lori Workbook Support

## Import Routes

- **Canonical Import:** `/imports/monthly-report` → `src/pages/ImportMonthlyReport.tsx`
- Supports both:
  1. **Standard template format** (metric_key, value, month columns)
  2. **Lori multi-month workbook** (auto-detected)

## UI Route

**File:** `src/App.tsx`

```tsx
// Line 162
<Route path="/imports/monthly-report" element={<AppLayout><ImportMonthlyReport /></AppLayout>} />
```

## Lori Workbook Detection

**File:** `src/lib/importers/loriWorkbookImporter.ts`

```typescript
export function isLoriWorkbook(workbook: XLSX.WorkBook): boolean {
  const sheetNames = workbook.SheetNames;
  
  // Must have Copy or Template sheet
  const hasTemplate = sheetNames.some(s => shouldSkipSheet(s));
  
  // Must have at least 2 month-like sheets
  const monthSheets = sheetNames.filter(s => {
    if (shouldSkipSheet(s)) return false;
    return parseSheetNameToPeriodKey(s) !== null;
  });
  
  return hasTemplate && monthSheets.length >= 2;
}
```

## Sheet Name to Period Key Mapping

```typescript
// Examples:
// "Sept" → "2025-09" (assumes current fiscal year)
// "Jan-26" → "2026-01"
// "February 2025" → "2025-02"
// "Copy" → null (skipped)
```

## Block Parsing Logic

Each month sheet has three main blocks in fixed column zones:

| Block | Columns | Header Marker | Stop Condition |
|-------|---------|---------------|----------------|
| Provider Table | A–G | "Provider Name" in col A | Blank or TOTAL row |
| Referral Totals | J–M | "Referrals" in col J | Blank row (max 10) |
| Referral Sources | O–P | "Referral Source" in col O | Blank row (max 50) |

Extra blocks (e.g., "Pain Management") are detected by scanning columns I–P for known titles.

## Payload Structure

```typescript
export interface LoriMonthPayload {
  sheet_name: string;
  period_key: string; // YYYY-MM
  provider_table: { headers: string[]; rows: any[][] };
  referral_totals: { headers: string[]; rows: any[][] };
  referral_sources: { headers: string[]; rows: any[][] };
  extra_blocks: { title: string; headers: string[]; rows: any[][] }[];
  warnings: string[];
}
```

## Upsert Code

```typescript
await supabase
  .from('legacy_monthly_reports')
  .upsert({
    organization_id: currentUser.team_id,
    period_key: payload.period_key,
    source_file_name: file?.name || null,
    payload: {
      sheet_name: payload.sheet_name,
      provider_table: payload.provider_table,
      referral_totals: payload.referral_totals,
      referral_sources: payload.referral_sources,
      extra_blocks: payload.extra_blocks,
      warnings: payload.warnings,
      imported_at: new Date().toISOString(),
    },
  }, {
    onConflict: 'organization_id,period_key',
  });
```

## Missing Block Handling

When a block is not found (header marker not detected):
1. The block's `rows` array is empty
2. A warning is added to `payload.warnings`
3. Import proceeds (partial data is still useful)
4. Warnings are displayed in the UI for user awareness

Example warnings:
- `"Provider table not found (no 'Provider Name' in column A)"`
- `"Referral sources list not found (no 'Referral Source' in column O)"`

## UI Flow for Lori Workbook

1. User uploads Excel file
2. System detects Lori workbook (multiple month sheets + Copy template)
3. Shows `lori-preview` step with:
   - List of months to import (period_key, sheet name)
   - Row counts per block
   - Any warnings per month
   - Skipped sheets list
4. User clicks "Import N Months"
5. Shows `lori-import` step with progress bar
6. Each month is upserted to `legacy_monthly_reports`
7. Results summary shown with success/error per month

## Standard Template Import (unchanged)

For non-Lori workbooks, the original flow continues:

| Column | Required | Purpose |
|--------|----------|---------|
| `metric_key` | Yes | Maps to `metrics.import_key` |
| `value` | Yes | Numeric value |
| `month` | Yes | Period key in `YYYY-MM` format |

## Files

- `src/lib/importers/loriWorkbookImporter.ts` — Lori parser module (NEW)
- `src/lib/importers/excelParser.ts` — Standard Excel parser
- `src/pages/ImportMonthlyReport.tsx` — UI integration (UPDATED)
