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
  file_info?: JaneFileInfo;
  csv_data?: Record<string, unknown>[];
  scan_s3?: boolean;
}

interface DataScopeConfig {
  allowed_resources: string[];
  prohibited_fields: string[];
  ingestion_mode: string;
}

interface QuarantinedField {
  organization_id: string;
  connector_id: string;
  file_name: string;
  resource_name: string;
  field_name: string;
  field_value_preview: string | null;
  detection_method: string;
  severity: string;
  action_taken: string;
}

// ============================================================================
// DATA MINIMIZATION: Core PHI Detection Patterns
// ============================================================================

// Fields that are ALWAYS prohibited regardless of connector config
const HARDCODED_PROHIBITED_FIELDS = new Set([
  // Names
  'patient_name', 'patient_first_name', 'patient_last_name', 'first_name', 'last_name', 'name', 'full_name',
  'guardian_name', 'emergency_contact_name', 'spouse_name',
  // Email
  'email', 'patient_email', 'email_address', 'contact_email',
  // Phone
  'phone', 'phone_number', 'mobile', 'cell', 'patient_phone', 'home_phone', 'work_phone', 'mobile_phone',
  // Address
  'address', 'street', 'street_address', 'address_line_1', 'address_line_2', 'full_address',
  // SSN/SIN
  'ssn', 'social_security', 'sin', 'social_insurance', 'social_security_number',
  // DOB - critical PHI
  'dob', 'date_of_birth', 'birth_date', 'birthdate', 'birthday',
  // Clinical notes
  'clinical_notes', 'notes', 'soap_notes', 'treatment_notes', 'chart_notes', 'progress_notes',
  'subjective', 'objective', 'assessment', 'plan', 'chief_complaint', 'history', 'medical_history',
  // Diagnosis
  'diagnosis', 'diagnoses', 'icd_code', 'diagnosis_code', 'condition', 'conditions',
  // Insurance
  'insurance_id', 'policy_number', 'member_id', 'group_number', 'subscriber_id',
  // Financial
  'credit_card', 'card_number', 'cvv', 'expiry', 'bank_account', 'routing_number',
  // Auth
  'password', 'secret', 'token', 'api_key',
]);

// Regex patterns for detecting PHI in field names (case-insensitive)
const PHI_FIELD_PATTERNS = [
  /patient.*name/i,
  /^name$/i,
  /first.*name/i,
  /last.*name/i,
  /full.*name/i,
  /^email/i,
  /email.*address/i,
  /^phone/i,
  /phone.*number/i,
  /^mobile/i,
  /^cell/i,
  /street.*address/i,
  /^address/i,
  /^ssn$/i,
  /social.*security/i,
  /^sin$/i,
  /date.*birth/i,
  /^dob$/i,
  /birth.*date/i,
  /clinical.*note/i,
  /soap.*note/i,
  /chart.*note/i,
  /treatment.*note/i,
  /^diagnosis/i,
  /icd.*code/i,
  /credit.*card/i,
  /card.*number/i,
];

// Regex patterns for detecting PHI VALUES (regardless of field name)
const PHI_VALUE_PATTERNS = [
  // Email pattern
  { pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, name: 'email', severity: 'critical' },
  // Phone patterns (various formats)
  { pattern: /^\+?1?\d{10,14}$/, name: 'phone_number', severity: 'critical' },
  { pattern: /^\(\d{3}\)\s?\d{3}-?\d{4}$/, name: 'phone_formatted', severity: 'critical' },
  { pattern: /^\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/, name: 'phone_dashed', severity: 'critical' },
  // SSN pattern
  { pattern: /^\d{3}-?\d{2}-?\d{4}$/, name: 'ssn', severity: 'critical' },
  // Credit card (basic check)
  { pattern: /^\d{13,19}$/, name: 'credit_card', severity: 'critical' },
];

