/**
 * Outcome Confidence Scoring
 * 
 * Enhanced confidence formula for intervention outcomes that includes:
 * - Baseline Quality Score
 * - Execution Health Score
 * - Data Density Score
 * - Pattern Cluster Strength
 * 
 * Formula:
 * confidence = (baselineQuality * 0.25) +
 *              (executionHealth * 0.25) +
 *              (dataDensity * 0.25) +
 *              (patternStrength * 0.25)
 * 
 * Each component is normalized to [0, 1], final score is 0-100.
 */

import type { BaselineQualityFlag } from "./baselineValidation";

// ============= Types =============

export interface OutcomeConfidenceInputs {
  // Baseline quality flag from validation
  baselineQualityFlag: BaselineQualityFlag;
  
  // Execution health score (0-100) from executionHealthScore.ts
  executionHealthScore: number;
  
  // Number of data points in evaluation period
  dataPointCount: number;
  
  // Pattern cluster confidence if available (0-100)
  patternClusterConfidence: number | null;
  
  // Historical sample size from pattern matching
  patternSampleSize: number;
}

export interface OutcomeConfidenceResult {
  /** Final composite score (0-100) */
  score: number;
  
  /** Individual component scores (0-1) */
  components: {
    baselineQuality: number;
    executionHealth: number;
    dataDensity: number;
    patternStrength: number;
  };
  
  /** Confidence level classification */
  level: ConfidenceLevel;
  
  /** Human-readable explanation */
  explanation: string;
}

export type ConfidenceLevel = "high" | "moderate" | "low" | "insufficient";

// ============= Constants =============

const WEIGHTS = {
  BASELINE_QUALITY: 0.25,
  EXECUTION_HEALTH: 0.25,
  DATA_DENSITY: 0.25,
  PATTERN_STRENGTH: 0.25,
} as const;

const THRESHOLDS = {
  HIGH: 70,
  MODERATE: 50,
  LOW: 30,
} as const;

// Data density scoring
const MIN_DATA_POINTS = 2;
const OPTIMAL_DATA_POINTS = 8; // 8 weeks of data

// ============= Score Calculation Functions =============

/**
 * Convert baseline quality flag to normalized score
 */
function scoreBaselineQuality(flag: BaselineQualityFlag): number {
  switch (flag) {
    case "good": return 1.0;
    case "iffy": return 0.5;
    case "bad": return 0.15;
    default: return 0.5;
  }
}

/**
 * Normalize execution health score (0-100) to (0-1)
 */
function scoreExecutionHealth(healthScore: number): number {
  return Math.max(0, Math.min(1, healthScore / 100));
}

/**
 * Score data density based on number of data points
 * Logarithmic scaling with floor at MIN_DATA_POINTS
 */
function scoreDataDensity(dataPointCount: number): number {
  if (dataPointCount < MIN_DATA_POINTS) return 0;
  
  // Logarithmic scaling: ln(n)/ln(optimal) capped at 1
  const score = Math.log(dataPointCount) / Math.log(OPTIMAL_DATA_POINTS);
  return Math.min(1, score);
}

/**
 * Score pattern cluster strength
 * Combines pattern confidence with sample size
 */
function scorePatternStrength(
  patternConfidence: number | null,
  sampleSize: number
): number {
  // If no pattern data, return neutral score
  if (patternConfidence === null || sampleSize === 0) {
    return 0.5;
  }
  
  // Normalize pattern confidence (0-100) to (0-1)
  const confidenceComponent = patternConfidence / 100;
  
  // Sample size component (log scale, optimal at 10)
  const sampleComponent = Math.min(1, Math.log(sampleSize + 1) / Math.log(11));
  
  // Weight confidence higher (60%) than sample size (40%)
  return confidenceComponent * 0.6 + sampleComponent * 0.4;
}

// ============= Main Calculation =============

/**
 * Calculate composite outcome confidence score
 */
