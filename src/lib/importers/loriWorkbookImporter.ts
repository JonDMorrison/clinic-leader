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

/** Row-level provenance for audit verification */
export interface RowProvenance {
  sheet_name: string;
  excel_row: number;    // 1-indexed Excel row
  start_col: number;    // 1-indexed column
  end_col: number;      // 1-indexed column
  raw_cells: any[];
}

export interface TableBlock {
  headers: string[];
  rows: any[][];
  /** Row provenance for audit - parallel array to rows */
  provenance?: RowProvenance[];
}

export interface ExtraBlock extends TableBlock {
  title: string;
}

/** Detailed block verification for audit */
export interface BlockVerification {
  header_cell: string;
  raw_range_a1: string;
  header_row_index_0: number;
  start_row_index_0: number;
  end_row_index_0: number;
  start_col_index_0: number;
  end_col_index_0: number;
  col_count: number;
  rows_in_range: number;
  rows_extracted: number;
  non_empty_row_count: number;
}

export interface ExtraBlockVerification extends BlockVerification {
  title: string;
  title_cell: string;
}

export interface SheetFingerprint {
  sheet_name: string;
  non_empty_cell_count: number;
  total_rows: number;
  total_cols: number;
}

/** Audit evidence fields for transparency */
export interface AuditEvidenceFields {
  // Provider block evidence
  meaningful_numeric_count_provider: number;
  provider_total_row_found: boolean;
  provider_total_row_numeric_cells: number;
  provider_subtotal_rows_found: number;
  provider_subtotal_numeric_cells: number;
  
  // Pain Management block evidence
  pain_mgmt_block_found: boolean;
  pain_mgmt_header_row_found: boolean;
  pain_mgmt_total_row_found: boolean;
  pain_mgmt_total_row_numeric_cells: number;
  pain_mgmt_headers_preview: string[];
  pain_mgmt_rows_count: number;
}

export interface LoriMonthPayload {
  sheet_name: string;
  period_key: string; // YYYY-MM
  provider_table: TableBlock;
  referral_totals: TableBlock;
  referral_sources: TableBlock;
  extra_blocks: ExtraBlock[];
  warnings: string[];
  // Verification data
  verification?: {
    // v1 (kept for backwards compatibility)
    provider_raw_range: string;
    provider_extracted: number;
    referral_totals_raw_range: string;
    referral_totals_extracted: number;
    referral_sources_raw_range: string;
    referral_sources_extracted: number;
    extra_blocks_counts: { title: string; extracted: number }[];

    // v2 (more explicit, used for audits)
    sheet_fingerprint: SheetFingerprint;
    provider?: BlockVerification;
    referral_totals?: BlockVerification;
    referral_sources?: BlockVerification;
    extra_blocks?: ExtraBlockVerification[];
    
    // v3 (numeric verification for data integrity)
    numeric_cell_count?: number;
    provider_numeric_count?: number;
    
    // v4 (month-level no-data detection)
    month_has_data?: boolean;
    meaningful_numeric_count?: number;
    has_nonzero_subtotal?: boolean;
    
    // v5 (audit evidence for NO_DATA/N/A classification transparency)
    audit_evidence?: AuditEvidenceFields;
  };
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

  // Strip common suffixes like "(Page 2)" and normalize separators like "Dec/Sept"
  // Examples:
  // - "Sept (Page 2)" -> "sept"
  // - "Oct (Page 3)" -> "oct"
  // - "Dec/Sept (Page 5)" -> "dec"
  const base = cleaned
    .replace(/\(.*\)/g, "")
    .split("/")[0]
    .trim();
  
  // Pattern: "Jan-26" or "Feb-2026"
  const withYearMatch = base.match(/^([a-z]+)[-\s]?(\d{2,4})$/);
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
  const fullMatch = base.match(/^([a-z]+)\s+(\d{4})$/);
  if (fullMatch) {
    const monthStr = fullMatch[1];
    const year = parseInt(fullMatch[2], 10);
    const month = MONTH_NAMES[monthStr];
    if (month) {
      return `${year}-${String(month).padStart(2, '0')}`;
    }
  }
  
