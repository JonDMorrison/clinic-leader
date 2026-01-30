/**
 * Lori Workbook Importer
 * 
 * Parses Lori's multi-month Excel workbook into structured payloads for legacy_monthly_reports.
 * 
 * Workbook structure:
 * - Multiple sheets named: Sept, Oct, Nov, Dec, Jan-26, etc.
 * - A template sheet called "Copy" (should be ignored)
 * 
 * Each month sheet has three main blocks:
 * - Columns A-G: Provider production table (header row includes "Provider Name")
 * - Columns J-M: Referrals totals block (header row includes "Referrals")
 * - Columns O-P: Referral source list (header row includes "Referral Source" and "Total")
 * 
 * Some sheets may contain extra blocks (like "Pain Management") which are stored in extra_blocks.
 */

import * as XLSX from 'xlsx';

// Types
export interface TableBlock {
  headers: string[];
  rows: any[][];
}

export interface ExtraBlock extends TableBlock {
  title: string;
}

export interface LoriMonthPayload {
  sheet_name: string;
  period_key: string; // YYYY-MM
  provider_table: TableBlock;
  referral_totals: TableBlock;
  referral_sources: TableBlock;
  extra_blocks: ExtraBlock[];
  warnings: string[];
}

export interface LoriParseResult {
  payloads: LoriMonthPayload[];
  skippedSheets: string[];
  errors: string[];
}

// Month name mappings
const MONTH_NAMES: Record<string, number> = {
  'jan': 1, 'january': 1,
  'feb': 2, 'february': 2,
  'mar': 3, 'march': 3,
  'apr': 4, 'april': 4,
  'may': 5,
  'jun': 6, 'june': 6,
  'jul': 7, 'july': 7,
  'aug': 8, 'august': 8,
  'sep': 9, 'sept': 9, 'september': 9,
  'oct': 10, 'october': 10,
  'nov': 11, 'november': 11,
  'dec': 12, 'december': 12,
};

// Sheets to skip
const SKIP_SHEETS = ['copy', 'template', 'instructions', 'example'];

/**
 * Parses a sheet name like "Sept", "Oct", "Jan-26" into a YYYY-MM period_key.
 * If no year is specified, uses heuristics based on the month.
 */
export function parseSheetNameToPeriodKey(sheetName: string, fallbackYear: number = 2025): string | null {
  const cleaned = sheetName.toLowerCase().trim();
  
  // Pattern: "Jan-26" or "Feb-2026"
  const withYearMatch = cleaned.match(/^([a-z]+)[-\s]?(\d{2,4})$/);
  if (withYearMatch) {
    const monthStr = withYearMatch[1];
    let year = parseInt(withYearMatch[2], 10);
    if (year < 100) year += 2000; // "26" -> 2026
    
    const month = MONTH_NAMES[monthStr];
    if (month) {
      return `${year}-${String(month).padStart(2, '0')}`;
    }
  }
  
  // Pattern: "September 2025"
  const fullMatch = cleaned.match(/^([a-z]+)\s+(\d{4})$/);
  if (fullMatch) {
    const monthStr = fullMatch[1];
    const year = parseInt(fullMatch[2], 10);
    const month = MONTH_NAMES[monthStr];
    if (month) {
      return `${year}-${String(month).padStart(2, '0')}`;
    }
  }
  
  // Pattern: Just month name - "Sept", "Oct", etc.
  const month = MONTH_NAMES[cleaned];
  if (month) {
    // Heuristic: if month is Sept-Dec, use fallbackYear; if Jan-Aug, use fallbackYear+1
    // This assumes data is typically Q4 of one year + Q1 of next
    const year = month >= 9 ? fallbackYear : fallbackYear + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
  }
  
  return null;
}

/**
 * Check if a sheet should be skipped (template sheets)
 */
function shouldSkipSheet(sheetName: string): boolean {
  const lower = sheetName.toLowerCase().trim();
  return SKIP_SHEETS.some(skip => lower === skip || lower.includes(skip));
}

/**
 * Get a cell value safely from a 2D array
 */
function getCell(rows: any[][], rowIdx: number, colIdx: number): any {
  if (rowIdx < 0 || rowIdx >= rows.length) return null;
  const row = rows[rowIdx];
  if (!row || colIdx < 0 || colIdx >= row.length) return null;
  return row[colIdx];
}

/**
 * Get cell as trimmed string
 */
