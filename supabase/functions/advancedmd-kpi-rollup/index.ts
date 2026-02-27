import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * advancedmd-kpi-rollup — STUB
 * Placeholder for AdvancedMD KPI rollup. Logs the request and returns 501.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[advancedmd-kpi-rollup] Not implemented. Received:", JSON.stringify(body));

    return new Response(
      JSON.stringify({
        error: "advancedmd-kpi-rollup is not implemented yet",
        received: body,
      }),
      { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[advancedmd-kpi-rollup] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
