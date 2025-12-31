import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IngestRequest {
  connector_id: string;
  file_name: string;
  file_checksum?: string;
  raw_data?: Record<string, unknown>[];
  schema_version?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: IngestRequest = await req.json();
    const { connector_id, file_name, file_checksum, raw_data, schema_version } = body;

    console.log(`[bulk-ingest-analytics] Starting ingestion for connector: ${connector_id}`);
    console.log(`[bulk-ingest-analytics] File: ${file_name}, Schema: ${schema_version || "default"}`);

    // 1. Fetch the connector configuration
    const { data: connector, error: connectorError } = await supabase
      .from("bulk_analytics_connectors")
      .select("*")
      .eq("id", connector_id)
      .single();

    if (connectorError || !connector) {
      console.error(`[bulk-ingest-analytics] Connector not found: ${connectorError?.message}`);
      return new Response(
        JSON.stringify({ error: "Connector not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[bulk-ingest-analytics] Connector found: ${connector.source_system}, status: ${connector.status}`);

    // 2. Update connector to show file received
    const receivedAt = new Date().toISOString();
    await supabase
      .from("bulk_analytics_connectors")
      .update({ 
        last_received_at: receivedAt,
        status: "active",
        last_error: null 
      })
      .eq("id", connector_id);

    // 3. Validate schema version matches expected
    const expectedSchema = connector.expected_schema_version;
    if (schema_version && schema_version !== expectedSchema) {
      const errorMsg = `Schema mismatch: expected ${expectedSchema}, got ${schema_version}`;
      console.error(`[bulk-ingest-analytics] ${errorMsg}`);
      
      await supabase
        .from("bulk_analytics_connectors")
        .update({ 
          status: "error",
          last_error: errorMsg 
        })
        .eq("id", connector_id);

      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Log to file_ingest_log
    const { data: ingestLog, error: ingestError } = await supabase
      .from("file_ingest_log")
      .insert({
        file_name: file_name,
        checksum: file_checksum || `bulk_${Date.now()}`,
        status: "pending",
        rows: raw_data?.length || 0,
      })
      .select()
      .single();

    if (ingestError) {
      console.error(`[bulk-ingest-analytics] Failed to create ingest log: ${ingestError.message}`);
    } else {
      console.log(`[bulk-ingest-analytics] Created ingest log: ${ingestLog.id}`);
    }

    // 5. Process the data based on source system
    let processedRows = 0;
    let processingError: string | null = null;

    try {
      if (raw_data && raw_data.length > 0) {
        // For Jane bulk analytics, we could load into staging_payments or similar
        // This is a simplified example - in production, you'd route to appropriate staging tables
        if (connector.source_system === "jane") {
          // Example: Insert into staging_payments for payment data
          const { error: stagingError } = await supabase
            .from("staging_payments")
            .insert(raw_data.map(row => ({ raw: row })));

          if (stagingError) {
            throw new Error(`Staging insert failed: ${stagingError.message}`);
          }
          processedRows = raw_data.length;
        } else {
          // Generic handling for other source systems
          processedRows = raw_data.length;
        }

        console.log(`[bulk-ingest-analytics] Processed ${processedRows} rows`);
      } else {
        // Simulated processing for manual trigger without data
        console.log(`[bulk-ingest-analytics] Manual trigger - no data to process`);
        processedRows = 0;
      }
    } catch (e) {
      processingError = e instanceof Error ? e.message : "Unknown processing error";
      console.error(`[bulk-ingest-analytics] Processing error: ${processingError}`);
    }

    // 6. Update ingest log with result
    if (ingestLog) {
      await supabase
        .from("file_ingest_log")
        .update({
          status: processingError ? "error" : "success",
          rows: processedRows,
          error: processingError,
        })
        .eq("id", ingestLog.id);
    }

    // 7. Update connector with processing result
    const processedAt = new Date().toISOString();
    await supabase
      .from("bulk_analytics_connectors")
      .update({
        last_processed_at: processedAt,
        status: processingError ? "error" : "active",
        last_error: processingError,
        updated_at: processedAt,
      })
      .eq("id", connector_id);

    console.log(`[bulk-ingest-analytics] Ingestion complete. Status: ${processingError ? "error" : "success"}`);

    return new Response(
      JSON.stringify({
        success: !processingError,
        connector_id,
        file_name,
        rows_processed: processedRows,
        received_at: receivedAt,
        processed_at: processedAt,
        error: processingError,
      }),
      { 
        status: processingError ? 500 : 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error(`[bulk-ingest-analytics] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
