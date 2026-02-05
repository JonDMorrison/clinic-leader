/**
 * AI Intervention Insight Generator
 * Generates advisory explanations for intervention outcomes
 * - Deterministic data drives the prompt
 * - No hallucinated numbers
 * - Always advisory language
 * - Consistent AI provider (Lovable AI gateway)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTenantContext } from '../_shared/tenant-context.ts';

const AI_MODEL = "google/gemini-3-flash-preview";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tenantContext = await getTenantContext(req);
    console.log(`ai-intervention-insight: User ${tenantContext.userId}`);
    
    const { outcome_id } = await req.json();
    
    if (!outcome_id) {
      return new Response(
        JSON.stringify({ error: "outcome_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch outcome with intervention and metric details
    const { data: outcome, error: outcomeError } = await supabase
      .from("intervention_outcomes")
      .select(`
        id,
        intervention_id,
        metric_id,
        evaluation_period_start,
        evaluation_period_end,
        actual_delta_value,
        actual_delta_percent,
        confidence_score,
        ai_summary,
        evaluated_at
      `)
      .eq("id", outcome_id)
      .single();

    if (outcomeError || !outcome) {
      return new Response(
        JSON.stringify({ error: "Outcome not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch intervention details
    const { data: intervention, error: interventionError } = await supabase
      .from("interventions")
      .select(`
        id,
        title,
        description,
        intervention_type,
        expected_time_horizon_days,
        start_date,
        end_date,
        status,
        organization_id
      `)
      .eq("id", outcome.intervention_id)
      .single();

    if (interventionError || !intervention) {
      return new Response(
        JSON.stringify({ error: "Intervention not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch metric details
    const { data: metric, error: metricError } = await supabase
      .from("metrics")
      .select("id, name, description, unit, direction")
      .eq("id", outcome.metric_id)
      .single();

    if (metricError || !metric) {
      return new Response(
        JSON.stringify({ error: "Metric not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch baseline value and quality from metric link
    const { data: metricLink } = await supabase
      .from("intervention_metric_links")
      .select("baseline_value, expected_direction, expected_magnitude_percent, baseline_quality_flag, baseline_source, baseline_override_justification")
      .eq("intervention_id", outcome.intervention_id)
      .eq("metric_id", outcome.metric_id)
      .single();

    const baselineValue = metricLink?.baseline_value ?? 0;
    const currentValue = baselineValue + (outcome.actual_delta_value ?? 0);
    const baselineQualityFlag = metricLink?.baseline_quality_flag || "good";
    const baselineSource = metricLink?.baseline_source || "unknown";
    const hasOverride = !!metricLink?.baseline_override_justification;

    // Fetch clinic/organization metadata
    const { data: team } = await supabase
      .from("teams")
      .select("name")
      .eq("id", intervention.organization_id)
      .single();

    // Determine if outcome was positive, negative, or neutral
    const isPositive = (outcome.actual_delta_value ?? 0) > 0;
    const isNegative = (outcome.actual_delta_value ?? 0) < 0;
    const outcomeDirection = isPositive ? "improved" : isNegative ? "declined" : "unchanged";

    // Build baseline quality context for AI
    let baselineQualityContext = "";
    if (baselineQualityFlag === "bad") {
      baselineQualityContext = `
BASELINE QUALITY WARNING:
- The baseline data is flagged as UNRELIABLE
- Reason: ${baselineSource === "manual" ? "Manual data with insufficient history" : "Timing issues with baseline capture"}
${hasOverride ? "- Note: User has provided override justification" : ""}
- IMPORTANT: You MUST express LOW CONFIDENCE in any conclusions. Use phrases like "given the unreliable baseline", "results should be interpreted with caution", "baseline quality concerns limit confidence"`;
    } else if (baselineQualityFlag === "iffy") {
      baselineQualityContext = `
BASELINE QUALITY NOTE:
- The baseline data is flagged as UNCERTAIN
- Reason: Limited historical data points
${hasOverride ? "- Note: User has provided override justification" : ""}
- Use moderate confidence language like "tentatively suggests", "early indicators show"`;
    }

    // Build the prompt with ONLY deterministic data
    const prompt = `You are a healthcare operations analyst providing an advisory insight for a clinic intervention outcome.

CRITICAL RULES:
1. Only reference the exact numbers provided below - NEVER invent or estimate additional data
2. Use advisory language: "may have", "could indicate", "suggests", "appears to"
3. Do not make definitive claims about causation
4. Keep response to 2-3 sentences maximum
5. Focus on plausible explanations and typical next steps for similar clinics
${baselineQualityFlag !== "good" ? "6. Account for baseline quality issues in your confidence level" : ""}

INTERVENTION DATA (use these exact values):
- Clinic: ${team?.name || "Healthcare clinic"}
- Intervention Type: ${intervention.intervention_type}
- Intervention: "${intervention.title}"
${intervention.description ? `- Description: ${intervention.description}` : ""}
- Time Horizon: ${intervention.expected_time_horizon_days} days
- Status: ${intervention.status}

METRIC DATA (use these exact values):
- Metric: ${metric.name}
- Baseline Value: ${baselineValue.toLocaleString()}${metric.unit ? ` ${metric.unit}` : ""}
- Baseline Source: ${baselineSource}
- Baseline Quality: ${baselineQualityFlag.toUpperCase()}
- Current Value: ${currentValue.toLocaleString()}${metric.unit ? ` ${metric.unit}` : ""}
- Change: ${outcome.actual_delta_value !== null ? (outcome.actual_delta_value > 0 ? "+" : "") + outcome.actual_delta_value.toLocaleString() : "N/A"}${metric.unit ? ` ${metric.unit}` : ""}
- Percent Change: ${outcome.actual_delta_percent !== null ? (outcome.actual_delta_percent > 0 ? "+" : "") + outcome.actual_delta_percent.toFixed(1) + "%" : "N/A"}
- Outcome Direction: ${outcomeDirection}
- Evaluation Period: ${outcome.evaluation_period_start} to ${outcome.evaluation_period_end}
- Expected Direction: ${metricLink?.expected_direction || "increase"}
${baselineQualityContext}

Generate a brief advisory insight explaining:
1. Why this ${intervention.intervention_type} intervention ${outcomeDirection === "improved" ? "may have worked" : outcomeDirection === "declined" ? "may not have achieved expected results" : "had minimal impact"}
2. What similar clinics typically consider next

Remember: Advisory language only. No definitive claims. Reference only the provided data.${baselineQualityFlag === "bad" ? " EXPRESS LOW CONFIDENCE due to baseline quality issues." : ""}`;

    // Call Lovable AI with consistent model
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { 
            role: "system", 
            content: "You are a healthcare operations analyst. Provide brief, advisory insights using only the data provided. Never invent numbers or make definitive causal claims. Use language like 'may indicate', 'suggests', 'could be', 'similar clinics often'." 
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI API Error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiSummary = aiData.choices[0].message.content.trim();

    // Track usage
    const tokensUsed = aiData.usage?.total_tokens || 0;
    const costEstimate = (tokensUsed / 1000000) * 0.15;

    await supabase.from("ai_usage").upsert({
      date: new Date().toISOString().split("T")[0],
      organization_id: intervention.organization_id,
      tokens_used: tokensUsed,
      api_calls: 1,
      cost_estimate: costEstimate,
    }, {
      onConflict: "date,organization_id",
      ignoreDuplicates: false,
    });

    // Build AI meta for determinism
    const aiMeta = {
      provider: "lovable_ai",
      model: AI_MODEL,
      generated_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    };

    // Save AI summary and meta to outcome
    const { error: updateError } = await supabase
      .from("intervention_outcomes")
      .update({ 
        ai_summary: aiSummary,
        ai_meta: aiMeta,
      })
      .eq("id", outcome_id);

    if (updateError) throw updateError;

    // Log AI activity
    await supabase.from("ai_logs").insert({
      type: "intervention_insight",
      organization_id: intervention.organization_id,
      payload: {
        outcome_id,
        intervention_id: outcome.intervention_id,
        metric_id: outcome.metric_id,
        outcome_direction: outcomeDirection,
        tokens_used: tokensUsed,
      },
    });

    console.log("Generated intervention insight for outcome:", outcome_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ai_summary: aiSummary,
        outcome_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error generating intervention insight:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
