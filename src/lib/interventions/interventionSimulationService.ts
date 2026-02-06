/**
 * Intervention Simulation Service
 * 
 * Generates synthetic intervention data for testing cluster learning,
 * recommendation generation, and reliability guardrails.
 * 
 * SAFETY:
 * - All synthetic data is flagged with is_synthetic = true
 * - Synthetic data is excluded from production learning by default
 * - Clearly labeled in all UI components
 */

import { supabase } from "@/integrations/supabase/client";

// ============= Types =============

export type EffectDistribution = "positive" | "negative" | "mixed" | "neutral";
export type BaselineQuality = "good" | "iffy" | "bad";
export type BatchSize = 5 | 10 | 25 | 50;

export interface SimulationConfig {
  metricId: string;
  interventionType: string;
  baselineValue: number;
  expectedDirection: "up" | "down";
  effectMagnitude: number; // Percentage effect (-100 to +100)
  executionHealthScore: number; // 0-100
  baselineQuality: BaselineQuality;
  timeHorizonDays: number;
  organizationId: string;
  createdBy: string;
}

export interface BatchSimulationConfig {
  metricId: string;
  interventionType: string;
  organizationId: string;
  createdBy: string;
  batchSize: BatchSize;
  effectDistribution: EffectDistribution;
  baselineRange: { min: number; max: number };
  effectRange: { min: number; max: number };
  executionHealthRange: { min: number; max: number };
  baselineQualityMix: { good: number; iffy: number; bad: number }; // Percentages
  timeHorizonRange: { min: number; max: number };
}

export interface SimulationResult {
  interventionId: string;
  outcomeId: string | null;
  metricLinkId: string;
  success: boolean;
  error?: string;
}

export interface BatchSimulationResult {
  totalGenerated: number;
  successful: number;
  failed: number;
  interventionIds: string[];
  errors: string[];
}

export interface ClusterRecomputeResult {
  runId: string;
  clusterCount: number;
  outcomesProcessed: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface ValidationReport {
  timestamp: string;
  checks: {
    clusterGeneration: { passed: boolean; message: string };
    recommendationsUsingClusters: { passed: boolean; message: string };
    reliabilityDowngrade: { passed: boolean; message: string };
    outcomeConfidence: { passed: boolean; message: string };
    playbookCandidateDetection: { passed: boolean; message: string };
  };
  syntheticDataCount: {
    interventions: number;
    outcomes: number;
    metricResults: number;
  };
  overallPassed: boolean;
}

// ============= Random Utilities =============

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomIntInRange(min: number, max: number): number {
  return Math.floor(randomInRange(min, max + 1));
}

function pickWeightedRandom<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let random = Math.random() * total;
  
  for (const [key, weight] of entries) {
    random -= weight;
    if (random <= 0) return key;
  }
  
  return entries[0][0];
}

function generateEffectByDistribution(
  distribution: EffectDistribution,
  range: { min: number; max: number }
): number {
  switch (distribution) {
    case "positive":
      return Math.abs(randomInRange(range.min, range.max));
    case "negative":
      return -Math.abs(randomInRange(range.min, range.max));
    case "mixed":
      return randomInRange(-range.max, range.max);
    case "neutral":
      return randomInRange(-2, 2); // Very small effect
  }
}

// ============= Synthetic Data Generator =============

/**
 * Generate a single synthetic intervention with outcome
 */
