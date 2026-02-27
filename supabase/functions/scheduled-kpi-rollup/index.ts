import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Map source_system → rollup edge function name. Add new sources here. */
const ROLLUP_FUNCTION_MAP: Record<string, string> = {
  jane: "jane-kpi-rollup",
  advancedmd: "advancedmd-kpi-rollup", // stub — function does not exist yet
};

/**
 * Scheduled KPI Rollup - runs nightly to ensure all orgs have fresh metric data
 *
 * This function:
 * 1. Finds ALL active connectors (any source_system)
 * 2. Routes each connector to the correct rollup function
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

    // Find ALL active connectors regardless of source_system
    const { data: connectors, error: connectorError } = await supabase
      .from("bulk_analytics_connectors")
      .select("organization_id, source_system")
      .in("status", ["receiving_data", "active"]);

    if (connectorError) {
      throw new Error(`Failed to fetch connectors: ${connectorError.message}`);
    }

    const rows = connectors || [];
    console.log(`[scheduled-kpi-rollup] Found ${rows.length} active connector(s) across ${new Set(rows.map(r => r.organization_id)).size} org(s)`);

    const results: { org: string; source: string; rollup_fn: string; weekly: string; monthly: string }[] = [];

    // Process each connector (not deduped — one org may have multiple sources)
    for (const row of rows) {
      const { organization_id: orgId, source_system: source } = row;
      const rollupFn = ROLLUP_FUNCTION_MAP[source];

      if (!rollupFn) {
        console.warn(`[scheduled-kpi-rollup] Skipping org=${orgId} — unsupported source_system="${source}"`);
        results.push({ org: orgId, source, rollup_fn: "none", weekly: "skipped", monthly: "skipped" });
        continue;
      }

      const entry = { org: orgId, source, rollup_fn: rollupFn, weekly: "pending", monthly: "pending" };

      try {
        // Run weekly rollup
        const { error: weeklyError } = await supabase.functions.invoke(rollupFn, {
          body: { organization_id: orgId, period_type: "weekly" },
        });
        entry.weekly = weeklyError ? `error: ${weeklyError.message}` : "success";

        // Run monthly rollup (also computes YTD)
        const { error: monthlyError } = await supabase.functions.invoke(rollupFn, {
          body: { organization_id: orgId, period_type: "monthly" },
        });
        entry.monthly = monthlyError ? `error: ${monthlyError.message}` : "success";
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        entry.weekly = `exception: ${errorMsg}`;
        entry.monthly = `exception: ${errorMsg}`;
      }

      results.push(entry);
      console.log(`[scheduled-kpi-rollup] org=${orgId} source=${source} fn=${rollupFn} weekly=${entry.weekly} monthly=${entry.monthly}`);
    }

    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.weekly === "success" && r.monthly === "success").length;
    const skippedCount = results.filter(r => r.weekly === "skipped").length;

    console.log(`[scheduled-kpi-rollup] Done: ${successCount} ok, ${skippedCount} skipped, ${results.length - successCount - skippedCount} failed (${duration}ms)`);

    return new Response(
      JSON.stringify({
        success: true,
        connectors_processed: results.length,
        successful: successCount,
        skipped: skippedCount,
        duration_ms: duration,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[scheduled-kpi-rollup] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