  // Pattern: Just month name - "Sept", "Oct", etc.
  const month = MONTH_NAMES[base];
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
function normalizeText(val: any): string {
  return val == null ? '' : String(val).trim();
}

function normalizeTextLower(val: any): string {
  return normalizeText(val).toLowerCase();
}

function isBlankCell(val: any): boolean {
  return normalizeText(val) === '';
}

function cellEquals(val: any, expected: string): boolean {
  return normalizeTextLower(val) === expected.trim().toLowerCase();
}

function cellContains(val: any, expected: string): boolean {
  return normalizeTextLower(val).includes(expected.trim().toLowerCase());
}

function getMaxColCount(rows: any[][], fallback: number = 0): number {
  return rows.reduce((max, r) => Math.max(max, r?.length ?? 0), fallback);
}

/**
 * Check if a string contains a target (case-insensitive)
 */
/**
 * Consider which cells are "meaningful" for scoring duplicate sheets.
 * We intentionally down-weight template-ish values like 0 and #DIV/0!.
 */
function isMeaningfulCellForScoring(val: any): boolean {
  const t = normalizeText(val);
  if (t === '') return false;
  const lower = t.toLowerCase();
  if (lower === '#div/0!' || lower === '#ref!' || lower === '#value!' || lower === '#n/a') return false;

  // Treat pure zero-ish values as not meaningful (templates tend to be all zeros)
  if (lower === '0' || lower === '0.0' || lower === '$0.00' || lower === '$0') return false;
  if (typeof val === 'number' && val === 0) return false;

  return true;
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

/**
 * Index to column letter (0=A, 1=B, ..., 25=Z, 26=AA, ...)
 */
function colIndexToLetter(index: number): string {
  let result = '';
  let i = index;
  while (i >= 0) {
    result = String.fromCharCode((i % 26) + 65) + result;
    i = Math.floor(i / 26) - 1;
  }
  return result;
}

/**
 * Extract a cell's value with proper numeric handling
 * Priority: cell.v (raw value) when type is 'n' (number), otherwise parsed from cell.w (formatted)
 */
function extractCellValue(cell: XLSX.CellObject | undefined): any {
  if (!cell) return null;
  
  // For numeric cells, use the raw value directly
  if (cell.t === 'n') {
    return cell.v;
  }
  
  // For string cells that look like currency/percentages, try to parse
  if (cell.t === 's') {
    const strVal = String(cell.v ?? cell.w ?? '').trim();
    // Check for currency format: $1,234.56 or ($1,234.56) for negative
    const currencyMatch = strVal.match(/^\$?([\d,]+\.?\d*)$/);
    if (currencyMatch) {
      const num = parseFloat(currencyMatch[1].replace(/,/g, ''));
      if (!isNaN(num)) return num;
    }
    // Check for negative currency: ($1,234.56) or -$1,234.56
    const negCurrencyMatch = strVal.match(/^\(?\$?([\d,]+\.?\d*)\)?$/);
    if (negCurrencyMatch && strVal.startsWith('(')) {
      const num = parseFloat(negCurrencyMatch[1].replace(/,/g, ''));
      if (!isNaN(num)) return -num;
    }
    // Check for percentage: 45.5%
    const pctMatch = strVal.match(/^([\d.]+)%$/);
    if (pctMatch) {
      const num = parseFloat(pctMatch[1]);
      if (!isNaN(num)) return num; // Keep as percentage value, not decimal
    }
    return strVal || null;
  }
  
  // For boolean, error, etc. return formatted value
  if (cell.w !== undefined) return cell.w;
  if (cell.v !== undefined) return cell.v;
  return null;
}

/**
 * Build a full-fidelity grid from worksheet, preserving numeric values
 * This replaces sheet_to_json to ensure numbers are not lost
 */
interface SheetGrid {
  grid: any[][];
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  numericCellCount: number;
}

function getSheetGrid(ws: XLSX.WorkSheet): SheetGrid {
  const ref = ws['!ref'];
  if (!ref) {
    return { grid: [], startRow: 0, endRow: 0, startCol: 0, endCol: 0, numericCellCount: 0 };
  }
  
  const range = XLSX.utils.decode_range(ref);
  const startRow = range.s.r;
  const endRow = range.e.r;
  const startCol = range.s.c;
  const endCol = range.e.c;
  
  const rowCount = endRow - startRow + 1;
  const colCount = endCol - startCol + 1;
  
  // Initialize grid with nulls
  const grid: any[][] = Array.from({ length: rowCount }, () => Array(colCount).fill(null));
  
  let numericCellCount = 0;
  
  // Handle merged cells first - store the top-left value for all cells in merge
  const merges = ws['!merges'] || [];
  const mergeValueMap = new Map<string, any>();
  
  for (const merge of merges) {
    const topLeftAddr = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
    const topLeftCell = ws[topLeftAddr] as XLSX.CellObject | undefined;
    const value = extractCellValue(topLeftCell);
    
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        mergeValueMap.set(addr, value);
      }
    }
  }
  
  // Fill grid with cell values
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const gridR = r - startRow;
      const gridC = c - startCol;
      
      // Check if this cell is part of a merge
      if (mergeValueMap.has(addr)) {
        grid[gridR][gridC] = mergeValueMap.get(addr);
        continue;
      }
      
      const cell = ws[addr] as XLSX.CellObject | undefined;
      const value = extractCellValue(cell);
      grid[gridR][gridC] = value;
      
