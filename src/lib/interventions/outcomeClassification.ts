/**
 * Outcome Classification Logic
 * 
 * Classifies intervention outcomes as:
 * - successful: positive delta >= threshold
 * - failed: negative delta
 * - inconclusive: no clear signal or insufficient data
 * - at_risk: active but trending negative
 */

export type OutcomeClassification = "successful" | "failed" | "inconclusive" | "at_risk" | "pending";

export interface OutcomeClassificationResult {
  classification: OutcomeClassification;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const POSITIVE_THRESHOLD = 2; // % delta to consider successful
const NEGATIVE_THRESHOLD = -5; // % delta to consider failed

/**
 * Classify an intervention outcome based on delta and status
 */
export function classifyOutcome(params: {
  actualDeltaPercent: number | null | undefined;
  confidenceScore: number | null | undefined;
  interventionStatus: string;
  expectedDirection?: string | null;
}): OutcomeClassificationResult {
  const { actualDeltaPercent, confidenceScore, interventionStatus, expectedDirection } = params;

  // If intervention is active with no outcomes yet
  if (actualDeltaPercent === null || actualDeltaPercent === undefined) {
    if (interventionStatus === "active" || interventionStatus === "planned") {
      return {
        classification: "pending",
        label: "Pending",
        color: "text-muted-foreground",
        bgColor: "bg-muted/50",
        borderColor: "border-muted",
      };
    }
    return {
      classification: "inconclusive",
      label: "Inconclusive",
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/10",
      borderColor: "border-yellow-300 dark:border-yellow-700",
    };
  }

  // Adjust for expected direction (if we expect decrease, flip the logic)
  const effectiveDelta = expectedDirection === "down" ? -actualDeltaPercent : actualDeltaPercent;

  // Classify based on delta
  if (effectiveDelta >= POSITIVE_THRESHOLD) {
    return {
      classification: "successful",
      label: "Successful",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/10",
      borderColor: "border-green-300 dark:border-green-700",
    };
  }

  if (effectiveDelta <= NEGATIVE_THRESHOLD) {
    return {
      classification: "failed",
      label: "Failed",
      color: "text-destructive",
      bgColor: "bg-destructive/5",
      borderColor: "border-destructive/30",
    };
  }

  // At risk if active and slightly negative
  if ((interventionStatus === "active" || interventionStatus === "planned") && effectiveDelta < 0) {
    return {
      classification: "at_risk",
      label: "At Risk",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-900/10",
      borderColor: "border-orange-300 dark:border-orange-700",
    };
  }

  // Small movement, inconclusive
  return {
    classification: "inconclusive",
    label: "Inconclusive",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/10",
    borderColor: "border-yellow-300 dark:border-yellow-700",
  };
}

/**
 * Get confidence label
 */
export function getConfidenceLabel(score: number | null | undefined): string {
  if (score === null || score === undefined) return "Unknown";
  if (score >= 4) return "High";
  if (score >= 3) return "Medium";
  if (score >= 2) return "Low";
  return "Very Low";
}

/**
 * Get confidence variant for badge
 */
export function getConfidenceVariant(score: number | null | undefined): "default" | "secondary" | "outline" | "destructive" {
  if (score === null || score === undefined) return "outline";
  if (score >= 4) return "default";
  if (score >= 3) return "secondary";
  return "outline";
}
