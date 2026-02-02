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

export type AuditStatus = "PASS" | "FAIL" | "UNVERIFIABLE";

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

export interface MetricAuditResult {
  metric_key: string;
  display_name: string;
  extracted_value: number | null;
  workbook_reference_value: number | null;
  delta: number | null;
  status: AuditStatus;
  is_verifiable: boolean;
  evidence: AuditEvidence | null;
  notes: string;
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
 * Check if a metric is verifiable
 */
export function isMetricVerifiable(metricKey: string): boolean {
  return VERIFIABLE_METRICS.has(metricKey);
}

/**
 * Get list of verifiable metric keys
 */
export function getVerifiableMetricKeys(): string[] {
  return Array.from(VERIFIABLE_METRICS);
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
 * Find Total row in a table block, returns row data and provenance
 */
function findTotalRow(table: TableBlock): {
  row: any[] | null;
  rowIdx: number;
  provenance: RowProvenance | null;
} {
  if (!table?.rows) return { row: null, rowIdx: -1, provenance: null };
  
  for (let i = 0; i < table.rows.length; i++) {
    const label = String(table.rows[i]?.[0] || '').toLowerCase().trim();
    if (label === 'total' || label === 'totals') {
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
 */
function auditMetric(
  mapping: LegacyMetricMapping,
  payload: LegacyMonthPayload,
  extractedValue: number | null
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
    };
  }

  let referenceValue: number | null = null;
  let evidence: AuditEvidence | null = null;

  // ========== PROVIDER TABLE METRICS (VERIFIABLE) ==========
  if (metric_key === 'total_new_patients') {
    const { row, provenance } = findTotalRow(payload.provider_table);
    if (row) {
      const colIdx = getColumnIndex(payload.provider_table.headers, 'new patient');
      if (colIdx >= 0) {
        referenceValue = parseNumeric(row[colIdx]);
        evidence = {
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
        };
      }
    }
  }
  
  else if (metric_key === 'total_visits') {
    const { row, provenance } = findTotalRow(payload.provider_table);
    if (row) {
      let colIdx = getColumnIndex(payload.provider_table.headers, 'total visits');
      if (colIdx < 0) colIdx = getColumnIndex(payload.provider_table.headers, 'visits');
      if (colIdx >= 0) {
        referenceValue = parseNumeric(row[colIdx]);
        evidence = {
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
        };
      }
    }
  }
  
  else if (metric_key === 'total_production') {
    const { row, provenance } = findTotalRow(payload.provider_table);
    if (row) {
      const colIdx = getColumnIndex(payload.provider_table.headers, 'production');
      if (colIdx >= 0) {
        referenceValue = parseNumeric(row[colIdx]);
        evidence = {
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
        };
      }
    }
  }
  
  else if (metric_key === 'total_charges') {
    const { row, provenance } = findTotalRow(payload.provider_table);
    if (row) {
      const colIdx = getColumnIndex(payload.provider_table.headers, 'charges');
      if (colIdx >= 0) {
        referenceValue = parseNumeric(row[colIdx]);
        evidence = {
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
        };
      }
    }
  }
  
  // ========== PAIN MANAGEMENT (VERIFIABLE if block exists) ==========
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

  // ========== DETERMINE STATUS FOR VERIFIABLE METRICS ==========
  let status: AuditStatus;
  let delta: number | null = null;

  if (referenceValue === null && extractedValue === null) {
    // Both null - no data in workbook for this metric (Pain Mgmt block missing, etc.)
    // This is OK - it means the workbook doesn't have this data
    status = "PASS"; // Pass because extractor correctly returned null
  } else if (referenceValue === null) {
    // Reference not found but extractor returned a value - mismatch
    status = "FAIL";
  } else if (extractedValue === null) {
    // Reference exists but extractor returned null - mismatch
    status = "FAIL";
  } else {
    delta = Math.abs(extractedValue - referenceValue);
    // Tolerance: ±1 for currency (rounding), exact for everything else
    const tolerance = mapping.unit === 'currency' ? 1 : 0;
    status = delta <= tolerance ? "PASS" : "FAIL";
  }

  return {
    metric_key,
    display_name: mapping.display_name,
    extracted_value: extractedValue,
    workbook_reference_value: referenceValue,
    delta,
    status,
    is_verifiable: true,
    evidence,
    notes: mapping.notes,
  };
}

/**
 * Run full audit for a month's payload
 * Returns a complete audit report with PASS/FAIL/UNVERIFIABLE for each metric
 */
export function auditDerivedMetrics(
  periodKey: string,
  payload: LegacyMonthPayload
): DerivedMetricAuditReport {
  const extracted = extractMetricsFromPayload(payload);
  const results: MetricAuditResult[] = [];

  for (const mapping of LEGACY_METRIC_MAPPINGS) {
    const ex = extracted.find(e => e.metric_key === mapping.metric_key);
    const extractedValue = ex?.value ?? null;
    const result = auditMetric(mapping, payload, extractedValue);
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
    unverifiable: results.filter(r => r.status === "UNVERIFIABLE").length,
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
export function hasVerifiableFailures(report: DerivedMetricAuditReport): boolean {
  return report.results.some(r => r.is_verifiable && r.status === "FAIL");
}

/**
 * Get only the metrics that should be synced to scorecard (verifiable + passed)
 */
export function getMetricsToSync(report: DerivedMetricAuditReport): MetricAuditResult[] {
  return report.results.filter(r => r.is_verifiable && r.status === "PASS");
}

/**
 * Generate JSON audit report suitable for saving to docs/audits/
 */
export function generateAuditJson(report: DerivedMetricAuditReport): string {
  return JSON.stringify(report, null, 2);
}
