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

    // Get METRICS data (the actual scorecard data - not the empty kpis table)
    const { data: metrics } = await supabase
      .from("metrics")
      .select(`
        name,
        target,
        unit,
        direction,
        category,
        owner:users!metrics_owner_fkey(full_name),
        metric_results(value, week_start, period_key)
      `)
      .eq("organization_id", team_id)
      .eq("active", true)
      .order("week_start", { foreignTable: "metric_results", ascending: false })
      .limit(4, { foreignTable: "metric_results" });

    if (metrics && metrics.length > 0) {
      contextData += "\n\nScorecard Metrics:\n" + metrics.map((metric: any) => {
        const recentResults = metric.metric_results?.slice(0, 4) || [];
        const latestValue = recentResults[0]?.value;
        const target = metric.target;
        const status = latestValue !== undefined && target !== undefined
          ? (metric.direction === 'up' 
              ? (latestValue >= target ? '✓ On Track' : '✗ Off Track')
              : (latestValue <= target ? '✓ On Track' : '✗ Off Track'))
          : 'No data';
        
        return `${metric.name} (${metric.category || 'General'}): Target ${target}${metric.unit || ''}, Latest: ${latestValue ?? 'N/A'} - ${status} - Owner: ${metric.owner?.full_name || 'Unassigned'}`;
      }).join("\n");
    }

    // Get rocks data filtered by team
    const { data: rocks } = await supabase
      .from("rocks")
      .select("title, status, due_date, owner:users!rocks_owner_id_fkey(full_name)")
      .eq("organization_id", team_id)
      .order("due_date", { ascending: true });

    if (rocks && rocks.length > 0) {
      contextData += "\n\nRocks (Quarterly Priorities):\n" + rocks.map((rock: any) =>
        `${rock.title} - Status: ${rock.status} - Due: ${rock.due_date} - Owner: ${rock.owner?.full_name || 'Unassigned'}`
      ).join("\n");
    }

    // Get issues data
    const { data: issues } = await supabase
      .from("issues")
      .select("title, priority, status, owner:users!issues_owner_id_fkey(full_name)")
      .eq("team_id", team_id)
      .eq("status", "open")
      .order("priority", { ascending: true })
      .limit(15);

    if (issues && issues.length > 0) {
      contextData += "\n\nOpen Issues:\n" + issues.map((issue: any) =>
        `${issue.title} (Priority: ${issue.priority}) - Owner: ${issue.owner?.full_name || 'Unassigned'}`
      ).join("\n");
    }

    // Get todos data
    const { data: todos } = await supabase
      .from("todos")
      .select("title, due_date, done_at, owner:users!todos_owner_id_fkey(full_name)")
      .eq("team_id", team_id)
      .is("done_at", null)
      .order("due_date", { ascending: true })
      .limit(15);

    if (todos && todos.length > 0) {
      contextData += "\n\nUpcoming Todos:\n" + todos.map((todo: any) =>
        `${todo.title} - Due: ${todo.due_date} - Owner: ${todo.owner?.full_name || 'Unassigned'}`
      ).join("\n");
    }

    // Get VTO data (Vision/Traction Organizer)
    const { data: vto } = await supabase
      .from("vto")
      .select("long_term_targets, three_year_picture, one_year_plan")
      .eq("organization_id", team_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (vto) {
      contextData += "\n\nVision & Goals:\n";
      if (vto.long_term_targets) {
        contextData += `Long-term Targets: ${JSON.stringify(vto.long_term_targets)}\n`;
      }
      if (vto.three_year_picture) {
        contextData += `3-Year Picture: ${JSON.stringify(vto.three_year_picture)}\n`;
      }
      if (vto.one_year_plan) {
        contextData += `1-Year Plan: ${JSON.stringify(vto.one_year_plan)}\n`;
      }
    }

    // Get Core Values
    const { data: coreValues } = await supabase
      .from("org_core_values")
      .select("title, short_behavior")
      .eq("organization_id", team_id)
      .order("display_order", { ascending: true });

    if (coreValues && coreValues.length > 0) {
      contextData += "\n\nCore Values:\n" + coreValues.map((cv: any) =>
        `• ${cv.title}${cv.short_behavior ? `: ${cv.short_behavior}` : ''}`
      ).join("\n");
    }

    // Build the prompt with all context
    const prompt = `Answer this question about the organization's EOS/business data: "${question}"

Context Data:${contextData}

Instructions:
- Provide a clear, concise answer based on the data provided
- If metrics are off track, explain which ones and by how much
- If asking about rocks, mention their status and due dates
- If you don't have enough specific information to answer, explain what data is available and what's missing
- Be helpful and actionable in your response`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an EOS (Entrepreneurial Operating System) consultant helping business owners understand their data. Be concise, specific, and actionable. Focus on what matters most for running a successful organization." },
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
      organization_id: tenantContext.teamId,
      tokens_used: tokensUsed,
      api_calls: 1,
      cost_estimate: costEstimate,
    }, {
      onConflict: "date,organization_id",
      ignoreDuplicates: false,
    });

    // Log activity
    await supabase.from("ai_logs").insert({
      type: "chat",
      organization_id: tenantContext.teamId,
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
