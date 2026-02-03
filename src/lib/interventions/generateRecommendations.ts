/**
 * Recommendation Generation Engine
 * 
 * Generates intervention recommendations when metrics go off-track.
 * Uses historical intervention outcomes to suggest evidence-based interventions.
 */

import { supabase } from "@/integrations/supabase/client";
import { metricStatus, type MetricStatus } from "@/lib/scorecard/metricStatus";
import {
  calculateConfidence,
  meetsConfidenceThreshold,
  CONFIDENCE_THRESHOLDS,
  type ConfidenceInputs,
} from "./calculateRecommendationConfidence";
import {
  fetchInterventionHistory,
  groupInterventions,
  computePatternStats,
} from "./buildInterventionPatterns";
import type { InterventionType } from "./types";

export interface RecommendationCandidate {
  intervention_type: InterventionType;
  template_id: string | null;
  template_name: string;
  confidence_score: number;
  evidence_summary: string;
  recommendation_reason: RecommendationReason;
  suggested_duration_days: number;
  suggested_actions: string[];
}

export interface RecommendationReason {
  matched_cases_count: number;
  avg_improvement_percent: number;
  median_improvement_percent: number;
  typical_time_to_result_days: number;
  historical_success_rate: number;
  similar_context_notes: string[];
  confidence_components: {
    historicalSuccessRate: number;
    sampleSizeScore: number;
    similarityScore: number;
    recencyScore: number;
  };
}

export interface GeneratedRecommendation {
  organization_id: string;
  metric_id: string;
  period_key: string;
  recommended_intervention_template: RecommendationCandidate;
  confidence_score: number;
  evidence_summary: string;
  recommendation_reason: RecommendationReason;
}

interface MetricContext {
  id: string;
  name: string;
  target: number | null;
  direction: string | null;
  unit: string | null;
  current_value: number | null;
  baseline_deviation_percent: number;
}

/**
 * Check if metric is off-track for recommendation trigger
 */
function isMetricOffTrack(
  metric: { target: number | null; direction: string | null; owner?: string | null },
  value: number | null
): boolean {
  const status = metricStatus(metric, { value }, null);
  return status.status === "off_track";
}

/**
 * Calculate baseline deviation percentage
 */
function calculateDeviationPercent(
  currentValue: number | null,
  target: number | null
): number {
  if (currentValue === null || target === null || target === 0) return 0;
  return ((currentValue - target) / Math.abs(target)) * 100;
}

/**
 * Get the most recent intervention date from a list
 */