export function calculateOutcomeConfidence(
  inputs: OutcomeConfidenceInputs
): OutcomeConfidenceResult {
  // Calculate individual component scores (0-1)
  const baselineQuality = scoreBaselineQuality(inputs.baselineQualityFlag);
  const executionHealth = scoreExecutionHealth(inputs.executionHealthScore);
  const dataDensity = scoreDataDensity(inputs.dataPointCount);
  const patternStrength = scorePatternStrength(
    inputs.patternClusterConfidence,
    inputs.patternSampleSize
  );
  
  // Calculate weighted composite (0-1)
  const compositeNormalized =
    baselineQuality * WEIGHTS.BASELINE_QUALITY +
    executionHealth * WEIGHTS.EXECUTION_HEALTH +
    dataDensity * WEIGHTS.DATA_DENSITY +
    patternStrength * WEIGHTS.PATTERN_STRENGTH;
  
  // Convert to 0-100 scale
  const score = Math.round(compositeNormalized * 100);
  
  // Determine confidence level
  const level = getConfidenceLevel(score);
  
  // Build explanation
  const explanation = buildExplanation(score, {
    baselineQuality,
    executionHealth,
    dataDensity,
    patternStrength,
  });
  
  return {
    score,
    components: {
      baselineQuality,
      executionHealth,
      dataDensity,
      patternStrength,
    },
    level,
    explanation,
  };
}

/**
 * Determine confidence level from score
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= THRESHOLDS.HIGH) return "high";
  if (score >= THRESHOLDS.MODERATE) return "moderate";
  if (score >= THRESHOLDS.LOW) return "low";
  return "insufficient";
}

/**
 * Build human-readable explanation
 */
function buildExplanation(
  score: number,
  components: OutcomeConfidenceResult["components"]
): string {
  const parts: string[] = [];
  
  if (components.baselineQuality < 0.5) {
    parts.push("baseline quality is uncertain");
  }
  if (components.executionHealth < 0.6) {
    parts.push("execution showed some issues");
  }
  if (components.dataDensity < 0.5) {
    parts.push("limited data points available");
  }
  if (components.patternStrength < 0.4) {
    parts.push("weak pattern matching");
  }
  
  if (parts.length === 0) {
    if (score >= THRESHOLDS.HIGH) {
      return "High confidence: Strong baseline, healthy execution, dense data, and solid pattern match.";
    }
    return "Moderate confidence: Most factors are acceptable.";
  }
  
  const level = getConfidenceLevel(score);
  const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);
  
  return `${levelLabel} confidence: ${parts.join(", ")}.`;
}

// ============= UI Helpers =============

export interface ConfidenceLevelConfig {
  level: ConfidenceLevel;
  label: string;
  description: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const LEVEL_CONFIGS: Record<ConfidenceLevel, ConfidenceLevelConfig> = {
  high: {
    level: "high",
    label: "High Confidence",
    description: "Strong evidence supports this outcome",
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-100 dark:bg-green-900/30",
    borderClass: "border-green-500/30",
  },
  moderate: {
    level: "moderate",
    label: "Moderate Confidence",
    description: "Reasonable evidence with some uncertainty",
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
    borderClass: "border-primary/30",
  },
  low: {
    level: "low",
    label: "Low Confidence",
    description: "Limited evidence, interpret with caution",
    colorClass: "text-warning dark:text-yellow-400",
    bgClass: "bg-warning/10 dark:bg-yellow-900/30",
    borderClass: "border-warning/30",
  },
  insufficient: {
    level: "insufficient",
    label: "Insufficient",
    description: "Not enough data to assess confidence",
    colorClass: "text-muted-foreground",
    bgClass: "bg-muted/50",
    borderClass: "border-muted",
  },
};

/**
 * Get configuration for confidence level UI
 */
export function getConfidenceLevelConfig(level: ConfidenceLevel): ConfidenceLevelConfig {
  return LEVEL_CONFIGS[level];
}

/**
 * Get configuration from score directly
 */
export function getConfidenceConfigFromScore(score: number): ConfidenceLevelConfig {
  return getConfidenceLevelConfig(getConfidenceLevel(score));
}

/**
 * Export thresholds for external use
 */
export const CONFIDENCE_LEVEL_THRESHOLDS = THRESHOLDS;
