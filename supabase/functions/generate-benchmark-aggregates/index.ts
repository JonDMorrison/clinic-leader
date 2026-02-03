/**
 * Benchmark Aggregates Generator
 * Scheduled job to compute anonymized EMR comparison benchmarks
 * Runs monthly - recomputes all aggregates
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_SAMPLE_SIZE = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting benchmark aggregate generation...");

    // Get all teams with their EMR source type
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, emr_source_type");

    if (teamsError) throw teamsError;

    // Categorize teams
    const janeTeamIds = teams
      ?.filter(t => t.emr_source_type === 'jane' || t.emr_source_type === 'jane_pipe')
      .map(t => t.id) || [];
    const nonJaneTeamIds = teams
      ?.filter(t => t.emr_source_type !== 'jane' && t.emr_source_type !== 'jane_pipe' && t.emr_source_type !== 'unknown')
      .map(t => t.id) || [];

    console.log(`Found ${janeTeamIds.length} Jane teams, ${nonJaneTeamIds.length} non-Jane teams`);

    // Skip if insufficient sample sizes
    if (janeTeamIds.length < MIN_SAMPLE_SIZE || nonJaneTeamIds.length < MIN_SAMPLE_SIZE) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Insufficient sample sizes for comparison",
          janeCount: janeTeamIds.length,
          nonJaneCount: nonJaneTeamIds.length,
          minRequired: MIN_SAMPLE_SIZE,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get distinct metrics and periods from metric_results
    const { data: metricPeriods, error: mpError } = await supabase
      .from("metric_results")
      .select("metric_id, period_key")
      .order("period_key", { ascending: false })
      .limit(1000);

    if (mpError) throw mpError;

    // Get unique metric/period combinations
    const uniqueCombos = new Map<string, { metricId: string; periodKey: string }>();
    for (const mp of metricPeriods || []) {
      const key = `${mp.metric_id}-${mp.period_key}`;
      if (!uniqueCombos.has(key)) {
        uniqueCombos.set(key, { metricId: mp.metric_id, periodKey: mp.period_key });
      }
    }

    // Get metric names for keys
    const metricIds = [...new Set([...uniqueCombos.values()].map(c => c.metricId))];
    const { data: metrics } = await supabase
      .from("metrics")
      .select("id, name, key")
      .in("id", metricIds);

    const metricKeyMap = new Map(metrics?.map(m => [m.id, m.key || m.name]) || []);

    let aggregatesGenerated = 0;
    const errors: string[] = [];

    // Process each unique metric/period combination
    for (const [, combo] of uniqueCombos) {
      try {
        const metricKey = metricKeyMap.get(combo.metricId) || combo.metricId;

        // Fetch values for Jane orgs
        const { data: janeValues } = await supabase
          .from("metric_results")
          .select("value, organization_id")
          .eq("metric_id", combo.metricId)
          .eq("period_key", combo.periodKey)
          .in("organization_id", janeTeamIds);

        // Fetch values for non-Jane orgs
        const { data: nonJaneValues } = await supabase
          .from("metric_results")
          .select("value, organization_id")
          .eq("metric_id", combo.metricId)
          .eq("period_key", combo.periodKey)
          .in("organization_id", nonJaneTeamIds);

        // Calculate aggregates for each group
        const calculateStats = (values: { value: number }[]) => {
          if (values.length < MIN_SAMPLE_SIZE) return null;
          
          const nums = values.map(v => v.value).sort((a, b) => a - b);
          const n = nums.length;
          
          const median = n % 2 === 0
            ? (nums[n / 2 - 1] + nums[n / 2]) / 2
            : nums[Math.floor(n / 2)];
          
          const p25 = nums[Math.floor(n * 0.25)];
          const p75 = nums[Math.floor(n * 0.75)];
          
          const mean = nums.reduce((a, b) => a + b, 0) / n;
          const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
          const stdDev = Math.sqrt(variance);
          
          return {
            median,
            p25,
            p75,
            stdDev,
            min: nums[0],
            max: nums[n - 1],
            sampleSize: n,
            orgCount: new Set(values.map(v => (v as any).organization_id)).size,
          };
        };

        const janeStats = janeValues ? calculateStats(janeValues) : null;
        const nonJaneStats = nonJaneValues ? calculateStats(nonJaneValues) : null;

        // Upsert aggregates
        const upsertAggregate = async (group: 'jane' | 'non_jane', stats: ReturnType<typeof calculateStats>) => {
          if (!stats) return;

          await supabase
            .from("benchmark_metric_aggregates")
            .upsert({
              metric_key: metricKey,
              period_key: combo.periodKey,
              emr_source_group: group,
              organization_count: stats.orgCount,
              median_value: stats.median,
              percentile_25: stats.p25,
              percentile_75: stats.p75,
              std_deviation: stats.stdDev,
              min_value: stats.min,
              max_value: stats.max,
              sample_size: stats.sampleSize,
              generated_at: new Date().toISOString(),
              methodology_version: 'v1.0',
            }, {
              onConflict: 'metric_key,period_key,emr_source_group',
            });
          
          aggregatesGenerated++;
        };

        await Promise.all([
          upsertAggregate('jane', janeStats),
          upsertAggregate('non_jane', nonJaneStats),
        ]);

      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Error processing ${combo.metricId}/${combo.periodKey}: ${message}`);
      }
    }

    // Generate intervention EMR analysis
    await generateInterventionAnalysis(supabase, janeTeamIds, nonJaneTeamIds);

    console.log(`Generated ${aggregatesGenerated} benchmark aggregates`);

    return new Response(
      JSON.stringify({
        success: true,
        aggregatesGenerated,
        janeOrgCount: janeTeamIds.length,
        nonJaneOrgCount: nonJaneTeamIds.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error generating benchmarks:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateInterventionAnalysis(
  supabase: any,
  janeTeamIds: string[],
  nonJaneTeamIds: string[]
) {
  // Get intervention outcomes with organization info
  const { data: outcomes } = await supabase
    .from("intervention_outcomes")
    .select(`
      *,
      intervention:interventions(organization_id, intervention_type, start_date, end_date)
    `);

  if (!outcomes || outcomes.length === 0) return;

  // Group by period, EMR group, and type
  const analysis = new Map<string, {
    periodKey: string;
    emrGroup: 'jane' | 'non_jane';
    interventionType: string;
    outcomes: any[];
  }>();

  for (const outcome of outcomes) {
    if (!outcome.intervention) continue;
    
    const orgId = outcome.intervention.organization_id;
    const isJane = janeTeamIds.includes(orgId);
    const isNonJane = nonJaneTeamIds.includes(orgId);
    
    if (!isJane && !isNonJane) continue;
    
    const periodKey = outcome.evaluation_period_start.substring(0, 7); // YYYY-MM
    const emrGroup = isJane ? 'jane' : 'non_jane';
    const key = `${periodKey}-${emrGroup}-${outcome.intervention.intervention_type}`;
    
    if (!analysis.has(key)) {
      analysis.set(key, {
        periodKey,
        emrGroup,
        interventionType: outcome.intervention.intervention_type,
        outcomes: [],
      });
    }
    
    analysis.get(key)!.outcomes.push({
      ...outcome,
      startDate: outcome.intervention.start_date,
      endDate: outcome.intervention.end_date,
    });
  }

  // Calculate stats and upsert
  for (const [, data] of analysis) {
    if (data.outcomes.length < MIN_SAMPLE_SIZE) continue;
    
    const successful = data.outcomes.filter(o => (o.actual_delta_percent || 0) > 0);
    const successRate = successful.length / data.outcomes.length;
    
    const resolutionDays = data.outcomes
      .filter(o => o.startDate && o.endDate)
      .map(o => {
        const start = new Date(o.startDate);
        const end = new Date(o.endDate);
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      });
    
    const avgResolutionDays = resolutionDays.length > 0
      ? resolutionDays.reduce((a, b) => a + b, 0) / resolutionDays.length
      : null;
    
    const improvements = data.outcomes
      .filter(o => o.actual_delta_percent != null)
      .map(o => o.actual_delta_percent);
    
    const avgImprovement = improvements.length > 0
      ? improvements.reduce((a: number, b: number) => a + b, 0) / improvements.length
      : null;

    await supabase
      .from("intervention_emr_analysis")
      .upsert({
        period_key: data.periodKey,
        emr_source_group: data.emrGroup,
        intervention_type: data.interventionType,
        total_interventions: data.outcomes.length,
        successful_interventions: successful.length,
        success_rate: successRate,
        avg_resolution_days: avgResolutionDays,
        avg_improvement_percent: avgImprovement,
        sample_size: data.outcomes.length,
        generated_at: new Date().toISOString(),
      }, {
        onConflict: 'period_key,emr_source_group,intervention_type',
      });
  }
}
