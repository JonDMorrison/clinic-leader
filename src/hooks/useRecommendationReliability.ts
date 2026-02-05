/**
 * Hook for fetching and evaluating reliability of recommendations
 */

import { useQuery } from "@tanstack/react-query";
import {
  evaluateReliability,
  fetchReliabilityInputs,
  type ReliabilityResult,
  type ReliabilityInputs,
} from "@/lib/interventions/recommendationReliabilityEvaluator";
import { classifyRecommendationTier, type RecommendationTier } from "@/lib/interventions/recommendationTiers";

interface UseReliabilityParams {
  metricId: string;
  interventionType: string;
  organizationId: string;
  confidenceScore: number;
  sampleSize: number;
  successRate: number;
  enabled?: boolean;
}

/**
 * Fetch and evaluate reliability for a single recommendation
 */
export function useRecommendationReliability({
  metricId,
  interventionType,
  organizationId,
  confidenceScore,
  sampleSize,
  successRate,
  enabled = true,
}: UseReliabilityParams) {
  return useQuery({
    queryKey: [
      "recommendation-reliability",
      metricId,
      interventionType,
      organizationId,
    ],
    queryFn: async (): Promise<ReliabilityResult> => {
      // Determine the original tier
      const tierConfig = classifyRecommendationTier({
        sampleSize,
        confidenceScore,
        successRate,
      });

      // Fetch reliability inputs from database
      const inputs = await fetchReliabilityInputs(
        metricId,
        interventionType,
        organizationId,
        {
          tier: tierConfig.tier,
          confidenceScore,
          sampleSize,
          successRate,
        }
      );

      // Evaluate reliability
      return evaluateReliability(inputs);
    },
    enabled: enabled && !!metricId && !!interventionType && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Batch fetch reliability for multiple recommendations
 */
export function useRecommendationsReliability(
  recommendations: Array<{
    id: string;
    metricId: string;
    interventionType: string;
    organizationId: string;
    confidenceScore: number;
    sampleSize: number;
    successRate: number;
  }>,
  enabled = true
) {
  return useQuery({
    queryKey: [
      "recommendations-reliability-batch",
      recommendations.map(r => `${r.id}-${r.interventionType}`).join(","),
    ],
    queryFn: async (): Promise<Map<string, ReliabilityResult>> => {
      const results = new Map<string, ReliabilityResult>();

      // Process in parallel
      await Promise.all(
        recommendations.map(async (rec) => {
          const tierConfig = classifyRecommendationTier({
            sampleSize: rec.sampleSize,
            confidenceScore: rec.confidenceScore,
            successRate: rec.successRate,
          });

          const inputs = await fetchReliabilityInputs(
            rec.metricId,
            rec.interventionType,
            rec.organizationId,
            {
              tier: tierConfig.tier,
              confidenceScore: rec.confidenceScore,
              sampleSize: rec.sampleSize,
              successRate: rec.successRate,
            }
          );

          const result = evaluateReliability(inputs);
          results.set(rec.id, result);
        })
      );

      return results;
    },
    enabled: enabled && recommendations.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a default reliability result for cases where evaluation isn't available
 */
export function createDefaultReliability(
  tier: RecommendationTier
): ReliabilityResult {
  return {
    reliability_score: 50,
    reliability_tier: "emerging_pattern",
    reliability_tier_label: "Emerging Pattern",
    reliability_explanations: ["Reliability evaluation pending"],
    downgrade_reason_codes: [],
    component_scores: {
      pattern_availability: 50,
      evidence_stability: 50,
      baseline_integrity: 50,
      execution_reliability: 50,
      data_density: 50,
    },
    ui_guardrails: {
      allow_recommend_tier: false,
      force_tier: tier === "recommend" ? "suggest" : tier,
      tone: "cautious",
    },
    effective_tier: tier,
    tier_downgraded: false,
    original_tier: tier,
    evidence_stats: {
      sample_size: 0,
      success_rate: null,
      variance: null,
      recency_days: null,
    },
  };
}