// Fields we EXPLICITLY ALLOW (whitelist approach for safe fields)
const ALLOWED_STAGING_FIELDS: Record<string, Set<string>> = {
  appointments: new Set([
    'organization_id', 'account_guid', 'file_date', 'raw_row',
    'appointment_guid', 'patient_guid', 'staff_member_guid', 'staff_member_name',
    'treatment_guid', 'clinic_guid', 'location_name', 'discipline_name', 'treatment_name',
    'start_at', 'end_at', 'booked_at', 'created_at_jane', 'updated_at_jane',
    'cancelled_at', 'arrived_at', 'no_show_at', 'price', 'first_visit',
  ]),
  patients: new Set([
    'organization_id', 'account_guid', 'file_date', 'raw_row',
    'patient_guid', 'clinic_guid', 'city', 'province', 'postal', 'country',
    'sex', 'referral_source', 'discharged_at', 'email_hash',
    // NOTE: dob is explicitly NOT in this list
  ]),
  payments: new Set([
    'organization_id', 'account_guid', 'file_date', 'raw_row',
    'payment_guid', 'clinic_guid', 'location_guid', 'patient_account_guid',
    'amount', 'payment_type', 'payer_type', 'payer_id', 'received_at',
    'workflow', 'payment_method', 'card_type',
    'payment_method_internal', 'payment_method_external', 'jane_payments_partner',
  ]),
  invoices: new Set([
    'organization_id', 'account_guid', 'file_date', 'raw_row',
    'invoice_guid', 'purchasable_guid', 'patient_guid', 'staff_member_guid', 'staff_member_name',
    'clinic_guid', 'subtotal', 'amount_paid', 'income_category', 'invoiced_at', 'payer_type',
    'location_guid', 'purchasable_type', 'purchasable_id', 'income_category_id', 'sale_map_coordinates',
  ]),
  shifts: new Set([
    'organization_id', 'account_guid', 'file_date', 'raw_row',
    'shift_guid', 'staff_member_guid', 'staff_member_name', 'clinic_guid',
    'location_guid', 'room_guid', 'start_at', 'end_at', 'book_online', 'call_to_book',
  ]),
};

// ============================================================================
// DATA MINIMIZATION: Enforcement Functions
// ============================================================================

function isProhibitedField(fieldName: string, customProhibited: string[] = []): boolean {
  const lowerField = fieldName.toLowerCase().trim();
  
  // Check hardcoded list
  if (HARDCODED_PROHIBITED_FIELDS.has(lowerField)) {
    return true;
  }
  
  // Check custom prohibited list from connector config
  if (customProhibited.some(p => lowerField === p.toLowerCase())) {
    return true;
  }
  
  // Check PHI patterns
  if (PHI_FIELD_PATTERNS.some(pattern => pattern.test(lowerField))) {
    return true;
  }
  
  return false;
}

function detectPhiInValue(value: unknown): { detected: boolean; type: string; severity: string } | null {
  if (value === null || value === undefined) return null;
  
  const strValue = String(value).trim();
  if (strValue.length < 5) return null; // Too short to be PHI
  
  for (const { pattern, name, severity } of PHI_VALUE_PATTERNS) {
    if (pattern.test(strValue)) {
      return { detected: true, type: name, severity };
    }
  }
  
  return null;
}

function redactPreview(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value);
  if (str.length <= 3) return '***';
  return str.substring(0, 3) + '***' + (str.length > 6 ? str.substring(str.length - 2) : '');
}

interface SanitizationResult {
  sanitizedRow: Record<string, unknown>;
  quarantinedFields: QuarantinedField[];
  hasBlockingViolation: boolean;
}

