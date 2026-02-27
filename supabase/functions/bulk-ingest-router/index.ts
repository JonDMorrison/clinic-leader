import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Map source_system → ingest edge function name. */
const INGEST_FUNCTION_MAP: Record<string, string> = {
  jane: "bulk-ingest-jane",
  advancedmd: "bulk-ingest-advancedmd",
};

/**
 * bulk-ingest-router
 *
 * A thin routing layer that:
 * 1. Looks up the connector by (organization_id, source_system)
 * 2. Validates the connector is in an active state
 * 3. Forwards the payload to the correct source-specific ingest function
 *
 * Input body:
 *   { organization_id, source_system, resource_type, s3_key?, csv_payload?, file_info?, csv_data? }
 *
 * Returns a consistent envelope:
 *   { success: boolean, source_system, ingest_function, connector_id, result?, error? }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { organization_id, source_system, resource_type, s3_key, csv_payload, ...rest } = body;

    // ── Validate required fields ──
    if (!organization_id || !source_system) {
      return jsonResponse(400, {
        success: false,
        error: "organization_id and source_system are required",
      });
    }

    // ── Look up connector (unique constraint guarantees at most one row) ──
    const { data: connector, error: connectorError } = await supabase
      .from("bulk_analytics_connectors")
      .select("id, status, source_system, locked_account_guid")
      .eq("organization_id", organization_id)
      .eq("source_system", source_system)
      .single();

    if (connectorError && connectorError.code === "PGRST116") {
      return jsonResponse(404, {
        success: false,
        error: `No connector found for org=${organization_id}, source=${source_system}`,
      });
    }
    if (connectorError) {
      throw connectorError;
    }

    // ── Validate connector status ──
    const VALID_STATUSES = ["active", "receiving_data"];
    if (!VALID_STATUSES.includes(connector.status)) {
      return jsonResponse(409, {
        success: false,
        error: `Connector status is "${connector.status}" — must be one of: ${VALID_STATUSES.join(", ")}`,
        connector_id: connector.id,
      });
    }

    // ── Resolve target ingest function ──
    const ingestFn = INGEST_FUNCTION_MAP[source_system];
    if (!ingestFn) {
      console.warn(`[bulk-ingest-router] Unsupported source_system="${source_system}" for org=${organization_id}`);
      return jsonResponse(422, {
        success: false,
        error: `Unsupported source_system: "${source_system}"`,
      });
    }

    console.log(`[bulk-ingest-router] Routing org=${organization_id} source=${source_system} → ${ingestFn}`);

    // ── Forward to source-specific ingest function ──
    // Pass through the full body plus the resolved connector_id
    const forwardBody = {
      ...rest,
      connector_id: connector.id,
      organization_id,
      source_system,
      resource_type,
      s3_key,
      csv_payload,
    };

    const { data: result, error: invokeError } = await supabase.functions.invoke(ingestFn, {
      body: forwardBody,
    });

    if (invokeError) {
      console.error(`[bulk-ingest-router] ${ingestFn} returned error:`, invokeError.message);
      return jsonResponse(502, {
        success: false,
        source_system,
        ingest_function: ingestFn,
        connector_id: connector.id,
        error: invokeError.message,
      });
    }

    console.log(`[bulk-ingest-router] ${ingestFn} completed for org=${organization_id}`);

    return jsonResponse(200, {
      success: true,
      source_system,
      ingest_function: ingestFn,
      connector_id: connector.id,
      result,
    });
  } catch (error) {
    console.error("[bulk-ingest-router] Fatal error:", error);
    return jsonResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
