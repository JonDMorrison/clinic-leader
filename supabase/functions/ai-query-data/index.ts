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
    const { question, team_id } = await req.json();
    
    // Validate tenant access
    const tenantContext = await validateTenantAccess(req, team_id);
    console.log(`ai-query-data: User ${tenantContext.userId} from team ${tenantContext.teamId}`);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Gather relevant data based on question keywords
    let contextData = "";

    // Get KPI data filtered by team
    const { data: kpis } = await supabase
      .from("kpis")
      .select(`
        name,
        target,
        unit,
        direction,
        users(full_name, team_id),
        kpi_readings(value, week_start)
      `)
      .eq("active", true)
      .eq("users.team_id", team_id)
      .order("week_start", { foreignTable: "kpi_readings", ascending: false })
      .limit(4, { foreignTable: "kpi_readings" });

    if (kpis) {
      contextData += "\n\nKPIs:\n" + kpis.map((kpi: any) => 
        `${kpi.name} (Owner: ${kpi.users?.full_name}): Target ${kpi.target}${kpi.unit}, Recent: ${kpi.kpi_readings?.map((r: any) => `${r.week_start}: ${r.value}`).join(", ")}`
      ).join("\n");
    }

    // Get rocks data filtered by team
    const { data: rocks } = await supabase
      .from("rocks")
      .select("title, status, due_date, users(full_name, team_id)")
      .eq("level", "team")
      .eq("users.team_id", team_id)
      .order("due_date", { ascending: true });

    if (rocks) {
      contextData += "\n\nRocks:\n" + rocks.map((rock: any) =>
        `${rock.title} (${rock.status}) - Due: ${rock.due_date} - Owner: ${rock.users?.full_name}`
      ).join("\n");
    }

    // Get issues data
    const { data: issues } = await supabase
      .from("issues")
      .select("title, priority, status, users(full_name)")
      .eq("team_id", team_id)
      .eq("status", "open")
      .order("priority", { ascending: true })
      .limit(10);

    if (issues) {
      contextData += "\n\nOpen Issues:\n" + issues.map((issue: any) =>
        `${issue.title} (Priority: ${issue.priority}) - Owner: ${issue.users?.full_name}`
      ).join("\n");
    }

    // Get todos data
    const { data: todos } = await supabase
      .from("todos")
      .select("title, due_date, done_at, users(full_name)")
      .eq("team_id", team_id)
      .is("done_at", null)
      .order("due_date", { ascending: true })
      .limit(10);

    if (todos) {
      contextData += "\n\nUpcoming Todos:\n" + todos.map((todo: any) =>
        `${todo.title} - Due: ${todo.due_date} - Owner: ${todo.users?.full_name}`
      ).join("\n");
    }

    const prompt = `Answer this question about the clinic's EOS data: "${question}"

Context:${contextData}

Provide a clear, concise answer based only on the data provided. If you don't have enough information, say so.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an EOS consultant helping clinic owners understand their data. Be concise and specific." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices[0].message.content;

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

    // Log activity
    await supabase.from("ai_logs").insert({
      type: "chat",
      payload: {
        question,
        answer: answer.substring(0, 500),
        team_id,
      },
    });

    return new Response(
      JSON.stringify({ success: true, answer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error querying data:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
