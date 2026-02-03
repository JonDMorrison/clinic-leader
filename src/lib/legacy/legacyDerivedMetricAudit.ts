/**
 * Legacy Derived Metric Audit
 * 
 * Verifies extracted derived metrics against workbook reference values using provenance.
 * Produces PASS/FAIL/UNVERIFIABLE results for each metric with cell-level evidence.
 * 
 * VERIFIABLE metrics have deterministic cell references in the workbook.
 * UNVERIFIABLE metrics are computed/derived and shown as informational only.
 * 
 * @see docs/audits/legacy_metric_truth_map.md for truth reference definitions
 */

import type { LegacyMonthPayload, TableBlock, RowProvenance } from "@/components/data/LegacyMonthlyReportView";
import { LEGACY_METRIC_MAPPINGS, extractMetricsFromPayload, type LegacyMetricMapping } from "./legacyMetricMapping";

export type AuditStatus = "PASS" | "FAIL" | "FAIL_EXTRACTION" | "NO_DATA" | "NOT_APPLICABLE" | "NEEDS_DEFINITION" | "UNVERIFIABLE";

export interface AuditEvidence {
  source_block: string;
  sheet_name: string | null;
  excel_row: number | null;
  start_col: number | null;
  end_col: number | null;
  row_label: string | null;
  column_name: string | null;
  column_index: number | null;
  raw_cells: any[] | null;
  computation: string;
}

/** Pain Management title scan hit (imported from loriWorkbookImporter) */
export interface PainMgmtTitleScanHit {
  row_1: number;
  col_0: number;
  value: string;
  cell_a1: string;
}

/** Classification inputs for transparency */
export interface ClassificationInputs {
  // Provider block evidence
  meaningful_numeric_count_provider: number;
  provider_total_row_found: boolean;
  provider_total_row_numeric_cells: number;
  provider_subtotal_rows_found: number;
  provider_subtotal_numeric_cells: number;
  
  // Pain Management block evidence (for pain metrics)
  pain_mgmt_block_found: boolean;
  pain_mgmt_header_row_found: boolean;
  pain_mgmt_total_row_found: boolean;
  pain_mgmt_total_row_numeric_cells: number;
  pain_mgmt_headers_preview: string[];
  pain_mgmt_rows_count: number;
  
  // Pain Management title scan (for extraction failure detection)
  pain_mgmt_title_scan_hits: PainMgmtTitleScanHit[];
  
  // Month-level flags
  month_has_data: boolean;
}

export interface MetricAuditResult {
  metric_key: string;
  display_name: string;
  extracted_value: number | null;
  workbook_reference_value: number | null;
  delta: number | null;
  status: AuditStatus;
  is_verifiable: boolean;
  /** True if workbook has a truth anchor we can compare against */
  has_reference: boolean;
  /** True if extractor returned a valid numeric value */
  has_extracted: boolean;
  /** Whether this metric can block sync (only when has_reference=true AND status=FAIL) */
  blocks_sync: boolean;
  evidence: AuditEvidence | null;
  notes: string;
  /** Human-readable explanation of classification decision */
  classification_reason: string;
  /** Structured inputs used for classification decision */
  classification_inputs: ClassificationInputs;
}

export interface DerivedMetricAuditReport {
  period_key: string;
  sheet_name: string;
  audit_timestamp: string;
  total_metrics: number;
  passed: number;
  failed: number;
  unverifiable: number;
  verifiable_count: number;
  results: MetricAuditResult[];
}

/**
 * Metrics that have deterministic cell references (VERIFIABLE)
 * All others are computed/derived (UNVERIFIABLE)
 */
const VERIFIABLE_METRICS = new Set([
  'total_new_patients',
  'total_visits',
  'total_production',
  'total_charges',
  'pain_mgmt_new_patients',
  'pain_mgmt_total_visits',
]);

/**
 * Metrics that require a specific block to exist
 */
const BLOCK_REQUIRED_METRICS: Record<string, string> = {
  'pain_mgmt_new_patients': 'pain_management',
  'pain_mgmt_total_visits': 'pain_management',
};

/**
 * Check if a metric is verifiable
 */
export function isMetricVerifiable(metricKey: string): boolean {
  return VERIFIABLE_METRICS.has(metricKey);
}

/**
 * Check if a metric requires a specific block
 */
export function getRequiredBlock(metricKey: string): string | null {
  return BLOCK_REQUIRED_METRICS[metricKey] || null;
}

/**
 * Get list of verifiable metric keys
 */
export function getVerifiableMetricKeys(): string[] {
  return Array.from(VERIFIABLE_METRICS);
}

