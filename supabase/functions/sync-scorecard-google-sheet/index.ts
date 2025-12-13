import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncResult {
  success: boolean;
  rows_processed: number;
  rows_upserted: number;
  unmatched_metric_keys: { key: string; rows: number[] }[];
  invalid_month_rows: { row: number; value: string }[];
  invalid_value_rows: { row: number; value: string }[];
  detected_headers: string[];
  last_synced_month: string | null;
  error?: string;
}

// Parse Google Sheet URL to extract sheet ID
function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// Normalize month to YYYY-MM format
function normalizeMonth(value: string | number): string | null {
  if (!value) return null;
  
  const str = String(value).trim();
  
  // Already YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(str)) return str;
  
  // YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 7);
  
  // MM/YYYY or MM-YYYY
  const mmYYYY = str.match(/^(\d{1,2})[\/-](\d{4})$/);
  if (mmYYYY) {
    const month = mmYYYY[1].padStart(2, '0');
    return `${mmYYYY[2]}-${month}`;
  }
  
  // YYYY/MM or YYYY.MM
  const yyyyMM = str.match(/^(\d{4})[\/.,-](\d{1,2})$/);
  if (yyyyMM) {
    const month = yyyyMM[2].padStart(2, '0');
    return `${yyyyMM[1]}-${month}`;
  }
  
  // Try parsing as date
  try {
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${year}-${month}`;
    }
  } catch {
    // ignore
  }
  
  return null;
}

// Parse numeric value
function parseNumericValue(value: string | number): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  if (typeof value === 'number') return value;
  
  const cleaned = String(value)
    .trim()
    .replace(/[$%,]/g, '')
    .replace(/\(([0-9.]+)\)/, '-$1'); // Handle accounting notation
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header to determine org
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's org
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("team_id")
      .eq("id", user.id)
      .single();
    
    if (userError || !userData?.team_id) {
      return new Response(
        JSON.stringify({ success: false, error: "User not associated with organization" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orgId = userData.team_id;
    console.log(`[sync-scorecard-google-sheet] Starting sync for org: ${orgId}`);

    // Get org's import config
    const { data: config, error: configError } = await supabase
      .from("scorecard_import_configs")
      .select("*")
      .eq("organization_id", orgId)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ success: false, error: "No Google Sheet configured. Set up connection first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (config.source !== 'google_sheet' || !config.sheet_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Google Sheet not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sheetId = config.sheet_id;
    const tabName = config.tab_name || 'Scorecard_Input';

    console.log(`[sync-scorecard-google-sheet] Fetching sheet: ${sheetId}, tab: ${tabName}`);

    // Fetch Google Sheet data (public sheet via export URL)
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
    
    let csvData: string;
    try {
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
      }
      csvData = await response.text();
    } catch (fetchError: any) {
      console.error(`[sync-scorecard-google-sheet] Fetch error:`, fetchError);
      
      // Update config with error
      await supabase
        .from("scorecard_import_configs")
        .update({
          status: 'error',
          error_message: `Failed to fetch sheet: ${fetchError.message}. Make sure the sheet is shared with "Anyone with the link".`,
        })
        .eq("organization_id", orgId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch sheet. Make sure the sheet is shared with "Anyone with the link".` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse CSV
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      await supabase
        .from("scorecard_import_configs")
        .update({ status: 'error', error_message: 'Sheet is empty or has no data rows' })
        .eq("organization_id", orgId);
      
      return new Response(
        JSON.stringify({ success: false, error: "Sheet is empty or has no data rows" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse CSV rows (handle quoted values)
    function parseCSVRow(line: string): string[] {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    }

    const headerRow = parseCSVRow(lines[0]);
    const detectedHeaders = headerRow.map(h => h.toLowerCase().trim());
    
    console.log(`[sync-scorecard-google-sheet] Detected headers:`, detectedHeaders);

    // Validate required columns
    const metricKeyIdx = detectedHeaders.findIndex(h => h === 'metric_key');
    const valueIdx = detectedHeaders.findIndex(h => h === 'value');
    const monthIdx = detectedHeaders.findIndex(h => h === 'month');

    if (metricKeyIdx === -1 || valueIdx === -1 || monthIdx === -1) {
      const missing = [];
      if (metricKeyIdx === -1) missing.push('metric_key');
      if (valueIdx === -1) missing.push('value');
      if (monthIdx === -1) missing.push('month');

      await supabase
        .from("scorecard_import_configs")
        .update({
          status: 'error',
          error_message: `Missing required columns: ${missing.join(', ')}. Detected: ${headerRow.join(', ')}`,
        })
        .eq("organization_id", orgId);

      return new Response(
        JSON.stringify({
          success: false,
          error: `Missing required columns: ${missing.join(', ')}`,
          detected_headers: headerRow,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get org's active metrics with import_key
    const { data: metrics, error: metricsError } = await supabase
      .from("metrics")
      .select("id, name, import_key")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .not("import_key", "is", null);

    if (metricsError) {
      console.error(`[sync-scorecard-google-sheet] Metrics error:`, metricsError);
      throw metricsError;
    }

    // Build lookup map
    const metricByKey = new Map<string, { id: string; name: string }>();
    for (const m of metrics || []) {
      if (m.import_key) {
        metricByKey.set(m.import_key.toLowerCase().trim(), { id: m.id, name: m.name });
      }
    }

    console.log(`[sync-scorecard-google-sheet] Found ${metricByKey.size} metrics with import keys`);

    // Process data rows
    const result: SyncResult = {
      success: true,
      rows_processed: 0,
      rows_upserted: 0,
      unmatched_metric_keys: [],
      invalid_month_rows: [],
      invalid_value_rows: [],
      detected_headers: headerRow,
      last_synced_month: null,
    };

    const unmatchedKeysMap = new Map<string, number[]>();
    const upsertBatch: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1;
      const row = parseCSVRow(lines[i]);
      
      // Skip empty rows
      if (row.every(cell => !cell.trim())) continue;
      
      result.rows_processed++;

      const metricKey = (row[metricKeyIdx] || '').toLowerCase().trim();
      const valueRaw = row[valueIdx];
      const monthRaw = row[monthIdx];

      // Skip rows with empty metric_key
      if (!metricKey) continue;

      // Lookup metric
      const metric = metricByKey.get(metricKey);
      if (!metric) {
        if (!unmatchedKeysMap.has(metricKey)) {
          unmatchedKeysMap.set(metricKey, []);
        }
        unmatchedKeysMap.get(metricKey)!.push(rowNum);
        continue;
      }

      // Parse month
      const periodKey = normalizeMonth(monthRaw);
      if (!periodKey) {
        result.invalid_month_rows.push({ row: rowNum, value: monthRaw });
        continue;
      }

      // Parse value
      const value = parseNumericValue(valueRaw);
      if (value === null && valueRaw && valueRaw.trim()) {
        result.invalid_value_rows.push({ row: rowNum, value: valueRaw });
        continue;
      }

      // Track latest month
      if (!result.last_synced_month || periodKey > result.last_synced_month) {
        result.last_synced_month = periodKey;
      }

      // Add to upsert batch
      upsertBatch.push({
        metric_id: metric.id,
        period_type: 'monthly',
        period_start: `${periodKey}-01`,
        period_key: periodKey,
        value: value,
        source: 'google_sheet',
        raw_row: { row: rowNum, metric_key: metricKey, value: valueRaw, month: monthRaw },
      });
    }

    // Convert unmatched map to array
    for (const [key, rows] of unmatchedKeysMap) {
      result.unmatched_metric_keys.push({ key, rows });
    }

    console.log(`[sync-scorecard-google-sheet] Upserting ${upsertBatch.length} results`);

    // Upsert results
    if (upsertBatch.length > 0) {
      const { error: upsertError } = await supabase
        .from("metric_results")
        .upsert(upsertBatch, {
          onConflict: 'metric_id,period_type,period_start',
        });

      if (upsertError) {
        console.error(`[sync-scorecard-google-sheet] Upsert error:`, upsertError);
        throw upsertError;
      }

      result.rows_upserted = upsertBatch.length;
    }

    // Update config with success
    await supabase
      .from("scorecard_import_configs")
      .update({
        status: result.unmatched_metric_keys.length > 0 ? 'ok' : 'ok', // Still OK, just with warnings
        error_message: result.unmatched_metric_keys.length > 0 
          ? `${result.unmatched_metric_keys.length} unmatched keys` 
          : null,
        last_synced_at: new Date().toISOString(),
        last_synced_month: result.last_synced_month,
      })
      .eq("organization_id", orgId);

    console.log(`[sync-scorecard-google-sheet] Sync complete:`, result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[sync-scorecard-google-sheet] Error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});