      if (cell?.t === 'n') {
        numericCellCount++;
      }
    }
  }
  
  // Dev-only diagnostic logging
  if (typeof window !== 'undefined' && (window as any).__LORI_IMPORTER_DEBUG__) {
    console.log('[LoriImporter] Grid extraction:', {
      ref,
      range: { startRow, endRow, startCol, endCol },
      rowCount,
      colCount,
      numericCellCount,
      sampleCells: getSampleCells(ws, startRow, startCol, 10),
    });
  }
  
  return { grid, startRow, endRow, startCol, endCol, numericCellCount };
}

/**
 * Get sample cells for debugging
 */
function getSampleCells(ws: XLSX.WorkSheet, startRow: number, startCol: number, count: number): any[] {
  const samples: any[] = [];
  const ref = ws['!ref'];
  if (!ref) return samples;
  
  const range = XLSX.utils.decode_range(ref);
  let collected = 0;
  
  for (let r = startRow; r <= range.e.r && collected < count; r++) {
    for (let c = startCol; c <= range.e.c && collected < count; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr] as XLSX.CellObject | undefined;
      if (cell && cell.t === 'n') {
        samples.push({
          address: addr,
          type: cell.t,
          value: cell.v,
          formatted: cell.w,
        });
        collected++;
      }
    }
  }
  return samples;
}

type CellPos = { r: number; c: number };

function findCell(
  rows: any[][],
  predicate: (value: any) => boolean,
  opts?: { maxRows?: number; maxCols?: number }
): CellPos | null {
  const maxRows = Math.min(rows.length, opts?.maxRows ?? rows.length);
  const maxCols = Math.min(getMaxColCount(rows), opts?.maxCols ?? getMaxColCount(rows));

  for (let r = 0; r < maxRows; r++) {
    for (let c = 0; c < maxCols; c++) {
      if (predicate(getCell(rows, r, c))) {
        return { r, c };
      }
    }
  }
  return null;
}

// Known table boundary keywords - if we encounter these in the header row,
// they indicate the start of a different table section
const TABLE_BOUNDARY_KEYWORDS = ['referrals', 'referral source', 'referral totals', 'pain management'];

function detectSpan(
  rows: any[][],
  headerRowIdx: number,
  startColIdx: number,
  opts?: { maxCols?: number; excludeKeywords?: string[] }
): { startCol: number; endCol: number } {
  const maxCols = opts?.maxCols ?? getMaxColCount(rows);
  let endCol = Math.max(startColIdx, maxCols - 1);
  const excludeKeywords = opts?.excludeKeywords ?? TABLE_BOUNDARY_KEYWORDS;

  let consecutiveBlankHeaders = 0;
  for (let c = startColIdx; c < maxCols; c++) {
    const headerVal = getCell(rows, headerRowIdx, c);
    const headerText = normalizeTextLower(headerVal);
    
    // Stop if we hit another table's header keyword (but not for the first column)
    if (c > startColIdx && excludeKeywords.some(kw => headerText.includes(kw))) {
      // Found a boundary keyword - end at the column before this one
      // But account for any blank columns between tables
      let boundaryCol = c - 1;
      while (boundaryCol > startColIdx && isBlankCell(getCell(rows, headerRowIdx, boundaryCol))) {
        boundaryCol--;
      }
      endCol = Math.max(startColIdx, boundaryCol);
      break;
    }
    
    if (isBlankCell(headerVal)) {
      consecutiveBlankHeaders++;
      if (consecutiveBlankHeaders >= 2) {
        endCol = Math.max(startColIdx, c - 2);
        break;
      }
    } else {
      consecutiveBlankHeaders = 0;
      endCol = c;
    }
  }

  return { startCol: startColIdx, endCol };
}

function isRowBlankAcrossSpan(rows: any[][], rowIdx: number, startCol: number, endCol: number): boolean {
  for (let c = startCol; c <= endCol; c++) {
    if (!isBlankCell(getCell(rows, rowIdx, c))) return false;
  }
  return true;
}

interface ExtractedTable {
  headers: string[];
  dataRows: any[][];
  provenance: RowProvenance[];
  headerRowIdx: number;
  startCol: number;
  endCol: number;
  colCount: number;
  startRow: number;
  endRow: number;
  headerCellA1: string;
  rawRangeA1: string;
  nonEmptyRowCount: number;
}

