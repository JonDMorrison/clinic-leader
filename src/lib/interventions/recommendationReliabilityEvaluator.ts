/**
 * Recommendation Reliability Evaluator
 * 
 * Evaluates the underlying quality of evidence supporting recommendations.
 * Sits AFTER confidence calculation to provide guardrails against overconfidence.
 * 
 * DETERMINISTIC: Same inputs always produce same outputs.
 * 
 * Evaluates:
 * A. Pattern Data Availability
 * B. Evidence Stability (variance, consistency)
 * C. Baseline Integrity
 * D. Execution Reliability
 * E. Data Density
 */

import { supabase } from "@/integrations/supabase/client";

// Export RecommendationTier for external use
export type RecommendationTier = "explore" | "suggest" | "recommend";

// ============= Types =============

export type ReliabilityTier = 
  | "insufficient_evidence"
  | "emerging_pattern"
  | "reliable_pattern"
  | "strong_evidence";

export type ReliabilityTierLabel = 
  | "Insufficient Evidence"
  | "Emerging Pattern"
  | "Reliable Pattern"
  | "Strong Evidence";

export type ToneType = "cautious" | "neutral" | "confident";

export type DowngradeReasonCode =
  | "no_pattern_clusters"
  | "low_cluster_count"
  | "low_sample_size"
  | "high_variance"
  | "low_consistency"
  | "poor_baseline_integrity"
  | "mixed_baseline_quality"
  | "bad_baseline_dominant"
  | "low_execution_health"
  | "insufficient_data_density"
  | "pattern_recency_stale";

export interface UIGuardrails {
  allow_recommend_tier: boolean;
  force_tier: "explore" | "suggest" | "recommend";
  tone: ToneType;
}

export interface ReliabilityResult {
  reliability_score: number; // 0-100
  reliability_tier: ReliabilityTier;
  reliability_tier_label: ReliabilityTierLabel;
  reliability_explanations: string[];
  downgrade_reason_codes: DowngradeReasonCode[];
  component_scores: {
    pattern_availability: number;
    evidence_stability: number;
    baseline_integrity: number;
    execution_reliability: number;
    data_density: number;
  };
  ui_guardrails: UIGuardrails;
  effective_tier: RecommendationTier; // Final tier after reliability downgrade
  tier_downgraded: boolean;
  original_tier: RecommendationTier;
  // Evidence stats for tooltip display
  evidence_stats: {
    sample_size: number;
    success_rate: number | null;
    variance: number | null;
    recency_days: number | null;
  };
}

export interface ReliabilityInputs {
  // From recommendation context
  recommendationTier: RecommendationTier;
  confidenceScore: number;
  sampleSize: number;
  successRate: number;
  
  // Pattern cluster data
  patternClusterExists: boolean;
  patternClusterCount: number;
  patternSampleSize: number;
  patternVariance: number | null;
  patternConsistencyScore: number | null;
  patternRecencyDays: number | null;
  
  // Baseline data from contributing interventions
  baselineQualityFlags: Array<"good" | "iffy" | "bad" | null>;
  
  // Execution health scores from interventions
  executionHealthScores: number[];
  
  // Data density (metric result points during evaluation)
  dataPointCount: number;
  evaluationWindowDays: number;
}

// ============= Thresholds =============

const THRESHOLDS = {
  // Sample size thresholds per spec
  SAMPLE_SIZE_INSUFFICIENT: 5,      // < 5 => Insufficient Evidence
  SAMPLE_SIZE_EMERGING: 10,         // 5-9 => Emerging Pattern
  SAMPLE_SIZE_RELIABLE: 25,         // 10-24 => Reliable Pattern
                                    // 25+ => Strong Evidence
  
  // Pattern availability
  MIN_CLUSTER_COUNT: 3,
  
  // Evidence stability
  MAX_VARIANCE_FOR_RELIABLE: 20, // %
  MIN_CONSISTENCY_SCORE: 50, // 0-100
  MAX_RECENCY_DAYS: 180, // 6 months
  
  // Baseline integrity
  MAX_IFFY_BASELINE_RATIO: 0.3, // 30%
  MAX_BAD_BASELINE_RATIO: 0.1, // 10%
  
  // Execution reliability
  MIN_EXECUTION_HEALTH: 60, // 0-100
  
  // Data density
  MIN_DATA_POINTS_PER_30_DAYS: 4,
};

// Tier label mapping
const TIER_LABELS: Record<ReliabilityTier, ReliabilityTierLabel> = {
  insufficient_evidence: "Insufficient Evidence",
  emerging_pattern: "Emerging Pattern",
  reliable_pattern: "Reliable Pattern",
  strong_evidence: "Strong Evidence",
};

