/**
 * Recommendation Confidence Scoring Model
 * 
 * Deterministic formula for calculating confidence scores.
 * All inputs are structured data - no AI/ML black boxes.
 * 
 * FORMULA:
 * confidence = (historicalSuccessRate * 0.35) + 
 *              (sampleSizeScore * 0.25) +
 *              (similarityScore * 0.25) +
 *              (recencyScore * 0.15)
 * 
 * Each component is normalized to [0, 1].
 */

export interface ConfidenceInputs {
  // Historical success rate from pattern (0-1)
  historicalSuccessRate: number;
  
  // Number of historical cases this pattern is based on
  sampleSize: number;
  
  // How similar is current baseline deviation to historical cases
  // Computed from (1 - |currentDeviation - historicalAvgDeviation| / maxDeviation)
  baselineDeviationPercent: number;
  historicalAvgDeviationPercent: number;
  
  // Days since most recent intervention in pattern
  daysSinceMostRecentCase: number;
}

export interface ConfidenceResult {
  score: number;
  components: {
    historicalSuccessRate: number;
    sampleSizeScore: number;
    similarityScore: number;
    recencyScore: number;
  };
  explanation: string;
}

// Weights for each component
const WEIGHTS = {
  HISTORICAL_SUCCESS: 0.35,
  SAMPLE_SIZE: 0.25,
  SIMILARITY: 0.25,
  RECENCY: 0.15,
} as const;

// Thresholds
const MIN_CONFIDENCE_THRESHOLD = 0.35;
const MIN_SAMPLE_SIZE = 3;
const OPTIMAL_SAMPLE_SIZE = 10;
const RECENCY_HALF_LIFE_DAYS = 180; // 6 months

/**
 * Calculate sample size score (logarithmic scaling)
 * Score increases rapidly from 0-5 samples, then plateaus
 */
function calculateSampleSizeScore(sampleSize: number): number {
  if (sampleSize < MIN_SAMPLE_SIZE) return 0;
  // Logarithmic scaling: ln(n)/ln(optimal) capped at 1
  const score = Math.log(sampleSize) / Math.log(OPTIMAL_SAMPLE_SIZE);
  return Math.min(1, score);
}

/**
 * Calculate similarity score based on baseline deviation matching
 * Measures how close current situation is to historical patterns
 */
function calculateSimilarityScore(
  currentDeviation: number,
  historicalAvgDeviation: number
): number {
  // If no historical deviation data, return neutral score
  if (historicalAvgDeviation === 0) return 0.5;
  
  // Calculate absolute difference
  const diff = Math.abs(currentDeviation - historicalAvgDeviation);
  
  // Normalize: 0% diff = 1.0 score, 50%+ diff = 0.0 score
  const normalizedDiff = Math.min(diff, 50) / 50;
  return 1 - normalizedDiff;
}

/**
 * Calculate recency score using exponential decay
 * More recent patterns are more relevant
 */
function calculateRecencyScore(daysSinceMostRecent: number): number {
  // Exponential decay with half-life
  return Math.exp(-Math.log(2) * daysSinceMostRecent / RECENCY_HALF_LIFE_DAYS);
}

/**
 * Calculate final confidence score
 * Returns score and component breakdown
 */
export function calculateConfidence(inputs: ConfidenceInputs): ConfidenceResult {
  // Validate historical success rate
  const historicalSuccessRate = Math.max(0, Math.min(1, inputs.historicalSuccessRate));
  
  // Calculate component scores
  const sampleSizeScore = calculateSampleSizeScore(inputs.sampleSize);
  const similarityScore = calculateSimilarityScore(
    inputs.baselineDeviationPercent,
    inputs.historicalAvgDeviationPercent
  );
  const recencyScore = calculateRecencyScore(inputs.daysSinceMostRecentCase);
  
  // Calculate weighted sum
  const score =
    historicalSuccessRate * WEIGHTS.HISTORICAL_SUCCESS +
    sampleSizeScore * WEIGHTS.SAMPLE_SIZE +
    similarityScore * WEIGHTS.SIMILARITY +
    recencyScore * WEIGHTS.RECENCY;
  
  // Round to 4 decimal places
  const finalScore = Math.round(score * 10000) / 10000;
  
  // Build explanation
  let explanation = "";
  if (finalScore >= 0.7) {
    explanation = "High confidence based on strong historical success and similar conditions.";
  } else if (finalScore >= 0.5) {
    explanation = "Moderate confidence. Historical data supports this recommendation.";
  } else if (finalScore >= MIN_CONFIDENCE_THRESHOLD) {
    explanation = "Limited confidence. Consider with caution.";
  } else {
    explanation = "Below confidence threshold. Not recommended.";
  }
  
  return {
    score: finalScore,
    components: {
      historicalSuccessRate,
      sampleSizeScore,
      similarityScore,
      recencyScore,
    },
    explanation,
  };
}

/**
 * Check if a recommendation meets minimum confidence threshold
 */
export function meetsConfidenceThreshold(score: number): boolean {
  return score >= MIN_CONFIDENCE_THRESHOLD;
}

/**
 * Get confidence level label for display
 */
export function getConfidenceLabel(score: number): {
  label: string;
  variant: "default" | "destructive" | "warning" | "success";
} {
  if (score >= 0.7) {
    return { label: "High", variant: "success" };
  } else if (score >= 0.5) {
    return { label: "Moderate", variant: "default" };
  } else if (score >= MIN_CONFIDENCE_THRESHOLD) {
    return { label: "Low", variant: "warning" };
  } else {
    return { label: "Insufficient", variant: "destructive" };
  }
}

/**
 * Export constants for external use
 */
export const CONFIDENCE_THRESHOLDS = {
  MIN_CONFIDENCE: MIN_CONFIDENCE_THRESHOLD,
  MIN_SAMPLE_SIZE,
  OPTIMAL_SAMPLE_SIZE,
  RECENCY_HALF_LIFE_DAYS,
};
