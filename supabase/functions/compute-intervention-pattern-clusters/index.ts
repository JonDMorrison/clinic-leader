/**
 * Compute Intervention Pattern Clusters Edge Function
 * 
 * Scheduled background job that:
 * 1. Aggregates intervention outcomes by clustering dimensions
 * 2. Computes pattern metrics (success rate, variance, consistency, etc.)
 * 3. Stores anonymized results in intervention_pattern_clusters
 * 4. Triggers downstream recommendation refresh
 * 
 * SECURITY: 
 * - No org-identifiable data is stored
 * - Minimum sample size enforced (5 outcomes, 3 orgs) for anonymity
 * - Only aggregated statistics are persisted
 * 
 * IDEMPOTENCY:
 * - Same outcome dataset produces same cluster results
 * - Uses deterministic cluster_key for upsert
 * - Computation version tracked for reproducibility
 * 
 * SAFETY:
 * - On failure: existing clusters are NOT overwritten
 * - Audit log always written for observability
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= Configuration =============
const MIN_SAMPLE_SIZE = 5;
const MIN_ORGS_FOR_PATTERN = 3;
const MIN_CONFIDENCE_SCORE = 60; // Configurable threshold
const MIN_EFFECT_SIZE = 1.0; // Minimum delta percent for "success"
const COMPUTATION_VERSION = "3.0";

// ============= Types =============
interface OutcomeRecord {
  id: string;
  orgId: string;
  metricId: string;
  interventionType: string;
  timeHorizon: number;
  deltaPercent: number | null;
  confidenceScore: number;
  evaluatedAt: string | null;
  baselineValue: number | null;
  orgSize: number;
  specialty: string | null;
  expectedDirection: string | null;
}

interface ClusterRecord {
  cluster_key: string;
  metric_id: string;
  intervention_type: string;
  org_size_band: string;
  specialty_type: string | null;
  time_horizon_band: string;
  baseline_value_band: string;
  sample_size: number;
  success_rate: number;
  avg_delta_percent: number | null;
  median_delta_percent: number | null;
  variance_delta_percent: number | null;
  consistency_score: number;
  recency_score: number;
  pattern_confidence: number;
  computation_version: string;
  computed_at: string;
  aggregation_parameters: object;
}

// ============= Main Handler =============
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const runId = crypto.randomUUID();
  const startTime = new Date();
  let outcomeCount = 0;
  let clusterCount = 0;
  let status = "success";
  let errorSummary: string | null = null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Parse request body for include_synthetic flag (admin simulation only)
    let includeSynthetic = false;
    try {
      const body = await req.json();
      includeSynthetic = body?.include_synthetic === true;
      if (includeSynthetic) {
        console.log(`[${runId}] WARNING: Including synthetic data (simulation mode)`);
      }
    } catch {
      // No body or invalid JSON - use defaults
    }

    console.log(`[${runId}] Starting pattern cluster computation v${COMPUTATION_VERSION}...`);

    // ============= Step 1: Fetch eligible outcomes =============
    // CRITICAL: Exclude synthetic data by default to prevent production pollution
    let query = supabase
      .from("interventions")
      .select(`
        id, organization_id, intervention_type, expected_time_horizon_days, status, expected_direction, is_synthetic,
        intervention_metric_links!inner(metric_id, baseline_value, baseline_quality_flag),
        intervention_outcomes(id, actual_delta_percent, confidence_score, evaluated_at, evaluator_version, is_synthetic)
      `)
      .or("status.eq.completed,intervention_outcomes.evaluator_version.not.is.null");
    
    // Apply synthetic filter unless explicitly including synthetic data
    if (!includeSynthetic) {
      query = query.eq("is_synthetic", false);
    }
    
    const { data: interventions, error: fetchError } = await query;

    if (fetchError) throw new Error(`Fetch failed: ${fetchError.message}`);
    
    if (!interventions?.length) {
      await logAudit(supabase, runId, startTime, 0, 0, "success", null, includeSynthetic);
      return jsonResponse({ success: true, runId, patterns: 0, message: "No interventions found" });
    }

    // ============= Step 2: Get org metadata for banding (NOT stored) =============
    const orgIds = [...new Set(interventions.map(i => i.organization_id))];
    const { data: orgsData } = await supabase.from("teams").select("id, specialty").in("id", orgIds);
    const { data: userCounts } = await supabase.from("users").select("team_id").in("team_id", orgIds);

    const orgSizeMap = new Map<string, number>();
    (userCounts || []).forEach((u: any) => {
      orgSizeMap.set(u.team_id, (orgSizeMap.get(u.team_id) || 0) + 1);
    });

    const orgSpecialtyMap = new Map<string, string | null>();
    (orgsData || []).forEach((o: any) => orgSpecialtyMap.set(o.id, o.specialty));

    // ============= Step 3: Filter and transform outcomes =============
    const outcomes: OutcomeRecord[] = [];
    
    for (const int of interventions) {
      const links = int.intervention_metric_links || [];
      const outs = int.intervention_outcomes || [];
      const link = links[0];
      const out = outs[0];

      if (!out || !link) continue;
      
      // Filter: confidence_score >= threshold
      if ((out.confidence_score || 0) < MIN_CONFIDENCE_SCORE) continue;
      
      // Filter: baseline_quality_flag != 'bad'
      if (link.baseline_quality_flag === "bad") continue;
      
      // Filter: status completed OR evaluator_version present
      if (int.status !== "completed" && !out.evaluator_version) continue;

      outcomes.push({
        id: out.id || int.id,
        orgId: int.organization_id,
        metricId: link.metric_id,
        interventionType: int.intervention_type,
        timeHorizon: int.expected_time_horizon_days || 90,
        deltaPercent: out.actual_delta_percent,
        confidenceScore: out.confidence_score || 0,
        evaluatedAt: out.evaluated_at,
        baselineValue: link.baseline_value,
        orgSize: orgSizeMap.get(int.organization_id) || 1,
        specialty: orgSpecialtyMap.get(int.organization_id) || null,
        expectedDirection: int.expected_direction,
      });
    }
    outcomeCount = outcomes.length;

    if (outcomeCount === 0) {
      await logAudit(supabase, runId, startTime, 0, 0, "success", null, includeSynthetic);
      return jsonResponse({ success: true, runId, patterns: 0, message: "No eligible outcomes" });
    }

    console.log(`[${runId}] Processing ${outcomeCount} eligible outcomes...`);

    // ============= Step 4: Group into clusters =============
    const clusters = new Map<string, OutcomeRecord[]>();
    
    for (const o of outcomes) {
      const dimensions = [
        o.metricId,
        o.interventionType,
        classifyOrgSize(o.orgSize),
        o.specialty || "general",
        classifyTimeHorizon(o.timeHorizon),
        classifyBaseline(o.baselineValue),
      ];
      const key = generateClusterKey(dimensions);
      
      const arr = clusters.get(key) || [];
      arr.push(o);
      clusters.set(key, arr);
    }

    // ============= Step 5: Compute pattern metrics =============
    const patterns: ClusterRecord[] = [];
    const now = new Date();

    for (const [clusterKey, data] of clusters) {
      // Enforce minimum sample size
      if (data.length < MIN_SAMPLE_SIZE) continue;
      
      // Enforce minimum unique orgs for anonymity
      const uniqueOrgs = new Set(data.map(d => d.orgId)).size;
      if (uniqueOrgs < MIN_ORGS_FOR_PATTERN) continue;

      // Extract dimensions from first record
      const sample = data[0];
      const orgSizeBand = classifyOrgSize(sample.orgSize);
      const timeHorizonBand = classifyTimeHorizon(sample.timeHorizon);
      const baselineValueBand = classifyBaseline(sample.baselineValue);

      // Calculate success rate
      const withDelta = data.filter(d => d.deltaPercent !== null);
      const successCount = withDelta.filter(d => {
        const delta = d.deltaPercent!;
        const direction = d.expectedDirection;
        // Success = delta in expected direction AND above minimum effect size
        if (direction === "down") {
          return delta < -MIN_EFFECT_SIZE;
        }
        return delta > MIN_EFFECT_SIZE; // "up" or default
      }).length;
      const successRate = withDelta.length > 0 
        ? (successCount / withDelta.length) * 100 
        : 0;

      // Calculate delta statistics
      const deltas = data.map(d => d.deltaPercent).filter((d): d is number => d !== null);
      const avgDelta = deltas.length > 0 
        ? deltas.reduce((a, b) => a + b, 0) / deltas.length 
        : null;
      const sortedDeltas = [...deltas].sort((a, b) => a - b);
      const medianDelta = sortedDeltas.length > 0 
        ? sortedDeltas[Math.floor(sortedDeltas.length / 2)] 
        : null;
      const varianceDelta = deltas.length > 1 
        ? deltas.reduce((sum, d) => sum + Math.pow(d - (avgDelta || 0), 2), 0) / (deltas.length - 1) 
        : null;

      // Calculate recency score (decay by age)
      const recencyDays = data
        .filter(d => d.evaluatedAt)
        .map(d => Math.floor((now.getTime() - new Date(d.evaluatedAt!).getTime()) / 86400000));
      const avgRecency = recencyDays.length > 0 
        ? recencyDays.reduce((a, b) => a + b, 0) / recencyDays.length 
        : 90;
      const recencyScore = Math.pow(0.5, avgRecency / 90) * 100;

      // Calculate consistency score (higher when variance low + success stable)
      const stdDev = varianceDelta !== null ? Math.sqrt(varianceDelta) : null;
      const consistencyScore = stdDev !== null && avgDelta !== null && Math.abs(avgDelta) > 0
        ? Math.max(0, Math.min(100, 100 - (Math.abs(stdDev / avgDelta) * 50)))
        : 50;

      // Calculate pattern confidence (composite formula)
      const avgConfScore = data.reduce((sum, d) => sum + d.confidenceScore, 0) / data.length;
      const patternConfidence = Math.min(100, Math.max(0,
        (successRate / 100) * 30 +                                           // 30% weight on success
        Math.min(25, (Math.log2(data.length + 1) / Math.log2(21)) * 25) +   // 25% weight on sample size
        (consistencyScore / 100) * 20 +                                      // 20% weight on consistency
        (recencyScore / 100) * 15 +                                          // 15% weight on recency
        (avgConfScore / 100) * 10                                            // 10% weight on outcome confidence
      ));

      patterns.push({
        cluster_key: clusterKey,
        metric_id: sample.metricId,
        intervention_type: sample.interventionType,
        org_size_band: orgSizeBand,
        specialty_type: sample.specialty,
        time_horizon_band: timeHorizonBand,
        baseline_value_band: baselineValueBand,
        sample_size: data.length,
        success_rate: round(successRate, 2),
        avg_delta_percent: avgDelta !== null ? round(avgDelta, 2) : null,
        median_delta_percent: medianDelta !== null ? round(medianDelta, 2) : null,
        variance_delta_percent: varianceDelta !== null ? round(varianceDelta, 2) : null,
        consistency_score: round(consistencyScore, 2),
        recency_score: round(recencyScore, 2),
        pattern_confidence: round(patternConfidence, 2),
        computation_version: COMPUTATION_VERSION,
        computed_at: now.toISOString(),
        aggregation_parameters: {
          min_sample: MIN_SAMPLE_SIZE,
          min_orgs: MIN_ORGS_FOR_PATTERN,
          min_confidence: MIN_CONFIDENCE_SCORE,
          min_effect_size: MIN_EFFECT_SIZE,
          version: COMPUTATION_VERSION,
        },
      });
    }
    clusterCount = patterns.length;

    console.log(`[${runId}] Generated ${clusterCount} pattern clusters from ${outcomeCount} outcomes`);

    // ============= Step 6: Persist patterns via upsert =============
    if (clusterCount > 0) {
      // Upsert in batches of 50
      for (let i = 0; i < patterns.length; i += 50) {
        const batch = patterns.slice(i, i + 50);
        const { error } = await supabase
          .from("intervention_pattern_clusters")
          .upsert(batch, { onConflict: "cluster_key" });
        
        if (error) throw new Error(`Upsert failed: ${error.message}`);
      }
    }

    // ============= Step 7: Invalidate caches =============
    try {
      await supabase.rpc("invalidate_recommendation_caches");
      console.log(`[${runId}] Recommendation caches invalidated`);
    } catch (e) {
      console.warn(`[${runId}] Cache invalidation failed:`, e);
    }

    // ============= Step 8: Log audit record =============
    await logAudit(supabase, runId, startTime, outcomeCount, clusterCount, "success", null, includeSynthetic);

    const duration = Date.now() - startTime.getTime();
    return jsonResponse({
      success: true,
      runId,
      patterns: clusterCount,
      outcomesProcessed: outcomeCount,
      durationMs: duration,
      version: COMPUTATION_VERSION,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[${runId}] Error:`, msg);
    
    // On failure: do NOT overwrite existing clusters, only log audit
    await logAudit(supabase, runId, startTime, outcomeCount, 0, "failure", msg, false);
    
    return jsonResponse({ success: false, runId, error: msg }, 500);
  }
});

// ============= Helper Functions =============

async function logAudit(
  supabase: any,
  runId: string,
  startTime: Date,
  outcomeCount: number,
  clusterCount: number,
  status: string,
  errorSummary: string | null,
  includeSynthetic: boolean = false
) {
  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();

  await supabase.from("intervention_pattern_audit").insert({
    cluster_run_id: runId,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    outcome_count_processed: outcomeCount,
    cluster_count_generated: clusterCount,
    status,
    error_summary: errorSummary,
    computation_duration_ms: durationMs,
    version: COMPUTATION_VERSION,
    include_synthetic: includeSynthetic,
  });
}

/**
 * Generate deterministic cluster key from dimensions
 */
function generateClusterKey(dimensions: (string | null)[]): string {
  const input = dimensions.map(d => d || "null").join("|");
  // Simple hash function for determinism
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `${Math.abs(hash).toString(16)}_${input.length}`;
}

function classifyOrgSize(count: number): string {
  if (count <= 5) return "small";
  if (count <= 20) return "medium";
  return "large";
}

function classifyTimeHorizon(days: number): string {
  if (days <= 14) return "0-14d";
  if (days <= 30) return "15-30d";
  if (days <= 60) return "31-60d";
  if (days <= 90) return "61-90d";
  return "90d+";
}

function classifyBaseline(val: number | null): string {
  if (val === null) return "unknown";
  if (val < 25) return "very_low";
  if (val < 50) return "low";
  if (val < 75) return "medium";
  return "high";
}

function round(val: number, dec: number): number {
  const f = Math.pow(10, dec);
  return Math.round(val * f) / f;
}

function jsonResponse(data: object, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