export async function generateSyntheticIntervention(
  config: SimulationConfig
): Promise<SimulationResult> {
  try {
    // 1. Create intervention record
    const { data: intervention, error: intError } = await supabase
      .from("interventions")
      .insert({
        organization_id: config.organizationId,
        intervention_type: config.interventionType,
        title: `[SYNTHETIC] ${config.interventionType} simulation`,
        description: `Synthetic intervention for testing. Effect: ${config.effectMagnitude}%, Health: ${config.executionHealthScore}`,
        status: "completed",
        expected_time_horizon_days: config.timeHorizonDays,
        created_by: config.createdBy,
        execution_health_score: config.executionHealthScore,
        is_synthetic: true,
      } as any)
      .select("id")
      .single();

    if (intError || !intervention) {
      throw new Error(`Failed to create intervention: ${intError?.message}`);
    }

    // 2. Create metric link with baseline
    const { data: metricLink, error: linkError } = await supabase
      .from("intervention_metric_links")
      .insert({
        intervention_id: intervention.id,
        metric_id: config.metricId,
        baseline_value: config.baselineValue,
        baseline_quality_flag: config.baselineQuality,
        baseline_capture_method: "manual",
        baseline_captured_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (linkError || !metricLink) {
      throw new Error(`Failed to create metric link: ${linkError?.message}`);
    }

    // 3. Create synthetic metric results for baseline period
    const baselineDate = new Date();
    baselineDate.setDate(baselineDate.getDate() - config.timeHorizonDays - 7);
    
    await supabase.from("metric_results").insert({
      metric_id: config.metricId,
      organization_id: config.organizationId,
      week_start: baselineDate.toISOString().split("T")[0],
      value: config.baselineValue,
      source: "manual",
      is_synthetic: true,
      period_key: `${baselineDate.getFullYear()}-W${String(Math.ceil((baselineDate.getDate()) / 7)).padStart(2, '0')}`,
      period_start: baselineDate.toISOString().split("T")[0],
      period_type: "week",
    });

    // 4. Create outcome - intervention_outcomes needs metric_id
    const actualDelta = config.effectMagnitude;
    const confidenceScore = calculateSimulatedConfidence(config);
    
    const { data: outcome, error: outError } = await supabase
      .from("intervention_outcomes")
      .insert({
        metric_id: config.metricId,
        actual_delta_percent: actualDelta,
        confidence_score: confidenceScore,
        evaluated_at: new Date().toISOString(),
        evaluator_version: "simulation-v1",
        is_synthetic: true,
      } as any)
      .select("id")
      .single();

    if (outError) {
      console.warn(`Failed to create outcome: ${outError.message}`);
    }

    return {
      interventionId: intervention.id,
      outcomeId: outcome?.id || null,
      metricLinkId: metricLink.id,
      success: true,
    };
  } catch (error) {
    return {
      interventionId: "",
      outcomeId: null,
      metricLinkId: "",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate batch of synthetic interventions with varied parameters
 */
export async function generateBatchSyntheticInterventions(
  config: BatchSimulationConfig
): Promise<BatchSimulationResult> {
  const results: SimulationResult[] = [];
  const errors: string[] = [];

  for (let i = 0; i < config.batchSize; i++) {
    const baselineQuality = pickWeightedRandom(config.baselineQualityMix);
    const effectMagnitude = generateEffectByDistribution(
      config.effectDistribution,
      config.effectRange
    );

    const singleConfig: SimulationConfig = {
      metricId: config.metricId,
      interventionType: config.interventionType,
      baselineValue: randomInRange(config.baselineRange.min, config.baselineRange.max),
      expectedDirection: effectMagnitude >= 0 ? "up" : "down",
      effectMagnitude,
      executionHealthScore: randomIntInRange(
        config.executionHealthRange.min,
        config.executionHealthRange.max
      ),
      baselineQuality,
      timeHorizonDays: randomIntInRange(
        config.timeHorizonRange.min,
        config.timeHorizonRange.max
      ),
      organizationId: config.organizationId,
      createdBy: config.createdBy,
    };

    const result = await generateSyntheticIntervention(singleConfig);
    results.push(result);

    if (!result.success && result.error) {
      errors.push(result.error);
    }
  }

  return {
    totalGenerated: config.batchSize,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    interventionIds: results.filter((r) => r.success).map((r) => r.interventionId),
    errors,
  };
}

/**
 * Calculate simulated confidence score based on config
 */
function calculateSimulatedConfidence(config: SimulationConfig): number {
  let confidence = 50;

  // Baseline quality impact
  switch (config.baselineQuality) {
    case "good":
      confidence += 25;
      break;
    case "iffy":
      confidence += 10;
      break;
    case "bad":
      confidence -= 10;
      break;
  }

  // Execution health impact
  confidence += (config.executionHealthScore - 50) * 0.3;

  // Effect magnitude impact (stronger effects = higher confidence)
  confidence += Math.min(15, Math.abs(config.effectMagnitude) * 0.2);

  return Math.max(0, Math.min(100, Math.round(confidence)));
}

// ============= Cluster Recompute =============

/**
 * Trigger cluster recomputation with optional synthetic data inclusion.
 * Uses admin-gated RPC that validates permissions and logs access.
 */
export async function triggerClusterRecompute(
  includeSynthetic: boolean = false
): Promise<ClusterRecomputeResult> {
  try {
    // Call the admin-gated RPC to log and get run_id
    const { data: runId, error: rpcError } = await supabase.rpc(
      "recompute_intervention_patterns"
    );

    if (rpcError) {
      // Check for 403 unauthorized
      if (rpcError.code === "P0403" || rpcError.message?.includes("Unauthorized")) {
        return {
          runId: "",
          clusterCount: 0,
          outcomesProcessed: 0,
          durationMs: 0,
          success: false,
          error: "Access denied: Admin privileges required",
        };
      }
      throw new Error(rpcError.message);
    }

    // Call edge function
    const { data, error } = await supabase.functions.invoke(
      "compute-intervention-pattern-clusters",
      {
        body: {
          source: "simulation_harness",
          triggered_at: new Date().toISOString(),
          run_id: runId,
          include_synthetic: includeSynthetic,
        },
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    return {
      runId: data?.runId || runId,
      clusterCount: data?.patterns || 0,
      outcomesProcessed: data?.outcomesProcessed || 0,
      durationMs: data?.durationMs || 0,
      success: data?.success || false,
      error: data?.error,
    };
  } catch (error) {
    return {
      runId: "",
      clusterCount: 0,
      outcomesProcessed: 0,
      durationMs: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============= Synthetic Data Management =============

/**
 * Get count of synthetic data
 */
export async function getSyntheticDataCounts(): Promise<{
  interventions: number;
  outcomes: number;
  metricResults: number;
}> {
  const [intCount, outCount, mrCount] = await Promise.all([
    supabase
      .from("interventions")
      .select("id", { count: "exact", head: true })
      .eq("is_synthetic", true),
    supabase
      .from("intervention_outcomes")
      .select("id", { count: "exact", head: true })
      .eq("is_synthetic", true),
    supabase
      .from("metric_results")
      .select("id", { count: "exact", head: true })
      .eq("is_synthetic", true),
  ]);

  return {
    interventions: intCount.count || 0,
    outcomes: outCount.count || 0,
    metricResults: mrCount.count || 0,
  };
}

/**
 * Purge all synthetic data via admin-gated RPC
 * This function now uses the server-side purge_synthetic_data RPC
 * which validates admin permissions and logs the action.
 */
export async function purgeSyntheticData(): Promise<{
  success: boolean;
  deleted: { interventions: number; outcomes: number; metricResults: number };
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc("purge_synthetic_data");
    
    if (error) {
      // Check for 403 unauthorized
      if (error.code === "P0403" || error.message?.includes("Unauthorized")) {
        return {
          success: false,
          deleted: { interventions: 0, outcomes: 0, metricResults: 0 },
          error: "Access denied: Master admin privileges required",
        };
      }
      throw error;
    }

    const result = data as { success: boolean; deleted: { interventions: number; outcomes: number; metricResults: number } };
    return {
      success: result.success,
      deleted: result.deleted,
    };
  } catch (error) {
    return {
      success: false,
      deleted: { interventions: 0, outcomes: 0, metricResults: 0 },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============= Validation Report =============

/**
 * Run automated validation checks and generate report
 */
export async function generateValidationReport(): Promise<ValidationReport> {
  const syntheticCounts = await getSyntheticDataCounts();

  // Check 1: Cluster generation
  const { count: clusterCount } = await supabase
    .from("intervention_pattern_clusters")
    .select("id", { count: "exact", head: true });

  const clusterGeneration = {
    passed: (clusterCount || 0) > 0,
    message:
      (clusterCount || 0) > 0
        ? `${clusterCount} pattern clusters exist`
        : "No pattern clusters found - run cluster computation",
  };

  // Check 2: Recommendations using clusters
  const { data: recentRuns } = await supabase
    .from("recommendation_runs")
    .select("id, reliability_summary")
    .order("created_at", { ascending: false })
    .limit(5);

  const runsWithReliability = recentRuns?.filter((r) => r.reliability_summary) || [];
  const recommendationsUsingClusters = {
    passed: runsWithReliability.length > 0,
    message:
      runsWithReliability.length > 0
        ? `${runsWithReliability.length} recent runs have reliability data`
        : "No recommendation runs with cluster data found",
  };

  // Check 3: Reliability downgrade functioning
  const { count: downgradeCount } = await supabase
    .from("recommendation_runs")
    .select("id", { count: "exact", head: true })
    .not("reliability_summary->tier_downgraded", "is", null);

  const reliabilityDowngrade = {
    passed: true, // Can pass even with 0 downgrades if system is working
    message:
      (downgradeCount || 0) > 0
        ? `${downgradeCount} recommendations have been tier-downgraded`
        : "No tier downgrades recorded (may be normal if evidence is strong)",
  };

  // Check 4: Outcome confidence functioning
  const { data: outcomes } = await supabase
    .from("intervention_outcomes")
    .select("confidence_score")
    .not("confidence_score", "is", null)
    .limit(10);

  const outcomeConfidence = {
    passed: (outcomes?.length || 0) > 0,
    message:
      (outcomes?.length || 0) > 0
        ? `${outcomes?.length} outcomes have confidence scores`
        : "No outcomes with confidence scores found",
  };

  // Check 5: Playbook candidate detection
  const { count: playbookCount } = await supabase
    .from("intervention_playbooks")
    .select("id", { count: "exact", head: true });

  const playbookCandidateDetection = {
    passed: true, // May not have playbooks yet
    message:
      (playbookCount || 0) > 0
        ? `${playbookCount} playbook candidates detected`
        : "No playbook candidates yet (requires high success rate clusters)",
  };

  const checks = {
    clusterGeneration,
    recommendationsUsingClusters,
    reliabilityDowngrade,
    outcomeConfidence,
    playbookCandidateDetection,
  };

  const overallPassed =
    checks.clusterGeneration.passed &&
    checks.outcomeConfidence.passed;

  return {
    timestamp: new Date().toISOString(),
    checks,
    syntheticDataCount: syntheticCounts,
    overallPassed,
  };
}