function sanitizeRow(
  row: Record<string, unknown>,
  resource: string,
  fileName: string,
  orgId: string,
  connectorId: string,
  dataScope: DataScopeConfig
): SanitizationResult {
  const sanitizedRow: Record<string, unknown> = {};
  const quarantinedFields: QuarantinedField[] = [];
  let hasBlockingViolation = false;
  
  const allowedFields = ALLOWED_STAGING_FIELDS[resource.toLowerCase()];
  
  for (const [key, value] of Object.entries(row)) {
    const lowerKey = key.toLowerCase().trim();
    
    // Check 1: Is this field explicitly prohibited?
    if (isProhibitedField(key, dataScope.prohibited_fields)) {
      quarantinedFields.push({
        organization_id: orgId,
        connector_id: connectorId,
        file_name: fileName,
        resource_name: resource,
        field_name: key,
        field_value_preview: redactPreview(value),
        detection_method: 'prohibited_list',
        severity: 'critical',
        action_taken: 'field_dropped',
      });
      console.log(`[DATA-MIN] Dropped prohibited field: ${key}`);
      continue; // Skip this field
    }
    
    // Check 2: Is this field in our whitelist for this resource?
    if (allowedFields && !allowedFields.has(lowerKey)) {
      // Unknown field - log but don't block
      quarantinedFields.push({
        organization_id: orgId,
        connector_id: connectorId,
        file_name: fileName,
        resource_name: resource,
        field_name: key,
        field_value_preview: redactPreview(value),
        detection_method: 'unknown_column',
        severity: 'warning',
        action_taken: 'field_dropped',
      });
      console.log(`[DATA-MIN] Dropped unknown field: ${key}`);
      continue; // Skip unknown fields by default
    }
    
    // Check 3: Does the VALUE contain PHI patterns?
    const phiDetection = detectPhiInValue(value);
    if (phiDetection) {
      quarantinedFields.push({
        organization_id: orgId,
        connector_id: connectorId,
        file_name: fileName,
        resource_name: resource,
        field_name: key,
        field_value_preview: redactPreview(value),
        detection_method: 'phi_pattern',
        severity: phiDetection.severity,
        action_taken: 'field_dropped',
      });
      console.log(`[DATA-MIN] PHI detected in field ${key}: ${phiDetection.type}`);
      
      if (phiDetection.severity === 'critical') {
        hasBlockingViolation = true;
      }
      continue; // Skip this field
    }
    
    // Field passes all checks - include it
    sanitizedRow[key] = value;
  }
  
  return { sanitizedRow, quarantinedFields, hasBlockingViolation };
}

async function logQuarantinedFields(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  fields: QuarantinedField[]
): Promise<void> {
  if (fields.length === 0) return;
  
  try {
    const { error } = await supabase
      .from('quarantined_fields_log')
      .insert(fields as unknown as Record<string, unknown>[]);
    
    if (error) {
      console.error(`[DATA-MIN] Failed to log quarantined fields: ${error.message}`);
    } else {
      console.log(`[DATA-MIN] Logged ${fields.length} quarantined fields`);
    }
  } catch (e) {
    console.error(`[DATA-MIN] Error logging quarantined fields:`, e);
  }
}

function validateHeaders(
  headers: string[],
  resource: string,
  dataScope: DataScopeConfig
): { valid: boolean; prohibitedFound: string[]; unknownFound: string[] } {
  const prohibitedFound: string[] = [];
  const unknownFound: string[] = [];
  const allowedFields = ALLOWED_STAGING_FIELDS[resource.toLowerCase()];
  
  for (const header of headers) {
    const lowerHeader = header.toLowerCase().trim();
    
    if (isProhibitedField(header, dataScope.prohibited_fields)) {
      prohibitedFound.push(header);
    } else if (allowedFields && !allowedFields.has(lowerHeader)) {
      unknownFound.push(header);
    }
  }
  
  return {
    valid: prohibitedFound.length === 0, // Block if any prohibited fields found
    prohibitedFound,
    unknownFound,
  };
}

// ============================================================================
// EXISTING HELPER FUNCTIONS
// ============================================================================

function parseJaneFilename(filename: string): { resource: string; account_guid: string } | null {
  const match = filename.match(/^([a-z_]+)_([a-f0-9-]+)\.csv$/i);
  if (!match) return null;
  return {
    resource: match[1],
    account_guid: match[2],
  };
}

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