const COMPONENT_WEIGHTS = {
  pattern_availability: 0.25,
  evidence_stability: 0.25,
  baseline_integrity: 0.20,
  execution_reliability: 0.15,
  data_density: 0.15,
};

// ============= Core Evaluation Function =============

/**
 * Evaluate reliability of recommendation evidence
 * Returns structured reliability assessment
 */
export function evaluateReliability(inputs: ReliabilityInputs): ReliabilityResult {
  const downgrades: DowngradeReasonCode[] = [];
  const explanations: string[] = [];

  // A. Pattern Data Availability Score
  const patternAvailability = evaluatePatternAvailability(inputs, downgrades, explanations);

  // B. Evidence Stability Score
  const evidenceStability = evaluateEvidenceStability(inputs, downgrades, explanations);

  // C. Baseline Integrity Score
  const baselineIntegrity = evaluateBaselineIntegrity(inputs, downgrades, explanations);

  // D. Execution Reliability Score
  const executionReliability = evaluateExecutionReliability(inputs, downgrades, explanations);

  // E. Data Density Score
  const dataDensity = evaluateDataDensity(inputs, downgrades, explanations);

  // Calculate weighted composite score
  const reliability_score = Math.round(
    patternAvailability * COMPONENT_WEIGHTS.pattern_availability +
    evidenceStability * COMPONENT_WEIGHTS.evidence_stability +
    baselineIntegrity * COMPONENT_WEIGHTS.baseline_integrity +
    executionReliability * COMPONENT_WEIGHTS.execution_reliability +
    dataDensity * COMPONENT_WEIGHTS.data_density
  );

  // Determine reliability tier based on sample size per spec
  const reliability_tier = determineReliabilityTierFromSampleSize(inputs.patternSampleSize, downgrades);

  // Determine UI guardrails based on reliability tier
  const ui_guardrails = computeUIGuardrails(reliability_tier, inputs.recommendationTier);

  // Determine effective recommendation tier after downgrade
  const { effective_tier, tier_downgraded } = applyTierDowngrade(
    inputs.recommendationTier,
    reliability_tier,
    downgrades
  );

  return {
    reliability_score,
    reliability_tier,
    reliability_tier_label: TIER_LABELS[reliability_tier],
    reliability_explanations: explanations,
    downgrade_reason_codes: downgrades,
    component_scores: {
      pattern_availability: patternAvailability,
      evidence_stability: evidenceStability,
      baseline_integrity: baselineIntegrity,
      execution_reliability: executionReliability,
      data_density: dataDensity,
    },
    ui_guardrails,
    effective_tier,
    tier_downgraded,
    original_tier: inputs.recommendationTier,
    evidence_stats: {
      sample_size: inputs.patternSampleSize,
      success_rate: inputs.successRate,
      variance: inputs.patternVariance,
      recency_days: inputs.patternRecencyDays,
    },
  };
}

// ============= Component Evaluators =============

function evaluatePatternAvailability(
  inputs: ReliabilityInputs,
  downgrades: DowngradeReasonCode[],
  explanations: string[]
): number {
  if (!inputs.patternClusterExists) {
    downgrades.push("no_pattern_clusters");
    explanations.push("No pattern cluster data available for this intervention type");
    return 0;
  }

  let score = 100;

  // Penalize low cluster count
  if (inputs.patternClusterCount < THRESHOLDS.MIN_CLUSTER_COUNT) {
    downgrades.push("low_cluster_count");
    explanations.push(`Only ${inputs.patternClusterCount} pattern clusters (minimum: ${THRESHOLDS.MIN_CLUSTER_COUNT})`);
    score -= 40;
  }

  // Penalize low sample size based on spec thresholds
  if (inputs.patternSampleSize < THRESHOLDS.SAMPLE_SIZE_INSUFFICIENT) {
    downgrades.push("low_sample_size");
    explanations.push(`Pattern based on only ${inputs.patternSampleSize} interventions (minimum: ${THRESHOLDS.SAMPLE_SIZE_INSUFFICIENT})`);
    score -= 60; // Major penalty
  } else if (inputs.patternSampleSize < THRESHOLDS.SAMPLE_SIZE_EMERGING) {
    explanations.push(`Pattern based on ${inputs.patternSampleSize} interventions (emerging)`);
    score -= 30;
  }

  // Penalize stale patterns
  if (inputs.patternRecencyDays !== null && inputs.patternRecencyDays > THRESHOLDS.MAX_RECENCY_DAYS) {
    downgrades.push("pattern_recency_stale");
    explanations.push(`Pattern data is ${inputs.patternRecencyDays} days old (maximum: ${THRESHOLDS.MAX_RECENCY_DAYS})`);
    score -= 20;
  }

  return Math.max(0, score);
}