function getCellStr(rows: any[][], rowIdx: number, colIdx: number): string {
  const val = getCell(rows, rowIdx, colIdx);
  return val != null ? String(val).trim() : '';
}

/**
 * Check if a string contains a target (case-insensitive)
 */
function cellContains(cellValue: string, target: string): boolean {
  return cellValue.toLowerCase().includes(target.toLowerCase());
}

/**
 * Column letter to index (A=0, B=1, ..., Z=25, AA=26, ...)
 */
function colLetterToIndex(letter: string): number {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return result - 1;
}

// Column indices for each block
const COL_A = colLetterToIndex('A'); // 0
const COL_G = colLetterToIndex('G'); // 6
const COL_I = colLetterToIndex('I'); // 8
const COL_J = colLetterToIndex('J'); // 9
const COL_M = colLetterToIndex('M'); // 12
const COL_O = colLetterToIndex('O'); // 14
const COL_P = colLetterToIndex('P'); // 15

/**
 * Find the row index where a column contains a target string
 */
function findRowWithText(rows: any[][], colIdx: number, target: string, maxRows: number = 50): number {
  for (let r = 0; r < Math.min(rows.length, maxRows); r++) {
    const cell = getCellStr(rows, r, colIdx);
    if (cellContains(cell, target)) {
      return r;
    }
  }
  return -1;
}

/**
 * Extract rows from a block until blank row or TOTAL row
 */
function extractBlockRows(
  rows: any[][],
  headerRowIdx: number,
  startCol: number,
  endCol: number,
  stopOnTotal: boolean = true,
  maxRows: number = 100
): { headers: string[]; dataRows: any[][] } {
  // Extract headers
  const headerRow = rows[headerRowIdx] || [];
  const headers: string[] = [];
  for (let c = startCol; c <= endCol; c++) {
    headers.push(headerRow[c] != null ? String(headerRow[c]).trim() : '');
  }
  
  // Extract data rows
  const dataRows: any[][] = [];
  for (let r = headerRowIdx + 1; r < Math.min(rows.length, headerRowIdx + maxRows); r++) {
    const row = rows[r] || [];
    const firstCell = getCellStr(rows, r, startCol);
    
    // Stop conditions
    if (!firstCell || firstCell === '') {
      // Check if entire row is blank in this column range
      let allBlank = true;
      for (let c = startCol; c <= endCol; c++) {
        if (getCellStr(rows, r, c) !== '') {
          allBlank = false;
          break;
        }
      }
      if (allBlank) break;
    }
    
    // Include TOTAL row but stop after
    const isTotal = firstCell.toLowerCase() === 'total' || firstCell.toLowerCase().includes('total');
    
    // Extract row data
    const rowData: any[] = [];
    for (let c = startCol; c <= endCol; c++) {
      rowData.push(getCell(rows, r, c));
    }
    dataRows.push(rowData);
    
    if (stopOnTotal && isTotal) break;
  }
  
  return { headers, dataRows };
}

/**
 * Parse a single month sheet
 */
