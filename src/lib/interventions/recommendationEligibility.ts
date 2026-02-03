/**
 * Recommendation Eligibility Checker
 * 
 * Deterministic rules for when a metric is eligible for intervention recommendations.
 * RULE: No target = No recommendations
 */

import { supabase } from "@/integrations/supabase/client";

/** Default thresholds (can be overridden per-organization) */
export const DEFAULT_ELIGIBILITY_THRESHOLDS = {
  /** Minimum deviation % to trigger recommendations (e.g., -10 means 10% below target) */
  MIN_DEVIATION_PERCENT: -10,
  /** Days to wait before re-suggesting same recommendation */
  COOLDOWN_DAYS: 30,
  /** Minimum historical cases for pattern confidence */
  MIN_SAMPLE_SIZE: 3,
  /** Whether target is required (always true for determinism) */
  REQUIRE_TARGET: true,
} as const;

export interface EligibilityResult {
  isEligible: boolean;
  reason: string;
  target: number | null;
  deviationPercent: number | null;
  thresholdUsed: number;
}

export interface CooldownResult {
  inCooldown: boolean;
  reason: string | null;
  lastRecommendedAt: Date | null;
  deviationWorsened: boolean;
}

export interface EligibilityConfig {
  minDeviationPercent: number;
  cooldownDays: number;
  minSampleSize: number;
  requireTarget: boolean;
}

/**
 * Fetch organization-specific eligibility configuration
 */
export async function getEligibilityConfig(organizationId: string): Promise<EligibilityConfig> {
  const { data } = await supabase
    .from("recommendation_config")
    .select("config_value")
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .eq("config_key", "eligibility_thresholds")
    .order("organization_id", { ascending: false, nullsFirst: false })
    .limit(1)
    .single();

  const config = data?.config_value as Record<string, unknown> | null;

  return {
    minDeviationPercent: (config?.min_deviation_percent as number) ?? DEFAULT_ELIGIBILITY_THRESHOLDS.MIN_DEVIATION_PERCENT,
    cooldownDays: (config?.cooldown_days as number) ?? DEFAULT_ELIGIBILITY_THRESHOLDS.COOLDOWN_DAYS,
    minSampleSize: (config?.min_sample_size as number) ?? DEFAULT_ELIGIBILITY_THRESHOLDS.MIN_SAMPLE_SIZE,
    requireTarget: (config?.require_target as boolean) ?? DEFAULT_ELIGIBILITY_THRESHOLDS.REQUIRE_TARGET,
  };
}

/**
 * Check if a metric is eligible for recommendations
 * Uses RPC for deterministic server-side evaluation
 */
export async function checkMetricEligibility(
  metricId: string,
  currentValue: number | null
): Promise<EligibilityResult> {
  const { data, error } = await supabase
    .rpc("is_metric_eligible_for_recommendations", {
      _metric_id: metricId,
      _current_value: currentValue,
    })
    .single();

  if (error) {
    console.error("Eligibility check failed:", error);
    return {
      isEligible: false,
      reason: "Failed to check eligibility",
      target: null,
      deviationPercent: null,
      thresholdUsed: DEFAULT_ELIGIBILITY_THRESHOLDS.MIN_DEVIATION_PERCENT,
    };
  }

  return {
    isEligible: data.is_eligible,
    reason: data.reason,
    target: data.target,
    deviationPercent: data.deviation_percent,
    thresholdUsed: data.threshold_used,
  };
}

/**
 * Check if a recommendation is in cooldown period
 */
export async function checkCooldown(
  organizationId: string,
  metricId: string,
  interventionType: string,
  currentDeviation: number | null
): Promise<CooldownResult> {
  const { data, error } = await supabase
    .rpc("is_recommendation_in_cooldown", {
      _org_id: organizationId,
      _metric_id: metricId,
      _intervention_type: interventionType,
      _current_deviation: currentDeviation,
    })
    .single();

  if (error) {
    console.error("Cooldown check failed:", error);
    return {
      inCooldown: false,
      reason: null,
      lastRecommendedAt: null,
      deviationWorsened: false,
    };
  }

  return {
    inCooldown: data.in_cooldown,
    reason: data.reason,
    lastRecommendedAt: data.last_recommended_at ? new Date(data.last_recommended_at) : null,
    deviationWorsened: data.deviation_worsened,
  };
}

/**
 * Calculate deviation percent deterministically
 */
export function calculateDeviation(
  currentValue: number | null,
  target: number | null,
  direction: string | null
): { deviationPercent: number | null; isOffTrack: boolean } {
  if (currentValue === null || target === null || target === 0) {
    return { deviationPercent: null, isOffTrack: false };
  }

  const deviation = ((currentValue - target) / Math.abs(target)) * 100;
  const isUp = direction === "up" || direction === ">=";
  
  // For "up" metrics: negative deviation = off-track
  // For "down" metrics: positive deviation = off-track
  const isOffTrack = isUp
    ? deviation <= DEFAULT_ELIGIBILITY_THRESHOLDS.MIN_DEVIATION_PERCENT
    : deviation >= Math.abs(DEFAULT_ELIGIBILITY_THRESHOLDS.MIN_DEVIATION_PERCENT);

  return { deviationPercent: deviation, isOffTrack };
}

/**
 * Format eligibility reason for display
 */
export function formatEligibilityReason(result: EligibilityResult): string {
  if (result.isEligible) {
    return `Eligible: ${result.reason}`;
  }
  return result.reason;
}