function evaluateEvidenceStability(
  inputs: ReliabilityInputs,
  downgrades: DowngradeReasonCode[],
  explanations: string[]
): number {
  let score = 100;

  // Check variance
  if (inputs.patternVariance !== null) {
    if (inputs.patternVariance > THRESHOLDS.MAX_VARIANCE_FOR_RELIABLE) {
      downgrades.push("high_variance");
      explanations.push(`High outcome variance (${inputs.patternVariance.toFixed(1)}%) indicates inconsistent results`);
      score -= Math.min(50, (inputs.patternVariance - THRESHOLDS.MAX_VARIANCE_FOR_RELIABLE) * 2);
    }
  } else {
    score -= 20; // Penalty for missing variance data
  }

  // Check consistency
  if (inputs.patternConsistencyScore !== null) {
    if (inputs.patternConsistencyScore < THRESHOLDS.MIN_CONSISTENCY_SCORE) {
      downgrades.push("low_consistency");
      explanations.push(`Low consistency score (${inputs.patternConsistencyScore.toFixed(0)}%) suggests variable outcomes`);
      score -= (THRESHOLDS.MIN_CONSISTENCY_SCORE - inputs.patternConsistencyScore);
    }
  } else {
    score -= 20; // Penalty for missing consistency data
  }

  return Math.max(0, score);
}

function evaluateBaselineIntegrity(
  inputs: ReliabilityInputs,
  downgrades: DowngradeReasonCode[],
  explanations: string[]
): number {
  if (inputs.baselineQualityFlags.length === 0) {
    return 50; // Neutral if no data
  }

  const total = inputs.baselineQualityFlags.length;
  const iffyCount = inputs.baselineQualityFlags.filter(f => f === "iffy").length;
  const badCount = inputs.baselineQualityFlags.filter(f => f === "bad").length;

  const iffyRatio = iffyCount / total;
  const badRatio = badCount / total;

  let score = 100;

  // Per spec: if "bad" baselines dominate => Insufficient Evidence
  if (badRatio > 0.5) {
    downgrades.push("bad_baseline_dominant");
    explanations.push(`${Math.round(badRatio * 100)}% of interventions have poor baseline quality - evidence unreliable`);
    score = 0;
    return score;
  }

  // Per spec: if baseline quality is mixed/iffy-heavy => cap at Emerging Pattern
  if (iffyRatio > THRESHOLDS.MAX_IFFY_BASELINE_RATIO || badRatio > THRESHOLDS.MAX_BAD_BASELINE_RATIO) {
    downgrades.push("mixed_baseline_quality");
    if (badRatio > THRESHOLDS.MAX_BAD_BASELINE_RATIO) {
      explanations.push(`${Math.round(badRatio * 100)}% of interventions have poor baseline quality`);
      score -= 50;
    }
    if (iffyRatio > THRESHOLDS.MAX_IFFY_BASELINE_RATIO) {
      explanations.push(`${Math.round(iffyRatio * 100)}% of interventions have uncertain baseline quality`);
      score -= 30;
    }
  }

  // Penalize proportionally
  score -= (iffyRatio * 20) + (badRatio * 40);

  return Math.max(0, score);
}

function evaluateExecutionReliability(
  inputs: ReliabilityInputs,
  downgrades: DowngradeReasonCode[],
  explanations: string[]
): number {
  if (inputs.executionHealthScores.length === 0) {
    return 50; // Neutral if no data
  }

  const avgHealth = inputs.executionHealthScores.reduce((a, b) => a + b, 0) / inputs.executionHealthScores.length;

  if (avgHealth < THRESHOLDS.MIN_EXECUTION_HEALTH) {
    downgrades.push("low_execution_health");
    explanations.push(`Average execution health (${avgHealth.toFixed(0)}%) is below threshold (${THRESHOLDS.MIN_EXECUTION_HEALTH}%)`);
    return Math.max(0, avgHealth);
  }

  return avgHealth;
}

function evaluateDataDensity(
  inputs: ReliabilityInputs,
  downgrades: DowngradeReasonCode[],
  explanations: string[]
): number {
  if (inputs.evaluationWindowDays <= 0) {
    return 50; // Neutral if no window
  }

  const expectedPoints = (inputs.evaluationWindowDays / 30) * THRESHOLDS.MIN_DATA_POINTS_PER_30_DAYS;
  const densityRatio = inputs.dataPointCount / expectedPoints;

  if (densityRatio < 1) {
    downgrades.push("insufficient_data_density");
    explanations.push(`Only ${inputs.dataPointCount} data points over ${inputs.evaluationWindowDays} days (expected: ${Math.ceil(expectedPoints)})`);
    return Math.max(0, densityRatio * 100);
  }

  return 100;
}

