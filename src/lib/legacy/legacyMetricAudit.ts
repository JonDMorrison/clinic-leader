/**
 * Legacy Metric Audit
 * 
 * Verifies derived metrics against workbook source values with cell-level provenance.
 */

import type { LegacyMonthPayload } from "@/components/data/LegacyMonthlyReportView";
import { LEGACY_METRIC_MAPPINGS, extractMetricsFromPayload } from "./legacyMetricMapping";

export type AuditStatus = "PASS" | "FAIL" | "NEEDS_DEFINITION";

export interface MetricAuditResult {
  metric_key: string;
  display_name: string;
  extracted_value: number | null;
  workbook_reference_value: number | null;
  delta: number | null;
  status: AuditStatus;
  evidence: {
    source_block: string;
    row_label: string | null;
    row_number_1: number | null;
    column_name: string | null;
    column_index: number | null;
    raw_cell_value: any;
  } | null;
  notes: string;
}

export interface AuditReport {
  period_key: string;
  sheet_name: string;
  audit_timestamp: string;
  total_metrics: number;
  passed: number;
  failed: number;
  needs_definition: number;
  results: MetricAuditResult[];
}

function parseNumeric(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const strVal = String(value).replace(/[$,%]/g, '').replace(/,/g, '').trim();
  if (strVal === '' || strVal === '-') return null;
  const num = parseFloat(strVal);
  return isNaN(num) ? null : num;
}

function findTotalRow(table: { headers: string[]; rows: any[][]; provenance?: any[] }): { 
  row: any[] | null; 
  rowIdx: number; 
  provenance: any | null 
} {
  for (let i = 0; i < (table.rows?.length || 0); i++) {
    const label = String(table.rows[i]?.[0] || '').toLowerCase().trim();
    if (label === 'total' || label === 'totals') {
      return { 
        row: table.rows[i], 
        rowIdx: i, 
        provenance: table.provenance?.[i] || null 
      };
    }
  }
  return { row: null, rowIdx: -1, provenance: null };
}

function getColumnIndex(headers: string[], search: string): number {
  const searchLower = search.toLowerCase();
  return headers.findIndex(h => String(h || '').toLowerCase().includes(searchLower));
}

/**
 * Audit a single metric by directly reading from the payload
 */
function auditMetric(
  metric_key: string,
  payload: LegacyMonthPayload,
  extractedValue: number | null
): MetricAuditResult {
  const mapping = LEGACY_METRIC_MAPPINGS.find(m => m.metric_key === metric_key);
  if (!mapping) {
    return {
      metric_key,
      display_name: metric_key,
      extracted_value: extractedValue,
      workbook_reference_value: null,
      delta: null,
      status: "NEEDS_DEFINITION",
      evidence: null,
      notes: "No mapping definition found",
    };
  }

  // Determine source block and extract reference value
  let sourceBlock = "unknown";
  let referenceValue: number | null = null;
  let evidence: MetricAuditResult["evidence"] = null;

  // Provider table metrics
  if (metric_key.startsWith("total_") && !metric_key.includes("referral")) {
    sourceBlock = "provider_table";
    const { row, rowIdx, provenance } = findTotalRow(payload.provider_table);
    if (row) {
      let colSearch = "";
      if (metric_key === "total_new_patients") colSearch = "new patient";
      else if (metric_key === "total_visits") colSearch = "visits";
      else if (metric_key === "total_production") colSearch = "production";
      else if (metric_key === "total_charges") colSearch = "charges";
      
      const colIdx = getColumnIndex(payload.provider_table.headers, colSearch);
      if (colIdx >= 0) {
        referenceValue = parseNumeric(row[colIdx]);
        evidence = {
          source_block: sourceBlock,
          row_label: String(row[0]),
          row_number_1: provenance?.row_number_1 || null,
          column_name: payload.provider_table.headers[colIdx],
          column_index: colIdx,
          raw_cell_value: row[colIdx],
        };
      }
    }
  }

  // Referral metrics
  if (metric_key.includes("referral") || metric_key === "reactivations" || metric_key === "discharges") {
    sourceBlock = "referral_totals";
    const { row, provenance } = findTotalRow(payload.referral_totals);
    if (row && metric_key === "total_referrals") {
      let sum = 0;
      for (let i = 1; i < row.length; i++) {
        const val = parseNumeric(row[i]);
        if (val !== null) sum += val;
      }
      referenceValue = sum;
      evidence = {
        source_block: sourceBlock,
        row_label: String(row[0]),
        row_number_1: provenance?.row_number_1 || null,
        column_name: "SUM(all columns)",
        column_index: null,
        raw_cell_value: row,
      };
    }
  }

  // Determine status
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
    // Tolerance: exact for integers, ±1 for currency (rounding)
    const tolerance = mapping.unit === "currency" ? 1 : 0;
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
 */
export function auditDerivedMetrics(
  periodKey: string,
  payload: LegacyMonthPayload
): AuditReport {
  const extracted = extractMetricsFromPayload(payload);
  const results: MetricAuditResult[] = [];

  for (const ex of extracted) {
    const result = auditMetric(ex.metric_key, payload, ex.value);
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
