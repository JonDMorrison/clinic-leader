const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * bulk-ingest-advancedmd — STUB
 *
 * Placeholder for AdvancedMD data ingestion. Returns a 501 until
 * staging tables and parsing logic are implemented.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const orgId = body.organization_id ?? "unknown";

  console.log(`[bulk-ingest-advancedmd] STUB called for org=${orgId}. Not yet implemented.`);

  return new Response(
    JSON.stringify({
      success: false,
      error: "AdvancedMD ingestion is not yet implemented",
      organization_id: orgId,
    }),
    {
      status: 501,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
