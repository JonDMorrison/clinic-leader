/**
 * Legacy Metric Mapping Configuration
 * 
 * PHASE 2 SCOPE (LOCKED):
 * - 12 canonical org-level KPIs only
 * - No location/provider breakdown
 * - Monthly cadence only
 * - No auto issue creation/closing
 * 
 * @see docs/audits/phase2_scope.md for full scope definition
 * 
 * Defines how to extract canonical KPIs from Lori's workbook JSONB payload
 * stored in legacy_monthly_reports.payload.
 * 
 * Each mapping defines:
 * - metric_key: maps to metrics.import_key
 * - display_name: human-readable name for the metric
 * - unit: metric unit (count, currency, percent)
 * - direction: higher_is_better or lower_is_better
 * - default_target: optional default target value
 * - extractor: function to extract value from payload
 * - notes: documentation about data source
 */

import type { LegacyMonthPayload } from "@/components/data/LegacyMonthlyReportView";

export type MetricDirection = "higher_is_better" | "lower_is_better";
export type MetricUnit = "count" | "currency" | "percent" | "number";

export interface LegacyMetricMapping {
  metric_key: string;
  display_name: string;
  unit: MetricUnit;
  direction: MetricDirection;
  default_target: number | null;
  category: string;
  extractor: (payload: LegacyMonthPayload) => number | null;
  notes: string;
}

/**
 * Safe numeric extraction helper
 */
function parseNumeric(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  // Handle string values with currency/percent symbols
  const strVal = String(value)
    .replace(/[$,%]/g, '')
    .replace(/,/g, '')
    .replace(/\(([^)]+)\)/, '-$1') // Convert (100) to -100
    .trim();
  
  if (strVal === '' || strVal === '-') return null;
  
  const num = parseFloat(strVal);
  return isNaN(num) ? null : num;
}

/**
 * Find a row in a table by matching the first column (label)
 */
function findRowByLabel(
  table: { headers: string[]; rows: any[][] },
  labelMatch: string | RegExp
): any[] | null {
  if (!table?.rows) return null;
  
  for (const row of table.rows) {
    const label = String(row?.[0] || '').toLowerCase().trim();
    if (typeof labelMatch === 'string') {
      if (label === labelMatch.toLowerCase()) return row;
    } else {
      if (labelMatch.test(label)) return row;
    }
  }
  return null;
}

/**
 * Get total row from a table (row labeled "Total" or "Totals")
 */
