/**
 * Intervention Progress Status Helper
 * Computes dynamic status based on time elapsed and outcomes
 */

import type { InterventionStatus } from "./types";

export type ProgressStatus = "planned" | "active" | "completed" | "abandoned" | "at_risk" | "overdue" | "on_track";

export interface InterventionOutcome {
  actual_delta_value: number | null;
  actual_delta_percent: number | null;
}

export interface InterventionInput {
  created_at: string;
  expected_time_horizon_days: number;
  status: InterventionStatus;
}

export interface InterventionProgress {
  status: ProgressStatus;
  days_elapsed: number;
  days_remaining: number;
  horizon_end_date: Date;
  has_any_outcomes: boolean;
  has_any_positive_delta: boolean;
  reason: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const AT_RISK_THRESHOLD_DAYS = 14;

/**
 * Calculate the dynamic progress status of an intervention
 */
export function getInterventionProgress({
  intervention,
  outcomes = [],
  now = new Date(),
}: {
  intervention: InterventionInput;
  outcomes?: InterventionOutcome[];
  now?: Date;
}): InterventionProgress {
  const createdAt = new Date(intervention.created_at);
  const horizonEndDate = new Date(createdAt.getTime() + intervention.expected_time_horizon_days * MS_PER_DAY);
  
  const daysElapsed = Math.floor((now.getTime() - createdAt.getTime()) / MS_PER_DAY);
  const daysRemaining = Math.floor((horizonEndDate.getTime() - now.getTime()) / MS_PER_DAY);
  
  const hasAnyOutcomes = outcomes.length > 0;
  const hasAnyPositiveDelta = outcomes.some(
    (o) => o.actual_delta_value !== null && o.actual_delta_value > 0
  );

  // Terminal statuses - return as-is
  if (intervention.status === "completed") {
    return {
      status: "completed",
      days_elapsed: daysElapsed,
      days_remaining: daysRemaining,
      horizon_end_date: horizonEndDate,
      has_any_outcomes: hasAnyOutcomes,
      has_any_positive_delta: hasAnyPositiveDelta,
      reason: "Intervention marked as completed",
    };
  }

  if (intervention.status === "abandoned") {
    return {
      status: "abandoned",
      days_elapsed: daysElapsed,
      days_remaining: daysRemaining,
      horizon_end_date: horizonEndDate,
      has_any_outcomes: hasAnyOutcomes,
      has_any_positive_delta: hasAnyPositiveDelta,
      reason: "Intervention was abandoned",
    };
  }

  if (intervention.status === "planned") {
    return {
      status: "planned",
      days_elapsed: daysElapsed,
      days_remaining: daysRemaining,
      horizon_end_date: horizonEndDate,
      has_any_outcomes: hasAnyOutcomes,
      has_any_positive_delta: hasAnyPositiveDelta,
      reason: "Intervention is planned but not yet active",
    };
  }

  // Active intervention - compute dynamic status
  
  // Overdue: past horizon_end_date AND no outcomes computed
  if (now > horizonEndDate && !hasAnyOutcomes) {
    return {
      status: "overdue",
      days_elapsed: daysElapsed,
      days_remaining: daysRemaining,
      horizon_end_date: horizonEndDate,
      has_any_outcomes: hasAnyOutcomes,
      has_any_positive_delta: hasAnyPositiveDelta,
      reason: `Time horizon exceeded by ${Math.abs(daysRemaining)} days with no outcomes evaluated`,
    };
  }

  // At Risk: within 14 days of horizon_end_date AND no positive delta
  if (daysRemaining <= AT_RISK_THRESHOLD_DAYS && daysRemaining > 0 && !hasAnyPositiveDelta) {
    return {
      status: "at_risk",
      days_elapsed: daysElapsed,
      days_remaining: daysRemaining,
      horizon_end_date: horizonEndDate,
      has_any_outcomes: hasAnyOutcomes,
      has_any_positive_delta: hasAnyPositiveDelta,
      reason: `Only ${daysRemaining} days remaining with no positive improvement detected`,
    };
  }

  // On Track: any linked metric has positive delta
  if (hasAnyPositiveDelta) {
    return {
      status: "on_track",
      days_elapsed: daysElapsed,
      days_remaining: daysRemaining,
      horizon_end_date: horizonEndDate,
      has_any_outcomes: hasAnyOutcomes,
      has_any_positive_delta: hasAnyPositiveDelta,
      reason: "Positive improvement detected in linked metrics",
    };
  }

  // Default: active
  return {
    status: "active",
    days_elapsed: daysElapsed,
    days_remaining: daysRemaining,
    horizon_end_date: horizonEndDate,
    has_any_outcomes: hasAnyOutcomes,
    has_any_positive_delta: hasAnyPositiveDelta,
    reason: "Intervention is active within time horizon",
  };
}

/**
 * Get badge styling for progress status
 */
export function getProgressStatusStyle(status: ProgressStatus): {
  className: string;
  label: string;
} {
  switch (status) {
    case "on_track":
      return {
        className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        label: "On Track",
      };
    case "at_risk":
      return {
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        label: "At Risk",
      };
    case "overdue":
      return {
        className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        label: "Overdue",
      };
    case "planned":
      return {
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        label: "Planned",
      };
    case "completed":
      return {
        className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
        label: "Completed",
      };
    case "abandoned":
      return {
        className: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
        label: "Abandoned",
      };
    case "active":
    default:
      return {
        className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
        label: "Active",
      };
  }
}
