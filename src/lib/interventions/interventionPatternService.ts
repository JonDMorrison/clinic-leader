/**
 * Intervention Pattern Learning Engine
 * 
 * Identifies success patterns across interventions using anonymized clustering.
 * 
 * Clustering Dimensions:
 * - Metric ID
 * - Intervention Type  
 * - Org Size Band
 * - Specialty Type
 * - Time Horizon Band
 * - Baseline Range Band
 * 
 * Pattern Scoring:
 * - Success Rate
 * - Sample Size
 * - Recency Decay
 * - Effect Magnitude
 */

import { supabase } from "@/integrations/supabase/client";

// ============ Types ============

export interface PatternCluster {
  id: string;
  metricId: string | null;
  interventionType: string;
  orgSizeBand: OrgSizeBand;
  specialtyType: string | null;
  timeHorizonBand: TimeHorizonBand;
  baselineRangeBand: BaselineRangeBand;
  successRate: number;
  sampleSize: number;
  avgEffectMagnitude: number | null;
  medianEffectMagnitude: number | null;
  patternConfidence: number;
  lastComputedAt: string;
}

export type OrgSizeBand = "small" | "medium" | "large";
export type TimeHorizonBand = "30d" | "60d" | "90d" | "120d+";
export type BaselineRangeBand = "low" | "medium" | "high";

export interface PatternMatchCriteria {
  metricId?: string;
  interventionType?: string;
  orgSizeBand?: OrgSizeBand;
  specialtyType?: string;
  timeHorizonBand?: TimeHorizonBand;
  minConfidence?: number;
  minSampleSize?: number;
}

export interface PatternRecommendation {
  pattern: PatternCluster;
  matchScore: number; // 0-100 how well this pattern matches the criteria
  reasoning: string;
}

// ============ Band Classification Helpers ============

/**
 * Classify organization size into bands based on provider/staff count
 */
export function classifyOrgSize(providerCount: number): OrgSizeBand {
  if (providerCount <= 5) return "small";
  if (providerCount <= 20) return "medium";
  return "large";
}

/**
 * Classify time horizon into bands
 */
export function classifyTimeHorizon(days: number): TimeHorizonBand {
  if (days <= 30) return "30d";
  if (days <= 60) return "60d";
  if (days <= 90) return "90d";
  return "120d+";
}

/**
 * Classify baseline value into bands (relative to metric benchmarks)
 * Uses percentile position: low (<33), medium (33-66), high (>66)
 */
export function classifyBaselineRange(
  baselineValue: number,
  benchmarkP25: number | null,
  benchmarkP75: number | null
): BaselineRangeBand {
  if (benchmarkP25 === null || benchmarkP75 === null) {
    // Without benchmarks, use simple tertile
    return "medium";
  }
  
  if (baselineValue < benchmarkP25) return "low";
  if (baselineValue > benchmarkP75) return "high";
  return "medium";
}

// ============ Pattern Scoring ============

/**
 * Calculate pattern confidence score (0-100)
 * 
 * Weights:
 * - Success Rate: 35%
 * - Sample Size: 30% (diminishing returns after n=20)
 * - Effect Consistency: 20% (low std deviation = higher)
 * - Recency: 15%
 */
export function calculatePatternConfidence(params: {
  successRate: number;
  sampleSize: number;
  effectStdDeviation: number | null;
  avgRecencyDays: number;
}): number {
  const { successRate, sampleSize, effectStdDeviation, avgRecencyDays } = params;
  
  // Success rate contribution (0-35)
  const successScore = (successRate / 100) * 35;
  
  // Sample size contribution (0-30, diminishing returns)
  const sampleScore = Math.min(30, (Math.log2(sampleSize + 1) / Math.log2(21)) * 30);
  
  // Effect consistency contribution (0-20)
  let consistencyScore = 20;
  if (effectStdDeviation !== null && effectStdDeviation > 0) {
    // Lower std deviation = higher consistency
    consistencyScore = Math.max(0, 20 - (effectStdDeviation / 10));
  }
  
  // Recency contribution (0-15, decays over 180 days)
  const recencyScore = Math.max(0, 15 * (1 - avgRecencyDays / 180));
  
  return Math.min(100, Math.max(0, 
    successScore + sampleScore + consistencyScore + recencyScore
  ));
}

