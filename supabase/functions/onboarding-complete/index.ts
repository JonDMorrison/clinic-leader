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

interface CoreValueEntry {
  title: string;
  short_behavior?: string;
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

    // Privileged client for server-side updates (bypasses RLS safely)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
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
      team_size: data.team_size,
      core_values_count: data.core_values?.length
    });

    if (!data.company_name || !data.industry || !data.team_size) {
      console.error("Missing required fields:", { 
        company_name: !!data.company_name, 
        industry: !!data.industry, 
        team_size: !!data.team_size 
      });
      throw new Error("Missing required fields");
    }

    // Validate core values (at least 3 required)
    if (!data.core_values || data.core_values.length < 3) {
      console.error("Insufficient core values:", data.core_values?.length || 0);
      throw new Error("At least 3 core values are required");
    }

    console.log("Validation passed, updating organization...");

    // Update user's name if provided
    if (data.first_name || data.last_name) {
      const fullName = `${data.first_name || ""} ${data.last_name || ""}`.trim();
      if (fullName) {
        console.log("Updating user full_name to:", fullName);
        await supabaseAdmin
          .from("users")
          .update({ full_name: fullName })
          .eq("id", userId);
      }
    }

    // Update organization with all data
    const { data: updateResult, error: updateError } = await supabaseAdmin
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
      .eq("id", organizationId)
      .select();

    if (updateError) {
      console.error("Error updating organization:", updateError);
      throw new Error(`Organization update failed: ${updateError.message}`);
    }

    if (!updateResult || updateResult.length === 0) {
      console.error("Organization update returned no data");
      throw new Error("Failed to confirm organization update");
    }

    console.log("Organization updated successfully:", {
      id: organizationId,
      onboarding_status: updateResult[0].onboarding_status
    });

    // Save core values with proper schema
    if (data.core_values && data.core_values.length > 0) {
      console.log("Saving core values:", data.core_values);
      
      // Delete existing
      await supabaseAdmin
        .from("org_core_values")
        .delete()
        .eq("organization_id", organizationId);

      // Insert new with proper column names (title, short_behavior, sort_order)
      const coreValuesInserts = data.core_values.map((value: CoreValueEntry, index: number) => ({
        organization_id: organizationId,
        title: value.title,
        short_behavior: value.short_behavior || null,
        sort_order: index,
        is_active: true,
      }));
      
      const { error: cvError } = await supabaseAdmin
        .from("org_core_values")
        .insert(coreValuesInserts);
      
      if (cvError) {
        console.error("Error saving core values:", cvError);
        // Don't throw - core values are important but shouldn't block onboarding
      } else {
        console.log("Core values saved successfully");
        
        // Create spotlight with first value
        const { data: insertedValues } = await supabaseAdmin
          .from("org_core_values")
          .select("id")
          .eq("organization_id", organizationId)
          .order("sort_order", { ascending: true })
          .limit(1);
        
        if (insertedValues && insertedValues.length > 0) {
          await supabaseAdmin.from("core_value_spotlight").upsert({
            organization_id: organizationId,
            current_core_value_id: insertedValues[0].id,
            rotation_mode: "weekly",
            rotates_on_weekday: 1,
          });
          console.log("Core value spotlight created");
        }
      }
    }

    // Provision based on settings
    if (data.eos_enabled) {
      console.log("EOS enabled, checking for VTO...");
      // Create VTO draft if not exists
      const { data: existingVto } = await supabaseAdmin
        .from("vtos")
        .select("id")
        .eq("organization_id", organizationId)
        .single();

      if (!existingVto) {
        console.log("Creating VTO draft");
        await supabaseAdmin.from("vtos").insert({
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
      const { data: existingIntegration } = await supabaseAdmin
        .from("jane_integrations")
        .select("id")
        .eq("team_id", organizationId)
        .single();

      if (!existingIntegration) {
        console.log("Creating Jane integration record");
        await supabaseAdmin.from("jane_integrations").insert({
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
    await supabaseAdmin
      .from("onboarding_sessions")
      .update({ completed: true })
      .eq("organization_id", organizationId)
      .eq("started_by", userId);

    // Log completion to audit
    console.log("Logging to audit");
    await supabaseAdmin.from("audit_log").insert({
      entity: "onboarding",
      entity_id: organizationId,
      actor_id: userId,
      action: "completed",
      payload: { industry: data.industry, team_size: data.team_size, core_values_count: data.core_values?.length },
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
