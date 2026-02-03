import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EvaluationResult {
  metric_id: string;
  metric_name: string;
  baseline_value: number | null;
  current_value: number | null;
  actual_delta_value: number | null;
  actual_delta_percent: number | null;
  expected_direction: string;
  evaluation_period_start: string;
  evaluation_period_end: string;
  evaluated: boolean;
  reason?: string;
}

interface LinkedMetricInfo {
  metric_id: string;
  metric_name: string;
  expected_direction: string;
  expected_magnitude_percent: number | null;
  baseline_value: number | null;
}

async function generateAISummary(
  intervention: { title: string; intervention_type: string },
  linkedMetrics: LinkedMetricInfo[],
  results: EvaluationResult[]
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("LOVABLE_API_KEY not configured, skipping AI summary");
    return "";
  }

  // Build context for the AI
  const metricsContext = results.map((r) => {
    const linked = linkedMetrics.find((l) => l.metric_id === r.metric_id);
    const expectedDir = linked?.expected_direction || "unknown";
    
    if (!r.evaluated || r.baseline_value === null || r.current_value === null) {
      return `- ${r.metric_name}: Insufficient data (baseline or current value missing)`;
    }

    const direction = r.actual_delta_value! > 0 ? "increased" : r.actual_delta_value! < 0 ? "decreased" : "unchanged";
    const matchedExpectation = 
      (expectedDir === "up" && r.actual_delta_value! > 0) ||
      (expectedDir === "down" && r.actual_delta_value! < 0) ||
      (expectedDir === "stable" && Math.abs(r.actual_delta_percent || 0) < 5);

    return `- ${r.metric_name}: ${direction} from ${r.baseline_value} to ${r.current_value} (${r.actual_delta_percent !== null ? (r.actual_delta_percent > 0 ? "+" : "") + r.actual_delta_percent.toFixed(1) + "%" : "N/A"}). Expected: ${expectedDir}. ${matchedExpectation ? "Matched expectation." : "Did NOT match expectation."}`;
  }).join("\n");

  const prompt = `You are analyzing the outcomes of an intervention. Write a brief summary (3-6 sentences max) that describes:
1. What was attempted (intervention title and type)
2. Which metrics moved and by how much (use ONLY the exact numbers provided)
3. Whether the movement matched expectations

CRITICAL: Do NOT invent or estimate any numbers. Use ONLY the values provided below. If data is insufficient, say so.

Intervention: "${intervention.title}" (Type: ${intervention.intervention_type})

Metric Results:
${metricsContext}

Write a concise, factual summary:`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a data analyst providing factual summaries. Never invent numbers. Be concise and objective." },
          { role: "user", content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("AI rate limit exceeded, skipping summary");
        return "";
      }
      if (response.status === 402) {
        console.warn("AI credits exhausted, skipping summary");
        return "";
      }
      console.error("AI gateway error:", response.status);
      return "";
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || "";
    return summary;
  } catch (error) {
    console.error("AI summary generation error:", error);
    return "";
  }
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
      .select("id, organization_id, status, expected_time_horizon_days, title, intervention_type")
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

    // Fetch linked metrics with expected direction
    const { data: links, error: linksError } = await supabase
      .from("intervention_metric_links")
      .select("id, metric_id, baseline_value, baseline_period_start, baseline_period_type, expected_direction, expected_magnitude_percent")
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

    // Build linked metrics info for AI
    const linkedMetricsInfo: LinkedMetricInfo[] = links.map((l) => ({
      metric_id: l.metric_id,
      metric_name: metricsMap.get(l.metric_id) || "Unknown",
      expected_direction: l.expected_direction,
      expected_magnitude_percent: l.expected_magnitude_percent,
      baseline_value: l.baseline_value,
    }));

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
          expected_direction: link.expected_direction,
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
        expected_direction: link.expected_direction,
        evaluation_period_start: evalStartStr,
        evaluation_period_end: evalEndStr,
        evaluated,
        reason: !evaluated ? "No metric result found for evaluation period" : undefined,
      });

      // Prepare outcome for upsert (ai_summary will be added later)
      if (evaluated) {
        outcomesToUpsert.push({
          intervention_id,
          metric_id: link.metric_id,
          evaluation_period_start: evalStartStr,
          evaluation_period_end: evalEndStr,
          actual_delta_value: actualDeltaValue,
          actual_delta_percent: actualDeltaPercent,
          confidence_score: 3,
          ai_summary: null, // Will be updated with per-metric summary if needed
          evaluated_at: new Date().toISOString(),
        });
      }
    }

    // Generate AI summary for the intervention
    const aiSummary = await generateAISummary(
      { title: intervention.title, intervention_type: intervention.intervention_type },
      linkedMetricsInfo,
      results
    );

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

    // Update intervention with rollup AI summary
    if (aiSummary) {
      const { error: updateError } = await supabase
        .from("interventions")
        .update({ ai_summary: aiSummary })
        .eq("id", intervention_id);

      if (updateError) {
        console.error("Failed to update intervention ai_summary:", updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        evaluated_count: outcomesToUpsert.length,
        ai_summary: aiSummary || null,
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