function extractTableFromHeader(
  rows: any[][],
  headerPos: CellPos,
  headerLabel: string,
  sheetName: string,
  opts?: { maxScanRows?: number }
): ExtractedTable {
  const maxScanRows = opts?.maxScanRows ?? rows.length;
  const headerRowIdx = headerPos.r;
  const { startCol, endCol } = detectSpan(rows, headerRowIdx, headerPos.c);
  const colCount = endCol - startCol + 1;

  const headers: string[] = [];
  for (let c = startCol; c <= endCol; c++) {
    headers.push(normalizeText(getCell(rows, headerRowIdx, c)));
  }

  const dataRows: any[][] = [];
  const provenance: RowProvenance[] = [];
  const blankBuffer: { row: any[]; prov: RowProvenance }[] = [];
  const STOP_AFTER = 3;
  let endRow = headerRowIdx;
  let nonEmptyRowCount = 0;

  const maxRow = Math.min(rows.length, headerRowIdx + 1 + maxScanRows);
  for (let r = headerRowIdx + 1; r < maxRow; r++) {
    const rowIsBlank = isRowBlankAcrossSpan(rows, r, startCol, endCol);
    const rawCells: any[] = [];
    for (let c = startCol; c <= endCol; c++) {
      rawCells.push(getCell(rows, r, c));
    }

    const prov: RowProvenance = {
      sheet_name: sheetName,
      excel_row: r + 1,
      start_col: startCol + 1,
      end_col: endCol + 1,
      raw_cells: rawCells,
    };

    if (rowIsBlank) {
      blankBuffer.push({ row: new Array(colCount).fill(null), prov });
      if (blankBuffer.length >= STOP_AFTER) break;
      continue;
    }

    if (blankBuffer.length > 0) {
      for (const buf of blankBuffer) {
        dataRows.push(buf.row);
        provenance.push(buf.prov);
      }
      blankBuffer.length = 0;
    }

    dataRows.push(rawCells);
    provenance.push(prov);
    nonEmptyRowCount++;
    endRow = r;
  }

  const headerCellA1 = XLSX.utils.encode_cell({ r: headerRowIdx, c: headerPos.c });
  const rawRangeA1 = XLSX.utils.encode_range({
    s: { r: headerRowIdx, c: startCol },
    e: { r: Math.max(headerRowIdx, endRow), c: endCol },
  });

  return {
    headers,
    dataRows,
    provenance,
    headerRowIdx,
    startCol,
    endCol,
    colCount,
    startRow: headerRowIdx + 1,
    endRow,
    headerCellA1,
    rawRangeA1,
    nonEmptyRowCount,
  };
}

/**
 * Split a table at the first "Total" row - works with any[][] + parallel provenance
 */
function splitTableAtTotal(
  headers: string[],
  dataRows: any[][],
  provenance: RowProvenance[],
  splitBlockTitle: string
): { 
  mainRows: any[][]; 
  mainProvenance: RowProvenance[];
  splitBlock: { title: string; headers: string[]; rows: any[][]; provenance: RowProvenance[] } | null;
} {
  // Find the first "Total" row (case-insensitive, must be in first column)
  let totalRowIdx = -1;
  for (let i = 0; i < dataRows.length; i++) {
    const firstCell = normalizeTextLower(dataRows[i]?.[0]);
    if (firstCell === 'total' || firstCell === 'totals') {
      totalRowIdx = i;
      break;
    }
  }
  
  // If no Total row found, or it's at the end, no split needed
  if (totalRowIdx === -1 || totalRowIdx >= dataRows.length - 1) {
    return { mainRows: dataRows, mainProvenance: provenance, splitBlock: null };
  }
  
  // Main rows include everything up to and including Total
  const mainRows = dataRows.slice(0, totalRowIdx + 1);
  const mainProvenance = provenance.slice(0, totalRowIdx + 1);
  
  // Split rows are everything after Total (skip leading blank rows)
  let splitStartIdx = totalRowIdx + 1;
  while (splitStartIdx < dataRows.length) {
    const row = dataRows[splitStartIdx];
    const hasContent = row?.some(cell => !isBlankCell(cell));
    if (hasContent) break;
    splitStartIdx++;
  }
  
  const splitRows = dataRows.slice(splitStartIdx);
  const splitProvenance = provenance.slice(splitStartIdx);
  
  // Only create split block if there are meaningful rows
  const nonEmptySplitRows = splitRows.filter(row => row?.some(cell => !isBlankCell(cell)));
  if (nonEmptySplitRows.length < 2) {
    return { mainRows: dataRows, mainProvenance: provenance, splitBlock: null };
  }
  
  return {
    mainRows,
    mainProvenance,
    splitBlock: {
      title: splitBlockTitle,
      headers: headers,
      rows: splitRows,
      provenance: splitProvenance,
    },
  };
}

/**
 * Compute audit evidence fields for transparency in NO_DATA and NOT_APPLICABLE classification
 */
