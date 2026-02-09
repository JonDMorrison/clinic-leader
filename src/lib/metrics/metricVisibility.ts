/**
 * Metric Visibility Utility
 * 
 * Centralized rules for how metric values should be displayed.
 * Prevents recurring bugs where null, zero, and undefined are conflated.
 * 
 * Rules:
 *   null      → "No data yet" — metric exists but has no result for this period
 *   0 + treat_zero_as_missing → "No data yet" — zero means no real data for this KPI
 *   0         → Render normally (zero is a valid measurement)
 *   undefined → "—" — ingestion hasn't produced this value
 */

export type MetricDisplayState = "value" | "no_data" | "missing";

export interface MetricDisplayResult {
  state: MetricDisplayState;
  label: string;
  value: number | null;
}

export interface MetricDisplayOptions {
  treatZeroAsMissing?: boolean;
}

/**
 * Determine display state for a metric value.
 */
export function resolveMetricDisplay(
  value: number | null | undefined,
  unit?: string,
  options?: MetricDisplayOptions
): MetricDisplayResult {
  if (value === undefined) {
    return { state: "missing", label: "—", value: null };
  }

  if (value === null) {
    return { state: "no_data", label: "No data yet", value: null };
  }

  // Zero treated as missing for certain KPIs
  if (value === 0 && options?.treatZeroAsMissing) {
    return { state: "no_data", label: "No data yet", value: null };
  }

  // value is a number (including 0)
  return { state: "value", label: formatMetricValue(value, unit), value };
}

/**
 * Format a numeric metric value for display.
 */
export function formatMetricValue(
  value: number,
  unit?: string
): string {
  if (unit === "dollars" || unit === "$") {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  if (unit === "%" || unit === "percent") {
    return `${value.toFixed(1)}%`;
  }
  return value.toLocaleString();
}

/**
 * Check if a value represents "has data" (not null/undefined).
 * Zero IS considered valid data unless treatZeroAsMissing is set.
 */
export function hasMetricData(
  value: number | null | undefined,
  options?: MetricDisplayOptions
): value is number {
  if (value === null || value === undefined) return false;
  if (value === 0 && options?.treatZeroAsMissing) return false;
  return true;
}

/**
 * Determine appropriate CSS class for metric display state.
 */
export function metricDisplayClass(state: MetricDisplayState): string {
  switch (state) {
    case "value":
      return "";
    case "no_data":
      return "text-muted-foreground italic";
    case "missing":
      return "text-muted-foreground";
  }
}
