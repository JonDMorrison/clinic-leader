import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JaneFileInfo {
  resource: string;
  file_date: string;
  account_guid: string;
  s3_key: string;
}

interface IngestRequest {
  connector_id: string;
  // Option 1: Direct file data (for manual upload or webhook)
  file_info?: JaneFileInfo;
  csv_data?: Record<string, unknown>[];
  // Option 2: S3 scan mode (for scheduled polling)
  scan_s3?: boolean;
}

// Parse Jane filename pattern: {resource}_{account_guid}.csv
function parseJaneFilename(filename: string): { resource: string; account_guid: string } | null {
  const match = filename.match(/^([a-z_]+)_([a-f0-9-]+)\.csv$/i);
  if (!match) return null;
  return {
    resource: match[1],
    account_guid: match[2],
  };
}

// Map Jane resource names to staging table names
function getStagingTable(resource: string): string | null {
  const tableMap: Record<string, string> = {
    appointments: "staging_appointments_jane",
    patients: "staging_patients_jane",
    payments: "staging_payments_jane",
    invoices: "staging_invoices_jane",
    shifts: "staging_shifts_jane",
  };
  return tableMap[resource.toLowerCase()] || null;
}

// Map CSV columns to staging table columns for each resource
function mapRowToStagingColumns(resource: string, row: Record<string, unknown>, accountGuid: string, fileDate: string, orgId: string): Record<string, unknown> | null {
  const baseFields = {
    organization_id: orgId,
    account_guid: accountGuid,
    file_date: fileDate,
    raw_row: row,
  };

  switch (resource.toLowerCase()) {
    case "appointments":
      return {
        ...baseFields,
        appointment_guid: row.appointment_guid || row.guid,
        patient_guid: row.patient_guid,
        staff_member_guid: row.staff_member_guid,
        treatment_guid: row.treatment_guid,
        clinic_guid: row.clinic_guid,
        location_name: row.location_name,
        discipline_name: row.discipline_name,
        treatment_name: row.treatment_name,
        start_at: row.start_at,
        end_at: row.end_at,
        booked_at: row.booked_at,
        created_at_jane: row.created_at,
        updated_at_jane: row.updated_at,
        cancelled_at: row.cancelled_at,
        arrived_at: row.arrived_at,
        no_show_at: row.no_show_at,
        price: row.price ? parseFloat(String(row.price)) : null,
        first_visit: row.first_visit === "true" || row.first_visit === true,
      };

    case "patients":
      return {
        ...baseFields,
        patient_guid: row.patient_guid || row.guid,
        clinic_guid: row.clinic_guid,
        city: row.city,
        province: row.province,
        postal: row.postal,
        country: row.country,
        sex: row.sex,
        referral_source: row.referral_source,
        dob: row.dob,
        discharged_at: row.discharged_at,
        email_hash: row.email_hash,
      };

    case "payments":
      return {
        ...baseFields,
        payment_guid: row.payment_guid || row.guid,
        clinic_guid: row.clinic_guid,
        location_guid: row.location_guid,
        patient_account_guid: row.account_guid,
        amount: row.amount ? parseFloat(String(row.amount)) : null,
        payment_type: row.type,
        payer_type: row.payer_type,
        payer_id: row.payer_id,
        received_at: row.received_at,
        workflow: row.workflow,
        payment_method: row.payment_method,
        card_type: row.card_type,
        // New fields from Jane data pipe
        payment_method_internal: row.payment_method_internal,
        payment_method_external: row.payment_method_external,
        jane_payments_partner: row.jane_payments_partner,
      };

    case "invoices":
      return {
        ...baseFields,
        invoice_guid: row.invoice_guid,
        purchasable_guid: row.purchasable_guid || row.guid,
        patient_guid: row.patient_guid,
        staff_member_guid: row.staff_member_guid,
        clinic_guid: row.clinic_guid,
        subtotal: row.subtotal ? parseFloat(String(row.subtotal)) : null,
        amount_paid: row.amount_paid ? parseFloat(String(row.amount_paid)) : null,
        income_category: row.income_category,
        invoiced_at: row.invoiced_at,
        payer_type: row.payer_type,
        // New fields from Jane data pipe
        location_guid: row.location_guid,
        purchasable_type: row.purchasable_type,
        purchasable_id: row.purchasable_id,
        income_category_id: row.income_category_id,
        sale_map_coordinates: row.sale_map_coordinates,
      };

    case "shifts":
      return {
        ...baseFields,
        shift_guid: row.shift_guid || row.guid,
        staff_member_guid: row.staff_member_guid,
        clinic_guid: row.clinic_guid,
        location_guid: row.location_guid,
        room_guid: row.room_guid,
        start_at: row.start_at,
        end_at: row.end_at,
        book_online: row.book_online === "true" || row.book_online === true,
        call_to_book: row.call_to_book === "true" || row.call_to_book === true,
      };

    default:
      return null;
  }
}