function computeAuditEvidence(providerTable: TableBlock, extraBlocks: ExtraBlock[]): AuditEvidenceFields {
  // Provider table evidence
  let meaningfulNumericCountProvider = 0;
  let providerTotalRowFound = false;
  let providerTotalRowNumericCells = 0;
  let providerSubtotalRowsFound = 0;
  let providerSubtotalNumericCells = 0;
  
  for (const row of providerTable.rows || []) {
    const label = normalizeTextLower(row?.[0]);
    const isGrandTotal = label === 'total' || label === 'totals' || /^total patient/i.test(String(row?.[0] || ''));
    const isSubtotal = !isGrandTotal && (
      label.includes('patient total') ||
      label.includes('therapist patient total') ||
      (label.endsWith('total') && (label.includes('chiro') || label.includes('mid level') || label.includes('massage')))
    );
    
    let rowNumericCount = 0;
    for (let i = 1; i < (row?.length || 0); i++) {
      const cell = row[i];
      if (typeof cell === 'number' && !isNaN(cell)) {
        rowNumericCount++;
        if (cell !== 0) meaningfulNumericCountProvider++;
      }
    }
    
    if (isGrandTotal && rowNumericCount >= 3) {
      providerTotalRowFound = true;
      providerTotalRowNumericCells = rowNumericCount;
    }
    
    if (isSubtotal && rowNumericCount >= 3) {
      providerSubtotalRowsFound++;
      providerSubtotalNumericCells += rowNumericCount;
    }
  }
  
  // Pain Management block evidence
  let painMgmtBlockFound = false;
  let painMgmtHeaderRowFound = false;
  let painMgmtTotalRowFound = false;
  let painMgmtTotalRowNumericCells = 0;
  let painMgmtHeadersPreview: string[] = [];
  let painMgmtRowsCount = 0;
  
  for (const block of extraBlocks) {
    const title = normalizeTextLower(block.title || '');
    if (title.includes('pain management') || title.includes('pain mgmt')) {
      painMgmtBlockFound = true;
      painMgmtHeaderRowFound = (block.headers?.length || 0) >= 2;
      painMgmtRowsCount = block.rows?.length || 0;
      painMgmtHeadersPreview = (block.headers || []).slice(0, 5).map(h => normalizeText(h));
      
      // Find total row
      for (const row of block.rows || []) {
        const label = normalizeTextLower(row?.[0]);
        if (label === 'total' || label === 'totals' || label.includes('total')) {
          painMgmtTotalRowFound = true;
          for (let i = 1; i < (row?.length || 0); i++) {
            const cell = row[i];
            if (typeof cell === 'number' && !isNaN(cell)) {
              painMgmtTotalRowNumericCells++;
            }
          }
          break;
        }
      }
      break; // Only process first matching block
    }
  }
  
  return {
    meaningful_numeric_count_provider: meaningfulNumericCountProvider,
    provider_total_row_found: providerTotalRowFound,
    provider_total_row_numeric_cells: providerTotalRowNumericCells,
    provider_subtotal_rows_found: providerSubtotalRowsFound,
    provider_subtotal_numeric_cells: providerSubtotalNumericCells,
    pain_mgmt_block_found: painMgmtBlockFound,
    pain_mgmt_header_row_found: painMgmtHeaderRowFound,
    pain_mgmt_total_row_found: painMgmtTotalRowFound,
    pain_mgmt_total_row_numeric_cells: painMgmtTotalRowNumericCells,
    pain_mgmt_headers_preview: painMgmtHeadersPreview,
    pain_mgmt_rows_count: painMgmtRowsCount,
  };
}

/**
 * REMOVED: isSectionHeaderRow
 * We now include ALL rows including category headers like "Chiro", "Mid Levels"
 */

/**
 * Parse a single month sheet - PRESERVE ALL ROWS using full-fidelity grid extraction
 */
