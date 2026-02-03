/**
 * Recommendation Eligibility Checker
 * 
 * HARDENED: Deterministic rules for when a metric is eligible for recommendations.
 * RULE: No target = No recommendations
 * RULE: Cooldown = 30 days unless deviation worsens by >5%
 * RULE: Minimum sample size = 3 periods
 */

import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

/** Default thresholds (can be overridden per-organization) */
export const DEFAULT_ELIGIBILITY_THRESHOLDS = {
  /** Minimum deviation % to trigger recommendations (e.g., -10 means 10% below target) */
  MIN_DEVIATION_PERCENT: -10,
  /** Days to wait before re-suggesting same recommendation */
  COOLDOWN_DAYS: 30,
  /** Deviation worsening threshold to bypass cooldown */
  COOLDOWN_WORSENING_THRESHOLD: 5,
  /** Minimum historical cases for pattern confidence */
  MIN_SAMPLE_SIZE: 3,
  /** Whether target is required (always true for determinism) */
  REQUIRE_TARGET: true,
} as const;

export interface EligibilityResult {
  isEligible: boolean;
  reason: string;
  target: number | null;
  currentValue: number | null;
  deviationPercent: number | null;
  sampleSize: number | null;
  cooldownActive: boolean;
  lastRunAt: string | null;
  lastDeviation: number | null;
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
  cooldownWorseningThreshold: number;
  minSampleSize: number;
  requireTarget: boolean;
}

export interface RecommendationRunInputs {
  current_value: number;
  target_value: number;
  deviation_percent: number;
  normalization_type?: string;
  sample_size: number;
  threshold_used: number;
}

export interface RecommendationEvidence {
  historical_cases: number;
  success_rate: number;
  avg_improvement_percent: number;
  avg_time_to_result_days: number;
  excluded_reasons: string[];
}

export interface StoredRecommendationRun {
  id: string;
  organization_id: string;
  metric_id: string;
  period_start: string;
  inputs: RecommendationRunInputs;
  evidence: RecommendationEvidence;
  recommendations: Array<{
    key: string;
    title: string;
    confidence: 'high' | 'medium' | 'low';
    expected_improvement: number;
    time_to_result_days: number;
  }>;
  created_at: string;
  eligible: boolean;
  ineligibility_reason: string | null;
}

/**
 * Fetch organization-specific eligibility configuration
 */
export async function getEligibilityConfig(organizationId: string): Promise<EligibilityConfig> {
  // Fetch individual config keys
  const { data } = await supabase
    .from("recommendation_config")
    .select("config_key, config_value")
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .in("config_key", ["deviation_threshold_percent", "min_sample_size", "cooldown_days", "cooldown_worsening_threshold"]);

  const configMap: Record<string, string> = {};
  data?.forEach(row => {
    configMap[row.config_key] = String(row.config_value);
  });

  return {
    minDeviationPercent: parseFloat(configMap.deviation_threshold_percent) || DEFAULT_ELIGIBILITY_THRESHOLDS.MIN_DEVIATION_PERCENT,
    cooldownDays: parseInt(configMap.cooldown_days) || DEFAULT_ELIGIBILITY_THRESHOLDS.COOLDOWN_DAYS,
    cooldownWorseningThreshold: parseFloat(configMap.cooldown_worsening_threshold) || DEFAULT_ELIGIBILITY_THRESHOLDS.COOLDOWN_WORSENING_THRESHOLD,
    minSampleSize: parseInt(configMap.min_sample_size) || DEFAULT_ELIGIBILITY_THRESHOLDS.MIN_SAMPLE_SIZE,
    requireTarget: true,
  };
}

/**
 * Check if a metric is eligible for recommendations using server-side RPC
 */
