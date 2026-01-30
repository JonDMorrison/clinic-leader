# D) Excel Import Proof

## UI Route

**File:** `src/App.tsx`

```tsx
// Line 162
<Route path="/imports/monthly-report" element={<AppLayout><ImportMonthlyReport /></AppLayout>} />
```

**URL:** `/imports/monthly-report`

## Parsing Library

**File:** `src/lib/importers/excelParser.ts`

```typescript
import * as XLSX from 'xlsx';

export interface ParsedExcel {
  headers: string[];
  rows: Record<string, any>[];
  sheetNames: string[];
}

export const parseExcel = (file: File): Promise<ParsedExcel> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length === 0) {
          throw new Error('Empty Excel file');
        }
        
        // First row as headers
        const headers = jsonData[0].map((h: any) => String(h || '').trim());
        
        // Convert rows to objects
        const rows: Record<string, any>[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row: Record<string, any> = {};
          headers.forEach((header, index) => {
            row[header] = jsonData[i][index];
          });
          rows.push(row);
        }
        
        resolve({
          headers,
          rows,
          sheetNames: workbook.SheetNames
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read Excel file'));
    reader.readAsBinaryString(file);
  });
};
```

## Import Page Component

**File:** `src/pages/ImportMonthlyReport.tsx`

**NEEDS VERIFICATION** - File exists in App.tsx imports but content not provided in context.

## CSV Import Logic

**File:** `src/lib/importers/metricCsvImport.ts`

**NEEDS VERIFICATION** - Referenced in previous audit but content not provided.

## Expected Validation Rules

Based on excelParser.ts structure, expected required columns:

| Column | Required | Purpose |
|--------|----------|---------|
| `metric_key` | Yes | Maps to `metrics.import_key` |
| `value` | Yes | Numeric value |
| `month` | Yes | Period key in `YYYY-MM` format |
| `location` | No | Optional location dimension |
| `provider` | No | Optional provider dimension |

## Import Flow (Expected)

1. User uploads `.xlsx` or `.csv` file
2. `parseExcel()` extracts headers and rows
3. Validation checks required columns exist
4. Rows mapped to `metric_results` table via `import_key` lookup
5. Upsert on `(metric_id, organization_id, period_key)` composite key
