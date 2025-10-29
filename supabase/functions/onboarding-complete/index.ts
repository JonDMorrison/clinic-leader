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

    console.log("Processing onboarding-complete request for user:", userId);

    if (!userId) {
      console.error("No userId found in token");
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data } = await req.json();
    console.log("Received data:", JSON.stringify(data, null, 2));

    // Get user's organization
    const { data: userData, error: userError } = await supabaseClient
      .from("users")
      .select("team_id, role")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      throw new Error(`User fetch failed: ${userError.message}`);
    }

    if (!userData?.team_id) {
      console.error("User has no team_id:", userData);
      throw new Error("User has no organization");
    }

    console.log("User organization:", userData.team_id);

    const organizationId = userData.team_id;

    // Validate required fields
    console.log("Validating required fields:", {
      company_name: data.company_name,
      industry: data.industry,
      team_size: data.team_size
    });

    if (!data.company_name || !data.industry || !data.team_size) {
      console.error("Missing required fields:", { 
        company_name: !!data.company_name, 
        industry: !!data.industry, 
        team_size: !!data.team_size 
      });
      throw new Error("Missing required fields");
    }

    console.log("Validation passed, updating organization...");

    // Update organization with all data
    const { error: updateError } = await supabaseClient
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

    if (updateError) {
      console.error("Error updating organization:", updateError);
      throw new Error(`Organization update failed: ${updateError.message}`);
    }

    console.log("Organization updated successfully");

    // Save core values
    if (data.core_values && data.core_values.length > 0) {
      console.log("Saving core values:", data.core_values);
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
      console.log("Core values saved");
    }

    // Provision based on settings
    if (data.eos_enabled) {
      console.log("EOS enabled, checking for VTO...");
      // Create VTO draft if not exists
      const { data: existingVto } = await supabaseClient
        .from("vtos")
        .select("id")
        .eq("organization_id", organizationId)
        .single();

      if (!existingVto) {
        console.log("Creating VTO draft");
        await supabaseClient.from("vtos").insert({
          organization_id: organizationId,
          owner_id: userId,
          status: "draft",
          preset_key: "clinic_growth",
        });
      } else {
        console.log("VTO already exists");
      }
    }

    // Create Jane integration record if selected
    if (data.ehr_system === "Jane") {
      console.log("Jane EHR selected, creating integration record...");
      const { data: existingIntegration } = await supabaseClient
        .from("jane_integrations")
        .select("id")
        .eq("team_id", organizationId)
        .single();

      if (!existingIntegration) {
        console.log("Creating Jane integration record");
        await supabaseClient.from("jane_integrations").insert({
          team_id: organizationId,
          api_key: "",
          status: "pending_setup",
        });
      } else {
        console.log("Jane integration already exists");
      }
    }

    // Mark onboarding session as completed
    console.log("Marking onboarding session as completed");
    await supabaseClient
      .from("onboarding_sessions")
      .update({ completed: true })
      .eq("organization_id", organizationId)
      .eq("started_by", userId);

    // Log completion to audit
    console.log("Logging to audit");
    await supabaseClient.from("audit_log").insert({
      entity: "onboarding",
      entity_id: organizationId,
      actor_id: userId,
      action: "completed",
      payload: { industry: data.industry, team_size: data.team_size },
    });

    console.log("Onboarding completed successfully, redirecting to dashboard");

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