/**
 * Determine reliability tier based on sample size per spec:
 * < 5 => Insufficient Evidence
 * 5-9 => Emerging Pattern
 * 10-24 => Reliable Pattern
 * 25+ => Strong Evidence
 */
function determineReliabilityTierFromSampleSize(
  sampleSize: number,
  downgrades: DowngradeReasonCode[]
): ReliabilityTier {
  // If no pattern clusters, insufficient evidence
  if (downgrades.includes("no_pattern_clusters")) {
    return "insufficient_evidence";
  }
  
  // If bad baselines dominate, cap at insufficient
  if (downgrades.includes("bad_baseline_dominant")) {
    return "insufficient_evidence";
  }

  // Sample size based tiers per spec
  if (sampleSize < THRESHOLDS.SAMPLE_SIZE_INSUFFICIENT) {
    return "insufficient_evidence";
  }
  if (sampleSize < THRESHOLDS.SAMPLE_SIZE_EMERGING) {
    return "emerging_pattern";
  }
  if (sampleSize < THRESHOLDS.SAMPLE_SIZE_RELIABLE) {
    return "reliable_pattern";
  }
  return "strong_evidence";
}

/**
 * Compute UI guardrails based on reliability tier
 */
function computeUIGuardrails(
  reliabilityTier: ReliabilityTier,
  originalTier: RecommendationTier
): UIGuardrails {
  switch (reliabilityTier) {
    case "insufficient_evidence":
      return {
        allow_recommend_tier: false,
        force_tier: "explore",
        tone: "cautious",
      };
    case "emerging_pattern":
      return {
        allow_recommend_tier: false,
        force_tier: originalTier === "recommend" ? "suggest" : originalTier,
        tone: "cautious",
      };
    case "reliable_pattern":
      return {
        allow_recommend_tier: originalTier === "recommend",
        force_tier: originalTier,
        tone: "neutral",
      };
    case "strong_evidence":
      return {
        allow_recommend_tier: true,
        force_tier: originalTier,
        tone: "confident",
      };
  }
}

function applyTierDowngrade(
  originalTier: RecommendationTier,
  reliabilityTier: ReliabilityTier,
  downgrades: DowngradeReasonCode[]
): { effective_tier: RecommendationTier; tier_downgraded: boolean } {
  const tierOrder: RecommendationTier[] = ["explore", "suggest", "recommend"];
  const originalIndex = tierOrder.indexOf(originalTier);

  let downgradeSteps = 0;

  // Rule 1: Insufficient evidence -> force to Explore
  if (reliabilityTier === "insufficient_evidence") {
    return { effective_tier: "explore", tier_downgraded: originalTier !== "explore" };
  }

  // Rule 2: Emerging pattern -> cap at Suggest
  if (reliabilityTier === "emerging_pattern" && originalTier === "recommend") {
    return { effective_tier: "suggest", tier_downgraded: true };
  }

  // Rule 3: Specific downgrade reasons
  if (downgrades.includes("no_pattern_clusters") || downgrades.includes("low_sample_size")) {
    downgradeSteps = 2; // Force to Explore
  } else if (downgrades.includes("high_variance")) {
    downgradeSteps = 1; // Downgrade by one tier
  } else if (downgrades.includes("poor_baseline_integrity")) {
    downgradeSteps = 1;
  }

  const effectiveIndex = Math.max(0, originalIndex - downgradeSteps);
  const effective_tier = tierOrder[effectiveIndex];

  return {
    effective_tier,
    tier_downgraded: effective_tier !== originalTier,
  };
}

// ============= Data Fetching =============

/**
 * Fetch reliability inputs for a recommendation
 */