function parseMonthSheet(sheetName: string, worksheet: XLSX.WorkSheet, fallbackYear: number): LoriMonthPayload | null {
  const periodKey = parseSheetNameToPeriodKey(sheetName, fallbackYear);
  if (!periodKey) {
    return null;
  }
  
  // Convert sheet to 2D array
  const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
  
  const warnings: string[] = [];
  
  // ========== PROVIDER TABLE (A-G) ==========
  // Find row where column A contains "Provider Name"
  const providerHeaderRow = findRowWithText(rows, COL_A, 'Provider Name');
  let providerTable: TableBlock = { headers: [], rows: [] };
  
  if (providerHeaderRow >= 0) {
    const extracted = extractBlockRows(rows, providerHeaderRow, COL_A, COL_G, true);
    providerTable = { headers: extracted.headers, rows: extracted.dataRows };
  } else {
    warnings.push('Provider table not found (no "Provider Name" in column A)');
  }
  
  // ========== REFERRAL TOTALS (J-M) ==========
  // Find row where column J contains "Referrals"
  const referralHeaderRow = findRowWithText(rows, COL_J, 'Referrals');
  let referralTotals: TableBlock = { headers: [], rows: [] };
  
  if (referralHeaderRow >= 0) {
    const extracted = extractBlockRows(rows, referralHeaderRow, COL_J, COL_M, false, 10);
    referralTotals = { headers: extracted.headers, rows: extracted.dataRows };
  } else {
    warnings.push('Referral totals block not found (no "Referrals" in column J)');
  }
  
  // ========== REFERRAL SOURCES (O-P) ==========
  // Find row where column O contains "Referral Source"
  const sourceHeaderRow = findRowWithText(rows, COL_O, 'Referral Source');
  let referralSources: TableBlock = { headers: [], rows: [] };
  
  if (sourceHeaderRow >= 0) {
    const extracted = extractBlockRows(rows, sourceHeaderRow, COL_O, COL_P, false, 50);
    referralSources = { headers: extracted.headers, rows: extracted.dataRows };
  } else {
    warnings.push('Referral sources list not found (no "Referral Source" in column O)');
  }
  
  // ========== EXTRA BLOCKS ==========
  // Scan for known extra blocks like "Pain Management"
  const extraBlocks: ExtraBlock[] = [];
  const knownExtraBlockTitles = ['Pain Management', 'Specialty', 'Other Services'];
  
  for (const title of knownExtraBlockTitles) {
    // Search in columns I-P for the title
    for (let c = COL_I; c <= COL_P; c++) {
      const foundRow = findRowWithText(rows, c, title);
      if (foundRow >= 0) {
        // Check if this is actually a title (next row should be headers)
        const nextRowFirstCell = getCellStr(rows, foundRow + 1, c);
        if (nextRowFirstCell && !cellContains(nextRowFirstCell, title)) {
          // Found an extra block - extract it
          // Determine column range (assume 2-3 columns)
          const extracted = extractBlockRows(rows, foundRow + 1, c, Math.min(c + 2, COL_P), false, 20);
          if (extracted.dataRows.length >= 2) {
            extraBlocks.push({
              title,
              headers: extracted.headers,
              rows: extracted.dataRows,
            });
          }
        }
        break;
      }
    }
  }
  
  return {
    sheet_name: sheetName,
    period_key: periodKey,
    provider_table: providerTable,
    referral_totals: referralTotals,
    referral_sources: referralSources,
    extra_blocks: extraBlocks,
    warnings,
  };
}

/**
 * Detect if a workbook is a Lori workbook (multiple month sheets + Copy template)
 */
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

/**
 * Main function: Parse Lori's multi-month workbook
 */
export async function parseLoriWorkbook(file: File, fallbackYear: number = 2025): Promise<LoriParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const payloads: LoriMonthPayload[] = [];
        const skippedSheets: string[] = [];
        const errors: string[] = [];
        
        for (const sheetName of workbook.SheetNames) {
          // Skip template sheets
          if (shouldSkipSheet(sheetName)) {
            skippedSheets.push(`${sheetName} (template)`);
            continue;
          }
          
          const worksheet = workbook.Sheets[sheetName];
          
          try {
            const payload = parseMonthSheet(sheetName, worksheet, fallbackYear);
            
            if (payload) {
              payloads.push(payload);
            } else {
              skippedSheets.push(`${sheetName} (unrecognized month name)`);
            }
          } catch (err: any) {
            errors.push(`Error parsing sheet "${sheetName}": ${err.message}`);
          }
        }
        
        // Sort payloads by period_key
        payloads.sort((a, b) => a.period_key.localeCompare(b.period_key));
        
        resolve({ payloads, skippedSheets, errors });
      } catch (err: any) {
        reject(new Error(`Failed to parse workbook: ${err.message}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

/**
 * Parse a workbook from an already-loaded XLSX.WorkBook
 */
export function parseLoriWorkbookSync(workbook: XLSX.WorkBook, fallbackYear: number = 2025): LoriParseResult {
  const payloads: LoriMonthPayload[] = [];
  const skippedSheets: string[] = [];
  const errors: string[] = [];
  
  for (const sheetName of workbook.SheetNames) {
    if (shouldSkipSheet(sheetName)) {
      skippedSheets.push(`${sheetName} (template)`);
      continue;
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    try {
      const payload = parseMonthSheet(sheetName, worksheet, fallbackYear);
      
      if (payload) {
        payloads.push(payload);
      } else {
        skippedSheets.push(`${sheetName} (unrecognized month name)`);
      }
    } catch (err: any) {
      errors.push(`Error parsing sheet "${sheetName}": ${err.message}`);
    }
  }
  
  payloads.sort((a, b) => a.period_key.localeCompare(b.period_key));
  
  return { payloads, skippedSheets, errors };
}
