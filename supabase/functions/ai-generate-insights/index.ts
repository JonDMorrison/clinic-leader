import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current week start (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff)).toISOString().split("T")[0];

    // Check if insights already exist for this week (caching)
    const { data: existingInsight, error: checkError } = await supabase
      .from("ai_insights")
      .select("id")
      .eq("week_start", weekStart)
      .single();

    if (existingInsight) {
      console.log("Using cached insights for week:", weekStart);
      return new Response(
        JSON.stringify({ success: true, cached: true, insight: existingInsight }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get last 2 weeks of KPI readings
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const { data: readings, error: readingsError } = await supabase
      .from("kpi_readings")
      .select("*, kpis(name, target, direction, unit)")
      .gte("week_start", twoWeeksAgo.toISOString().split("T")[0])
      .order("week_start", { ascending: false });

    if (readingsError) throw readingsError;

    // Calculate deltas and prepare data
    const kpiData: any = {};
    readings?.forEach((reading: any) => {
      const kpiName = reading.kpis.name;
      if (!kpiData[kpiName]) {
        kpiData[kpiName] = {
          target: reading.kpis.target,
          direction: reading.kpis.direction,
          unit: reading.kpis.unit,
          values: [],
        };
      }
      kpiData[kpiName].values.push({
        week: reading.week_start,
        value: reading.value,
      });
    });

    // Prepare prompt for AI
    const prompt = `Analyze this clinic's KPI data from the last 2 weeks and provide insights in JSON format.

KPI Data:
${Object.entries(kpiData).map(([name, data]: [string, any]) => 
  `${name}: Target ${data.target}, Direction: ${data.direction}, Unit: ${data.unit}
  Recent values: ${data.values.map((v: any) => `${v.week}: ${v.value}`).join(", ")}`
).join("\n")}

Provide a JSON response with exactly this structure:
{
  "wins": ["3 specific positive achievements or metrics exceeding targets"],
  "warnings": ["3 specific concerns or declining metrics"],
  "opportunities": ["3 actionable improvement opportunities based on the data"]
}

Keep each item concise (under 100 characters). Focus on numeric insights and actionable patterns.`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a healthcare operations analyst. Provide structured insights in valid JSON format only." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API Error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summary = JSON.parse(aiData.choices[0].message.content);

    // Track usage
    const tokensUsed = aiData.usage?.total_tokens || 0;
    const costEstimate = (tokensUsed / 1000000) * 0.15; // Approximate cost for gemini-2.5-flash

    await supabase.from("ai_usage").upsert({
      date: new Date().toISOString().split("T")[0],
      tokens_used: tokensUsed,
      api_calls: 1,
      cost_estimate: costEstimate,
    }, {
      onConflict: "date",
      ignoreDuplicates: false,
    });

    // Save insight
    const { data: insight, error: insertError } = await supabase
      .from("ai_insights")
      .insert({
        week_start: weekStart,
        summary,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Log AI activity
    await supabase.from("ai_logs").insert({
      type: "insight",
      payload: {
        week_start: weekStart,
        insight_id: insight.id,
        kpi_count: Object.keys(kpiData).length,
      },
    });

    console.log("Generated insights:", insight);

    return new Response(
      JSON.stringify({ success: true, insight }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating insights:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