/**
 * Check if the Pain Management block exists in the payload
 */
export function hasPainManagementBlock(payload: LegacyMonthPayload): boolean {
  if (!payload.extra_blocks || payload.extra_blocks.length === 0) return false;
  
  for (const block of payload.extra_blocks) {
    const title = String((block as any).title || '').toLowerCase().trim();
    if (title.includes('pain management') || title.includes('pain mgmt')) {
      // Must have at least 2 data rows and a header row
      const rows = (block as any).rows || [];
      const headers = (block as any).headers || [];
      if (headers.length >= 2 && rows.length >= 2) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get Pain Management block details for classification inputs
 */
function getPainManagementDetails(payload: LegacyMonthPayload): {
  block_found: boolean;
  header_row_found: boolean;
  total_row_found: boolean;
  total_row_numeric_cells: number;
  headers_preview: string[];
  rows_count: number;
} {
  const defaultResult = {
    block_found: false,
    header_row_found: false,
    total_row_found: false,
    total_row_numeric_cells: 0,
    headers_preview: [],
    rows_count: 0,
  };
  
  if (!payload.extra_blocks || payload.extra_blocks.length === 0) return defaultResult;
  
  for (const block of payload.extra_blocks) {
    const title = String((block as any).title || '').toLowerCase().trim();
    if (title.includes('pain management') || title.includes('pain mgmt')) {
      const rows = (block as any).rows || [];
      const headers = (block as any).headers || [];
      
      // Find total row
      let totalRowFound = false;
      let totalRowNumericCells = 0;
      for (const row of rows) {
        const label = String(row?.[0] || '').toLowerCase().trim();
        if (label === 'total' || label === 'totals' || label.includes('total')) {
          totalRowFound = true;
          for (let i = 1; i < row.length; i++) {
            const val = parseNumeric(row[i]);
            if (val !== null) totalRowNumericCells++;
          }
          break;
        }
      }
      
      return {
        block_found: true,
        header_row_found: headers.length >= 2,
        total_row_found: totalRowFound,
        total_row_numeric_cells: totalRowNumericCells,
        headers_preview: headers.slice(0, 5).map((h: any) => String(h || '').trim()),
        rows_count: rows.length,
      };
    }
  }
  return defaultResult;
}

/**
 * Get Provider table details for classification inputs
 */
function getProviderDetails(payload: LegacyMonthPayload): {
  meaningful_numeric_count: number;
  total_row_found: boolean;
  total_row_numeric_cells: number;
  subtotal_rows_found: number;
  subtotal_numeric_cells: number;
} {
  const providerTable = payload.provider_table;
  if (!providerTable?.rows) {
    return {
      meaningful_numeric_count: 0,
      total_row_found: false,
      total_row_numeric_cells: 0,
      subtotal_rows_found: 0,
      subtotal_numeric_cells: 0,
    };
  }
  
  let meaningfulCount = 0;
  let totalRowFound = false;
  let totalRowNumericCells = 0;
  let subtotalRowsFound = 0;
  let subtotalNumericCells = 0;
  
  for (const row of providerTable.rows) {
    const label = String(row?.[0] || '').toLowerCase().trim();
    const isGrandTotal = label === 'total' || label === 'totals' || /^total patient/i.test(label);
    const isSubtotal = !isGrandTotal && (
      label.includes('patient total') ||
      label.includes('therapist patient total') ||
      (label.endsWith('total') && (label.includes('chiro') || label.includes('mid level') || label.includes('massage')))
    );
    
    let rowNumericCount = 0;
    for (let i = 1; i < (row?.length || 0); i++) {
      const val = parseNumeric(row[i]);
      if (val !== null) {
        rowNumericCount++;
        if (val !== 0) meaningfulCount++;
      }
    }
    
    if (isGrandTotal && rowNumericCount >= 3) {
      totalRowFound = true;
      totalRowNumericCells = rowNumericCount;
    }
    
    if (isSubtotal && rowNumericCount >= 3) {
      subtotalRowsFound++;
      subtotalNumericCells += rowNumericCount;
    }
  }
  
  return {
    meaningful_numeric_count: meaningfulCount,
    total_row_found: totalRowFound,
    total_row_numeric_cells: totalRowNumericCells,
    subtotal_rows_found: subtotalRowsFound,
    subtotal_numeric_cells: subtotalNumericCells,
  };
}

/**
 * Build classification inputs for a payload
 */
function buildClassificationInputs(payload: LegacyMonthPayload, monthHasDataFlag: boolean): ClassificationInputs {
  const providerDetails = getProviderDetails(payload);
  const painDetails = getPainManagementDetails(payload);
  
  // Get pain management title scan hits from audit evidence if available
  const auditEvidence = (payload.verification as any)?.audit_evidence;
  const painMgmtTitleScanHits: PainMgmtTitleScanHit[] = auditEvidence?.pain_mgmt_title_scan_hits || [];
  
  return {
    meaningful_numeric_count_provider: providerDetails.meaningful_numeric_count,
    provider_total_row_found: providerDetails.total_row_found,
    provider_total_row_numeric_cells: providerDetails.total_row_numeric_cells,
    provider_subtotal_rows_found: providerDetails.subtotal_rows_found,
    provider_subtotal_numeric_cells: providerDetails.subtotal_numeric_cells,
    pain_mgmt_block_found: painDetails.block_found,
    pain_mgmt_header_row_found: painDetails.header_row_found,
    pain_mgmt_total_row_found: painDetails.total_row_found,
    pain_mgmt_total_row_numeric_cells: painDetails.total_row_numeric_cells,
    pain_mgmt_headers_preview: painDetails.headers_preview,
    pain_mgmt_rows_count: painDetails.rows_count,
    pain_mgmt_title_scan_hits: painMgmtTitleScanHits,
    month_has_data: monthHasDataFlag,
  };
}

/**
 * Check if month has meaningful numeric data (not a template)
 * Returns false if the month appears to be a template/no-data month
 */
export function monthHasData(payload: LegacyMonthPayload): boolean {
  // Check verification metadata first (set by importer)
  const verification = payload.verification as any;
  if (verification?.month_has_data !== undefined) {
    return verification.month_has_data;
  }
  
  // Fallback: count meaningful numeric cells in provider_table
  const providerTable = payload.provider_table;
  if (!providerTable?.rows) return false;
  
  let meaningfulCount = 0;
  let hasNonZeroSubtotal = false;
  
  for (const row of providerTable.rows) {
    const label = String(row?.[0] || '').toLowerCase().trim();
    const isTotal = label.includes('total');
    
    for (let i = 1; i < (row?.length || 0); i++) {
      const val = parseNumeric(row[i]);
      if (val !== null && val !== 0) {
        meaningfulCount++;
        if (isTotal && val > 0) {
          hasNonZeroSubtotal = true;
        }
      }
    }
  }
  
  // Month has data if: at least 5 meaningful cells OR any subtotal row has non-zero values
  return meaningfulCount >= 5 || hasNonZeroSubtotal;
}

/**
 * Parse numeric value from cell (handles currency, percentages, commas)
 */
function parseNumeric(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const strVal = String(value)
    .replace(/[$,%]/g, '')
    .replace(/,/g, '')
    .replace(/\(([^)]+)\)/, '-$1')
    .trim();
  if (strVal === '' || strVal === '-') return null;
  const num = parseFloat(strVal);
  return isNaN(num) ? null : num;
}

/**
 * Count numeric cells in a row (excluding first column)
 */
function countNumericCells(row: any[]): number {
  let count = 0;
  for (let i = 1; i < row.length; i++) {
    const val = parseNumeric(row[i]);
    if (val !== null) count++;
  }
  return count;
}

/**
 * Check if a row label is a subtotal row (e.g. "Chiro Patient Total", "Mid Level Patient Total")
 */
function isSubtotalRow(label: string): boolean {
  const l = label.toLowerCase().trim();
  return (
    l.includes('patient total') ||
    l.includes('therapist patient total') ||
    (l.endsWith('total') && (l.includes('chiro') || l.includes('mid level') || l.includes('massage')))
  );
}

/**
 * Find all subtotal rows from a table with provenance
 */
function findSubtotalRows(table: TableBlock): Array<{
  row: any[];
  rowIdx: number;
  provenance: RowProvenance | null;
}> {
  if (!table?.rows) return [];
  
  const subtotals: Array<{ row: any[]; rowIdx: number; provenance: RowProvenance | null }> = [];
  for (let i = 0; i < table.rows.length; i++) {
    const label = String(table.rows[i]?.[0] || '').toLowerCase().trim();
    if (isSubtotalRow(label)) {
      subtotals.push({
        row: table.rows[i],
        rowIdx: i,
        provenance: table.provenance?.[i] || null,
      });
    }
  }
  return subtotals;
}

/**
 * Find Total row in a table block, returns row data and provenance
 * 
 * Only returns a row if it has numeric data. Otherwise returns null to signal
 * that subtotals should be summed.
 */
function findTotalRow(table: TableBlock): {
  row: any[] | null;
  rowIdx: number;
  provenance: RowProvenance | null;
} {
  if (!table?.rows) return { row: null, rowIdx: -1, provenance: null };
  
  // Strategy 1: Exact "Total" or "Totals" match WITH data
  for (let i = 0; i < table.rows.length; i++) {
    const label = String(table.rows[i]?.[0] || '').toLowerCase().trim();
    if (/^totals?$/i.test(label) && countNumericCells(table.rows[i]) >= 3) {
      return {
        row: table.rows[i],
        rowIdx: i,
        provenance: table.provenance?.[i] || null,
      };
    }
  }
  
  // Strategy 2: "Total Patient" pattern WITH data
  for (let i = 0; i < table.rows.length; i++) {
    const label = String(table.rows[i]?.[0] || '').toLowerCase().trim();
    if (/^total patient/i.test(label) && countNumericCells(table.rows[i]) >= 3) {
      return {
        row: table.rows[i],
        rowIdx: i,
        provenance: table.provenance?.[i] || null,
      };
    }
  }
  
  // No grand total with data found - return null to signal summing needed
  return { row: null, rowIdx: -1, provenance: null };
}

/**
 * Extract and sum a column value from subtotal rows when grand total is empty
 */
function sumSubtotalColumn(
  table: TableBlock,
  colIdx: number
): { sum: number | null; subtotalLabels: string[] } {
  const subtotals = findSubtotalRows(table);
  if (subtotals.length === 0) return { sum: null, subtotalLabels: [] };
  
  let sum = 0;
  let hasValue = false;
  const labels: string[] = [];
  
  for (const { row } of subtotals) {
    const val = parseNumeric(row[colIdx]);
    if (val !== null) {
      sum += val;
      hasValue = true;
      labels.push(String(row[0]));
    }
  }
  
  return { sum: hasValue ? sum : null, subtotalLabels: labels };
}

/**
 * Find a row by label match
 */
function findRowByLabelWithProvenance(
  table: TableBlock,
  labelMatch: RegExp
): {
  row: any[] | null;
  rowIdx: number;
  provenance: RowProvenance | null;
} {
  if (!table?.rows) return { row: null, rowIdx: -1, provenance: null };
  
  for (let i = 0; i < table.rows.length; i++) {
    const label = String(table.rows[i]?.[0] || '').toLowerCase().trim();
    if (labelMatch.test(label)) {
      return {
        row: table.rows[i],
        rowIdx: i,
        provenance: table.provenance?.[i] || null,
      };
    }
  }
  return { row: null, rowIdx: -1, provenance: null };
}

/**
 * Get column index by header name (case-insensitive partial match)
 */
function getColumnIndex(headers: string[], search: string): number {
  const searchLower = search.toLowerCase();
  return headers.findIndex(h => 
    String(h || '').toLowerCase().includes(searchLower)
  );
}

/**
 * Sum numeric values in a row (excluding first column which is usually label)
 */
function sumRowValues(row: any[]): { sum: number; hasValue: boolean } {
  let sum = 0;
  let hasValue = false;
  for (let i = 1; i < row.length; i++) {
    const val = parseNumeric(row[i]);
    if (val !== null) {
      sum += val;
      hasValue = true;
    }
  }
  return { sum, hasValue };
}

/**
 * Find extra block by title
 */
function findExtraBlockWithProvenance(
  payload: LegacyMonthPayload,
  titleMatch: string
): TableBlock | null {
  if (!payload.extra_blocks) return null;
  
  for (const block of payload.extra_blocks) {
    const title = String(block.title || '').toLowerCase().trim();
    if (title.includes(titleMatch.toLowerCase())) {
      return block as TableBlock;
    }
  }
  return null;
}

/**
 * Audit a single metric by extracting workbook reference value with provenance
 * 
 * Decision Tree:
 * 1. If month has NO_DATA → status = NO_DATA (never blocks)
 * 2. If metric requires a block that doesn't exist → status = NOT_APPLICABLE (never blocks)
 * 3. If block exists but no truth anchor defined → status = NEEDS_DEFINITION (never blocks)
 * 4. If truth anchor exists → PASS or FAIL (FAIL blocks sync)
 */
function auditMetric(
  mapping: LegacyMetricMapping,
  payload: LegacyMonthPayload,
  extractedValue: number | null,
  monthHasDataFlag: boolean,
  classificationInputs: ClassificationInputs
): MetricAuditResult {
  const metric_key = mapping.metric_key;
  const isVerifiable = isMetricVerifiable(metric_key);
  
  // For UNVERIFIABLE metrics, return immediately without verification attempt
  if (!isVerifiable) {
    return {
      metric_key,
      display_name: mapping.display_name,
      extracted_value: extractedValue,
      workbook_reference_value: null,
      delta: null,
      status: "UNVERIFIABLE",
      is_verifiable: false,
      has_reference: false,
      has_extracted: extractedValue !== null && extractedValue !== undefined && !isNaN(extractedValue),
      blocks_sync: false,
      evidence: {
        source_block: mapping.notes.split(',')[0] || 'derived',
        sheet_name: payload.sheet_name,
        excel_row: null,
        start_col: null,
        end_col: null,
        row_label: null,
        column_name: null,
        column_index: null,
        raw_cells: null,
        computation: 'Computed value - no single cell reference',
      },
      notes: mapping.notes,
      classification_reason: 'UNVERIFIABLE: Computed/derived metric with no deterministic cell reference.',
      classification_inputs: classificationInputs,
    };
  }

  // ========== DECISION 1: Check if month has data ==========
  if (!monthHasDataFlag) {
    const reason = `NO_DATA: meaningful_numeric_count_provider=${classificationInputs.meaningful_numeric_count_provider}, ` +
      `provider_total_row_found=${classificationInputs.provider_total_row_found}, ` +
      `provider_subtotal_rows_found=${classificationInputs.provider_subtotal_rows_found}. ` +
      `Month appears to be a template or future month with insufficient numeric data.`;
    
    return {
      metric_key,
      display_name: mapping.display_name,
      extracted_value: null,
      workbook_reference_value: null,
      delta: null,
      status: "NO_DATA",
      is_verifiable: true,
      has_reference: false,
      has_extracted: false,
      blocks_sync: false,
      evidence: {
        source_block: 'N/A',
        sheet_name: payload.sheet_name,
        excel_row: null,
        start_col: null,
        end_col: null,
        row_label: null,
        column_name: null,
        column_index: null,
        raw_cells: null,
        computation: 'Month marked as no-data/template; skipping verification.',
      },
      notes: 'Month has no meaningful numeric data (template or future month). Does not block sync.',
      classification_reason: reason,
      classification_inputs: classificationInputs,
    };
  }

  // ========== DECISION 2: Check if required block exists ==========
  const requiredBlock = getRequiredBlock(metric_key);
  if (requiredBlock === 'pain_management' && !hasPainManagementBlock(payload)) {
    // Check if there are title scan hits indicating the block SHOULD exist
    const titleScanHits = classificationInputs.pain_mgmt_title_scan_hits || [];
    
    // HARDEN: In NO_DATA months, ignore title scan hits - they're likely template remnants
    // Also require minimum numeric cells in the pain mgmt total row to count as a real block
    const painMgmtTotalNumeric = classificationInputs.pain_mgmt_total_row_numeric_cells || 0;
    const hasRealPainMgmtIndicator = titleScanHits.length > 0 && 
                                      monthHasDataFlag && 
                                      painMgmtTotalNumeric >= 2; // Require at least 2 numeric cells in total row
    
    if (hasRealPainMgmtIndicator) {
      // FAIL_EXTRACTION: Workbook indicates pain mgmt section exists but extractor didn't build the block
      const hitCells = titleScanHits.map(h => `${h.cell_a1}="${h.value}"`).join(', ');
      const reason = `FAIL_EXTRACTION: Workbook contains Pain Management indicators but extractor failed to build block. ` +
        `Title scan hits: [${hitCells}]. ` +
        `pain_mgmt_block_found=${classificationInputs.pain_mgmt_block_found}, ` +
        `pain_mgmt_total_row_numeric_cells=${painMgmtTotalNumeric}. ` +
        `This is a BLOCKING failure.`;
      
      return {
        metric_key,
        display_name: mapping.display_name,
        extracted_value: null,
        workbook_reference_value: null,
        delta: null,
        status: "FAIL_EXTRACTION",
        is_verifiable: true,
        has_reference: false,  // No reference found because block wasn't extracted
        has_extracted: false,
        blocks_sync: true,     // BLOCKS SYNC
        evidence: {
          source_block: 'extra_blocks',
          sheet_name: payload.sheet_name,
          excel_row: titleScanHits[0]?.row_1 || null,
          start_col: titleScanHits[0]?.col_0 || null,
          end_col: null,
          row_label: titleScanHits[0]?.value || null,
          column_name: null,
          column_index: null,
          raw_cells: titleScanHits.map(h => h.value),
          computation: `Title scan found ${titleScanHits.length} hit(s): ${hitCells}`,
        },
        notes: `Workbook indicates Pain Management section exists (found "${titleScanHits[0]?.value}" at ${titleScanHits[0]?.cell_a1}) but extractor did not build the block. Sync blocked.`,
        classification_reason: reason,
        classification_inputs: classificationInputs,
      };
    }
    
    // NOT_APPLICABLE: Either no title scan hits, or NO_DATA month, or insufficient numeric data
    const reason = `NOT_APPLICABLE: Metric requires Pain Management block. ` +
      `pain_mgmt_block_found=${classificationInputs.pain_mgmt_block_found}, ` +
      `pain_mgmt_title_scan_hits=${titleScanHits.length}, ` +
      `pain_mgmt_total_row_numeric_cells=${painMgmtTotalNumeric}, ` +
      `month_has_data=${monthHasDataFlag}. ` +
      (titleScanHits.length > 0 && !monthHasDataFlag 
        ? `Title scan hits ignored because month is NO_DATA (template/future).`
        : titleScanHits.length > 0 && painMgmtTotalNumeric < 2
        ? `Title scan hits ignored because pain_mgmt_total_row_numeric_cells < 2 (insufficient data).`
        : `Block not present in this month's workbook.`);
    
    return {
      metric_key,
      display_name: mapping.display_name,
      extracted_value: null,
      workbook_reference_value: null,
      delta: null,
      status: "NOT_APPLICABLE",
      is_verifiable: true,
      has_reference: false,
      has_extracted: false,
      blocks_sync: false,
      evidence: {
        source_block: 'extra_blocks',
        sheet_name: payload.sheet_name,
        excel_row: null,
        start_col: null,
        end_col: null,
        row_label: null,
        column_name: null,
        column_index: null,
        raw_cells: null,
        computation: titleScanHits.length > 0 
          ? `Title scan found ${titleScanHits.length} hit(s) but gated out: monthHasData=${monthHasDataFlag}, numericCells=${painMgmtTotalNumeric}.`
          : 'Pain Management block not found in workbook for this month (no title scan hits).',
      },
      notes: 'Pain Management block does not exist or has insufficient data. Does not block sync.',
      classification_reason: reason,
      classification_inputs: classificationInputs,
    };
  }

  // ========== Extract reference value ==========
  let referenceValue: number | null = null;
  let evidence: AuditEvidence | null = null;

  // Helper to extract provider_table value (either from grand total or sum of subtotals)
  const extractProviderValue = (columnSearches: string[]) => {
    const { row, provenance } = findTotalRow(payload.provider_table);
    let colIdx = -1;
    let foundColumn = '';
    
    for (const search of columnSearches) {
      colIdx = getColumnIndex(payload.provider_table.headers, search);
      if (colIdx >= 0) {
        foundColumn = search;
        break;
      }
    }
    
    if (colIdx < 0) return { value: null, evidence: null };
    
    // If we have a grand total row with data
    if (row && parseNumeric(row[colIdx]) !== null) {
      const value = parseNumeric(row[colIdx]);
      return {
        value,
        evidence: {
          source_block: 'provider_table',
          sheet_name: provenance?.sheet_name || payload.sheet_name,
          excel_row: provenance?.excel_row || null,
          start_col: provenance?.start_col || null,
          end_col: provenance?.end_col || null,
          row_label: String(row[0]),
          column_name: payload.provider_table.headers[colIdx],
          column_index: colIdx,
          raw_cells: provenance?.raw_cells || row,
          computation: `cell[${colIdx}] from Total row`,
        },
      };
    }
    
    // No grand total - sum subtotals
    const { sum, subtotalLabels } = sumSubtotalColumn(payload.provider_table, colIdx);
    if (sum !== null) {
      return {
        value: sum,
        evidence: {
          source_block: 'provider_table',
          sheet_name: payload.sheet_name,
          excel_row: null,
          start_col: null,
          end_col: null,
          row_label: `SUM(${subtotalLabels.join(' + ')})`,
          column_name: payload.provider_table.headers[colIdx],
          column_index: colIdx,
          raw_cells: null,
          computation: `SUM of ${subtotalLabels.length} subtotal rows, column ${foundColumn}`,
        },
      };
    }
    
    return { value: null, evidence: null };
  };

  // ========== PROVIDER TABLE METRICS (VERIFIABLE) ==========
  if (metric_key === 'total_new_patients') {
    const result = extractProviderValue(['new patient', 'new patients']);
    referenceValue = result.value;
    evidence = result.evidence;
  }
  
  else if (metric_key === 'total_visits') {
    const result = extractProviderValue(['total visits', 'visits']);
    referenceValue = result.value;
    evidence = result.evidence;
  }
  
  else if (metric_key === 'total_production') {
    const result = extractProviderValue(['production', 'revenue']);
    referenceValue = result.value;
    evidence = result.evidence;
  }
  
  else if (metric_key === 'total_charges') {
    const result = extractProviderValue(['charges']);
    referenceValue = result.value;
    evidence = result.evidence;
  }
  
  // ========== PAIN MANAGEMENT (block exists - check for truth anchor) ==========
  else if (metric_key === 'pain_mgmt_new_patients') {
    const block = findExtraBlockWithProvenance(payload, 'pain management');
    if (block) {
      const { row, provenance } = findTotalRow(block);
      if (row) {
        const colIdx = getColumnIndex(block.headers, 'new');
        if (colIdx >= 0) {
          referenceValue = parseNumeric(row[colIdx]);
          evidence = {
            source_block: 'extra_blocks[Pain Management]',
            sheet_name: provenance?.sheet_name || payload.sheet_name,
            excel_row: provenance?.excel_row || null,
            start_col: provenance?.start_col || null,
            end_col: provenance?.end_col || null,
            row_label: String(row[0]),
            column_name: block.headers[colIdx],
            column_index: colIdx,
            raw_cells: provenance?.raw_cells || row,
            computation: `cell[${colIdx}] from Total row in Pain Management block`,
          };
        }
      }
    }
  }
  
  else if (metric_key === 'pain_mgmt_total_visits') {
    const block = findExtraBlockWithProvenance(payload, 'pain management');
    if (block) {
      const { row, provenance } = findTotalRow(block);
      if (row) {
        let colIdx = getColumnIndex(block.headers, 'total');
        if (colIdx < 0) colIdx = getColumnIndex(block.headers, 'visits');
        if (colIdx >= 0) {
          referenceValue = parseNumeric(row[colIdx]);
          evidence = {
            source_block: 'extra_blocks[Pain Management]',
            sheet_name: provenance?.sheet_name || payload.sheet_name,
            excel_row: provenance?.excel_row || null,
            start_col: provenance?.start_col || null,
            end_col: provenance?.end_col || null,
            row_label: String(row[0]),
            column_name: block.headers[colIdx],
            column_index: colIdx,
            raw_cells: provenance?.raw_cells || row,
            computation: `cell[${colIdx}] from Total row in Pain Management block`,
          };
        }
      }
    }
  }

  // ========== DECISION 3 & 4: NEEDS_DEFINITION vs PASS/FAIL ==========
  const hasReference = referenceValue !== null && referenceValue !== undefined && !isNaN(referenceValue);
  const hasExtracted = extractedValue !== null && extractedValue !== undefined && !isNaN(extractedValue);
  
  let status: AuditStatus;
  let delta: number | null = null;
  let notes = mapping.notes;
  let blockSync = false;
  let classificationReason = '';

  if (!hasReference) {
    // Block exists but no truth anchor found (e.g., Pain Management block exists but no Total row)
    status = "NEEDS_DEFINITION";
    if (hasExtracted) {
      notes = `Block exists, extracted value ${extractedValue}, but no truth anchor defined yet. Does not block sync.`;
      classificationReason = `NEEDS_DEFINITION: Extracted value=${extractedValue} but no truth anchor. ` +
        `provider_total_row_found=${classificationInputs.provider_total_row_found}, ` +
        `pain_mgmt_total_row_found=${classificationInputs.pain_mgmt_total_row_found}. ` +
        `Block exists but Total row has no valid numeric data for this column.`;
    } else {
      notes = "Block exists but no truth anchor defined (no Total row or column found). Does not block sync.";
      classificationReason = `NEEDS_DEFINITION: No extracted value and no truth anchor. ` +
        `provider_total_row_found=${classificationInputs.provider_total_row_found}, ` +
        `pain_mgmt_total_row_found=${classificationInputs.pain_mgmt_total_row_found}. ` +
        `Block exists but Total row or column not found.`;
    }
  } else {
    // HAS TRUTH ANCHOR - can PASS or FAIL
    if (!hasExtracted) {
      // Reference exists but extractor failed - this IS a real failure
      status = "FAIL";
      blockSync = true;
      notes = `Extractor returned null but workbook reference shows ${referenceValue}. Sync blocked.`;
      classificationReason = `FAIL: Truth anchor exists (ref=${referenceValue}) but extractor returned null. ` +
        `This is a BLOCKING failure that prevents sync.`;
    } else {
      // Both values exist - compare with tolerance
      delta = Math.abs(extractedValue - referenceValue);
      const tolerance = mapping.unit === 'currency' ? 1 : 0;
      if (delta <= tolerance) {
        status = "PASS";
        notes = `Verified: extracted ${extractedValue} matches reference ${referenceValue}`;
        classificationReason = `PASS: Extracted value ${extractedValue} matches reference ${referenceValue} ` +
          `(delta=${delta}, tolerance=${tolerance}).`;
      } else {
        status = "FAIL";
        blockSync = true;
        notes = `Value mismatch: extracted ${extractedValue}, workbook ${referenceValue}, delta ${delta}. Sync blocked.`;
        classificationReason = `FAIL: Value mismatch. Extracted=${extractedValue}, reference=${referenceValue}, delta=${delta}. ` +
          `This is a BLOCKING failure that prevents sync.`;
      }
    }
  }

  return {
    metric_key,
    display_name: mapping.display_name,
    extracted_value: extractedValue,
    workbook_reference_value: referenceValue,
    delta,
    status,
    is_verifiable: true,
    has_reference: hasReference,
    has_extracted: hasExtracted,
    blocks_sync: blockSync,
    evidence,
    notes,
    classification_reason: classificationReason,
    classification_inputs: classificationInputs,
  };
}

/**
 * Run full audit for a month's payload
 * Returns a complete audit report with PASS/FAIL/NO_DATA/NOT_APPLICABLE/NEEDS_DEFINITION for each metric
 */
export function auditDerivedMetrics(
  periodKey: string,
  payload: LegacyMonthPayload
): DerivedMetricAuditReport {
  const extracted = extractMetricsFromPayload(payload);
  const results: MetricAuditResult[] = [];
  
  // Determine if month has meaningful data
  const monthHasDataFlag = monthHasData(payload);
  
  // Build classification inputs once for all metrics
  const classificationInputs = buildClassificationInputs(payload, monthHasDataFlag);

  for (const mapping of LEGACY_METRIC_MAPPINGS) {
    const ex = extracted.find(e => e.metric_key === mapping.metric_key);
    const extractedValue = ex?.value ?? null;
    const result = auditMetric(mapping, payload, extractedValue, monthHasDataFlag, classificationInputs);
    results.push(result);
  }

  const verifiableResults = results.filter(r => r.is_verifiable);

  return {
    period_key: periodKey,
    sheet_name: payload.sheet_name,
    audit_timestamp: new Date().toISOString(),
    total_metrics: results.length,
    passed: verifiableResults.filter(r => r.status === "PASS").length,
    failed: verifiableResults.filter(r => r.status === "FAIL").length,
    unverifiable: results.filter(r => 
      r.status === "UNVERIFIABLE" || 
      r.status === "NO_DATA" || 
      r.status === "NOT_APPLICABLE" || 
      r.status === "NEEDS_DEFINITION"
    ).length,
    verifiable_count: verifiableResults.length,
    results,
  };
}

/**
 * Run audit for multiple months
 */
export function auditMultipleMonths(
  payloads: { period_key: string; payload: LegacyMonthPayload }[]
): DerivedMetricAuditReport[] {
  return payloads.map(({ period_key, payload }) => 
    auditDerivedMetrics(period_key, payload)
  );
}

/**
 * Check if any verifiable metric failed audit
 */
/**
 * Check if any metric should block sync
 * Only metrics with has_reference=true AND status=FAIL block sync
 */
export function hasBlockingFailures(report: DerivedMetricAuditReport): boolean {
  return report.results.some(r => r.blocks_sync === true);
}

/**
 * @deprecated Use hasBlockingFailures instead
 */
export function hasVerifiableFailures(report: DerivedMetricAuditReport): boolean {
  return hasBlockingFailures(report);
}

/**
 * Get only the metrics that should be synced to scorecard
 * Includes: PASS metrics with valid extracted values
 * Excludes: FAIL, UNVERIFIABLE, NEEDS_DEFINITION without extracted values
 */
export function getMetricsToSync(report: DerivedMetricAuditReport): MetricAuditResult[] {
  return report.results.filter(r => 
    r.is_verifiable && 
    r.status === "PASS" && 
    r.has_extracted
  );
}

/**
 * Get blocking failures for display (only metrics that actually block sync)
 */
export function getBlockingFailures(report: DerivedMetricAuditReport): MetricAuditResult[] {
  return report.results.filter(r => r.blocks_sync === true);
}

/**
 * Get informational metrics that don't block (NEEDS_DEFINITION, UNVERIFIABLE)
 */
export function getInformationalMetrics(report: DerivedMetricAuditReport): MetricAuditResult[] {
  return report.results.filter(r => 
    r.status === "UNVERIFIABLE" || 
    r.status === "NEEDS_DEFINITION"
  );
}

/**
 * Generate JSON audit report suitable for saving to docs/audits/
 */
export function generateAuditJson(report: DerivedMetricAuditReport): string {
  return JSON.stringify(report, null, 2);
}
