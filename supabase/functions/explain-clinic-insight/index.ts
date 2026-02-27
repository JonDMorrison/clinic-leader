import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── In-memory rate limiter: 5 requests / user / clinic / 10 minutes ──
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 5;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRate(userId: string, clinicGuid: string): boolean {
  const key = `${userId}:${clinicGuid}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count++;
  return true;
}

// ── Prompt template ──

function buildPrompt(insight: {
  title: string;
  summary: string | null;
  severity: string;
  insight_key: string;
  value_primary: number | null;
  value_secondary: number | null;
  money_impact: number | null;
  data_json: Record<string, unknown> | null;
  period_start: string;
  period_end: string | null;
}): string {
  const delta =
    insight.value_primary != null && insight.value_secondary != null
      ? insight.value_primary - insight.value_secondary
      : null;

  return `You are a concise clinic operations advisor. Using ONLY the aggregated data below (never reference individual patients), produce exactly 3 bullet points:

• **Why it matters** – business impact in plain language
• **Likely causes** – 1-2 probable operational reasons
• **One action this week** – a specific, actionable step the clinic owner can take

Constraints:
- Maximum 90 words total across all 3 bullets.
- No patient names, IDs, or row-level data.
- Use the severity to calibrate urgency.
- Be direct and practical, not generic.

Insight data:
- Key: ${insight.insight_key}
- Title: ${insight.title}
- Period: ${insight.period_start} to ${insight.period_end ?? "unknown"}
- Severity: ${insight.severity}
- Primary value: ${insight.value_primary ?? "N/A"}
- Prior week value: ${insight.value_secondary ?? "N/A"}
- WoW delta: ${delta ?? "N/A"}
- Summary: ${insight.summary ?? "N/A"}
- Money impact: ${insight.money_impact != null ? `$${insight.money_impact}` : "N/A"}
- Breakdown: ${insight.data_json ? JSON.stringify(insight.data_json) : "none"}`;
}

// ── Handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Parse request
    const { clinic_guid, insight_key, period_start } = await req.json();
    if (!clinic_guid || !insight_key || !period_start) {
      return new Response(
        JSON.stringify({ error: "clinic_guid, insight_key, and period_start are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Rate limit
    if (!checkRate(userId, clinic_guid)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again in a few minutes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch insight (RLS scopes to user's org)
    const { data: insight, error: fetchError } = await supabase
      .from("clinic_insights")
      .select("title, summary, severity, insight_key, value_primary, value_secondary, money_impact, data_json, period_start, period_end")
      .eq("clinic_guid", clinic_guid)
      .eq("insight_key", insight_key)
      .eq("period_start", period_start)
      .maybeSingle();

    if (fetchError) {
      console.error("[explain-clinic-insight] fetch error:", fetchError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch insight" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!insight) {
      return new Response(
        JSON.stringify({ error: "Insight not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = buildPrompt(insight as any);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit exceeded. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errText = await aiResponse.text();
      console.error("[explain-clinic-insight] AI error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const explanation = aiData.choices?.[0]?.message?.content ?? "Unable to generate explanation.";

    return new Response(
      JSON.stringify({ explanation, insight_key, period_start }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[explain-clinic-insight] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
