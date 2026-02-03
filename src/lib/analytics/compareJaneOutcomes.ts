/**
 * Jane vs Non-Jane Outcome Comparison Engine
 * Calculates performance deltas between EMR source groups
 * 
 * PRIVACY: All comparisons only include organizations that have opted in
 * via teams.benchmark_opt_in = true. Non-opted-in orgs never contribute
 * to cross-org aggregates.
 */

import { supabase } from "@/integrations/supabase/client";

export interface EMRGroupStats {
  emrSourceGroup: 'jane' | 'non_jane';
  organizationCount: number;
  medianValue: number;
  percentile25: number;
  percentile75: number;
  stdDeviation: number;
  sampleSize: number;
}

export interface OutcomeComparison {
  metricKey: string;
  periodKey: string;
  janeStats: EMRGroupStats | null;
  nonJaneStats: EMRGroupStats | null;
  performanceDelta: number | null;
  trendStability: 'stable' | 'moderate' | 'volatile';
  volatilityComparison: {
    janeVolatility: number;
    nonJaneVolatility: number;
    janeLessVolatile: boolean;
  } | null;
  improvementSpeedDays: {
    jane: number | null;
    nonJane: number | null;
  };
  interventionSuccessRate: {
    jane: number | null;
    nonJane: number | null;
  };
}

/**
 * Fetches benchmark aggregates for a specific metric and period
 */
export async function fetchBenchmarkAggregates(
  metricKey: string,
  periodKey: string
): Promise<{ jane: EMRGroupStats | null; nonJane: EMRGroupStats | null }> {
  const { data, error } = await supabase
    .from("benchmark_metric_aggregates")
    .select("*")
    .eq("metric_key", metricKey)
    .eq("period_key", periodKey);

  if (error || !data) {
    console.error("Error fetching benchmark aggregates:", error);
    return { jane: null, nonJane: null };
  }

  const jane = data.find(d => d.emr_source_group === 'jane');
  const nonJane = data.find(d => d.emr_source_group === 'non_jane');

  return {
    jane: jane ? mapToStats(jane) : null,
    nonJane: nonJane ? mapToStats(nonJane) : null,
  };
}

function mapToStats(row: any): EMRGroupStats {
  return {
    emrSourceGroup: row.emr_source_group,
    organizationCount: row.organization_count,
    medianValue: row.median_value,
    percentile25: row.percentile_25,
    percentile75: row.percentile_75,
    stdDeviation: row.std_deviation,
    sampleSize: row.sample_size,
  };
}

/**
 * Calculates trend stability based on coefficient of variation
 */
export function calculateTrendStability(stdDeviation: number, median: number): 'stable' | 'moderate' | 'volatile' {
  if (median === 0) return 'volatile';
  
  const cv = Math.abs(stdDeviation / median) * 100;
  
  if (cv < 15) return 'stable';
  if (cv < 35) return 'moderate';
  return 'volatile';
}

/**
 * Compares Jane vs Non-Jane outcomes for a given metric
 */
export async function compareJaneOutcomes(
  metricKey: string,
  periodKey: string
): Promise<OutcomeComparison> {
  const { jane: janeStats, nonJane: nonJaneStats } = await fetchBenchmarkAggregates(metricKey, periodKey);
  
  // Calculate performance delta (jane median vs non-jane median)
  let performanceDelta: number | null = null;
  if (janeStats && nonJaneStats && nonJaneStats.medianValue !== 0) {
    performanceDelta = ((janeStats.medianValue - nonJaneStats.medianValue) / nonJaneStats.medianValue) * 100;
  }
  
  // Calculate volatility comparison
  let volatilityComparison = null;
  if (janeStats && nonJaneStats) {
    const janeCV = janeStats.medianValue !== 0 ? Math.abs(janeStats.stdDeviation / janeStats.medianValue) : 0;
    const nonJaneCV = nonJaneStats.medianValue !== 0 ? Math.abs(nonJaneStats.stdDeviation / nonJaneStats.medianValue) : 0;
    
    volatilityComparison = {
      janeVolatility: Math.round(janeCV * 100),
      nonJaneVolatility: Math.round(nonJaneCV * 100),
      janeLessVolatile: janeCV < nonJaneCV,
    };
  }
  
  // Determine overall trend stability
  const trendStability = janeStats 
    ? calculateTrendStability(janeStats.stdDeviation, janeStats.medianValue)
    : 'volatile';
  
  return {
    metricKey,
    periodKey,
    janeStats,
    nonJaneStats,
    performanceDelta,
    trendStability,
    volatilityComparison,
    improvementSpeedDays: {
      jane: null, // To be populated from intervention analysis
      nonJane: null,
    },
    interventionSuccessRate: {
      jane: null, // To be populated from intervention analysis
      nonJane: null,
    },
  };
}

