/**
 * Recommendation Tier Classification
 * 
 * Tiers based on sample size and confidence:
 * - Recommend: High confidence, sufficient sample (≥10)
 * - Suggest: Medium confidence, moderate sample (≥5)
 * - Explore: Low confidence or small sample (<5)
 */

export type RecommendationTier = "recommend" | "suggest" | "explore";

export interface TierConfig {
  tier: RecommendationTier;
  label: string;
  description: string;
  variant: "default" | "secondary" | "outline";
  icon: "star" | "lightbulb" | "compass";
}

const TIER_CONFIGS: Record<RecommendationTier, TierConfig> = {
  recommend: {
    tier: "recommend",
    label: "Recommend",
    description: "Strong evidence from 10+ similar cases with high success rate",
    variant: "default",
    icon: "star",
  },
  suggest: {
    tier: "suggest",
    label: "Suggest",
    description: "Moderate evidence from 5-9 similar cases",
    variant: "secondary",
    icon: "lightbulb",
  },
  explore: {
    tier: "explore",
    label: "Explore",
    description: "Limited evidence - consider as an experimental option",
    variant: "outline",
    icon: "compass",
  },
};

// Thresholds for tier classification
const THRESHOLDS = {
  recommend: {
    minSampleSize: 10,
    minConfidence: 0.6,
    minSuccessRate: 60,
  },
  suggest: {
    minSampleSize: 5,
    minConfidence: 0.4,
    minSuccessRate: 40,
  },
};

export interface TierClassificationInputs {
  sampleSize: number;
  confidenceScore: number;
  successRate: number;
}

/**
 * Classify recommendation into tier based on evidence strength
 */
export function classifyRecommendationTier(inputs: TierClassificationInputs): TierConfig {
  const { sampleSize, confidenceScore, successRate } = inputs;

  // Recommend tier: High evidence bar
  if (
    sampleSize >= THRESHOLDS.recommend.minSampleSize &&
    confidenceScore >= THRESHOLDS.recommend.minConfidence &&
    successRate >= THRESHOLDS.recommend.minSuccessRate
  ) {
    return TIER_CONFIGS.recommend;
  }

  // Suggest tier: Medium evidence bar
  if (
    sampleSize >= THRESHOLDS.suggest.minSampleSize &&
    confidenceScore >= THRESHOLDS.suggest.minConfidence &&
    successRate >= THRESHOLDS.suggest.minSuccessRate
  ) {
    return TIER_CONFIGS.suggest;
  }

  // Default to Explore tier
  return TIER_CONFIGS.explore;
}

/**
 * Get tier configuration by name
 */
export function getTierConfig(tier: RecommendationTier): TierConfig {
  return TIER_CONFIGS[tier];
}

/**
 * Format tier thresholds for explainability
 */
export function formatTierRequirements(tier: RecommendationTier): string[] {
  switch (tier) {
    case "recommend":
      return [
        `Sample size ≥ ${THRESHOLDS.recommend.minSampleSize} interventions`,
        `Confidence ≥ ${THRESHOLDS.recommend.minConfidence * 100}%`,
        `Success rate ≥ ${THRESHOLDS.recommend.minSuccessRate}%`,
      ];
    case "suggest":
      return [
        `Sample size ≥ ${THRESHOLDS.suggest.minSampleSize} interventions`,
        `Confidence ≥ ${THRESHOLDS.suggest.minConfidence * 100}%`,
        `Success rate ≥ ${THRESHOLDS.suggest.minSuccessRate}%`,
      ];
    case "explore":
      return [
        "Below thresholds for Suggest tier",
        "Consider as experimental option",
        "Monitor closely if implemented",
      ];
  }
}
