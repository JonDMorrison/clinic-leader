# Provenance Refactor - TODO

**Status:** INCOMPLETE - Requires dedicated session

## Problem
The attempt to add embedded provenance to each row (`{ cells, provenance }` format) broke too many files:
- `loriWorkbookImporter.ts` 
- `LegacyMonthlyReportView.tsx`
- `legacyMetricMapping.ts`
- `legacyMetricAudit.ts`
- `YTDDataView.tsx`
- `ImportMonthlyReport.tsx`

## Simpler Approach (Recommended)
Keep rows as `any[][]` and store provenance as a **parallel array**:

```typescript
interface TableBlock {
  headers: string[];
  rows: any[][];
  provenance?: RowProvenance[]; // Parallel to rows
}
```

This approach:
1. Doesn't require UI changes
2. Doesn't break metric extractors
3. Only adds optional provenance data

## Files Already Partially Modified
- `src/lib/importers/loriWorkbookImporter.ts` - needs revert
- `src/components/data/LegacyMonthlyReportView.tsx` - needs revert

## Next Steps
1. Revert loriWorkbookImporter.ts to original state
2. Keep provenance as parallel array (already supported by original types)
3. Update extractTableFromHeader to populate provenance array
4. No other file changes needed
