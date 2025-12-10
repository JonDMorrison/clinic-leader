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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile and org
    const { data: profile } = await supabase
      .from("users")
      .select("id, team_id, full_name")
      .eq("email", user.email)
      .single();

    if (!profile?.team_id) {
      return new Response(JSON.stringify({ error: "User not assigned to organization" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.team_id;

    // Calculate current quarter
    const now = new Date();
    const currentQuarter = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;

    // Fetch organization info
    const { data: org } = await supabase
      .from("teams")
      .select("name")
      .eq("id", orgId)
      .single();

    // Fetch active VTO and latest version
    const { data: vto } = await supabase
      .from("vto")
      .select("id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .maybeSingle();

    if (!vto) {
      return new Response(JSON.stringify({ error: "NO_ACTIVE_VTO", message: "No active V/TO found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: vtoVersion } = await supabase
      .from("vto_versions")
      .select("*")
      .eq("vto_id", vto.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch current metrics with latest values
    const { data: metrics } = await supabase
      .from("metrics")
      .select("id, name, category, target, direction, unit, owner")
      .eq("organization_id", orgId);

    // Fetch metric results for status analysis
    const metricIds = metrics?.map(m => m.id) || [];
    const { data: results } = await supabase
      .from("metric_results")
      .select("metric_id, value, week_start")
      .in("metric_id", metricIds)
      .order("week_start", { ascending: false })
      .limit(metricIds.length * 4); // Last 4 weeks

    // Calculate metric status
    const metricStatus = metrics?.map(m => {
      const metricResults = results?.filter(r => r.metric_id === m.id) || [];
      const latestValue = metricResults[0]?.value;
      const isUp = m.direction === "up" || m.direction === ">=";
      const onTrack = m.target && latestValue !== undefined
        ? (isUp ? latestValue >= m.target : latestValue <= m.target)
        : null;
      
      return {
        ...m,
        latest_value: latestValue,
        on_track: onTrack,
        status: onTrack === null ? "no_data" : onTrack ? "on_track" : "off_track",
      };
    }) || [];

    // Fetch current rocks for this quarter
    const { data: rocks } = await supabase
      .from("rocks")
      .select("id, title, note, owner_id, status, quarter")
      .eq("organization_id", orgId)
      .eq("quarter", currentQuarter);

    // Fetch team members for owner assignment
    const { data: teamMembers } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("team_id", orgId);

    // Build VTO context
    const vtoContext = vtoVersion ? {
      core_values: vtoVersion.core_values,
      core_focus: vtoVersion.core_focus,
      ten_year_target: vtoVersion.ten_year_target,
      three_year_picture: vtoVersion.three_year_picture,
      one_year_plan: vtoVersion.one_year_plan,
    } : null;

    // Build prompt
    const prompt = `You are an EOS (Entrepreneurial Operating System) expert analyzing a healthcare clinic's Quarterly Rocks alignment with their V/TO and Scorecard.

Organization: ${org?.name || "Healthcare Clinic"}
Current Quarter: ${currentQuarter}

V/TO Summary:
${JSON.stringify(vtoContext, null, 2)}

Current Scorecard (with status):
${JSON.stringify(metricStatus, null, 2)}

Current Rocks for ${currentQuarter}:
${JSON.stringify(rocks || [], null, 2)}

Team Members (for owner assignment):
${JSON.stringify(teamMembers?.map(t => ({ id: t.id, name: t.full_name })) || [], null, 2)}

Analyze the alignment and suggest rock adjustments. Focus on:
1. Off-track KPIs that need immediate attention
2. Strategic goals from 1-year plan that need execution
3. Gaps between current rocks and V/TO objectives

Return a JSON object with exactly this structure:
{
  "keep": [
    { "id": "rock-uuid", "title": "Rock Title", "reason": "Why this rock is well-aligned" }
  ],
  "improve": [
    { "id": "rock-uuid", "title": "Current Title", "newTitle": "Suggested New Title", "newDescription": "Better description", "reason": "Why this needs improvement" }
  ],
  "add": [
    { 
      "title": "Suggested Rock Title",
      "description": "Clear, SMART rock description",
      "owner_id": "user-uuid-from-team-members",
      "linked_metric_ids": ["metric-uuid-if-relevant"],
      "reason": "Based on off-track KPI X or V/TO goal Y"
    }
  ]
}

Rules:
1. Rocks must be 90-day achievable, specific, and measurable
2. Each rock should have a clear owner from the team members list
3. Link rocks to relevant metrics when they address off-track KPIs
4. Suggest 3-7 new rocks maximum, prioritizing urgent KPI fixes
5. Focus on quarterly wins that drive annual and 3-year goals
6. ONLY return valid JSON, no markdown or explanatory text`;

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an EOS expert. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", errText);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let suggestions;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      suggestions = JSON.parse(jsonStr.trim());
    } catch (parseErr) {
      console.error("Failed to parse AI response:", content);
      suggestions = { keep: [], improve: [], add: [] };
    }

    // Validate references
    const validRockIds = new Set(rocks?.map(r => r.id) || []);
    const validTeamMemberIds = new Set(teamMembers?.map(t => t.id) || []);
    const validMetricIdsSet = new Set(metricIds);

    if (suggestions.keep) {
      suggestions.keep = suggestions.keep.filter((k: any) => validRockIds.has(k.id));
    }
    if (suggestions.improve) {
      suggestions.improve = suggestions.improve.filter((i: any) => validRockIds.has(i.id));
    }
    if (suggestions.add) {
      suggestions.add = suggestions.add.map((a: any) => ({
        ...a,
        owner_id: validTeamMemberIds.has(a.owner_id) ? a.owner_id : null,
        linked_metric_ids: (a.linked_metric_ids || []).filter((id: string) => validMetricIdsSet.has(id)),
      }));
    }

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ai-review-rocks-against-vto-scorecard:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
