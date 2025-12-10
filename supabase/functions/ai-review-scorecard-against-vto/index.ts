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

    if (!vtoVersion) {
      return new Response(JSON.stringify({ error: "NO_VTO_VERSION", message: "No V/TO version found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch current metrics
    const { data: metrics } = await supabase
      .from("metrics")
      .select("id, name, category, target, direction, unit, owner")
      .eq("organization_id", orgId);

    // Build VTO context
    const vtoContext = {
      core_values: vtoVersion.core_values,
      core_focus: vtoVersion.core_focus,
      ten_year_target: vtoVersion.ten_year_target,
      three_year_picture: vtoVersion.three_year_picture,
      one_year_plan: vtoVersion.one_year_plan,
      marketing_strategy: vtoVersion.marketing_strategy,
    };

    // Build prompt
    const prompt = `You are an EOS (Entrepreneurial Operating System) expert analyzing a healthcare clinic's Scorecard alignment with their Vision/Traction Organizer (V/TO).

Organization: ${org?.name || "Healthcare Clinic"}

V/TO Summary:
${JSON.stringify(vtoContext, null, 2)}

Current Scorecard KPIs:
${JSON.stringify(metrics || [], null, 2)}

Analyze the alignment between the V/TO strategic goals and the current Scorecard KPIs.

Return a JSON object with exactly this structure:
{
  "keep": [
    { "id": "metric-uuid", "name": "Metric Name", "reason": "Why this KPI aligns with strategy" }
  ],
  "improve": [
    { "id": "metric-uuid", "name": "Current Name", "newName": "Suggested New Name", "newTarget": 100, "reason": "Why this needs improvement" }
  ],
  "add": [
    { "name": "Suggested KPI Name", "category": "Category", "reason": "Why this KPI is needed based on V/TO goals" }
  ]
}

Rules:
1. Keep: KPIs that directly support 10-year target, 3-year picture, or 1-year goals
2. Improve: KPIs that need renaming, better targets, or clearer connection to strategy
3. Add: Missing KPIs that should exist based on V/TO goals (max 5 suggestions)
4. Focus on measurable outcomes that drive the clinic's strategic objectives
5. Consider revenue, patient care, operations, and team development goals from the V/TO
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
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      suggestions = JSON.parse(jsonStr.trim());
    } catch (parseErr) {
      console.error("Failed to parse AI response:", content);
      suggestions = { keep: [], improve: [], add: [] };
    }

    // Validate that referenced metric IDs exist in our org
    const validMetricIds = new Set(metrics?.map(m => m.id) || []);
    
    if (suggestions.keep) {
      suggestions.keep = suggestions.keep.filter((k: any) => validMetricIds.has(k.id));
    }
    if (suggestions.improve) {
      suggestions.improve = suggestions.improve.filter((i: any) => validMetricIds.has(i.id));
    }

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ai-review-scorecard-against-vto:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
