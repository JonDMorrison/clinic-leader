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
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const { data } = await req.json();

    // Get user's organization
    const { data: userData } = await supabaseClient
      .from("users")
      .select("team_id, role")
      .eq("id", user.id)
      .single();

    if (!userData?.team_id) {
      throw new Error("User has no organization");
    }

    const organizationId = userData.team_id;

    // Validate required fields
    if (!data.company_name || !data.industry || !data.team_size) {
      throw new Error("Missing required fields");
    }

    // Update organization with all data
    await supabaseClient
      .from("teams")
      .update({
        name: data.company_name,
        industry: data.industry,
        team_size: data.team_size,
        location_city: data.location_city,
        location_region: data.location_region,
        country: data.country,
        timezone: data.timezone,
        currency: data.currency,
        unit_system: data.unit_system,
        ehr_system: data.ehr_system,
        review_cadence: data.review_cadence,
        meeting_rhythm: data.meeting_rhythm,
        eos_enabled: data.eos_enabled || false,
        default_report_email: data.default_report_email,
        brand_color: data.brand_color,
        logo_url: data.logo_url,
        onboarding_status: "completed",
      })
      .eq("id", organizationId);

    // Save core values
    if (data.core_values && data.core_values.length > 0) {
      // Delete existing
      await supabaseClient
        .from("org_core_values")
        .delete()
        .eq("organization_id", organizationId);

      // Insert new
      const coreValuesInserts = data.core_values.map((value: string, index: number) => ({
        organization_id: organizationId,
        value,
        position: index,
      }));
      await supabaseClient.from("org_core_values").insert(coreValuesInserts);
    }

    // Provision based on settings
    if (data.eos_enabled) {
      // Create VTO draft if not exists
      const { data: existingVto } = await supabaseClient
        .from("vtos")
        .select("id")
        .eq("organization_id", organizationId)
        .single();

      if (!existingVto) {
        await supabaseClient.from("vtos").insert({
          organization_id: organizationId,
          owner_id: user.id,
          status: "draft",
          preset_key: "clinic_growth",
        });
      }
    }

    // Create Jane integration record if selected
    if (data.ehr_system === "Jane") {
      const { data: existingIntegration } = await supabaseClient
        .from("jane_integrations")
        .select("id")
        .eq("team_id", organizationId)
        .single();

      if (!existingIntegration) {
        await supabaseClient.from("jane_integrations").insert({
          team_id: organizationId,
          api_key: "",
          status: "pending_setup",
        });
      }
    }

    // Mark onboarding session as completed
    await supabaseClient
      .from("onboarding_sessions")
      .update({ completed: true })
      .eq("organization_id", organizationId)
      .eq("started_by", user.id);

    // Log completion to audit
    await supabaseClient.from("audit_log").insert({
      entity: "onboarding",
      entity_id: organizationId,
      actor_id: user.id,
      action: "completed",
      payload: { industry: data.industry, team_size: data.team_size },
    });

    return new Response(
      JSON.stringify({ success: true, redirect: "/dashboard" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
