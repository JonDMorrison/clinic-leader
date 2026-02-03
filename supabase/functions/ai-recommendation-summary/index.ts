import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecommendationInput {
  intervention_type: string;
  metric_name: string;
  current_deviation_percent: number;
  historical_success_rate: number;
  matched_cases_count: number;
  avg_improvement_percent: number;
  typical_time_to_result_days: number;
  confidence_score: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, input } = await req.json() as { prompt: string; input: RecommendationInput };

    if (!input) {
      return new Response(
        JSON.stringify({ error: "Missing input data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Lovable AI for summarization
    const response = await fetch("https://lovable.dev/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY") || ""}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a healthcare business analyst. Summarize intervention recommendations using ONLY the provided data. 
Keep responses under 50 words. Use advisory language ("typically", "historically", "may").
Never invent statistics or examples not in the data.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 150,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      // Fallback to template-based summary
      const summary = buildFallbackSummary(input);
      return new Response(
        JSON.stringify({ summary, source: "fallback" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || buildFallbackSummary(input);

    return new Response(
      JSON.stringify({ summary, source: "ai" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating summary:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate summary" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildFallbackSummary(input: RecommendationInput): string {
  const interventionLabel = input.intervention_type.replace("_", " ");
  const successPercent = Math.round(input.historical_success_rate * 100);
  const improvementStr = input.avg_improvement_percent.toFixed(1);

  return `Historically, ${interventionLabel} interventions have improved this metric ${successPercent}% of the time, based on ${input.matched_cases_count} similar cases. Average improvement was ${improvementStr}%, typically seen within ${input.typical_time_to_result_days} days.`;
}
