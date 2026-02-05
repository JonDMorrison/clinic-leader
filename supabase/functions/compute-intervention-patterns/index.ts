/**
 * Compute Intervention Patterns Edge Function
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
 * - Computation version tracked for reproducibility
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_SAMPLE_SIZE = 5;
const MIN_ORGS_FOR_PATTERN = 3;
const MIN_CONFIDENCE_SCORE = 30;
const COMPUTATION_VERSION = "2.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const runId = crypto.randomUUID();
  const startTime = Date.now();
  let outcomeCount = 0;
  let clusterCount = 0;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log(`[${runId}] Starting pattern computation v${COMPUTATION_VERSION}...`);

    // Fetch completed interventions with outcomes
    const { data: interventions, error: fetchError } = await supabase
      .from("interventions")
      .select(`
        id, organization_id, intervention_type, expected_time_horizon_days, status,
        intervention_metric_links!inner(metric_id, baseline_value, baseline_quality_flag),
        intervention_outcomes(actual_delta_percent, confidence_score, evaluated_at)
      `)
      .eq("status", "completed")
      .not("intervention_outcomes", "is", null);

    if (fetchError) throw new Error(`Fetch failed: ${fetchError.message}`);
    if (!interventions?.length) {
      await logAudit(supabase, 0, 0, Date.now() - startTime, null);
      return jsonResponse({ success: true, patterns: 0, message: "No interventions" });
    }

    // Get org metadata
    const orgIds = [...new Set(interventions.map(i => i.organization_id))];
    const { data: orgsData } = await supabase.from("teams").select("id, specialty").in("id", orgIds);
    const { data: userCounts } = await supabase.from("users").select("team_id").in("team_id", orgIds);

    const orgSizeMap = new Map<string, number>();
    (userCounts || []).forEach((u: any) => orgSizeMap.set(u.team_id, (orgSizeMap.get(u.team_id) || 0) + 1));
    
    const orgSpecialtyMap = new Map<string, string | null>();
    (orgsData || []).forEach((o: any) => orgSpecialtyMap.set(o.id, o.specialty));

    // Transform data
    const outcomes: any[] = [];
    for (const int of interventions) {
      const links = int.intervention_metric_links || [];
      const outs = int.intervention_outcomes || [];
      const link = links[0];
      const out = outs[0];
      
      if (!out || !link) continue;
      if ((out.confidence_score || 0) < MIN_CONFIDENCE_SCORE) continue;
      if (link.baseline_quality_flag === "bad") continue;

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
      });
    }
    outcomeCount = outcomes.length;

    if (outcomeCount === 0) {
      await logAudit(supabase, 0, 0, Date.now() - startTime, null);
      return jsonResponse({ success: true, patterns: 0, message: "No eligible outcomes" });
    }

    // Group into clusters
    const clusters = new Map<string, any[]>();
    for (const o of outcomes) {
      const key = JSON.stringify([
        o.metricId,
        o.interventionType,
        classifyOrgSize(o.orgSize),
        o.specialty,
        classifyTimeHorizon(o.timeHorizon),
        classifyBaseline(o.baselineValue),
      ]);
      const arr = clusters.get(key) || [];
      arr.push(o);
      clusters.set(key, arr);
    }

    // Compute patterns
    const patterns: any[] = [];
    const now = new Date();

    for (const [keyStr, data] of clusters) {
      if (data.length < MIN_SAMPLE_SIZE) continue;
      const uniqueOrgs = new Set(data.map(d => d.orgId)).size;
      if (uniqueOrgs < MIN_ORGS_FOR_PATTERN) continue;

      const [metricId, interventionType, orgSizeBand, specialtyType, timeHorizonBand, baselineRangeBand] = JSON.parse(keyStr);

      const withDelta = data.filter(d => d.deltaPercent !== null);
      const successCount = withDelta.filter(d => d.deltaPercent > 0).length;
      const successRate = withDelta.length > 0 ? (successCount / withDelta.length) * 100 : 0;

      const deltas = data.map(d => d.deltaPercent).filter((d): d is number => d !== null);
      const avgEffect = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null;
      const sortedDeltas = [...deltas].sort((a, b) => a - b);
      const medianEffect = sortedDeltas.length > 0 ? sortedDeltas[Math.floor(sortedDeltas.length / 2)] : null;
      
      const variance = deltas.length > 1 ? deltas.reduce((sum, d) => sum + Math.pow(d - (avgEffect || 0), 2), 0) / (deltas.length - 1) : null;
      const stdDev = variance !== null ? Math.sqrt(variance) : null;

      const recencyDays = data.filter(d => d.evaluatedAt).map(d => {
        return Math.floor((now.getTime() - new Date(d.evaluatedAt).getTime()) / 86400000);
      });
      const avgRecency = recencyDays.length > 0 ? recencyDays.reduce((a, b) => a + b, 0) / recencyDays.length : 90;
      const recencyScore = Math.pow(0.5, avgRecency / 90) * 100;
      const recencyWeightedScore = avgEffect !== null ? avgEffect * (recencyScore / 100) : null;

      const consistencyScore = stdDev !== null && avgEffect !== null && Math.abs(avgEffect) > 0
        ? Math.max(0, 100 - (Math.abs(stdDev / avgEffect) * 100)) : 50;

      const avgConfScore = data.reduce((sum, d) => sum + d.confidenceScore, 0) / data.length;
      const patternConfidence = Math.min(100, Math.max(0,
        (successRate / 100) * 30 +
        Math.min(25, (Math.log2(data.length + 1) / Math.log2(21)) * 25) +
        (consistencyScore / 100) * 20 +
        (recencyScore / 100) * 15 +
        (avgConfScore / 100) * 10
      ));

      patterns.push({
        metric_id: metricId,
        intervention_type: interventionType,
        org_size_band: orgSizeBand,
        specialty_type: specialtyType,
        time_horizon_band: timeHorizonBand,
        baseline_range_band: baselineRangeBand,
        success_rate: round(successRate, 2),
        avg_effect_magnitude: avgEffect !== null ? round(avgEffect, 2) : null,
        median_effect_magnitude: medianEffect !== null ? round(medianEffect, 2) : null,
        effect_std_deviation: stdDev !== null ? round(stdDev, 2) : null,
        sample_size: data.length,
        recency_weighted_score: recencyWeightedScore !== null ? round(recencyWeightedScore, 2) : null,
        pattern_confidence: round(patternConfidence, 2),
        last_computed_at: now.toISOString(),
        computation_version: COMPUTATION_VERSION,
        source_outcome_ids: data.map(d => d.id),
        aggregation_parameters: { min_sample: MIN_SAMPLE_SIZE, min_orgs: MIN_ORGS_FOR_PATTERN, min_conf: MIN_CONFIDENCE_SCORE, version: COMPUTATION_VERSION },
      });
    }
    clusterCount = patterns.length;

    // Persist patterns
    if (clusterCount > 0) {
      await supabase.from("intervention_pattern_clusters").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      for (let i = 0; i < patterns.length; i += 50) {
        const { error } = await supabase.from("intervention_pattern_clusters").insert(patterns.slice(i, i + 50));
        if (error) throw new Error(`Insert failed: ${error.message}`);
      }
    }

    // Invalidate caches
    try { await supabase.rpc("invalidate_recommendation_caches"); } catch (e) { console.warn("Cache invalidation failed:", e); }

    const duration = Date.now() - startTime;
    await logAudit(supabase, clusterCount, outcomeCount, duration, null);

    return jsonResponse({ success: true, runId, patterns: clusterCount, outcomesProcessed: outcomeCount, durationMs: duration, version: COMPUTATION_VERSION });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[${runId}] Error:`, msg);
    await logAudit(supabase, 0, outcomeCount, Date.now() - startTime, msg);
    return jsonResponse({ success: false, runId, error: msg }, 500);
  }
});

async function logAudit(supabase: any, patterns: number, outcomes: number, duration: number, error: string | null) {
  await supabase.from("intervention_pattern_audit").insert({
    patterns_generated: patterns,
    interventions_analyzed: outcomes,
    orgs_included: 0,
    computation_duration_ms: duration,
    error_message: error,
    version: COMPUTATION_VERSION,
  });
}

function classifyOrgSize(count: number): string {
  if (count <= 5) return "small";
  if (count <= 20) return "medium";
  return "large";
}

function classifyTimeHorizon(days: number): string {
  if (days <= 30) return "30d";
  if (days <= 60) return "60d";
  if (days <= 90) return "90d";
  return "120d+";
}

function classifyBaseline(val: number | null): string {
  if (val === null) return "unknown";
  if (val < 33) return "low";
  if (val < 66) return "medium";
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
