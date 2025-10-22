import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LicenseCheck {
  organizationId: string;
  checkType: "users" | "ai_calls";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { organizationId, checkType }: LicenseCheck = await req.json();

    // Get license
    const { data: license, error: licenseError } = await supabase
      .from("licenses")
      .select("*")
      .eq("organization_id", organizationId)
      .single();

    if (licenseError) {
      console.error("License fetch error:", licenseError);
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          error: "License not found" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!license.active) {
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          error: "License inactive" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let allowed = true;
    let usage = 0;
    let limit = 0;

    if (checkType === "users") {
      // Check user count
      const { count } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("team_id", organizationId);

      usage = count || 0;
      limit = license.users_limit;
      allowed = usage < limit;
    } else if (checkType === "ai_calls") {
      // Check AI calls for current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: aiUsage } = await supabase
        .from("ai_usage")
        .select("api_calls")
        .gte("date", startOfMonth.toISOString().split("T")[0]);

      usage = aiUsage?.reduce((sum, record) => sum + record.api_calls, 0) || 0;
      limit = license.ai_calls_limit;
      allowed = usage < limit;
    }

    return new Response(
      JSON.stringify({
        allowed,
        usage,
        limit,
        plan: license.plan,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
