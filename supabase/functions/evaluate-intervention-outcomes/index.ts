import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EvaluationResult {
  metric_id: string;
  metric_name: string;
  baseline_value: number | null;
  current_value: number | null;
  actual_delta_value: number | null;
  actual_delta_percent: number | null;
  evaluation_period_start: string;
  evaluation_period_end: string;
  evaluated: boolean;
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's auth to verify permissions
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { intervention_id } = await req.json();
    if (!intervention_id) {
      return new Response(
        JSON.stringify({ error: "intervention_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch intervention with its organization
    const { data: intervention, error: intError } = await supabase
      .from("interventions")
      .select("id, organization_id, status, expected_time_horizon_days")
      .eq("id", intervention_id)
      .single();

    if (intError || !intervention) {
      return new Response(
        JSON.stringify({ error: "Intervention not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user belongs to org (using user client to respect RLS)
    const { data: userRecord } = await supabaseUser
      .from("users")
      .select("id, team_id")
      .eq("id", user.id)
      .single();

    if (!userRecord || userRecord.team_id !== intervention.organization_id) {
      return new Response(
        JSON.stringify({ error: "Access denied to this intervention" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify intervention status
    if (!["active", "completed"].includes(intervention.status)) {
      return new Response(
        JSON.stringify({ 
          error: `Cannot evaluate intervention with status '${intervention.status}'. Only active/completed interventions can be evaluated.` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch linked metrics
    const { data: links, error: linksError } = await supabase
      .from("intervention_metric_links")
      .select("id, metric_id, baseline_value, baseline_period_start, baseline_period_type")
      .eq("intervention_id", intervention_id);

    if (linksError) {
      throw linksError;
    }

    if (!links || links.length === 0) {
      return new Response(
        JSON.stringify({ error: "No metrics linked to this intervention" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch metric names
    const metricIds = links.map((l) => l.metric_id);
    const { data: metrics } = await supabase
      .from("metrics")
      .select("id, name")
      .in("id", metricIds);

    const metricsMap = new Map(metrics?.map((m) => [m.id, m.name]) || []);

    const results: EvaluationResult[] = [];
    const outcomesToUpsert: any[] = [];

    for (const link of links) {
      const metricName = metricsMap.get(link.metric_id) || "Unknown";
      
      // Skip if no baseline period start
      if (!link.baseline_period_start) {
        results.push({
          metric_id: link.metric_id,
          metric_name: metricName,
          baseline_value: null,
          current_value: null,
          actual_delta_value: null,
          actual_delta_percent: null,
          evaluation_period_start: "",
          evaluation_period_end: "",
          evaluated: false,
          reason: "No baseline period defined",
        });
        continue;
      }

      // Calculate evaluation window
      const evalStart = new Date(link.baseline_period_start);
      const evalEnd = new Date(evalStart);
      evalEnd.setDate(evalEnd.getDate() + intervention.expected_time_horizon_days);
      
      // Truncate to month start for comparison
      const evalEndMonthStart = new Date(evalEnd.getFullYear(), evalEnd.getMonth(), 1);
      const evalEndStr = evalEndMonthStart.toISOString().split("T")[0];
      const evalStartStr = link.baseline_period_start;

      // Find metric result at or after evaluation_period_end
      let { data: currentResult } = await supabase
        .from("metric_results")
        .select("value, period_start")
        .eq("metric_id", link.metric_id)
        .eq("period_type", "monthly")
        .gte("period_start", evalEndStr)
        .order("period_start", { ascending: true })
        .limit(1)
        .maybeSingle();

      // If none found, get most recent after baseline
      if (!currentResult) {
        const { data: fallbackResult } = await supabase
          .from("metric_results")
          .select("value, period_start")
          .eq("metric_id", link.metric_id)
          .eq("period_type", "monthly")
          .gt("period_start", evalStartStr)
          .order("period_start", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        currentResult = fallbackResult;
      }

      const baselineValue = link.baseline_value;
      const currentValue = currentResult?.value ?? null;

      let actualDeltaValue: number | null = null;
      let actualDeltaPercent: number | null = null;

      if (baselineValue !== null && currentValue !== null) {
        actualDeltaValue = currentValue - baselineValue;
        if (baselineValue !== 0) {
          actualDeltaPercent = Math.round((actualDeltaValue / baselineValue) * 100 * 100) / 100;
        }
      }

      const evaluated = currentValue !== null;

      results.push({
        metric_id: link.metric_id,
        metric_name: metricName,
        baseline_value: baselineValue,
        current_value: currentValue,
        actual_delta_value: actualDeltaValue,
        actual_delta_percent: actualDeltaPercent,
        evaluation_period_start: evalStartStr,
        evaluation_period_end: evalEndStr,
        evaluated,
        reason: !evaluated ? "No metric result found for evaluation period" : undefined,
      });

      // Prepare outcome for upsert
      if (evaluated) {
        outcomesToUpsert.push({
          intervention_id,
          metric_id: link.metric_id,
          evaluation_period_start: evalStartStr,
          evaluation_period_end: evalEndStr,
          actual_delta_value: actualDeltaValue,
          actual_delta_percent: actualDeltaPercent,
          confidence_score: 3,
          ai_summary: null,
          evaluated_at: new Date().toISOString(),
        });
      }
    }

    // Upsert outcomes
    if (outcomesToUpsert.length > 0) {
      // Delete existing outcomes for this intervention first
      await supabase
        .from("intervention_outcomes")
        .delete()
        .eq("intervention_id", intervention_id);

      // Insert new outcomes
      const { error: upsertError } = await supabase
        .from("intervention_outcomes")
        .insert(outcomesToUpsert);

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        throw upsertError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        evaluated_count: outcomesToUpsert.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Evaluation error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
