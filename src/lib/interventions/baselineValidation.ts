/**
 * Baseline Validation Logic for Interventions
 * 
 * Determines baseline quality based on:
 * - Source type (manual vs automated)
 * - Historical data availability
 * - Timing relative to intervention creation
 */

export type BaselineQualityFlag = "good" | "iffy" | "bad";

export interface BaselineValidationInput {
  source: string | null;
  historicalPointCount: number;
  baselineCapturedAt: Date | null;
  interventionCreatedAt: Date | null;
}

export interface BaselineValidationResult {
  flag: BaselineQualityFlag;
  reasons: string[];
}

/**
 * Validates baseline quality and returns flag with reasons
 */
export function validateBaseline(input: BaselineValidationInput): BaselineValidationResult {
  const reasons: string[] = [];
  let flag: BaselineQualityFlag = "good";

  // Rule 1: If baseline captured after intervention created → bad
  if (
    input.baselineCapturedAt &&
    input.interventionCreatedAt &&
    input.baselineCapturedAt > input.interventionCreatedAt
  ) {
    flag = "bad";
    reasons.push("Baseline was captured after intervention was created");
  }

  // Rule 2: Manual source with <2 historical points → iffy
  if (
    input.source === "manual" &&
    input.historicalPointCount < 2
  ) {
    if (flag !== "bad") {
      flag = "iffy";
    }
    reasons.push("Manual data source with limited historical data (<2 points)");
  }

  // Additional checks that could make baseline iffy
  if (input.historicalPointCount === 0 && flag === "good") {
    flag = "iffy";
    reasons.push("No historical data points available for baseline");
  }

  if (reasons.length === 0) {
    reasons.push("Baseline has sufficient historical data and was captured before intervention");
  }

  return { flag, reasons };
}

/**
 * Returns display text for quality flag
 */
export function getQualityFlagLabel(flag: BaselineQualityFlag): string {
  switch (flag) {
    case "good":
      return "Good baseline";
    case "iffy":
      return "Uncertain baseline";
    case "bad":
      return "Unreliable baseline";
  }
}

/**
 * Returns color classes for quality flag badge
 */
export function getQualityFlagColors(flag: BaselineQualityFlag): string {
  switch (flag) {
    case "good":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "iffy":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "bad":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  }
}