// Generate checksum for deduplication
function generateChecksum(s3Key: string, fileDate: string): string {
  return `jane_${s3Key}_${fileDate}`;
}

// Count consecutive failures for a resource
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getConsecutiveFailures(
  supabase: any,
  orgId: string,
  resource: string
): Promise<number> {
  const { data: recentLogs } = await supabase
    .from("file_ingest_log")
    .select("status")
    .eq("organization_id", orgId)
    .eq("source_system", "jane")
    .eq("resource_name", resource)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!recentLogs || recentLogs.length === 0) return 0;

  let failures = 0;
  for (const log of recentLogs as { status: string }[]) {
    if (log.status === "error") {
      failures++;
    } else {
      break;
    }
  }
  return failures;
}

// Determine if error is a schema mismatch (quarantine-worthy)
function isSchemaError(errorMessage: string): boolean {
  const schemaErrorPatterns = [
    "column .* does not exist",
    "invalid input syntax",
    "violates not-null constraint",
    "relation .* does not exist",
    "type .* does not exist",
  ];
  return schemaErrorPatterns.some(pattern => 
    new RegExp(pattern, "i").test(errorMessage)
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: IngestRequest = await req.json();
    const { connector_id, file_info, csv_data, scan_s3 } = body;

    console.log(`[bulk-ingest-jane] Starting ingestion for connector: ${connector_id}`);

    // 1. Fetch the connector configuration
    const { data: connector, error: connectorError } = await supabase
      .from("bulk_analytics_connectors")
      .select("*")
      .eq("id", connector_id)
      .single();

    if (connectorError || !connector) {
      console.error(`[bulk-ingest-jane] Connector not found: ${connectorError?.message}`);
      return new Response(
        JSON.stringify({ error: "Connector not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (connector.source_system !== "jane") {
      console.error(`[bulk-ingest-jane] Invalid source system: ${connector.source_system}`);
      return new Response(
        JSON.stringify({ error: "This endpoint only handles Jane connectors" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orgId = connector.organization_id;
    console.log(`[bulk-ingest-jane] Connector: ${connector.source_system}, org: ${orgId}, status: ${connector.status}`);

    // If scan_s3 mode, we would poll the S3 bucket for new files
    // For now, we implement direct file processing
    if (scan_s3) {
      // TODO: Implement S3 scanning when S3 credentials are configured
      console.log(`[bulk-ingest-jane] S3 scan mode - not yet implemented`);
      return new Response(
        JSON.stringify({ message: "S3 scanning not yet implemented. Use direct file upload." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate we have file info and data
    if (!file_info || !csv_data || csv_data.length === 0) {
      console.error(`[bulk-ingest-jane] Missing file_info or csv_data`);
      return new Response(
        JSON.stringify({ error: "file_info and csv_data are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { resource, file_date, account_guid, s3_key } = file_info;

    // 2. CRITICAL: Lock account GUID on first ingest
    if (connector.locked_account_guid) {
      // Verify this file belongs to the same account
      if (account_guid !== connector.locked_account_guid) {
        const errorMsg = `Account GUID mismatch. Expected: ${connector.locked_account_guid}, Got: ${account_guid}. This prevents cross-clinic data mixing.`;
        console.error(`[bulk-ingest-jane] ${errorMsg}`);
        
        await supabase
          .from("bulk_analytics_connectors")
          .update({ 
            status: "error",
            last_error: errorMsg,
            updated_at: new Date().toISOString()
          })
          .eq("id", connector_id);

        return new Response(
          JSON.stringify({ error: errorMsg }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Check for duplicate file or quarantined file
    const checksum = generateChecksum(s3_key, file_date);
    const { data: existingLog } = await supabase
      .from("file_ingest_log")
      .select("id, status, quarantined, quarantine_reason")
      .eq("organization_id", orgId)
      .eq("checksum", checksum)
      .maybeSingle();

    if (existingLog && existingLog.status === "success") {
      console.log(`[bulk-ingest-jane] File already processed: ${s3_key}`);
      return new Response(
        JSON.stringify({ message: "File already processed", file: s3_key }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if file is quarantined (don't retry unless schema version changed)
    if (existingLog?.quarantined) {
      console.log(`[bulk-ingest-jane] File is quarantined: ${existingLog.quarantine_reason}`);
      return new Response(
        JSON.stringify({ 
          message: "File is quarantined and will not be retried",
          reason: existingLog.quarantine_reason,
          file: s3_key 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Get staging table for this resource
    const stagingTable = getStagingTable(resource);
    if (!stagingTable) {
      console.error(`[bulk-ingest-jane] Unknown resource type: ${resource}`);
      return new Response(
        JSON.stringify({ error: `Unknown resource type: ${resource}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current consecutive failures for this resource
    const currentConsecutiveFailures = await getConsecutiveFailures(supabase, orgId, resource);

    // 5. Create or update ingest log entry
    const { data: ingestLog, error: ingestError } = await supabase
      .from("file_ingest_log")
      .upsert({
        organization_id: orgId,
        source_system: "jane",
        resource_name: resource,
        file_name: s3_key,
        s3_bucket: connector.s3_bucket,
        s3_key: s3_key,
        file_date: file_date,
        account_guid: account_guid,
        checksum: checksum,
        status: "pending",
        rows: csv_data.length,
        consecutive_failures: currentConsecutiveFailures,
        quarantined: false,
        quarantine_reason: null,
      }, { onConflict: "organization_id,checksum" })
      .select()
      .single();

    if (ingestError) {
      console.error(`[bulk-ingest-jane] Failed to create ingest log: ${ingestError.message}`);
    } else {
      console.log(`[bulk-ingest-jane] Created ingest log: ${ingestLog.id}`);
    }

    // 6. Update connector to show file received
    const receivedAt = new Date().toISOString();
    await supabase
      .from("bulk_analytics_connectors")
      .update({ 
        last_received_at: receivedAt,
      })
      .eq("id", connector_id);

    // 7. Process and insert data into staging table
    let processedRows = 0;
    let processingError: string | null = null;

    try {
      // Map rows to staging format
      const stagingRows = csv_data
        .map(row => mapRowToStagingColumns(resource, row, account_guid, file_date, orgId))
        .filter(row => row !== null);

      if (stagingRows.length === 0) {
        throw new Error("No valid rows after mapping");
      }

      console.log(`[bulk-ingest-jane] Upserting ${stagingRows.length} rows to ${stagingTable}`);

      // Upsert in batches of 500
      const batchSize = 500;
      for (let i = 0; i < stagingRows.length; i += batchSize) {
        const batch = stagingRows.slice(i, i + batchSize);
        
        // Use raw insert with ON CONFLICT for upsert behavior
        const { error: insertError } = await supabase
          .from(stagingTable)
          .upsert(batch as Record<string, unknown>[], { 
            onConflict: getUpsertConflictKey(resource),
            ignoreDuplicates: false 
          });

        if (insertError) {
          throw new Error(`Staging insert failed: ${insertError.message}`);
        }
        
        processedRows += batch.length;
      }

      console.log(`[bulk-ingest-jane] Successfully processed ${processedRows} rows`);
    } catch (e) {
      processingError = e instanceof Error ? e.message : "Unknown processing error";
      console.error(`[bulk-ingest-jane] Processing error: ${processingError}`);
    }

    // 8. Calculate new consecutive failures
    const newConsecutiveFailures = processingError 
      ? currentConsecutiveFailures + 1 
      : 0;

    // Determine if we should quarantine this file (schema error)
    const shouldQuarantine = processingError && isSchemaError(processingError);
    
    // SOFT-FAILURE: Only set connector to error if 3+ consecutive failures for same resource
    // OR if it's a schema mismatch that prevents ingestion entirely
    const shouldSetConnectorError = shouldQuarantine || newConsecutiveFailures >= 3;

    // 9. Update ingest log with result
    if (ingestLog) {
      await supabase
        .from("file_ingest_log")
        .update({
          status: processingError ? "error" : "success",
          rows: processedRows,
          error: processingError,
          consecutive_failures: newConsecutiveFailures,
          quarantined: shouldQuarantine,
          quarantine_reason: shouldQuarantine ? `Schema error: ${processingError}` : null,
        })
        .eq("id", ingestLog.id);
    }

    // 10. Update connector with processing result
    const processedAt = new Date().toISOString();
    const isFirstSuccessfulIngest = !connector.locked_account_guid && !processingError;
    
    const connectorUpdate: Record<string, unknown> = {
      updated_at: processedAt,
    };

    // Only update last_processed_at on success
    if (!processingError) {
      connectorUpdate.last_processed_at = processedAt;
      connectorUpdate.last_error = null;
    }

    // Lock account GUID on first successful ingest
    if (isFirstSuccessfulIngest) {
      connectorUpdate.locked_account_guid = account_guid;
      connectorUpdate.status = "receiving_data";
      console.log(`[bulk-ingest-jane] First successful ingest - locking account_guid: ${account_guid}`);
    } else if (shouldSetConnectorError) {
      // Only set connector to error for severe/repeated failures
      connectorUpdate.status = "error";
      connectorUpdate.last_error = shouldQuarantine 
        ? `Schema mismatch on ${resource}: ${processingError}`
        : `${resource} failed ${newConsecutiveFailures} times: ${processingError}`;
      console.log(`[bulk-ingest-jane] Setting connector to error: ${connectorUpdate.last_error}`);
    } else if (!processingError) {
      // Successful subsequent ingest
      connectorUpdate.status = "receiving_data";
    }
    // Note: Single resource failure does NOT set connector to error (soft-failure)

    await supabase
      .from("bulk_analytics_connectors")
      .update(connectorUpdate)
      .eq("id", connector_id);

    console.log(`[bulk-ingest-jane] Ingestion complete. Status: ${processingError ? "error" : "success"}, Consecutive failures: ${newConsecutiveFailures}`);

    return new Response(
      JSON.stringify({
        success: !processingError,
        connector_id,
        resource,
        file_date,
        account_guid,
        rows_processed: processedRows,
        received_at: receivedAt,
        processed_at: processedAt,
        first_ingest: isFirstSuccessfulIngest,
        consecutive_failures: newConsecutiveFailures,
        quarantined: shouldQuarantine,
        connector_status_changed: shouldSetConnectorError,
        error: processingError,
      }),
      { 
        status: processingError ? 500 : 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error(`[bulk-ingest-jane] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper to get upsert conflict key for each resource
function getUpsertConflictKey(resource: string): string {
  switch (resource.toLowerCase()) {
    case "appointments":
      return "organization_id,appointment_guid,file_date";
    case "patients":
      return "organization_id,patient_guid,file_date";
    case "payments":
      return "organization_id,payment_guid,file_date";
    case "invoices":
      return "organization_id,purchasable_guid,file_date";
    case "shifts":
      return "organization_id,shift_guid,file_date";
    default:
      return "organization_id";
  }
}
