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

    // Get all active KPIs with last 2 readings
    const { data: kpis, error: kpisError } = await supabase
      .from("kpis")
      .select(`
        *,
        kpi_readings!inner(value, week_start),
        users(full_name, team_id)
      `)
      .eq("active", true)
      .order("week_start", { foreignTable: "kpi_readings", ascending: false })
      .limit(2, { foreignTable: "kpi_readings" });

    if (kpisError) throw kpisError;

    const issuesCreated: string[] = [];

    // Process each KPI
    for (const kpi of kpis || []) {
      if (!kpi.kpi_readings || kpi.kpi_readings.length < 2) continue;

      const [latest, previous] = kpi.kpi_readings;
      
      // Check if red 2 weeks in a row
      const latestRed = kpi.direction === "up" 
        ? latest.value < kpi.target 
        : latest.value > kpi.target;
      const previousRed = kpi.direction === "up"
        ? previous.value < kpi.target
        : previous.value > kpi.target;

      if (latestRed && previousRed) {
        // Check if issue already exists for this KPI recently
        const { data: existingIssue } = await supabase
          .from("issues")
          .select("id")
          .ilike("title", `%${kpi.name}%`)
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .eq("owner_id", kpi.owner_id)
          .single();

        if (existingIssue) {
          console.log(`Issue already exists for ${kpi.name}`);
          continue;
        }

        // Generate AI analysis
        const prompt = `Analyze this KPI miss and suggest an action:

KPI: ${kpi.name}
Target: ${kpi.target} ${kpi.unit}
Direction: ${kpi.direction}
Last week: ${previous.value} ${kpi.unit}
This week: ${latest.value} ${kpi.unit}

Provide a JSON response:
{
  "reason": "Brief analysis of why this KPI is missing target (under 150 chars)",
  "action": "Specific first action step to address this (under 100 chars)"
}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a healthcare operations analyst. Provide valid JSON only." },
              { role: "user", content: prompt }
            ],
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI error for ${kpi.name}:`, aiResponse.status);
          continue;
        }

        const aiData = await aiResponse.json();
        const analysis = JSON.parse(aiData.choices[0].message.content);

        // Create issue
        const { data: newIssue, error: issueError } = await supabase
          .from("issues")
          .insert({
            title: `[AI] ${kpi.name} Below Target`,
            context: `${analysis.reason}\n\nRecommended Action: ${analysis.action}\n\nData: Week ${previous.week_start}: ${previous.value}, Week ${latest.week_start}: ${latest.value} (Target: ${kpi.target})`,
            priority: 2,
            status: "open",
            owner_id: kpi.owner_id,
            team_id: kpi.users?.team_id,
          })
          .select()
          .single();

        if (issueError) {
          console.error(`Error creating issue for ${kpi.name}:`, issueError);
          continue;
        }

        issuesCreated.push(`${kpi.name}: ${analysis.reason}`);

        // Log activity
        await supabase.from("ai_logs").insert({
          type: "issue",
          payload: {
            kpi_id: kpi.id,
            kpi_name: kpi.name,
            issue_id: newIssue.id,
            reason: analysis.reason,
            action: analysis.action,
          },
        });

        console.log(`Created issue for ${kpi.name}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        issuesCreated: issuesCreated.length,
        issues: issuesCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating issues:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
