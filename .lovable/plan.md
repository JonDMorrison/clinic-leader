
# Plan: Incremental Import Workflow + Year-to-Date View

## Current Behavior (Good News!)

The import system **already supports adding new months without deleting existing data**:

- When you upload a new spreadsheet, only the months **present in that file** are upserted
- Months not in the new file remain untouched in the database
- If a month exists and is also in the new file, it gets **updated** (not duplicated)

**Example workflow:**
1. You have Sep-Jan already imported
2. You get February data, add a "Feb-26" sheet to your workbook
3. Upload the workbook - February is added, Sep-Jan are updated if changed, nothing is deleted

---

## New Feature: Year-to-Date (YTD) Aggregation Tab

Add a special "YTD" tab that aggregates data across all months in the current fiscal year.

### How It Works

1. User selects "YTD" tab (alongside individual month tabs)
2. System loads all months from Jan 1 through the latest available month
3. Provider Production: Sum numeric columns, show cumulative totals
4. Referral Totals: Sum all referral counts across months
5. Referral Sources: Sum referral counts by source across months

### UI Changes

**DataDefaultHome.tsx:**
- Add "YTD" as a special tab option (appears first or last in the tab list)
- When selected, fetch all months for the current fiscal year
- Pass aggregated payload to `LegacyMonthlyReportView`

**New Component - YTDDataView.tsx:**
- Receives array of month payloads
- Aggregates numeric columns across months
- Shows "Year to Date (Jan - [Latest Month])" header
- Same table layout as individual months, but with summed values

---

## Additional Ideas

### 1. Fiscal Year Selector
Allow choosing which fiscal year to view (2025, 2026) when you accumulate multiple years of data.

### 2. Month-over-Month Trends
Add sparkline trends showing how each metric changed across the visible months.

### 3. Import History Panel
Show a log of when each month was last imported/updated, with source file name.

### 4. Export to Excel
One-click export of the current view (single month or YTD) back to Excel format.

### 5. Comparison Mode
Select two months and show side-by-side comparison with variance calculations.

---

## Technical Implementation

### Database
No schema changes needed - `legacy_monthly_reports` already supports the structure.

### Files to Create
- `src/components/data/YTDDataView.tsx` - Aggregation logic and display

### Files to Modify
- `src/pages/DataDefaultHome.tsx` - Add YTD tab option and data fetching
- `src/components/data/LegacyMonthlyReportView.tsx` - Optional: add "aggregated" mode indicator

### Aggregation Logic
```text
For each Provider row:
  - Sum "New Patient Visits", "Total Visits", etc.
  - Calculate averages where appropriate (e.g., "Avg Visits/Patient")

For Referral Totals:
  - Sum all numeric cells by row label

For Referral Sources:
  - Group by source name, sum totals across months
  - Sort by total descending
```

---

## Recommended Priority

1. **YTD Tab** - Highest value, gives executive-level summary
2. **Export to Excel** - Completes the round-trip workflow
3. **Fiscal Year Selector** - Needed once you have 2+ years of data
4. **Comparison Mode** - Nice-to-have for variance analysis
