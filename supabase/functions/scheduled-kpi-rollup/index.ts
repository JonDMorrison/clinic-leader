import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Scheduled KPI Rollup - runs nightly to ensure all orgs have fresh metric data
 * 
 * This function:
 * 1. Finds all active Jane connectors
 * 2. Triggers jane-kpi-rollup for each org (weekly + monthly)
 * 3. Ensures "This Week", "This Month", and "YTD" data is always available
 * 
 * Triggered by pg_cron at 2 AM UTC daily
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[scheduled-kpi-rollup] Starting nightly rollup job...");

    // Find all active Jane connectors
    const { data: connectors, error: connectorError } = await supabase
      .from("bulk_analytics_connectors")
      .select("organization_id")
      .eq("source_system", "jane")
      .in("status", ["receiving_data", "active"]);

    if (connectorError) {
      throw new Error(`Failed to fetch connectors: ${connectorError.message}`);
    }

    const orgIds = [...new Set((connectors || []).map(c => c.organization_id))];
    console.log(`[scheduled-kpi-rollup] Found ${orgIds.length} active organizations`);

    const results: { org: string; weekly: string; monthly: string }[] = [];

    // Process each org
    for (const orgId of orgIds) {
      const orgResult = { org: orgId, weekly: "pending", monthly: "pending" };
      
      try {
        // Run weekly rollup
        const { error: weeklyError } = await supabase.functions.invoke("jane-kpi-rollup", {
          body: { organization_id: orgId, period_type: "weekly" },
        });
        orgResult.weekly = weeklyError ? `error: ${weeklyError.message}` : "success";

        // Run monthly rollup (also computes YTD)
        const { error: monthlyError } = await supabase.functions.invoke("jane-kpi-rollup", {
          body: { organization_id: orgId, period_type: "monthly" },
        });
        orgResult.monthly = monthlyError ? `error: ${monthlyError.message}` : "success";

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        orgResult.weekly = `exception: ${errorMsg}`;
        orgResult.monthly = `exception: ${errorMsg}`;
      }

      results.push(orgResult);
      console.log(`[scheduled-kpi-rollup] Org ${orgId}: weekly=${orgResult.weekly}, monthly=${orgResult.monthly}`);
    }

    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.weekly === "success" && r.monthly === "success").length;

    console.log(`[scheduled-kpi-rollup] Completed: ${successCount}/${orgIds.length} orgs successful, ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        organizations_processed: orgIds.length,
        successful: successCount,
        duration_ms: duration,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[scheduled-kpi-rollup] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
