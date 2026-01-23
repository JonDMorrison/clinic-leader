import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

function parseJwt(token: string) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key to create organizations for new users
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") || "" },
        },
      }
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const claims = token ? parseJwt(token) : null;
    const userId = (claims?.sub as string) || undefined;
    const userEmail = (claims?.email as string) || undefined;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { step, data } = await req.json();

    // Get user's organization
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("team_id")
      .eq("id", userId)
      .single();

    let organizationId = userData?.team_id;

    // If user has no organization, create one during onboarding
    if (!organizationId) {
      console.log("Creating new organization for user:", userId);
      
      // Create a new organization with default or provided name
      const orgName = data.company_name || "New Clinic";
      
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from("teams")
        .insert({
          name: orgName,
          timezone: data.timezone || "America/New_York",
          currency: data.currency || "USD",
          onboarding_status: "in_progress",
        })
        .select("id")
        .single();

      if (orgError || !newOrg) {
        console.error("Failed to create organization:", orgError);
        throw new Error("Failed to create organization");
      }

      organizationId = newOrg.id;
      console.log("Created organization:", organizationId);

      // Assign user to the new organization with owner role
      const { error: updateUserError } = await supabaseAdmin
        .from("users")
        .update({ 
          team_id: organizationId,
          role: "owner"
        })
        .eq("id", userId);

      if (updateUserError) {
        console.error("Failed to assign user to organization:", updateUserError);
        throw new Error("Failed to assign user to organization");
      }

      // Create owner role in user_roles table
      await supabaseAdmin
        .from("user_roles")
        .upsert({
          user_id: userId,
          role: "owner",
        }, { onConflict: "user_id,role" });

      console.log("User assigned to organization as owner");
    }

    // Update or create onboarding session
    const { data: existingSession } = await supabaseAdmin
      .from("onboarding_sessions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("started_by", userId)
      .single();

    if (existingSession) {
      await supabaseAdmin
        .from("onboarding_sessions")
        .update({
          step,
          data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSession.id);
    } else {
      await supabaseAdmin
        .from("onboarding_sessions")
        .insert({
          organization_id: organizationId,
          started_by: userId,
          step,
          data,
        });
    }

    // Update organization with live data if provided
    if (data.company_name || data.timezone || data.currency) {
      const updates: Record<string, unknown> = {};
      if (data.company_name) updates.name = data.company_name;
      if (data.timezone) updates.timezone = data.timezone;
      if (data.currency) updates.currency = data.currency;
      if (data.brand_color) updates.brand_color = data.brand_color;
      if (data.logo_url) updates.logo_url = data.logo_url;

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin
          .from("teams")
          .update(updates)
          .eq("id", organizationId);
      }
    }

    return new Response(JSON.stringify({ success: true, organizationId }), {
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