function getMostRecentInterventionDate(createdDates: string[]): Date {
  if (createdDates.length === 0) return new Date();
  const dates = createdDates.map((d) => new Date(d));
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

/**
 * Generate recommendations for a specific off-track metric
 */
export async function generateRecommendationsForMetric(
  organizationId: string,
  metricId: string,
  periodKey: string,
  currentValue: number | null
): Promise<GeneratedRecommendation[]> {
  // Get metric details
  const { data: metric, error: metricError } = await supabase
    .from("metrics")
    .select("id, name, target, direction, unit, owner")
    .eq("id", metricId)
    .single();

  if (metricError || !metric) {
    throw new Error(`Metric not found: ${metricId}`);
  }

  // Check if metric is off-track
  if (!isMetricOffTrack(metric, currentValue)) {
    return []; // Only generate for off-track metrics
  }

  // Fetch intervention history for this organization
  const history = await fetchInterventionHistory(organizationId);
  
  // Filter to interventions that targeted this metric
  const metricHistory = history.filter((h) => h.metric_id === metricId);
  
  // Check minimum sample size
  if (metricHistory.length < CONFIDENCE_THRESHOLDS.MIN_SAMPLE_SIZE) {
    return []; // Not enough historical data
  }

  // Get metric names for pattern computation
  const { data: metrics } = await supabase
    .from("metrics")
    .select("id, name")
    .eq("id", metricId);
  const metricName = metrics?.[0]?.name || "Unknown";

  // Group by intervention type
  const groups = groupInterventions(metricHistory);
  
  // Calculate current deviation
  const currentDeviation = calculateDeviationPercent(currentValue, metric.target);
  
  // Generate recommendations for each pattern
  const recommendations: GeneratedRecommendation[] = [];

  for (const group of groups) {
    const pattern = computePatternStats(group, metricName);
    if (!pattern || pattern.sample_size < CONFIDENCE_THRESHOLDS.MIN_SAMPLE_SIZE) {
      continue;
    }

    // Calculate historical average deviation
    const historicalDeviations = metricHistory
      .filter((h) => h.intervention_type === group.intervention_type)
      .map((h) => {
        if (h.baseline_value === null || metric.target === null || metric.target === 0) return 0;
        return ((h.baseline_value - metric.target) / Math.abs(metric.target)) * 100;
      });
    const avgHistoricalDeviation =
      historicalDeviations.length > 0
        ? historicalDeviations.reduce((a, b) => a + b, 0) / historicalDeviations.length
        : 0;

    // Calculate days since most recent case
    const recentDate = getMostRecentInterventionDate(
      metricHistory
        .filter((h) => h.intervention_type === group.intervention_type)
        .map((h) => h.created_at)
    );
    const daysSinceRecent = Math.round(
      (Date.now() - recentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate confidence
    const confidenceInputs: ConfidenceInputs = {
      historicalSuccessRate: pattern.success_rate,
      sampleSize: pattern.sample_size,
      baselineDeviationPercent: Math.abs(currentDeviation),
      historicalAvgDeviationPercent: Math.abs(avgHistoricalDeviation),
      daysSinceMostRecentCase: daysSinceRecent,
    };
    const confidence = calculateConfidence(confidenceInputs);

    // Skip if below threshold
    if (!meetsConfidenceThreshold(confidence.score)) {
      continue;
    }

    // Build recommendation reason
    const reason: RecommendationReason = {
      matched_cases_count: pattern.sample_size,
      avg_improvement_percent: Math.round(pattern.avg_improvement_percent * 100) / 100,
      median_improvement_percent: Math.round(pattern.median_improvement_percent * 100) / 100,
      typical_time_to_result_days: pattern.avg_time_to_result_days,
      historical_success_rate: Math.round(pattern.success_rate * 100),
      similar_context_notes: [
        `Based on ${pattern.sample_size} historical interventions`,
        `Average improvement: ${pattern.avg_improvement_percent.toFixed(1)}%`,
        `Typical time to see results: ${pattern.avg_time_to_result_days} days`,
      ],
      confidence_components: confidence.components,
    };

    // Build candidate
    const candidate: RecommendationCandidate = {
      intervention_type: pattern.intervention_type,
      template_id: null, // Will be linked if template exists
      template_name: `${pattern.intervention_type.replace("_", " ")} intervention`,
      confidence_score: confidence.score,
      evidence_summary: `This intervention type has a ${Math.round(pattern.success_rate * 100)}% success rate based on ${pattern.sample_size} historical cases. Average improvement: ${pattern.avg_improvement_percent.toFixed(1)}%.`,
      recommendation_reason: reason,
      suggested_duration_days: pattern.typical_duration_days,
      suggested_actions: pattern.common_actions,
    };

    recommendations.push({
      organization_id: organizationId,
      metric_id: metricId,
      period_key: periodKey,
      recommended_intervention_template: candidate,
      confidence_score: confidence.score,
      evidence_summary: candidate.evidence_summary,
      recommendation_reason: reason,
    });
  }

  // Sort by confidence score descending, take top 3
  recommendations.sort((a, b) => b.confidence_score - a.confidence_score);
  return recommendations.slice(0, 3);
}

/**
 * Store generated recommendations in database
 */
export async function storeRecommendations(
  recommendations: GeneratedRecommendation[]
): Promise<void> {
  if (recommendations.length === 0) return;

  // Mark existing recommendations for this metric/period as expired
  const first = recommendations[0];
  await supabase
    .from("intervention_recommendations")
    .update({ expires_at: new Date().toISOString() })
    .eq("organization_id", first.organization_id)
    .eq("metric_id", first.metric_id)
    .eq("period_key", first.period_key)
    .eq("dismissed", false)
    .eq("accepted", false);

  // Insert new recommendations - cast to any to handle JSONB typing
  const inserts = recommendations.map((r) => ({
    organization_id: r.organization_id,
    metric_id: r.metric_id,
    period_key: r.period_key,
    recommended_intervention_template: JSON.parse(JSON.stringify(r.recommended_intervention_template)),
    confidence_score: r.confidence_score,
    evidence_summary: r.evidence_summary,
    recommendation_reason: JSON.parse(JSON.stringify(r.recommendation_reason)),
    model_version: "v1.0",
  }));

  await supabase.from("intervention_recommendations").insert(inserts as any);
}

/**
 * Get active recommendations for a metric
 */
export async function getActiveRecommendations(
  organizationId: string,
  metricId: string,
  periodKey?: string
) {
  let query = supabase
    .from("intervention_recommendations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("metric_id", metricId)
    .eq("dismissed", false)
    .eq("accepted", false)
    .or("expires_at.is.null,expires_at.gt.now()")
    .order("confidence_score", { ascending: false });

  if (periodKey) {
    query = query.eq("period_key", periodKey);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Check if organization has opted into recommendations
 * Future: implement organization settings
 */
export async function isRecommendationEngineEnabled(
  _organizationId: string
): Promise<boolean> {
  // For now, enabled for all organizations with sufficient data
  return true;
}