function parseMonthSheet(sheetName: string, worksheet: XLSX.WorkSheet, fallbackYear: number): LoriMonthPayload | null {
  const periodKey = parseSheetNameToPeriodKey(sheetName, fallbackYear);
  if (!periodKey) {
    return null;
  }
  
  // Use full-fidelity grid extraction instead of sheet_to_json
  // This preserves numeric values that would otherwise be lost
  const sheetGrid = getSheetGrid(worksheet);
  const rows = sheetGrid.grid;
  
  // Dev-only diagnostic logging
  if (typeof window !== 'undefined' && (window as any).__LORI_IMPORTER_DEBUG__) {
    console.log(`[LoriImporter] Sheet "${sheetName}" (${periodKey}):`, {
      worksheetRef: worksheet['!ref'],
      gridSize: `${rows.length} rows x ${rows[0]?.length ?? 0} cols`,
      numericCellCount: sheetGrid.numericCellCount,
      providerTablePreview: rows.slice(0, 5).map((r, i) => ({ row: i, data: r?.slice(0, 8) })),
    });
  }
  
  // Compute sheet fingerprint for duplicate detection
  const maxCols = getMaxColCount(rows);
  let nonEmptyCellCount = 0;
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < (rows[r]?.length ?? 0); c++) {
      if (!isBlankCell(getCell(rows, r, c))) nonEmptyCellCount++;
    }
  }
  
  const sheetFingerprint: SheetFingerprint = {
    sheet_name: sheetName,
    non_empty_cell_count: nonEmptyCellCount,
    total_rows: rows.length,
    total_cols: maxCols,
  };
  
  const warnings: string[] = [];
  const verification: LoriMonthPayload['verification'] = {
    sheet_fingerprint: sheetFingerprint,
    provider_raw_range: '',
    provider_extracted: 0,
    referral_totals_raw_range: '',
    referral_totals_extracted: 0,
    referral_sources_raw_range: '',
    referral_sources_extracted: 0,
    extra_blocks_counts: [],
    extra_blocks: [],
    // New v3 verification fields
    numeric_cell_count: sheetGrid.numericCellCount,
    provider_numeric_count: 0,
  };
  
  // ========== PROVIDER TABLE (dynamic) ==========
  // Find header cell equal to "Provider Name" (case/trim-insensitive) anywhere on sheet
  const providerHeaderCell = findCell(rows, (v) => cellEquals(v, 'Provider Name'));
  let providerTable: TableBlock = { headers: [], rows: [] };
  
  if (providerHeaderCell) {
    const extracted = extractTableFromHeader(rows, providerHeaderCell, 'Provider Name', sheetName, { maxScanRows: 500 });
    providerTable = { headers: extracted.headers, rows: extracted.dataRows, provenance: extracted.provenance };
    verification.provider_raw_range = extracted.rawRangeA1;
    verification.provider_extracted = extracted.dataRows.length;
    verification.provider = {
      header_cell: extracted.headerCellA1,
      raw_range_a1: extracted.rawRangeA1,
      header_row_index_0: extracted.headerRowIdx,
      start_row_index_0: extracted.startRow,
      end_row_index_0: extracted.endRow,
      start_col_index_0: extracted.startCol,
      end_col_index_0: extracted.endCol,
      col_count: extracted.colCount,
      rows_in_range: Math.max(0, extracted.endRow - extracted.headerRowIdx),
      rows_extracted: extracted.dataRows.length,
      non_empty_row_count: extracted.nonEmptyRowCount,
    };
    if (verification.provider.rows_in_range !== verification.provider.rows_extracted) {
      warnings.push(`Provider table row mismatch: range=${verification.provider.rows_in_range}, extracted=${verification.provider.rows_extracted}`);
    }
    
    // Count numeric cells in provider table for verification
    let providerNumericCount = 0;
    for (const row of extracted.dataRows) {
      for (const cell of row) {
        if (typeof cell === 'number' && !isNaN(cell)) {
          providerNumericCount++;
        }
      }
    }
    verification.provider_numeric_count = providerNumericCount;
    
    // Dev-only diagnostic: log provider table data
    if (typeof window !== 'undefined' && (window as any).__LORI_IMPORTER_DEBUG__) {
      // Find total/subtotal rows
      const totalRows = extracted.dataRows.filter((row, idx) => {
        const label = normalizeTextLower(row?.[0]);
        return label.includes('total');
      });
      console.log(`[LoriImporter] Provider table "${sheetName}":`, {
        headers: extracted.headers,
        rowCount: extracted.dataRows.length,
        numericCellCount: providerNumericCount,
        totalRows: totalRows.map(r => ({ label: r?.[0], data: r })),
        first5Rows: extracted.dataRows.slice(0, 5),
        last5Rows: extracted.dataRows.slice(-5),
      });
    }
    
    // Critical warning if no numeric cells found
    if (providerNumericCount === 0) {
      warnings.push('CRITICAL: Provider table has zero numeric cells - data extraction may have failed');
    }
  } else {
    warnings.push('Provider table not found (no "Provider Name" cell found)');
  }
  
  // ========== REFERRAL TOTALS (dynamic) ==========
  // Find header cell containing "Referrals" anywhere on sheet
  const referralsHeaderCell = findCell(rows, (v) => cellContains(v, 'Referrals'));
  let referralTotals: TableBlock = { headers: [], rows: [] };
  let revenueByInsurance: ExtraBlock | null = null;
  
  if (referralsHeaderCell) {
    const extracted = extractTableFromHeader(rows, referralsHeaderCell, 'Referrals', sheetName, { maxScanRows: 200 });
    
    // Split the table at "Total" row - everything after is "Revenue by Insurance"
    const { mainRows, mainProvenance, splitBlock } = splitTableAtTotal(
      extracted.headers, 
      extracted.dataRows,
      extracted.provenance,
      'Revenue by Insurance'
    );
    
    referralTotals = { headers: extracted.headers, rows: mainRows, provenance: mainProvenance };
    if (splitBlock) {
      revenueByInsurance = { title: splitBlock.title, headers: splitBlock.headers, rows: splitBlock.rows };
    }
    
    verification.referral_totals_raw_range = extracted.rawRangeA1;
    verification.referral_totals_extracted = mainRows.length;
    verification.referral_totals = {
      header_cell: extracted.headerCellA1,
      raw_range_a1: extracted.rawRangeA1,
      header_row_index_0: extracted.headerRowIdx,
      start_row_index_0: extracted.startRow,
      end_row_index_0: extracted.endRow,
      start_col_index_0: extracted.startCol,
      end_col_index_0: extracted.endCol,
      col_count: extracted.colCount,
      rows_in_range: Math.max(0, extracted.endRow - extracted.headerRowIdx),
      rows_extracted: mainRows.length,
      non_empty_row_count: extracted.nonEmptyRowCount,
    };
  } else {
    warnings.push('Referral totals block not found (no cell containing "Referrals" found)');
  }
  
  // ========== REFERRAL SOURCES (dynamic) ==========
  // Find header cell containing "Referral Source" anywhere on sheet
  const referralSourcesHeaderCell = findCell(rows, (v) => cellContains(v, 'Referral Source'));
  let referralSources: TableBlock = { headers: [], rows: [] };
  
  if (referralSourcesHeaderCell) {
    const extracted = extractTableFromHeader(rows, referralSourcesHeaderCell, 'Referral Source', sheetName, { maxScanRows: 500 });
    referralSources = { headers: extracted.headers, rows: extracted.dataRows, provenance: extracted.provenance };
    verification.referral_sources_raw_range = extracted.rawRangeA1;
    verification.referral_sources_extracted = extracted.dataRows.length;
    verification.referral_sources = {
      header_cell: extracted.headerCellA1,
      raw_range_a1: extracted.rawRangeA1,
      header_row_index_0: extracted.headerRowIdx,
      start_row_index_0: extracted.startRow,
      end_row_index_0: extracted.endRow,
      start_col_index_0: extracted.startCol,
      end_col_index_0: extracted.endCol,
      col_count: extracted.colCount,
      rows_in_range: Math.max(0, extracted.endRow - extracted.headerRowIdx),
      rows_extracted: extracted.dataRows.length,
      non_empty_row_count: extracted.nonEmptyRowCount,
    };
    if (verification.referral_sources.rows_in_range !== verification.referral_sources.rows_extracted) {
      warnings.push(`Referral sources row mismatch: range=${verification.referral_sources.rows_in_range}, extracted=${verification.referral_sources.rows_extracted}`);
    }
  } else {
    warnings.push('Referral sources list not found (no cell containing "Referral Source" found)');
  }
  
  // ========== EXTRA BLOCKS (dynamic) ==========
  const extraBlocks: ExtraBlock[] = [];
  const extraBlockFingerprints = new Set<string>(); // For deduplication

  const mainHeaderRows = new Set<number>([
    verification.provider?.header_row_index_0,
    verification.referral_totals?.header_row_index_0,
    verification.referral_sources?.header_row_index_0,
  ].filter((v): v is number => typeof v === 'number'));

  // Only recognize known extra block titles - stricter matching
  const knownTitles = ['Pain Management'];
  // maxCols already computed above for sheet_fingerprint

  const isTitleCandidate = (val: any, rowIdx: number): boolean => {
    const text = normalizeText(val);
    if (!text) return false;
    if (text.length > 50) return false;
    const lower = text.toLowerCase();
    
    // Exclude common false positives - these are NOT extra block titles
    if (lower.includes('provider name')) return false;
    if (lower.includes('referral source')) return false;
    if (lower.includes('referrals')) return false;
    if (lower === 'total' || lower === 'totals') return false;
    if (lower.includes('massage therapist')) return false;
    if (lower.includes('northwest injury')) return false;
    if (lower.includes('sears injury')) return false;
    if (lower.includes('injury law')) return false;
    if (lower.includes('law')) return false; // Law firms are referral sources, not blocks
    if (lower.includes('accident help')) return false;
    
    // Must look like a section title (letters/spaces mostly)
    const letters = text.replace(/[^a-zA-Z]/g, '');
    if (letters.length < 8) return false; // Require longer names

    // Titles usually live on mostly-empty rows
    const row = rows[rowIdx] || [];
    const nonBlankCount = row.filter((cell) => !isBlankCell(cell)).length;
    return nonBlankCount <= 2;
  };

  const findHeaderRowBelow = (titleRow: number, startCol: number): number | null => {
    for (let r = titleRow + 1; r <= Math.min(titleRow + 6, rows.length - 1); r++) {
      if (mainHeaderRows.has(r)) continue;
      // A header row should have at least 2 non-empty cells across the next ~12 columns
      let nonBlank = 0;
      for (let c = startCol; c < Math.min(maxCols, startCol + 20); c++) {
        if (!isBlankCell(getCell(rows, r, c))) nonBlank++;
      }
      if (nonBlank >= 2) return r;
    }
    return null;
  };

  // Generate fingerprint for deduplication
  const generateBlockFingerprint = (title: string, headers: string[], rows: any[][]): string => {
    const headerPart = headers.slice(0, 3).join('|');
    const row0 = rows[0] ? rows[0].slice(0, 3).map(v => normalizeText(v)).join(',') : '';
    const row1 = rows[1] ? rows[1].slice(0, 3).map(v => normalizeText(v)).join(',') : '';
    return `${title}::${headerPart}::${row0}::${row1}`;
  };

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < maxCols; c++) {
      const cellVal = getCell(rows, r, c);
      const text = normalizeText(cellVal);
      if (!text) continue;

      const isKnown = knownTitles.some((t) => cellEquals(text, t));
      if (!isKnown && !isTitleCandidate(cellVal, r)) continue;

      const headerRow = findHeaderRowBelow(r, c);
      if (headerRow == null) continue;

      const extracted = extractTableFromHeader(rows, { r: headerRow, c }, `extra:${text}`, sheetName, { maxScanRows: 200 });
      
      // Minimum requirements: at least 2 columns AND at least 2 non-empty data rows
      if (extracted.colCount < 2 || extracted.nonEmptyRowCount < 2) continue;
      if (extracted.dataRows.length === 0) continue;

      // Deduplication check
      const fingerprint = generateBlockFingerprint(text, extracted.headers, extracted.dataRows);
      if (extraBlockFingerprints.has(fingerprint)) continue;
      extraBlockFingerprints.add(fingerprint);

      const titleCellA1 = XLSX.utils.encode_cell({ r, c });
      extraBlocks.push({
        title: text,
        headers: extracted.headers,
        rows: extracted.dataRows,
      });

      verification.extra_blocks_counts.push({ title: text, extracted: extracted.dataRows.length });
      verification.extra_blocks!.push({
        title: text,
        title_cell: titleCellA1,
        header_cell: extracted.headerCellA1,
        raw_range_a1: extracted.rawRangeA1,
        header_row_index_0: extracted.headerRowIdx,
        start_row_index_0: extracted.startRow,
        end_row_index_0: extracted.endRow,
        start_col_index_0: extracted.startCol,
        end_col_index_0: extracted.endCol,
        col_count: extracted.colCount,
        rows_in_range: Math.max(0, extracted.endRow - extracted.headerRowIdx),
        rows_extracted: extracted.dataRows.length,
        non_empty_row_count: extracted.nonEmptyRowCount,
      });
    }
  }
  
  // Add Revenue by Insurance block if it was split from Referral Totals
  if (revenueByInsurance) {
    extraBlocks.unshift(revenueByInsurance); // Add at the beginning so it appears first
  }

  // ========== COMPUTE AUDIT EVIDENCE ==========
  // These fields provide transparency for NO_DATA and NOT_APPLICABLE classification
  const auditEvidence = computeAuditEvidence(providerTable, extraBlocks);
  verification.audit_evidence = auditEvidence;
  
  // Compute month_has_data based on evidence
  const meaningfulCount = auditEvidence.meaningful_numeric_count_provider;
  const hasNonZeroTotal = auditEvidence.provider_total_row_found && auditEvidence.provider_total_row_numeric_cells >= 3;
  const hasNonZeroSubtotals = auditEvidence.provider_subtotal_rows_found > 0 && auditEvidence.provider_subtotal_numeric_cells >= 3;
  verification.month_has_data = meaningfulCount >= 5 || hasNonZeroTotal || hasNonZeroSubtotals;
  verification.meaningful_numeric_count = meaningfulCount;
  verification.has_nonzero_subtotal = hasNonZeroSubtotals || hasNonZeroTotal;

  return {
    sheet_name: sheetName,
    period_key: periodKey,
    provider_table: providerTable,
    referral_totals: referralTotals,
    referral_sources: referralSources,
    extra_blocks: extraBlocks,
    warnings,
    verification,
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
  const candidatesByPeriod = new Map<string, { payload: LoriMonthPayload; sheetScore: number }[]>();
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
        // Score sheet based on provider block "meaningful" cell count
        let providerScore = 0;
        for (const provRow of payload.provider_table.rows) {
          for (const cell of (provRow || [])) {
            if (isMeaningfulCellForScoring(cell)) providerScore++;
          }
        }

        const list = candidatesByPeriod.get(payload.period_key) ?? [];
        list.push({ payload, sheetScore: providerScore });
        candidatesByPeriod.set(payload.period_key, list);
      } else {
        skippedSheets.push(`${sheetName} (unrecognized month name)`);
      }
    } catch (err: any) {
      errors.push(`Error parsing sheet "${sheetName}": ${err.message}`);
    }
  }

  // Resolve duplicates: choose the best-scoring sheet per period_key
  const payloads: LoriMonthPayload[] = [];
  for (const [periodKey, candidates] of candidatesByPeriod.entries()) {
    const sorted = [...candidates].sort((a, b) => b.sheetScore - a.sheetScore);
    const chosen = sorted[0];
    payloads.push(chosen.payload);

    if (sorted.length > 1) {
      for (const other of sorted.slice(1)) {
        skippedSheets.push(
          `${other.payload.sheet_name} (duplicate period ${periodKey} — chosen ${chosen.payload.sheet_name} score=${chosen.sheetScore} over score=${other.sheetScore})`
        );
      }
    }
  }

  payloads.sort((a, b) => a.period_key.localeCompare(b.period_key));

  return { payloads, skippedSheets, errors };
}