function getTotalRow(table: { headers: string[]; rows: any[][] }): any[] | null {
  return findRowByLabel(table, /^totals?$/i);
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
 * Extract value from a specific column of the Total row
 */
function extractTotalColumn(
  table: { headers: string[]; rows: any[][] },
  columnSearch: string
): number | null {
  const totalRow = getTotalRow(table);
  if (!totalRow) return null;
  
  const colIdx = getColumnIndex(table.headers, columnSearch);
  if (colIdx < 0) return null;
  
  return parseNumeric(totalRow[colIdx]);
}

/**
 * Sum a column across all non-total rows
 */
function sumColumn(
  table: { headers: string[]; rows: any[][] },
  columnSearch: string
): number | null {
  if (!table?.rows || !table?.headers) return null;
  
  const colIdx = getColumnIndex(table.headers, columnSearch);
  if (colIdx < 0) return null;
  
  let sum = 0;
  let hasAnyValue = false;
  
  for (const row of table.rows) {
    const label = String(row?.[0] || '').toLowerCase().trim();
    // Skip total rows
    if (/^totals?$/i.test(label)) continue;
    
    const val = parseNumeric(row?.[colIdx]);
    if (val !== null) {
      sum += val;
      hasAnyValue = true;
    }
  }
  
  return hasAnyValue ? sum : null;
}

/**
 * Find an extra block by title
 */
function findExtraBlock(
  payload: LegacyMonthPayload,
  titleMatch: string | RegExp
): { title: string; headers: string[]; rows: any[][] } | null {
  if (!payload.extra_blocks) return null;
  
  for (const block of payload.extra_blocks) {
    const title = String(block.title || '').toLowerCase().trim();
    if (typeof titleMatch === 'string') {
      if (title.includes(titleMatch.toLowerCase())) return block;
    } else {
      if (titleMatch.test(title)) return block;
    }
  }
  return null;
}

// =============================================================================
// CANONICAL METRIC MAPPINGS
// =============================================================================

export const LEGACY_METRIC_MAPPINGS: LegacyMetricMapping[] = [
  // ---------------------------------------------------------------------------
  // PROVIDER PRODUCTION METRICS (from provider_table)
  // ---------------------------------------------------------------------------
  {
    metric_key: "total_new_patients",
    display_name: "Total New Patients",
    unit: "count",
    direction: "higher_is_better",
    default_target: null,
    category: "Provider Production",
    extractor: (payload) => {
      // Sum "New Patient" column from provider_table Total row
      return extractTotalColumn(payload.provider_table, "new patient");
    },
    notes: "From provider_table, 'New Patient' column, Total row",
  },
  {
    metric_key: "total_visits",
    display_name: "Total Patient Visits",
    unit: "count",
    direction: "higher_is_better",
    default_target: null,
    category: "Provider Production",
    extractor: (payload) => {
      // Try "Total Visits" or "Visits" column
      let val = extractTotalColumn(payload.provider_table, "total visits");
      if (val === null) {
        val = extractTotalColumn(payload.provider_table, "visits");
      }
      return val;
    },
    notes: "From provider_table, 'Total Visits' column, Total row",
  },
  {
    metric_key: "total_production",
    display_name: "Total Production ($)",
    unit: "currency",
    direction: "higher_is_better",
    default_target: null,
    category: "Provider Production",
    extractor: (payload) => {
      // Try "Production" or "$ Production" column
      let val = extractTotalColumn(payload.provider_table, "production");
      return val;
    },
    notes: "From provider_table, 'Production' column, Total row",
  },
  {
    metric_key: "total_charges",
    display_name: "Total Charges ($)",
    unit: "currency",
    direction: "higher_is_better",
    default_target: null,
    category: "Provider Production",
    extractor: (payload) => {
      return extractTotalColumn(payload.provider_table, "charges");
    },
    notes: "From provider_table, 'Charges' column, Total row",
  },

  // ---------------------------------------------------------------------------
  // REFERRAL METRICS (from referral_totals)
  // ---------------------------------------------------------------------------
  {
    metric_key: "total_referrals",
    display_name: "Total Referrals",
    unit: "count",
    direction: "higher_is_better",
    default_target: null,
    category: "Referrals",
    extractor: (payload) => {
      // Get Total row from referral_totals
      const totalRow = getTotalRow(payload.referral_totals);
      if (!totalRow) return null;
      
      // Sum all numeric columns after the label
      let sum = 0;
      let hasValue = false;
      for (let i = 1; i < totalRow.length; i++) {
        const val = parseNumeric(totalRow[i]);
        if (val !== null) {
          sum += val;
          hasValue = true;
        }
      }
      return hasValue ? sum : null;
    },
    notes: "From referral_totals, Total row, sum of all columns",
  },
  {
    metric_key: "new_referrals",
    display_name: "New Referrals",
    unit: "count",
    direction: "higher_is_better",
    default_target: null,
    category: "Referrals",
    extractor: (payload) => {
      // Find "New" or "New Referrals" row
      const row = findRowByLabel(payload.referral_totals, /^new/i);
      if (!row) return null;
      
      // Sum numeric columns
      let sum = 0;
      let hasValue = false;
      for (let i = 1; i < row.length; i++) {
        const val = parseNumeric(row[i]);
        if (val !== null) {
          sum += val;
          hasValue = true;
        }
      }
      return hasValue ? sum : null;
    },
    notes: "From referral_totals, 'New' row, sum of all columns",
  },
  {
    metric_key: "reactivations",
    display_name: "Reactivations",
    unit: "count",
    direction: "higher_is_better",
    default_target: null,
    category: "Referrals",
    extractor: (payload) => {
      const row = findRowByLabel(payload.referral_totals, /reactivat/i);
      if (!row) return null;
      
      let sum = 0;
      let hasValue = false;
      for (let i = 1; i < row.length; i++) {
        const val = parseNumeric(row[i]);
        if (val !== null) {
          sum += val;
          hasValue = true;
        }
      }
      return hasValue ? sum : null;
    },
    notes: "From referral_totals, 'Reactivation' row, sum of all columns",
  },
  {
    metric_key: "discharges",
    display_name: "Discharges",
    unit: "count",
    direction: "lower_is_better",
    default_target: null,
    category: "Referrals",
    extractor: (payload) => {
      const row = findRowByLabel(payload.referral_totals, /discharge/i);
      if (!row) return null;
      
      let sum = 0;
      let hasValue = false;
      for (let i = 1; i < row.length; i++) {
        const val = parseNumeric(row[i]);
        if (val !== null) {
          sum += val;
          hasValue = true;
        }
      }
      return hasValue ? sum : null;
    },
    notes: "From referral_totals, 'Discharge' row, sum of all columns",
  },

  // ---------------------------------------------------------------------------
  // TOP REFERRAL SOURCES (from referral_sources)
  // ---------------------------------------------------------------------------
  {
    metric_key: "top_referral_source_count",
    display_name: "Top Referral Source Count",
    unit: "count",
    direction: "higher_is_better",
    default_target: null,
    category: "Referrals",
    extractor: (payload) => {
      // Get the first non-total row from referral_sources and its count
      if (!payload.referral_sources?.rows?.length) return null;
      
      for (const row of payload.referral_sources.rows) {
        const label = String(row?.[0] || '').toLowerCase().trim();
        if (label && !/^totals?$/i.test(label)) {
          // This is the top referral source - get its count (second column)
          return parseNumeric(row[1]);
        }
      }
      return null;
    },
    notes: "From referral_sources, first source row, count column",
  },
  {
    metric_key: "referral_source_count",
    display_name: "Number of Referral Sources",
    unit: "count",
    direction: "higher_is_better",
    default_target: null,
    category: "Referrals",
    extractor: (payload) => {
      // Count non-empty, non-total rows in referral_sources
      if (!payload.referral_sources?.rows) return null;
      
      let count = 0;
      for (const row of payload.referral_sources.rows) {
        const label = String(row?.[0] || '').trim();
        if (label && !/^totals?$/i.test(label.toLowerCase())) {
          count++;
        }
      }
      return count > 0 ? count : null;
    },
    notes: "From referral_sources, count of distinct sources",
  },

  // ---------------------------------------------------------------------------
  // PAIN MANAGEMENT (from extra_blocks)
  // ---------------------------------------------------------------------------
  {
    metric_key: "pain_mgmt_new_patients",
    display_name: "Pain Management New Patients",
    unit: "count",
    direction: "higher_is_better",
    default_target: null,
    category: "Pain Management",
    extractor: (payload) => {
      const block = findExtraBlock(payload, "pain management");
      if (!block) return null;
      
      return extractTotalColumn(block, "new");
    },
    notes: "From 'Pain Management' extra block, 'New' column, Total row",
  },
  {
    metric_key: "pain_mgmt_total_visits",
    display_name: "Pain Management Total Visits",
    unit: "count",
    direction: "higher_is_better",
    default_target: null,
    category: "Pain Management",
    extractor: (payload) => {
      const block = findExtraBlock(payload, "pain management");
      if (!block) return null;
      
      let val = extractTotalColumn(block, "total");
      if (val === null) {
        val = extractTotalColumn(block, "visits");
      }
      return val;
    },
    notes: "From 'Pain Management' extra block, 'Total' column, Total row",
  },
];

/**
 * Get all metric keys defined in mappings
 */
export function getCanonicalMetricKeys(): string[] {
  return LEGACY_METRIC_MAPPINGS.map(m => m.metric_key);
}

/**
 * Get mapping by metric_key
 */
export function getMappingByKey(metricKey: string): LegacyMetricMapping | undefined {
  return LEGACY_METRIC_MAPPINGS.find(m => m.metric_key === metricKey);
}

/**
 * Extract all metrics from a Lori payload
 * Returns array of { metric_key, value, extracted: boolean }
 */
export function extractMetricsFromPayload(
  payload: LegacyMonthPayload
): { metric_key: string; value: number | null; display_name: string }[] {
  const results: { metric_key: string; value: number | null; display_name: string }[] = [];
  
  for (const mapping of LEGACY_METRIC_MAPPINGS) {
    try {
      const value = mapping.extractor(payload);
      results.push({
        metric_key: mapping.metric_key,
        value,
        display_name: mapping.display_name,
      });
    } catch (error) {
      // Log in dev mode but never throw
      if (import.meta.env.DEV) {
        console.warn(`[LegacyMetric] Extractor failed for ${mapping.metric_key}:`, error);
      }
      results.push({
        metric_key: mapping.metric_key,
        value: null,
        display_name: mapping.display_name,
      });
    }
  }
  
  return results;
}
