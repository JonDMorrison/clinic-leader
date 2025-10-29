import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") || "" },
        },
      }
    );

    // Prefer extracting the JWT directly to avoid auth context issues
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    const {
      data: { user },
      error: userErr,
    } = await supabaseClient.auth.getUser(jwt);

    if (userErr) {
      console.error("getUser error:", userErr);
    }

    if (!user) {
      throw new Error("Not authenticated");
    }

    const { step, data } = await req.json();

    // Get user's organization
    const { data: userData } = await supabaseClient
      .from("users")
      .select("team_id")
      .eq("id", user.id)
      .single();

    if (!userData?.team_id) {
      throw new Error("User has no organization");
    }

    const organizationId = userData.team_id;

    // Update or create onboarding session
    const { data: existingSession } = await supabaseClient
      .from("onboarding_sessions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("started_by", user.id)
      .single();

    if (existingSession) {
      await supabaseClient
        .from("onboarding_sessions")
        .update({
          step,
          data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSession.id);
    } else {
      await supabaseClient
        .from("onboarding_sessions")
        .insert({
          organization_id: organizationId,
          started_by: user.id,
          step,
          data,
        });
    }

    // Update organization with live data if provided
    if (data.company_name || data.timezone || data.currency) {
      const updates: any = {};
      if (data.company_name) updates.name = data.company_name;
      if (data.timezone) updates.timezone = data.timezone;
      if (data.currency) updates.currency = data.currency;
      if (data.brand_color) updates.brand_color = data.brand_color;
      if (data.logo_url) updates.logo_url = data.logo_url;

      if (Object.keys(updates).length > 0) {
        await supabaseClient
          .from("teams")
          .update(updates)
          .eq("id", organizationId);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error saving draft:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
