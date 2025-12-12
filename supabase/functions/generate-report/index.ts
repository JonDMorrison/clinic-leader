import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateTenantAccess } from '../_shared/tenant-context.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple trend-based forecasting
function generateForecast(kpiSummary: any[], period: string) {
  return kpiSummary.slice(0, 5).map((kpi) => {
    const multiplier = period === "weekly" ? 4 : 3; // 4 weeks or 3 months ahead
    let predictedValue = kpi.current;
    
    // Simple linear projection based on trend
    if (kpi.trend === "up") {
      const growthRate = 1.05; // 5% growth assumption
      predictedValue = kpi.current * Math.pow(growthRate, multiplier);
    } else if (kpi.trend === "down") {
      const declineRate = 0.95; // 5% decline assumption
      predictedValue = kpi.current * Math.pow(declineRate, multiplier);
    }
    
    const projectedDate = new Date();
    if (period === "weekly") {
      projectedDate.setDate(projectedDate.getDate() + (7 * multiplier));
    } else {
      projectedDate.setMonth(projectedDate.getMonth() + multiplier);
    }
    
    return {
      kpi_name: kpi.name,
      current_value: kpi.current,
      predicted_value: Math.round(predictedValue * 100) / 100,
      confidence: kpi.trend === "stable" ? "low" : "medium",
      projection_date: projectedDate.toISOString().split("T")[0],
      trend: kpi.trend,
    };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { team_id, period = "weekly" } = await req.json();
    
    // Validate tenant access
    const tenantContext = await validateTenantAccess(req, team_id);
    console.log(`generate-report: User ${tenantContext.userId} from team ${tenantContext.teamId}`);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    if (period === "weekly") {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const weekStart = new Date();
    const dayOfWeek = weekStart.getDay();
    const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    weekStart.setDate(diff);

    // Gather KPI data
    const { data: kpis, error: kpisError } = await supabase
      .from("kpis")
      .select(`
        *,
        kpi_readings!inner(value, week_start),
        users(full_name)
      `)
      .eq("active", true)
      .gte("kpi_readings.week_start", startDate.toISOString().split("T")[0])
      .order("week_start", { foreignTable: "kpi_readings", ascending: false });

    if (kpisError) throw kpisError;

    // Gather Rocks data
    const { data: rocks, error: rocksError } = await supabase
      .from("rocks")
      .select("*")
      .gte("created_at", startDate.toISOString());

    if (rocksError) throw rocksError;

    // Gather Issues data
    const { data: issues, error: issuesError } = await supabase
      .from("issues")
      .select("*")
      .eq("organization_id", team_id)
      .gte("created_at", startDate.toISOString());

    if (issuesError) throw issuesError;

    // Get latest AI insights
    const { data: insights, error: insightsError } = await supabase
      .from("ai_insights")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (insightsError && insightsError.code !== "PGRST116") throw insightsError;

    // Prepare data summary
    const kpiSummary = kpis?.map((kpi: any) => {
      const readings = kpi.kpi_readings || [];
      const current = readings[0]?.value || 0;
      const previous = readings[1]?.value || 0;
      const trend = current > previous ? "up" : current < previous ? "down" : "stable";
      
      const status = kpi.direction === "up"
        ? (current >= kpi.target ? "success" : "warning")
        : (current <= kpi.target ? "success" : "warning");

      return {
        name: kpi.name,
        current,
        target: kpi.target,
        trend,
        status,
        unit: kpi.unit,
      };
    }) || [];

    const rocksSummary = {
      total: rocks?.length || 0,
      on_track: rocks?.filter((r: any) => r.status === "on_track").length || 0,
      at_risk: rocks?.filter((r: any) => r.status === "at_risk").length || 0,
      completed: rocks?.filter((r: any) => r.status === "done").length || 0,
    };

    const issuesSummary = {
      opened: issues?.filter((i: any) => new Date(i.created_at) >= startDate).length || 0,
      solved: issues?.filter((i: any) => i.status === "solved").length || 0,
      open: issues?.filter((i: any) => i.status === "open").length || 0,
    };

    // Generate AI report summary
    const prompt = `Generate a professional EOS ${period} report summary based on this data:

KPIs:
${kpiSummary.map(k => `- ${k.name}: ${k.current}${k.unit} (Target: ${k.target}${k.unit}, Trend: ${k.trend})`).join("\n")}

Rocks: ${rocksSummary.total} total, ${rocksSummary.on_track} on track, ${rocksSummary.at_risk} at risk, ${rocksSummary.completed} completed

Issues: ${issuesSummary.opened} new, ${issuesSummary.solved} solved, ${issuesSummary.open} still open

${insights ? `Recent Insights:\nWins: ${insights.summary.wins?.join(", ")}\nWarnings: ${insights.summary.warnings?.join(", ")}` : ""}

Provide a JSON response with:
{
  "executive_summary": ["3 brief bullet points for leadership"],
  "wins": ["3 specific achievements"],
  "challenges": ["3 key challenges"],
  "opportunities": ["3 actionable opportunities"],
  "ai_commentary": "A 2-3 sentence professional summary with an encouraging tone"
}

Be concise, data-driven, and professional. Each item under 100 characters.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an EOS consultant creating executive reports. Provide valid JSON only." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    // Strip markdown code fences if present
    let aiContent = aiData.choices[0].message.content;
    aiContent = aiContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const aiSummary = JSON.parse(aiContent);

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

    // Build report summary
    const reportSummary = {
      period_label: period === "weekly" 
        ? `Week of ${weekStart.toISOString().split("T")[0]}`
        : `Month of ${new Date(startDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
      ...aiSummary,
      kpi_summary: kpiSummary,
      rocks_summary: rocksSummary,
      issues_summary: issuesSummary,
      forecast: generateForecast(kpiSummary, period),
    };

    // Save report
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        organization_id: team_id,
        period,
        week_start: weekStart.toISOString().split("T")[0],
        summary: reportSummary,
      })
      .select()
      .single();

    if (reportError) throw reportError;

    // Log activity
    await supabase.from("ai_logs").insert({
      type: "insight",
      payload: {
        report_id: report.id,
        period,
        team_id,
      },
    });

    console.log("Generated report:", report.id);

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