/**
 * Fetches intervention success comparison between EMR groups
 */
export async function fetchInterventionEMRAnalysis(
  periodKey: string
): Promise<Map<string, { jane: any; nonJane: any }>> {
  const { data, error } = await supabase
    .from("intervention_emr_analysis")
    .select("*")
    .eq("period_key", periodKey);

  if (error || !data) {
    console.error("Error fetching intervention EMR analysis:", error);
    return new Map();
  }

  const byType = new Map<string, { jane: any; nonJane: any }>();
  
  for (const row of data) {
    if (!byType.has(row.intervention_type)) {
      byType.set(row.intervention_type, { jane: null, nonJane: null });
    }
    const entry = byType.get(row.intervention_type)!;
    if (row.emr_source_group === 'jane') {
      entry.jane = row;
    } else {
      entry.nonJane = row;
    }
  }
  
  return byType;
}

/**
 * Calculates comprehensive comparison summary
 */
export async function generateComprehensiveComparison(
  metricKeys: string[],
  periodKey: string
): Promise<{
  metrics: OutcomeComparison[];
  overallJaneAdvantage: number;
  avgResolutionSpeedAdvantage: number | null;
  interventionSuccessAdvantage: number | null;
}> {
  const comparisons = await Promise.all(
    metricKeys.map(key => compareJaneOutcomes(key, periodKey))
  );
  
  // Calculate overall advantage
  const validDeltas = comparisons
    .filter(c => c.performanceDelta !== null)
    .map(c => c.performanceDelta!);
  
  const overallJaneAdvantage = validDeltas.length > 0
    ? validDeltas.reduce((a, b) => a + b, 0) / validDeltas.length
    : 0;
  
  // Fetch intervention analysis
  const interventionAnalysis = await fetchInterventionEMRAnalysis(periodKey);
  
  // Calculate average resolution speed advantage
  let resolutionAdvantages: number[] = [];
  let successAdvantages: number[] = [];
  
  interventionAnalysis.forEach(({ jane, nonJane }) => {
    if (jane && nonJane) {
      if (jane.avg_resolution_days && nonJane.avg_resolution_days) {
        const advantage = ((nonJane.avg_resolution_days - jane.avg_resolution_days) / nonJane.avg_resolution_days) * 100;
        resolutionAdvantages.push(advantage);
      }
      if (jane.success_rate !== null && nonJane.success_rate !== null) {
        successAdvantages.push(jane.success_rate - nonJane.success_rate);
      }
    }
  });
  
  return {
    metrics: comparisons,
    overallJaneAdvantage: Math.round(overallJaneAdvantage * 10) / 10,
    avgResolutionSpeedAdvantage: resolutionAdvantages.length > 0
      ? Math.round(resolutionAdvantages.reduce((a, b) => a + b, 0) / resolutionAdvantages.length * 10) / 10
      : null,
    interventionSuccessAdvantage: successAdvantages.length > 0
      ? Math.round(successAdvantages.reduce((a, b) => a + b, 0) / successAdvantages.length * 10) / 10
      : null,
  };
}
