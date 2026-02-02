/**
 * Legacy Derived Metric Audit
 * 
 * Verifies extracted derived metrics against workbook reference values using provenance.
 * Produces PASS/FAIL results for each metric with cell-level evidence.
 * 
 * @see docs/audits/phase2_scope.md for scope definition
 */

import type { LegacyMonthPayload, TableBlock, RowProvenance } from "@/components/data/LegacyMonthlyReportView";
import { LEGACY_METRIC_MAPPINGS, extractMetricsFromPayload, type LegacyMetricMapping } from "./legacyMetricMapping";

export type AuditStatus = "PASS" | "FAIL" | "NEEDS_DEFINITION";

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
  needs_definition: number;
  results: MetricAuditResult[];
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
  let referenceValue: number | null = null;
  let evidence: AuditEvidence | null = null;

  // ========== PROVIDER TABLE METRICS ==========
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
  
  // ========== REFERRAL METRICS ==========
  else if (metric_key === 'total_referrals') {
    const { row, provenance } = findTotalRow(payload.referral_totals);
    if (row) {
      const { sum, hasValue } = sumRowValues(row);
      if (hasValue) {
        referenceValue = sum;
        evidence = {
          source_block: 'referral_totals',
          sheet_name: provenance?.sheet_name || payload.sheet_name,
          excel_row: provenance?.excel_row || null,
          start_col: provenance?.start_col || null,
          end_col: provenance?.end_col || null,
          row_label: String(row[0]),
          column_name: 'SUM(all columns)',
          column_index: null,
          raw_cells: provenance?.raw_cells || row,
          computation: 'SUM(row[1..n]) from Total row',
        };
      }
    }
  }
  
  else if (metric_key === 'new_referrals') {
    const { row, provenance } = findRowByLabelWithProvenance(payload.referral_totals, /^new/i);
    if (row) {
      const { sum, hasValue } = sumRowValues(row);
      if (hasValue) {
        referenceValue = sum;
        evidence = {
          source_block: 'referral_totals',
          sheet_name: provenance?.sheet_name || payload.sheet_name,
          excel_row: provenance?.excel_row || null,
          start_col: provenance?.start_col || null,
          end_col: provenance?.end_col || null,
          row_label: String(row[0]),
          column_name: 'SUM(all columns)',
          column_index: null,
          raw_cells: provenance?.raw_cells || row,
          computation: 'SUM(row[1..n]) from "New" row',
        };
      }
    }
  }
  
  else if (metric_key === 'reactivations') {
    const { row, provenance } = findRowByLabelWithProvenance(payload.referral_totals, /reactivat/i);
    if (row) {
      const { sum, hasValue } = sumRowValues(row);
      if (hasValue) {
        referenceValue = sum;
        evidence = {
          source_block: 'referral_totals',
          sheet_name: provenance?.sheet_name || payload.sheet_name,
          excel_row: provenance?.excel_row || null,
          start_col: provenance?.start_col || null,
          end_col: provenance?.end_col || null,
          row_label: String(row[0]),
          column_name: 'SUM(all columns)',
          column_index: null,
          raw_cells: provenance?.raw_cells || row,
          computation: 'SUM(row[1..n]) from "Reactivation" row',
        };
      }
    }
  }
  
  else if (metric_key === 'discharges') {
    const { row, provenance } = findRowByLabelWithProvenance(payload.referral_totals, /discharge/i);
    if (row) {
      const { sum, hasValue } = sumRowValues(row);
      if (hasValue) {
        referenceValue = sum;
        evidence = {
          source_block: 'referral_totals',
          sheet_name: provenance?.sheet_name || payload.sheet_name,
          excel_row: provenance?.excel_row || null,
          start_col: provenance?.start_col || null,
          end_col: provenance?.end_col || null,
          row_label: String(row[0]),
          column_name: 'SUM(all columns)',
          column_index: null,
          raw_cells: provenance?.raw_cells || row,
          computation: 'SUM(row[1..n]) from "Discharge" row',
        };
      }
    }
  }
  
  // ========== REFERRAL SOURCES ==========
  else if (metric_key === 'top_referral_source_count') {
    const table = payload.referral_sources;
    if (table?.rows?.length) {
      for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i];
        const label = String(row?.[0] || '').toLowerCase().trim();
        if (label && !/^totals?$/i.test(label)) {
          referenceValue = parseNumeric(row[1]);
          evidence = {
            source_block: 'referral_sources',
            sheet_name: table.provenance?.[i]?.sheet_name || payload.sheet_name,
            excel_row: table.provenance?.[i]?.excel_row || null,
            start_col: table.provenance?.[i]?.start_col || null,
            end_col: table.provenance?.[i]?.end_col || null,
            row_label: String(row[0]),
            column_name: table.headers[1] || 'count',
            column_index: 1,
            raw_cells: table.provenance?.[i]?.raw_cells || row,
            computation: 'cell[1] from first non-Total source row',
          };
          break;
        }
      }
    }
  }
  
  else if (metric_key === 'referral_source_count') {
    const table = payload.referral_sources;
    if (table?.rows) {
      let count = 0;
      for (const row of table.rows) {
        const label = String(row?.[0] || '').trim();
        if (label && !/^totals?$/i.test(label.toLowerCase())) {
          count++;
        }
      }
      if (count > 0) {
        referenceValue = count;
        evidence = {
          source_block: 'referral_sources',
          sheet_name: payload.sheet_name,
          excel_row: null,
          start_col: null,
          end_col: null,
          row_label: null,
          column_name: null,
          column_index: null,
          raw_cells: null,
          computation: `COUNT(non-Total rows) = ${count}`,
        };
      }
    }
  }
  
  // ========== PAIN MANAGEMENT ==========
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

  // ========== DETERMINE STATUS ==========
  let status: AuditStatus = "NEEDS_DEFINITION";
  let delta: number | null = null;

  if (referenceValue === null && extractedValue === null) {
    status = "NEEDS_DEFINITION";
  } else if (referenceValue === null) {
    status = "NEEDS_DEFINITION";
  } else if (extractedValue === null) {
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
    evidence,
    notes: mapping.notes,
  };
}

/**
 * Run full audit for a month's payload
 * Returns a complete audit report with PASS/FAIL for each metric
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

  return {
    period_key: periodKey,
    sheet_name: payload.sheet_name,
    audit_timestamp: new Date().toISOString(),
    total_metrics: results.length,
    passed: results.filter(r => r.status === "PASS").length,
    failed: results.filter(r => r.status === "FAIL").length,
    needs_definition: results.filter(r => r.status === "NEEDS_DEFINITION").length,
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
 * Generate JSON audit report suitable for saving to docs/audits/
 */
export function generateAuditJson(report: DerivedMetricAuditReport): string {
  return JSON.stringify(report, null, 2);
}