export async function checkMetricEligibility(
  organizationId: string,
  metricId: string,
  periodStart: Date
): Promise<EligibilityResult> {
  const periodStartStr = format(periodStart, 'yyyy-MM-dd');
  
  const { data, error } = await supabase.rpc('check_recommendation_eligibility', {
    _org_id: organizationId,
    _metric_id: metricId,
    _period_start: periodStartStr,
  });

  if (error) {
    console.error("Eligibility check failed:", error);
    return {
      isEligible: false,
      reason: "Failed to check eligibility",
      target: null,
      currentValue: null,
      deviationPercent: null,
      sampleSize: null,
      cooldownActive: false,
      lastRunAt: null,
      lastDeviation: null,
      thresholdUsed: DEFAULT_ELIGIBILITY_THRESHOLDS.MIN_DEVIATION_PERCENT,
    };
  }

  const result = (data as any[])?.[0];
  if (!result) {
    return {
      isEligible: false,
      reason: "No eligibility data returned",
      target: null,
      currentValue: null,
      deviationPercent: null,
      sampleSize: null,
      cooldownActive: false,
      lastRunAt: null,
      lastDeviation: null,
      thresholdUsed: DEFAULT_ELIGIBILITY_THRESHOLDS.MIN_DEVIATION_PERCENT,
    };
  }

  return {
    isEligible: result.eligible,
    reason: result.reason,
    target: result.target_value,
    currentValue: result.current_value,
    deviationPercent: result.deviation_percent,
    sampleSize: result.sample_size,
    cooldownActive: result.cooldown_active,
    lastRunAt: result.last_run_at,
    lastDeviation: result.last_deviation,
    thresholdUsed: DEFAULT_ELIGIBILITY_THRESHOLDS.MIN_DEVIATION_PERCENT,
  };
}

/**
 * Get or check for existing recommendation run
 */
export async function getRecommendationRun(
  organizationId: string,
  metricId: string,
  periodStart: Date
): Promise<StoredRecommendationRun | null> {
  const periodStartStr = format(periodStart, 'yyyy-MM-dd');
  
  const { data, error } = await supabase.rpc('get_recommendation_run', {
    _org_id: organizationId,
    _metric_id: metricId,
    _period_start: periodStartStr,
  });

  if (error) {
    console.error('Error getting recommendation run:', error);
    return null;
  }

  const result = (data as any[])?.[0];
  if (!result || !result.id) {
    return null;
  }

  return {
    id: result.id,
    organization_id: result.organization_id,
    metric_id: result.metric_id,
    period_start: result.period_start,
    inputs: result.inputs || {},
    evidence: result.evidence || {},
    recommendations: result.recommendations || [],
    created_at: result.created_at,
    eligible: result.eligible,
    ineligibility_reason: result.ineligibility_reason,
  };
}

/**
 * Save a recommendation run with evidence snapshot
 */
export async function saveRecommendationRun(
  organizationId: string,
  metricId: string,
  periodStart: Date,
  inputs: RecommendationRunInputs,
  evidence: RecommendationEvidence,
  recommendations: StoredRecommendationRun['recommendations']
): Promise<string | null> {
  const periodStartStr = format(periodStart, 'yyyy-MM-dd');
  const user = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('recommendation_runs')
    .upsert({
      organization_id: organizationId,
      metric_id: metricId,
      run_period_start: periodStartStr,
      inputs: inputs as any,
      evidence: evidence as any,
      recommendations: recommendations as any,
      deviation_at_run: inputs.deviation_percent,
      created_by: user.data.user?.id,
    }, {
      onConflict: 'organization_id,metric_id,run_period_start',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving recommendation run:', error);
    return null;
  }

  return data?.id || null;
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
 * Format eligibility reason for display with icon hint
 */
export function formatEligibilityReason(result: EligibilityResult): {
  icon: 'target' | 'clock' | 'history' | 'check' | 'alert';
  message: string;
  details?: string;
} {
  if (result.isEligible) {
    return {
      icon: 'check',
      message: 'Eligible for recommendations',
      details: `${result.sampleSize} historical periods available`,
    };
  }

  if (result.reason.includes('No target')) {
    return {
      icon: 'target',
      message: 'No target configured',
      details: 'Set a target for this metric to enable recommendations',
    };
  }

  if (result.cooldownActive || result.reason.includes('Cooldown')) {
    return {
      icon: 'clock',
      message: 'Cooldown active',
      details: result.reason,
    };
  }

  if (result.reason.includes('Insufficient') || result.reason.includes('history')) {
    return {
      icon: 'history',
      message: 'Insufficient historical data',
      details: result.reason,
    };
  }

  if (result.reason.includes('vs target') || result.reason.includes('At ')) {
    return {
      icon: 'check',
      message: 'On track',
      details: 'Metric is meeting or exceeding target',
    };
  }

  return {
    icon: 'alert',
    message: result.reason,
  };
}
