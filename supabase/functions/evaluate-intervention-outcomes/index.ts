import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTenantContext } from '../_shared/tenant-context.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EVALUATOR_VERSION = "v2"; // Increment when evaluation logic changes
const AI_MODEL = "google/gemini-3-flash-preview";

interface EvaluationResult {
  metric_id: string;
  metric_name: string;
  baseline_value: number | null;
  baseline_result_id: string | null;
  current_value: number | null;
  current_result_id: string | null;
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
  baseline_quality_flag: string | null;
}

interface AIMetaData {
  provider: string;
  model: string;
  generated_at: string;
  tokens_used?: number;
}

async function generateAISummary(
  intervention: { title: string; intervention_type: string },
  linkedMetrics: LinkedMetricInfo[],
  results: EvaluationResult[]
): Promise<{ summary: string; meta: AIMetaData | null }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("LOVABLE_API_KEY not configured, skipping AI summary");
    return { summary: "", meta: null };
  }

  // Build context for the AI - use ONLY deterministic data
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
        model: AI_MODEL,
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
        return { summary: "", meta: null };
      }
      if (response.status === 402) {
        console.warn("AI credits exhausted, skipping summary");
        return { summary: "", meta: null };
      }
      console.error("AI gateway error:", response.status);
      return { summary: "", meta: null };
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || "";
    const tokensUsed = data.usage?.total_tokens;
    
    const meta: AIMetaData = {
      provider: "lovable_ai",
      model: AI_MODEL,
      generated_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    };
    
    return { summary, meta };
  } catch (error) {
    console.error("AI summary generation error:", error);
    return { summary: "", meta: null };
  }
}

async function logInterventionEvent(
  supabase: any,
  interventionId: string,
  orgId: string,
  actorUserId: string,
  eventType: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from("intervention_events").insert({
      organization_id: orgId,
      intervention_id: interventionId,
      actor_user_id: actorUserId,
      event_type: eventType,
      details,
    } as any);
  } catch (error) {
    console.error("Failed to log intervention event:", error);
    // Don't throw - event logging is not critical path
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth and get tenant context
    const tenantContext = await getTenantContext(req);
    console.log(`evaluate-intervention-outcomes: User ${tenantContext.userId}, Org ${tenantContext.teamId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // Verify user belongs to same org
    if (tenantContext.teamId !== intervention.organization_id) {
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

    // Fetch linked metrics with expected direction and baseline quality
    const { data: links, error: linksError } = await supabase
      .from("intervention_metric_links")
      .select("id, metric_id, baseline_value, baseline_period_start, baseline_period_type, expected_direction, expected_magnitude_percent, baseline_quality_flag, baseline_override_justification")
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
      baseline_quality_flag: l.baseline_quality_flag,
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
          baseline_result_id: null,
          current_value: null,
          current_result_id: null,
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

      // Get baseline result ID explicitly
      const { data: baselineResult } = await supabase
        .from("metric_results")
        .select("id, value")
        .eq("metric_id", link.metric_id)
        .eq("period_type", "monthly")
        .eq("period_start", link.baseline_period_start)
        .maybeSingle();

      // Calculate evaluation window
      const evalStart = new Date(link.baseline_period_start);
      const evalEnd = new Date(evalStart);
      evalEnd.setDate(evalEnd.getDate() + intervention.expected_time_horizon_days);
      
      // Truncate to month start for comparison
      const evalEndMonthStart = new Date(evalEnd.getFullYear(), evalEnd.getMonth(), 1);
      const evalEndStr = evalEndMonthStart.toISOString().split("T")[0];
      const evalStartStr = link.baseline_period_start;

      // Find metric result at or after evaluation_period_end - get ID explicitly
      let { data: currentResult } = await supabase
        .from("metric_results")
        .select("id, value, period_start")
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
          .select("id, value, period_start")
          .eq("metric_id", link.metric_id)
          .eq("period_type", "monthly")
          .gt("period_start", evalStartStr)
          .order("period_start", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        currentResult = fallbackResult;
      }

      const baselineValue = baselineResult?.value ?? link.baseline_value;
      const baselineResultId = baselineResult?.id ?? null;
      const currentValue = currentResult?.value ?? null;
      const currentResultId = currentResult?.id ?? null;

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
        baseline_result_id: baselineResultId,
        current_value: currentValue,
        current_result_id: currentResultId,
        actual_delta_value: actualDeltaValue,
        actual_delta_percent: actualDeltaPercent,
        expected_direction: link.expected_direction,
        evaluation_period_start: evalStartStr,
        evaluation_period_end: evalEndStr,
        evaluated,
        reason: !evaluated ? "No metric result found for evaluation period" : undefined,
      });

      // Prepare outcome for upsert with deterministic IDs
      if (evaluated) {
        // Cap confidence score based on baseline quality
        // bad baseline = max 2, iffy baseline = max 3, good baseline = up to 4
        const baselineQuality = link.baseline_quality_flag || "good";
        const hasOverride = !!link.baseline_override_justification;
        
        let confidenceScore = 3; // default
        if (baselineQuality === "bad" && !hasOverride) {
          confidenceScore = 2; // Low confidence - unreliable baseline
        } else if (baselineQuality === "iffy" && !hasOverride) {
          confidenceScore = 3; // Medium confidence - uncertain baseline
        } else {
          // Good baseline or override provided - higher confidence possible
          confidenceScore = 4;
        }

        outcomesToUpsert.push({
          intervention_id,
          metric_id: link.metric_id,
          evaluation_period_start: evalStartStr,
          evaluation_period_end: evalEndStr,
          actual_delta_value: actualDeltaValue,
          actual_delta_percent: actualDeltaPercent,
          confidence_score: confidenceScore,
          baseline_result_id: baselineResultId,
          current_result_id: currentResultId,
          evaluator_version: EVALUATOR_VERSION,
          computed_at: new Date().toISOString(),
          evaluated_at: new Date().toISOString(),
        });
      }
    }

    // Generate AI summary
    const { summary: aiSummary, meta: aiMeta } = await generateAISummary(
      { title: intervention.title, intervention_type: intervention.intervention_type },
      linkedMetricsInfo,
      results
    );

    // Upsert outcomes with ON CONFLICT for determinism
    if (outcomesToUpsert.length > 0) {
      for (const outcome of outcomesToUpsert) {
        // Add AI meta to each outcome
        outcome.ai_meta = aiMeta;
        
        // Upsert with deterministic key
        const { error: upsertError } = await supabase
          .from("intervention_outcomes")
          .upsert(outcome, {
            onConflict: "intervention_id,metric_id,evaluation_period_end,evaluator_version",
          });

        if (upsertError) {
          console.error("Upsert error:", upsertError);
          throw upsertError;
        }
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

    // Log the evaluation event
    await logInterventionEvent(
      supabase,
      intervention_id,
      intervention.organization_id,
      tenantContext.userId,
      "evaluate_outcomes",
      {
        evaluator_version: EVALUATOR_VERSION,
        metrics_evaluated: outcomesToUpsert.length,
        ai_summary_generated: !!aiSummary,
        results: results.map(r => ({
          metric_id: r.metric_id,
          evaluated: r.evaluated,
          delta_percent: r.actual_delta_percent,
        })),
      }
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        evaluated_count: outcomesToUpsert.length,
        evaluator_version: EVALUATOR_VERSION,
        ai_summary: aiSummary || null,
        ai_meta: aiMeta,
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