function mapRowToStagingColumns(
  resource: string,
  row: Record<string, unknown>,
  accountGuid: string,
  fileDate: string,
  orgId: string
): Record<string, unknown> | null {
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
        staff_member_name: row.staff_member_name || row.staff_name || row.practitioner_name,
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
        // dob: row.dob, // REMOVED - PHI field
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
        staff_member_name: row.staff_member_name || row.staff_name || row.practitioner_name,
        clinic_guid: row.clinic_guid,
        subtotal: row.subtotal ? parseFloat(String(row.subtotal)) : null,
        amount_paid: row.amount_paid ? parseFloat(String(row.amount_paid)) : null,
        income_category: row.income_category,
        invoiced_at: row.invoiced_at,
        payer_type: row.payer_type,
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
        staff_member_name: row.staff_member_name || row.staff_name || row.practitioner_name,
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

function generateChecksum(s3Key: string, fileDate: string): string {
  return `jane_${s3Key}_${fileDate}`;
}

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

// ============================================================================
// MAIN HANDLER
// ============================================================================

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

    // 1. Fetch the connector configuration including data scope
    const { data: connector, error: connectorError } = await supabase
      .from("bulk_analytics_connectors")
      .select("*, allowed_resources, prohibited_fields, ingestion_mode")
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
      return new Response(
        JSON.stringify({ error: "This endpoint only handles Jane connectors" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract data scope configuration
    const dataScope: DataScopeConfig = {
      allowed_resources: connector.allowed_resources || [],
      prohibited_fields: connector.prohibited_fields || [],
      ingestion_mode: connector.ingestion_mode || 'aggregate_only',
    };

    const orgId = connector.organization_id;
    console.log(`[bulk-ingest-jane] Connector: ${connector.source_system}, org: ${orgId}, mode: ${dataScope.ingestion_mode}`);

    if (scan_s3) {
      return new Response(
        JSON.stringify({ message: "S3 scanning not yet implemented. Use direct file upload." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!file_info || !csv_data || csv_data.length === 0) {
      return new Response(
        JSON.stringify({ error: "file_info and csv_data are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { resource, file_date, account_guid, s3_key } = file_info;

    // =========================================================================
    // DATA MINIMIZATION: Pre-flight header validation
    // =========================================================================
    const headers = csv_data.length > 0 ? Object.keys(csv_data[0]) : [];
    const headerValidation = validateHeaders(headers, resource, dataScope);
    
    if (!headerValidation.valid) {
      console.error(`[DATA-MIN] BLOCKING: Prohibited fields in headers: ${headerValidation.prohibitedFound.join(', ')}`);
      
      // Log all prohibited fields found
      const quarantineEntries: QuarantinedField[] = headerValidation.prohibitedFound.map(field => ({
        organization_id: orgId,
        connector_id: connector_id,
        file_name: s3_key,
        resource_name: resource,
        field_name: field,
        field_value_preview: null,
        detection_method: 'prohibited_list',
        severity: 'critical',
        action_taken: 'file_blocked',
      }));
      
      await logQuarantinedFields(supabase, quarantineEntries);
      
      // Update connector status
      await supabase
        .from("bulk_analytics_connectors")
        .update({
          status: "error",
          last_error: `PHI DETECTED: File contains prohibited fields (${headerValidation.prohibitedFound.join(', ')}). Ingestion blocked.`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connector_id);
      
      return new Response(
        JSON.stringify({
          error: "PHI_DETECTED",
          message: "File contains prohibited fields and cannot be ingested",
          prohibited_fields: headerValidation.prohibitedFound,
          action: "file_blocked",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Log unknown fields as warnings (but continue processing)
    if (headerValidation.unknownFound.length > 0) {
      console.log(`[DATA-MIN] Unknown fields will be dropped: ${headerValidation.unknownFound.join(', ')}`);
    }

    // 2. Account GUID lock check
    if (connector.locked_account_guid) {
      if (account_guid !== connector.locked_account_guid) {
        const errorMsg = `Account GUID mismatch. Expected: ${connector.locked_account_guid}, Got: ${account_guid}`;
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

    // 3. Check for duplicate/quarantined file
    const checksum = generateChecksum(s3_key, file_date);
    const { data: existingLog } = await supabase
      .from("file_ingest_log")
      .select("id, status, quarantined, quarantine_reason")
      .eq("organization_id", orgId)
      .eq("checksum", checksum)
      .maybeSingle();

    if (existingLog && existingLog.status === "success") {
      return new Response(
        JSON.stringify({ message: "File already processed", file: s3_key }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingLog?.quarantined) {
      return new Response(
        JSON.stringify({ 
          message: "File is quarantined and will not be retried",
          reason: existingLog.quarantine_reason,
          file: s3_key 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Get staging table
    const stagingTable = getStagingTable(resource);
    if (!stagingTable) {
      return new Response(
        JSON.stringify({ error: `Unknown resource type: ${resource}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentConsecutiveFailures = await getConsecutiveFailures(supabase, orgId, resource);

    // 5. Create ingest log
    const { data: ingestLog } = await supabase
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

    // 6. Update connector received timestamp
    const receivedAt = new Date().toISOString();
    await supabase
      .from("bulk_analytics_connectors")
      .update({ last_received_at: receivedAt })
      .eq("id", connector_id);

    // =========================================================================
    // DATA MINIMIZATION: Row-by-row sanitization
    // =========================================================================
    let processedRows = 0;
    let processingError: string | null = null;
    const allQuarantinedFields: QuarantinedField[] = [];

    try {
      const sanitizedRows: Record<string, unknown>[] = [];
      
      for (const row of csv_data) {
        // Sanitize each row - remove prohibited/unknown fields
        const { sanitizedRow, quarantinedFields, hasBlockingViolation } = sanitizeRow(
          row,
          resource,
          s3_key,
          orgId,
          connector_id,
          dataScope
        );
        
        allQuarantinedFields.push(...quarantinedFields);
        
        // Map to staging format (only with sanitized data)
        const stagingRow = mapRowToStagingColumns(resource, sanitizedRow, account_guid, file_date, orgId);
        if (stagingRow) {
          sanitizedRows.push(stagingRow);
        }
      }

      // Log all quarantined fields
      await logQuarantinedFields(supabase, allQuarantinedFields);

      if (sanitizedRows.length === 0) {
        throw new Error("No valid rows after sanitization");
      }

      console.log(`[bulk-ingest-jane] Upserting ${sanitizedRows.length} sanitized rows to ${stagingTable}`);
      console.log(`[DATA-MIN] Quarantined ${allQuarantinedFields.length} field instances`);

      // Upsert in batches
      const batchSize = 500;
      for (let i = 0; i < sanitizedRows.length; i += batchSize) {
        const batch = sanitizedRows.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from(stagingTable)
          .upsert(batch, { 
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

    // 8. Calculate consecutive failures
    const newConsecutiveFailures = processingError 
      ? currentConsecutiveFailures + 1 
      : 0;

    const shouldQuarantine = processingError && isSchemaError(processingError);
    const shouldSetConnectorError = shouldQuarantine || newConsecutiveFailures >= 3;

    // 9. Update ingest log
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

    // 10. Update connector status
    const processedAt = new Date().toISOString();
    const isFirstSuccessfulIngest = !connector.locked_account_guid && !processingError;
    
    const connectorUpdate: Record<string, unknown> = {
      updated_at: processedAt,
    };

    if (!processingError) {
      connectorUpdate.last_processed_at = processedAt;
      connectorUpdate.last_error = null;
    }

    if (isFirstSuccessfulIngest) {
      connectorUpdate.locked_account_guid = account_guid;
      connectorUpdate.status = "receiving_data";
    } else if (shouldSetConnectorError) {
      connectorUpdate.status = "error";
      connectorUpdate.last_error = shouldQuarantine 
        ? `Schema mismatch on ${resource}: ${processingError}`
        : `${resource} failed ${newConsecutiveFailures} times: ${processingError}`;
    } else if (!processingError) {
      connectorUpdate.status = "receiving_data";
    }

    await supabase
      .from("bulk_analytics_connectors")
      .update(connectorUpdate)
      .eq("id", connector_id);

    return new Response(
      JSON.stringify({
        success: !processingError,
        connector_id,
        resource,
        file_date,
        account_guid,
        rows_processed: processedRows,
        rows_original: csv_data.length,
        fields_quarantined: allQuarantinedFields.length,
        received_at: receivedAt,
        processed_at: processedAt,
        first_ingest: isFirstSuccessfulIngest,
        consecutive_failures: newConsecutiveFailures,
        quarantined: shouldQuarantine,
        data_minimization: {
          enabled: true,
          mode: dataScope.ingestion_mode,
          fields_dropped: allQuarantinedFields.length,
        },
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
