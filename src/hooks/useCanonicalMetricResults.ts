/**
 * Hook for fetching canonical metric results with fallback to raw metric_results.
 * 
 * Strategy:
 * 1. First query metric_canonical_results for computed canonical values
 * 2. For any metric+period combos NOT in canonical, fallback to raw metric_results
 * 3. Mark fallback results with a warning flag for dev visibility
 */

import { supabase } from "@/integrations/supabase/client";

export interface CanonicalResult {
  metric_id: string;
  period_start: string;
  period_type: string;
  value: number | null;
  source: string | null;
  is_canonical: boolean;
  selection_reason?: string;
  computed_at?: string;
  created_at?: string;
  // Original result ID for tracing
  result_id?: string;
}

interface FetchCanonicalResultsParams {
  organizationId: string;
  metricIds: string[];
  periodType: 'week' | 'month';
  periodStarts: string[];
}

/**
 * Fetches canonical results for given metrics and periods.
 * Falls back to raw metric_results when canonical not computed yet.
 */
export async function fetchCanonicalMetricResults({
  organizationId,
  metricIds,
  periodType,
  periodStarts,
}: FetchCanonicalResultsParams): Promise<{
  results: CanonicalResult[];
  fallbackMetricIds: string[];
}> {
  if (metricIds.length === 0 || periodStarts.length === 0) {
    return { results: [], fallbackMetricIds: [] };
  }

  // 1. Query canonical results first
  const { data: canonicalData, error: canonicalError } = await supabase
    .from("metric_canonical_results")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("period_type", periodType)
    .in("metric_id", metricIds)
    .in("period_start", periodStarts);

  if (canonicalError) {
    console.error("[useCanonicalMetricResults] Canonical query error:", canonicalError);
    // Fall through to raw results
  }

  const canonicalResults: CanonicalResult[] = (canonicalData || []).map(r => ({
    metric_id: r.metric_id,
    period_start: r.period_start,
    period_type: r.period_type,
    value: r.value,
    source: r.chosen_source,
    is_canonical: true,
    selection_reason: r.selection_reason,
    computed_at: r.computed_at,
    created_at: r.computed_at,
    result_id: r.chosen_metric_result_id || undefined,
  }));

  // 2. Build set of canonical keys to identify gaps
  const canonicalKeys = new Set(
    canonicalResults.map(r => `${r.metric_id}|${r.period_start}`)
  );

  // 3. Find which metric+period combos need fallback
  const missingCombos: { metric_id: string; period_start: string }[] = [];
  for (const metricId of metricIds) {
    for (const periodStart of periodStarts) {
      const key = `${metricId}|${periodStart}`;
      if (!canonicalKeys.has(key)) {
        missingCombos.push({ metric_id: metricId, period_start: periodStart });
      }
    }
  }

  // 4. If all covered by canonical, return early
  if (missingCombos.length === 0) {
    return { results: canonicalResults, fallbackMetricIds: [] };
  }

  // 5. Query raw metric_results for missing combos
  const missingMetricIds = [...new Set(missingCombos.map(c => c.metric_id))];

  // For weekly, use week_start; for monthly, use period_start
  const rawQuery = supabase
    .from("metric_results")
    .select("id, metric_id, value, source, period_start, period_type, week_start, created_at")
    .in("metric_id", missingMetricIds);

  if (periodType === 'week') {
    rawQuery.in("week_start", periodStarts);
  } else {
    rawQuery.eq("period_type", "monthly").in("period_start", periodStarts);
  }

  const { data: rawData, error: rawError } = await rawQuery;

  if (rawError) {
    console.error("[useCanonicalMetricResults] Raw query error:", rawError);
    return { results: canonicalResults, fallbackMetricIds: missingMetricIds };
  }

  // 6. Convert raw results to canonical format with fallback flag
  const fallbackResults: CanonicalResult[] = (rawData || [])
    .filter(r => r.value !== null) // Exclude null values
    .map(r => ({
      metric_id: r.metric_id,
      period_start: periodType === 'week' ? r.week_start : r.period_start,
      period_type: periodType,
      value: r.value,
      source: r.source,
      is_canonical: false, // FALLBACK - not from canonical engine
      created_at: r.created_at,
      result_id: r.id,
    }));

  // 7. Merge results
  const allResults = [...canonicalResults, ...fallbackResults];

  return {
    results: allResults,
    fallbackMetricIds: missingMetricIds,
  };
}

/**
 * Groups results by metric_id for easy lookup
 */
export function groupResultsByMetric(
  results: CanonicalResult[]
): Record<string, CanonicalResult[]> {
  return results.reduce((acc, r) => {
    if (!acc[r.metric_id]) acc[r.metric_id] = [];
    acc[r.metric_id].push(r);
    return acc;
  }, {} as Record<string, CanonicalResult[]>);
}

/**
 * Checks if any results are non-canonical (fallback)
 */
export function hasNonCanonicalResults(results: CanonicalResult[]): boolean {
  return results.some(r => !r.is_canonical);
}