export async function fetchReliabilityInputs(
  metricId: string,
  interventionType: string,
  organizationId: string,
  recommendationContext: {
    tier: RecommendationTier;
    confidenceScore: number;
    sampleSize: number;
    successRate: number;
  }
): Promise<ReliabilityInputs> {
  // Fetch pattern clusters for this intervention type + metric
  const { data: patterns } = await supabase
    .from("intervention_pattern_clusters")
    .select("*")
    .eq("intervention_type", interventionType)
    .or(`metric_id.eq.${metricId},metric_id.is.null`);

  const patternClusterExists = patterns !== null && patterns.length > 0;
  const patternClusterCount = patterns?.length ?? 0;
  
  // Aggregate pattern stats
  let patternSampleSize = 0;
  let patternVariance: number | null = null;
  let patternConsistencyScore: number | null = null;
  let patternRecencyDays: number | null = null;

  if (patterns && patterns.length > 0) {
    patternSampleSize = patterns.reduce((sum, p) => sum + (p.sample_size || 0), 0);
    
    // Average variance from patterns
    const variances = patterns
      .map(p => p.effect_std_deviation)
      .filter((v): v is number => v !== null);
    if (variances.length > 0) {
      patternVariance = variances.reduce((a, b) => a + b, 0) / variances.length;
    }

    // Average consistency (using pattern_confidence as proxy)
    const confidences = patterns
      .map(p => p.pattern_confidence)
      .filter((c): c is number => c !== null);
    if (confidences.length > 0) {
      patternConsistencyScore = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    }

    // Recency from most recent pattern
    const dates = patterns
      .map(p => p.last_computed_at)
      .filter((d): d is string => d !== null)
      .map(d => new Date(d));
    if (dates.length > 0) {
      const mostRecent = Math.max(...dates.map(d => d.getTime()));
      patternRecencyDays = Math.floor((Date.now() - mostRecent) / (1000 * 60 * 60 * 24));
    }
  }

  // Fetch baseline quality flags from interventions
  // CRITICAL: Exclude synthetic data from production reliability evaluation
  const { data: interventions } = await supabase
    .from("interventions")
    .select(`
      id,
      intervention_metric_links!inner(baseline_quality_flag)
    `)
    .eq("organization_id", organizationId)
    .eq("intervention_type", interventionType as any)
    .eq("status", "completed")
    .eq("is_synthetic", false)
    .limit(50);

  const baselineQualityFlags: Array<"good" | "iffy" | "bad" | null> = [];
  if (interventions) {
    for (const int of interventions) {
      const links = int.intervention_metric_links as any[];
      for (const link of links || []) {
        baselineQualityFlags.push(link.baseline_quality_flag as any);
      }
    }
  }

  // Fetch execution health scores from interventions
  // CRITICAL: Exclude synthetic data from production reliability evaluation
  const { data: healthScores } = await supabase
    .from("interventions")
    .select("execution_health_score")
    .eq("organization_id", organizationId)
    .eq("intervention_type", interventionType as any)
    .eq("status", "completed")
    .eq("is_synthetic", false)
    .not("execution_health_score", "is", null)
    .limit(50);

  const executionHealthScores = (healthScores || [])
    .map(h => h.execution_health_score)
    .filter((s): s is number => s !== null);

  // Fetch data density (metric result count)
  // CRITICAL: Exclude synthetic data from production reliability evaluation
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: dataPointCount } = await supabase
    .from("metric_results")
    .select("*", { count: "exact", head: true })
    .eq("metric_id", metricId)
    .eq("is_synthetic", false)
    .gte("result_date", thirtyDaysAgo);

  return {
    recommendationTier: recommendationContext.tier,
    confidenceScore: recommendationContext.confidenceScore,
    sampleSize: recommendationContext.sampleSize,
    successRate: recommendationContext.successRate,
    patternClusterExists,
    patternClusterCount,
    patternSampleSize,
    patternVariance,
    patternConsistencyScore,
    patternRecencyDays,
    baselineQualityFlags,
    executionHealthScores,
    dataPointCount: dataPointCount ?? 0,
    evaluationWindowDays: 30,
  };
}

// ============= Display Helpers =============

export function getReliabilityTierLabel(tier: ReliabilityTier): string {
  const labels: Record<ReliabilityTier, string> = {
    insufficient_evidence: "Insufficient Evidence",
    emerging_pattern: "Emerging Pattern",
    reliable_pattern: "Reliable Pattern",
    strong_evidence: "Strong Evidence",
  };
  return labels[tier];
}

export function getReliabilityTierColor(tier: ReliabilityTier): {
  variant: "default" | "secondary" | "outline" | "destructive";
  className: string;
} {
  switch (tier) {
    case "strong_evidence":
      return { variant: "default", className: "bg-primary text-primary-foreground" };
    case "reliable_pattern":
      return { variant: "secondary", className: "bg-secondary text-secondary-foreground" };
    case "emerging_pattern":
      return { variant: "outline", className: "border-warning text-warning-foreground" };
    case "insufficient_evidence":
      return { variant: "destructive", className: "bg-muted text-muted-foreground" };
  }
}

export function getInsufficientEvidenceMessage(): string {
  return "Not enough historical intervention evidence yet. This is an early hypothesis based on limited signals.";
}
