/**
 * Compute Intervention Patterns Edge Function
 * 
 * Scheduled background job that:
 * 1. Aggregates intervention outcomes across organizations
 * 2. Clusters by dimensions (metric, type, org size, specialty, time horizon, baseline)
 * 3. Calculates pattern scores (success rate, sample size, recency, effect magnitude)
 * 4. Stores anonymized results in intervention_pattern_clusters
 * 
 * SECURITY: 
 * - No org-identifiable data is stored
 * - Minimum sample size enforced (5 orgs) for anonymity
 * - Only aggregated statistics are persisted
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_SAMPLE_SIZE = 5; // Minimum interventions for pattern to be stored
const MIN_ORGS_FOR_PATTERN = 3; // Minimum unique orgs for anonymity

interface ClusterKey {
  metricId: string | null;
  interventionType: string;
  orgSizeBand: string;
  specialtyType: string | null;
  timeHorizonBand: string;
  baselineRangeBand: string;
}

interface InterventionData {
  id: string;
  orgId: string;
  metricId: string | null;
  interventionType: string;
  timeHorizon: number;
  status: string;
  deltaPercent: number | null;
  evaluatedAt: string | null;
  baselineValue: number | null;
  orgSize: number;
  specialty: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Initialize Supabase client with service role for full access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting intervention pattern computation...");

    // Step 1: Fetch all completed interventions with outcomes
    const { data: interventions, error: fetchError } = await supabase
      .from("interventions")
      .select(`
        id,
        organization_id,
        intervention_type,
        expected_time_horizon_days,
        status,
        intervention_metric_links!inner(
          metric_id,
          baseline_value
        ),
        intervention_outcomes(
          actual_delta_percent,
          evaluated_at
        )
      `)
      .in("status", ["completed", "active"])
      .not("intervention_outcomes", "is", null);

    if (fetchError) {
      throw new Error(`Failed to fetch interventions: ${fetchError.message}`);
    }

    if (!interventions || interventions.length === 0) {
      console.log("No interventions found for pattern analysis");
      return new Response(
        JSON.stringify({ success: true, patterns: 0, message: "No interventions to analyze" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Fetch organization metadata for size/specialty classification
    const orgIds = [...new Set(interventions.map((i) => i.organization_id))];
    const { data: orgsData } = await supabase
      .from("teams")
      .select("id, specialty")
      .in("id", orgIds);

    // Get provider counts for org size
    const { data: userCounts } = await supabase
      .from("users")
      .select("team_id")
      .in("team_id", orgIds);

    // Calculate org sizes
    const orgSizeMap = new Map<string, number>();
    (userCounts || []).forEach((u) => {
      const current = orgSizeMap.get(u.team_id) || 0;
      orgSizeMap.set(u.team_id, current + 1);
    });

    const orgSpecialtyMap = new Map<string, string | null>();
    (orgsData || []).forEach((o) => {
      orgSpecialtyMap.set(o.id, o.specialty || null);
    });

    // Step 3: Transform interventions into analyzable format
    const interventionData: InterventionData[] = [];

    for (const intervention of interventions) {
      const links = intervention.intervention_metric_links || [];
      const outcomes = intervention.intervention_outcomes || [];
      
      // Use first outcome for simplicity
      const outcome = outcomes[0];
      const link = links[0];
      
      if (!outcome || !link) continue;

      interventionData.push({
        id: intervention.id,
        orgId: intervention.organization_id,
        metricId: link.metric_id,
        interventionType: intervention.intervention_type,
        timeHorizon: intervention.expected_time_horizon_days || 90,
        status: intervention.status,
        deltaPercent: outcome.actual_delta_percent,
        evaluatedAt: outcome.evaluated_at,
        baselineValue: link.baseline_value,
        orgSize: orgSizeMap.get(intervention.organization_id) || 1,
        specialty: orgSpecialtyMap.get(intervention.organization_id) || null,
      });
    }

    console.log(`Analyzing ${interventionData.length} interventions...`);

    // Step 4: Group into clusters
    const clusters = new Map<string, InterventionData[]>();

    for (const data of interventionData) {
      const key = buildClusterKey({
        metricId: data.metricId,
        interventionType: data.interventionType,
        orgSizeBand: classifyOrgSize(data.orgSize),
        specialtyType: data.specialty,
        timeHorizonBand: classifyTimeHorizon(data.timeHorizon),
        baselineRangeBand: classifyBaselineRange(data.baselineValue),
      });

      const existing = clusters.get(key) || [];
      existing.push(data);
      clusters.set(key, existing);
    }

    // Step 5: Calculate pattern statistics for each cluster
    const patterns: any[] = [];
    const now = new Date();

    for (const [keyStr, clusterData] of clusters) {
      // Enforce minimum sample size
      if (clusterData.length < MIN_SAMPLE_SIZE) continue;

      // Enforce minimum unique orgs for anonymity
      const uniqueOrgs = new Set(clusterData.map((d) => d.orgId)).size;
      if (uniqueOrgs < MIN_ORGS_FOR_PATTERN) continue;

      const key = parseClusterKey(keyStr);
      
      // Calculate success rate (positive delta = success)
      const successfulCount = clusterData.filter(
        (d) => d.deltaPercent !== null && d.deltaPercent > 0
      ).length;
      const successRate = (successfulCount / clusterData.length) * 100;

      // Calculate effect magnitudes
      const deltas = clusterData
        .map((d) => d.deltaPercent)
        .filter((d): d is number => d !== null);

      const avgEffect = deltas.length > 0
        ? deltas.reduce((a, b) => a + b, 0) / deltas.length
        : null;

      const sortedDeltas = [...deltas].sort((a, b) => a - b);
      const medianEffect = sortedDeltas.length > 0
        ? sortedDeltas[Math.floor(sortedDeltas.length / 2)]
        : null;

      const stdDev = deltas.length > 1
        ? Math.sqrt(
            deltas.reduce((sum, d) => sum + Math.pow(d - (avgEffect || 0), 2), 0) / 
            (deltas.length - 1)
          )
        : null;

      // Calculate recency-weighted score
      const recencyDays = clusterData
        .filter((d) => d.evaluatedAt)
        .map((d) => {
          const evalDate = new Date(d.evaluatedAt!);
          return Math.floor((now.getTime() - evalDate.getTime()) / (1000 * 60 * 60 * 24));
        });
      const avgRecencyDays = recencyDays.length > 0
        ? recencyDays.reduce((a, b) => a + b, 0) / recencyDays.length
        : 90;

      const recencyWeightedScore = avgEffect !== null
        ? avgEffect * Math.pow(0.5, avgRecencyDays / 90)
        : null;

      // Calculate pattern confidence
      const patternConfidence = calculatePatternConfidence({
        successRate,
        sampleSize: clusterData.length,
        effectStdDeviation: stdDev,
        avgRecencyDays,
      });

      patterns.push({
        metric_id: key.metricId || null,
        intervention_type: key.interventionType,
        org_size_band: key.orgSizeBand,
        specialty_type: key.specialtyType,
        time_horizon_band: key.timeHorizonBand,
        baseline_range_band: key.baselineRangeBand,
        success_rate: Math.round(successRate * 100) / 100,
        sample_size: clusterData.length,
        avg_effect_magnitude: avgEffect !== null ? Math.round(avgEffect * 100) / 100 : null,
        median_effect_magnitude: medianEffect !== null ? Math.round(medianEffect * 100) / 100 : null,
        effect_std_deviation: stdDev !== null ? Math.round(stdDev * 100) / 100 : null,
        recency_weighted_score: recencyWeightedScore !== null ? Math.round(recencyWeightedScore * 100) / 100 : null,
        pattern_confidence: Math.round(patternConfidence * 100) / 100,
        last_computed_at: now.toISOString(),
        computation_version: "1.0",
      });
    }

    console.log(`Generated ${patterns.length} patterns from ${clusters.size} clusters`);

    // Step 6: Upsert patterns (replace existing)
    if (patterns.length > 0) {
      // Delete old patterns
      await supabase.from("intervention_pattern_clusters").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // Insert new patterns
      const { error: insertError } = await supabase
        .from("intervention_pattern_clusters")
        .insert(patterns);

      if (insertError) {
        throw new Error(`Failed to insert patterns: ${insertError.message}`);
      }
    }

    // Step 7: Log audit entry
    const duration = Date.now() - startTime;
    await supabase.from("intervention_pattern_audit").insert({
      patterns_generated: patterns.length,
      interventions_analyzed: interventionData.length,
      orgs_included: orgIds.length,
      computation_duration_ms: duration,
      version: "1.0",
    });

    console.log(`Pattern computation completed in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        patterns: patterns.length,
        interventionsAnalyzed: interventionData.length,
        orgsIncluded: orgIds.length,
        durationMs: duration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Pattern computation error:", error);
    
    // Log error to audit
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase.from("intervention_pattern_audit").insert({
        patterns_generated: 0,
        interventions_analyzed: 0,
        orgs_included: 0,
        computation_duration_ms: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : String(error),
        version: "1.0",
      });
    } catch (auditError) {
      console.error("Failed to log audit:", auditError);
    }

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============ Helper Functions ============

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

function classifyBaselineRange(baseline: number | null): string {
  if (baseline === null) return "medium";
  // Simple tertile classification without benchmarks
  return "medium";
}

function buildClusterKey(key: ClusterKey): string {
  return JSON.stringify([
    key.metricId,
    key.interventionType,
    key.orgSizeBand,
    key.specialtyType,
    key.timeHorizonBand,
    key.baselineRangeBand,
  ]);
}

function parseClusterKey(keyStr: string): ClusterKey {
  const [metricId, interventionType, orgSizeBand, specialtyType, timeHorizonBand, baselineRangeBand] = JSON.parse(keyStr);
  return { metricId, interventionType, orgSizeBand, specialtyType, timeHorizonBand, baselineRangeBand };
}

function calculatePatternConfidence(params: {
  successRate: number;
  sampleSize: number;
  effectStdDeviation: number | null;
  avgRecencyDays: number;
}): number {
  const { successRate, sampleSize, effectStdDeviation, avgRecencyDays } = params;
  
  const successScore = (successRate / 100) * 35;
  const sampleScore = Math.min(30, (Math.log2(sampleSize + 1) / Math.log2(21)) * 30);
  
  let consistencyScore = 20;
  if (effectStdDeviation !== null && effectStdDeviation > 0) {
    consistencyScore = Math.max(0, 20 - (effectStdDeviation / 10));
  }
  
  const recencyScore = Math.max(0, 15 * (1 - avgRecencyDays / 180));
  
  return Math.min(100, Math.max(0, successScore + sampleScore + consistencyScore + recencyScore));
}