/**
 * Apply recency decay to effect magnitude
 * Exponential decay with half-life of 90 days
 */
export function applyRecencyDecay(magnitude: number, daysSinceEval: number): number {
  const halfLife = 90;
  const decayFactor = Math.pow(0.5, daysSinceEval / halfLife);
  return magnitude * decayFactor;
}

// ============ Pattern Fetching (Client-side) ============

/**
 * Fetch pattern clusters matching criteria
 * Used by recommendation engine to find applicable patterns
 */
export async function fetchMatchingPatterns(
  criteria: PatternMatchCriteria,
  limit = 10
): Promise<PatternCluster[]> {
  let query = supabase
    .from("intervention_pattern_clusters")
    .select("*")
    .order("pattern_confidence", { ascending: false })
    .limit(limit);

  // Apply filters
  if (criteria.metricId) {
    query = query.eq("metric_id", criteria.metricId);
  }
  if (criteria.interventionType) {
    query = query.eq("intervention_type", criteria.interventionType);
  }
  if (criteria.orgSizeBand) {
    query = query.eq("org_size_band", criteria.orgSizeBand);
  }
  if (criteria.specialtyType) {
    query = query.eq("specialty_type", criteria.specialtyType);
  }
  if (criteria.timeHorizonBand) {
    query = query.eq("time_horizon_band", criteria.timeHorizonBand);
  }
  if (criteria.minConfidence) {
    query = query.gte("pattern_confidence", criteria.minConfidence);
  }
  if (criteria.minSampleSize) {
    query = query.gte("sample_size", criteria.minSampleSize);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error("Error fetching patterns:", error);
    return [];
  }

  return (data || []).map(mapPatternFromDb);
}

/**
 * Find best patterns for a recommendation scenario
 */
export async function findPatternsForRecommendation(params: {
  metricId: string;
  interventionType?: string;
  orgSizeBand: OrgSizeBand;
  specialtyType?: string;
}): Promise<PatternRecommendation[]> {
  const { metricId, interventionType, orgSizeBand, specialtyType } = params;

  // Fetch patterns with flexible matching
  const patterns = await fetchMatchingPatterns({
    metricId,
    minConfidence: 30,
    minSampleSize: 3,
  }, 20);

  // Score each pattern for relevance
  const recommendations: PatternRecommendation[] = patterns.map((pattern) => {
    let matchScore = 50; // Base score for metric match
    let reasons: string[] = [];

    // Boost for matching intervention type
    if (interventionType && pattern.interventionType === interventionType) {
      matchScore += 20;
      reasons.push(`Same intervention type (${interventionType})`);
    }

    // Boost for matching org size
    if (pattern.orgSizeBand === orgSizeBand) {
      matchScore += 15;
      reasons.push(`Similar organization size (${orgSizeBand})`);
    }

    // Boost for matching specialty
    if (specialtyType && pattern.specialtyType === specialtyType) {
      matchScore += 15;
      reasons.push(`Same specialty (${specialtyType})`);
    }

    // Adjust by pattern confidence
    matchScore = matchScore * (pattern.patternConfidence / 100);

    return {
      pattern,
      matchScore: Math.round(matchScore),
      reasoning: reasons.length > 0 
        ? reasons.join(". ") 
        : "Based on similar interventions for this metric",
    };
  });

  // Sort by match score and return top results
  return recommendations
    .filter((r) => r.matchScore >= 25)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);
}

// ============ Helpers ============

function mapPatternFromDb(row: any): PatternCluster {
  return {
    id: row.id,
    metricId: row.metric_id,
    interventionType: row.intervention_type,
    orgSizeBand: row.org_size_band as OrgSizeBand,
    specialtyType: row.specialty_type,
    timeHorizonBand: row.time_horizon_band as TimeHorizonBand,
    baselineRangeBand: row.baseline_range_band as BaselineRangeBand,
    successRate: row.success_rate,
    sampleSize: row.sample_size,
    avgEffectMagnitude: row.avg_effect_magnitude,
    medianEffectMagnitude: row.median_effect_magnitude,
    patternConfidence: row.pattern_confidence,
    lastComputedAt: row.last_computed_at,
  };
}
