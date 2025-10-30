import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateTenantAccess } from '../_shared/tenant-context.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { team_id } = await req.json();
    
    // Validate tenant access
    const tenantContext = await validateTenantAccess(req, team_id);
    console.log(`ai-generate-agenda: User ${tenantContext.userId} from team ${tenantContext.teamId}`);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current week start
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff)).toISOString().split("T")[0];

    // Check if agenda already exists for this week/team (caching)
    const { data: existingAgenda, error: checkError } = await supabase
      .from("ai_agendas")
      .select("id")
      .eq("team_id", team_id)
      .eq("week_start", weekStart)
      .single();

    if (existingAgenda) {
      console.log("Using cached agenda for week:", weekStart);
      return new Response(
        JSON.stringify({ success: true, cached: true, agenda: existingAgenda }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get off-track KPIs
    const { data: kpis, error: kpisError } = await supabase
      .from("kpis")
      .select(`
        *,
        kpi_readings!inner(value, week_start),
        users(full_name)
      `)
      .eq("active", true)
      .order("week_start", { foreignTable: "kpi_readings", ascending: false })
      .limit(2, { foreignTable: "kpi_readings" });

    if (kpisError) throw kpisError;

    // Get open issues
    const { data: issues, error: issuesError } = await supabase
      .from("issues")
      .select("*, users(full_name)")
      .eq("status", "open")
      .eq("team_id", team_id)
      .order("priority", { ascending: true })
      .limit(10);

    if (issuesError) throw issuesError;

    // Analyze KPIs for red status
    const offTrackKpis = kpis?.filter((kpi: any) => {
      if (!kpi.kpi_readings || kpi.kpi_readings.length < 2) return false;
      const latest = kpi.kpi_readings[0];
      const previous = kpi.kpi_readings[1];
      
      const latestRed = kpi.direction === "up" 
        ? latest.value < kpi.target 
        : latest.value > kpi.target;
      const previousRed = kpi.direction === "up"
        ? previous.value < kpi.target
        : previous.value > kpi.target;
        
      return latestRed && previousRed;
    }) || [];

    const prompt = `Generate a Level 10 Meeting agenda based on this data:

Off-Track KPIs (2+ weeks):
${offTrackKpis.map((kpi: any) => 
  `- ${kpi.name}: Current ${kpi.kpi_readings[0]?.value} vs Target ${kpi.target} (Owner: ${kpi.users?.full_name})`
).join("\n")}

Open Issues:
${issues?.map((issue: any) => 
  `- ${issue.title} (Priority: ${issue.priority}, Owner: ${issue.users?.full_name})`
).join("\n")}

Provide a JSON response with this structure:
{
  "topics": [
    {
      "title": "Topic title",
      "description": "Brief description of what to discuss",
      "root_cause_hypothesis": "Potential root cause",
      "suggested_action": "Recommended next step"
    }
  ]
}

Create 3-5 topics prioritizing the most critical issues and KPI misses. Keep descriptions concise.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an EOS facilitator helping create Level 10 meeting agendas. Provide valid JSON only." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const agenda = JSON.parse(aiData.choices[0].message.content);

    // Track usage
    const tokensUsed = aiData.usage?.total_tokens || 0;
    const costEstimate = (tokensUsed / 1000000) * 0.15;

    await supabase.from("ai_usage").upsert({
      date: new Date().toISOString().split("T")[0],
      tokens_used: tokensUsed,
      api_calls: 1,
      cost_estimate: costEstimate,
    }, {
      onConflict: "date",
      ignoreDuplicates: false,
    });

    // Save agenda
    const { data: savedAgenda, error: insertError } = await supabase
      .from("ai_agendas")
      .insert({
        team_id,
        week_start: weekStart,
        agenda,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Log activity
    await supabase.from("ai_logs").insert({
      type: "agenda",
      payload: {
        team_id,
        week_start: weekStart,
        agenda_id: savedAgenda.id,
        topic_count: agenda.topics.length,
      },
    });

    console.log("Generated agenda:", savedAgenda);

    return new Response(
      JSON.stringify({ success: true, agenda: savedAgenda }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating agenda:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
