/**
 * Legacy Metric Bridge
 * 
 * PHASE 2 SCOPE (LOCKED):
 * - Org-level totals only (no location breakdown)
 * - Monthly cadence only (period_type = 'monthly')
 * - Only VERIFIABLE metrics synced (see truth map)
 * - Manual issue creation only (no auto-create/close)
 * - Source tagged as 'legacy_workbook'
 * 
 * Bridges Lori workbook data (legacy_monthly_reports) to the metric_results table
 * so that Scorecard, off-track detection, and meeting agenda generation work for
 * organizations in "default" (Legacy) data_mode.
 * 
 * Flow:
 * 1. After Lori payload is upserted to legacy_monthly_reports
 * 2. Audit runs to verify PASS/FAIL for verifiable metrics
 * 3. If all verifiable metrics PASS, call bridgeLegacyToMetricResults()
 * 4. Only VERIFIABLE metrics are synced (UNVERIFIABLE are skipped)
 * 
 * @see docs/audits/legacy_metric_truth_map.md for verifiability definitions
 */

import { supabase } from "@/integrations/supabase/client";
import type { LegacyMonthPayload } from "@/components/data/LegacyMonthlyReportView";
import {
  LEGACY_METRIC_MAPPINGS,
  extractMetricsFromPayload,
  type LegacyMetricMapping,
} from "./legacyMetricMapping";
import { isMetricVerifiable, getVerifiableMetricKeys, monthHasData } from "./legacyDerivedMetricAudit";

// ============= ENHANCED ERROR TYPES FOR DIAGNOSTICS =============

export interface SupabaseErrorDetails {
  message: string;
  details: string | null;
  hint: string | null;
  code: string | null;
}

export interface DerivedMetricResult {
  metric_key: string;
  display_name: string;
  value: number | null;
  status: "inserted" | "updated" | "skipped_null" | "skipped_unverifiable" | "skipped_no_data" | "skipped_blocked" | "error";
  error_message?: string;
  // Enhanced error fields for diagnostics
  error_details?: string | null;
  error_hint?: string | null;
  error_code?: string | null;
  attempted_payload?: Record<string, any>;
}

export interface BridgeResult {
  period_key: string;
  metrics_ensured: number;
  metrics_created: number;
  results: DerivedMetricResult[];
  total_inserted: number;
  total_updated: number;
  total_skipped_null: number;
  total_skipped_no_data: boolean;
  total_skipped_blocked: boolean;
  total_unverifiable_skipped: number;
  // Debug context
  auth_user_id?: string | null;
  debug_schema?: any;
}

/**
 * Get only verifiable mappings for bridge operations
 */
function getVerifiableMappings(): LegacyMetricMapping[] {
  return LEGACY_METRIC_MAPPINGS.filter(m => isMetricVerifiable(m.metric_key));
}

/**
 * Debug helper: Fetch metric_results table schema for diagnostics
 */
async function debugFetchMetricResultsSchema(): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('metric_results')
      .select('*')
      .limit(0);
    
    // We can't get schema directly, but we can log the attempt
    console.debug("[LegacyBridge] Schema probe attempted", { error: error?.message });
    
    return { probed: true, error: error?.message };
  } catch (e: any) {
    return { probed: false, error: e.message };
  }
}

/**
 * Ensure all verifiable legacy metrics exist for an organization.
 * Creates metrics with reasonable defaults if they don't exist.
 */
async function ensureMetricsExist(
  organizationId: string,
  mappings: LegacyMetricMapping[]
): Promise<{
  metricIdMap: Map<string, string>;
  created: number;
  ensured: number;
}> {
  const metricIdMap = new Map<string, string>();
  let created = 0;
  let ensured = 0;

  // Fetch existing metrics with import_key
  const { data: existingMetrics, error: fetchError } = await supabase
    .from("metrics")
    .select("id, import_key")
    .eq("organization_id", organizationId)
    .eq("is_active", true);

  if (fetchError) {
    console.error("[LegacyBridge] Failed to fetch existing metrics:", fetchError);
    throw fetchError;
  }

  // Fetch an admin user as default metric owner (owner or director role)
  const { data: adminUsers } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", ["owner", "director"])
    .limit(1);
  
  // Verify the admin is from this org
  let defaultOwnerId: string | null = null;
  if (adminUsers && adminUsers.length > 0) {
    const { data: userCheck } = await supabase
      .from("users")
      .select("id")
      .eq("id", adminUsers[0].user_id)
      .eq("team_id", organizationId)
      .single();
    if (userCheck) {
      defaultOwnerId = userCheck.id;
    }
  }

  // Build lookup of existing import_keys
  const existingKeyMap = new Map<string, string>();
  for (const m of existingMetrics || []) {
    if (m.import_key) {
      existingKeyMap.set(m.import_key.toLowerCase(), m.id);
    }
  }

  // Process each mapping (only verifiable ones)
  for (const mapping of mappings) {
    const keyLower = mapping.metric_key.toLowerCase();
    const existingId = existingKeyMap.get(keyLower);

    if (existingId) {
      // Metric already exists
      metricIdMap.set(mapping.metric_key, existingId);
      ensured++;
    } else {
      // Create new metric with safe defaults
      // Map direction values: DB expects 'up'/'down', mapping uses 'higher_is_better'/'lower_is_better'
      const dbDirection = mapping.direction === 'higher_is_better' ? 'up' : 'down';
      
      const { data: newMetric, error: insertError } = await supabase
        .from("metrics")
        .insert({
          organization_id: organizationId,
          name: mapping.display_name,
          import_key: mapping.metric_key,
          unit: mapping.unit,
          direction: dbDirection,
          target: mapping.default_target, // null is OK - shows "Configure targets" CTA
          cadence: "monthly",
          is_active: true,
          category: mapping.category,
          owner: defaultOwnerId, // Set org owner as default metric owner
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(
          `[LegacyBridge] Failed to create metric ${mapping.metric_key}:`,
          insertError
        );
        // Continue with other metrics
        continue;
      }

      if (newMetric) {
        metricIdMap.set(mapping.metric_key, newMetric.id);
        created++;
        ensured++;
      }
    }
  }

  return { metricIdMap, created, ensured };
}

/**
 * Upsert extracted metrics into metric_results (only verifiable ones)
 * 
 * IMPORTANT: Zero values ARE valid when month_has_data is true.
 * Only null/undefined values are skipped per-metric.
 * 
 * ENHANCED: Full error capture for diagnostics
 */
async function upsertMetricResults(
  organizationId: string,
  periodKey: string,
  metricIdMap: Map<string, string>,
  extractedMetrics: { metric_key: string; value: number | null; display_name: string }[],
  authUserId: string | null
): Promise<{ results: DerivedMetricResult[]; unverifiableSkipped: number }> {
  const results: DerivedMetricResult[] = [];
  let unverifiableSkipped = 0;

  // Prepare period fields
  const periodStart = `${periodKey}-01`;

  for (const extracted of extractedMetrics) {
    // Skip unverifiable metrics
    if (!isMetricVerifiable(extracted.metric_key)) {
      results.push({
        metric_key: extracted.metric_key,
        display_name: extracted.display_name,
        value: extracted.value,
        status: "skipped_unverifiable",
      });
      unverifiableSkipped++;
      continue;
    }

    const metricId = metricIdMap.get(extracted.metric_key);

    if (!metricId) {
      results.push({
        metric_key: extracted.metric_key,
        display_name: extracted.display_name,
        value: extracted.value,
        status: "error",
        error_message: "Metric not found in database",
        error_code: "METRIC_NOT_FOUND",
      });
      continue;
    }

    // ========== SAFETY: Never upsert null/undefined values ==========
    // Zero IS valid when the month has real data (month_has_data check happens at caller level)
    if (extracted.value === null || extracted.value === undefined) {
      results.push({
        metric_key: extracted.metric_key,
        display_name: extracted.display_name,
        value: null,
        status: "skipped_null",
      });
      continue;
    }

    // ========== BUILD UPSERT PAYLOAD ==========
    const upsertPayload = {
      metric_id: metricId,
      value: extracted.value, // Can be 0 - that's valid for real months
      period_type: "monthly",
      period_start: periodStart,
      period_key: periodKey,
      week_start: periodStart, // Required legacy field
      source: "legacy_workbook", // ALWAYS tag as legacy_workbook
      note: `Derived from Lori workbook import`,
    };

    // ========== DEBUG: Log payload before upsert ==========
    console.debug("LEGACY_BRIDGE_PAYLOAD", {
      metric_name: extracted.display_name,
      metric_key: extracted.metric_key,
      metric_id: metricId,
      period_key: periodKey,
      auth_user_id: authUserId,
      payload: upsertPayload
    });

    // ========== RLS PROBE: Test insert capability ==========
    const rlsProbe = await supabase
      .from("metric_results")
      .select("id")
      .eq("metric_id", metricId)
      .eq("period_type", "monthly")
      .eq("period_start", periodStart)
      .maybeSingle();

    console.debug("RLS_PROBE_SELECT", {
      metric_key: extracted.metric_key,
      existing_row: rlsProbe.data,
      error: rlsProbe.error?.message
    });

    // ========== UPSERT with full error capture ==========
    const { data, error: upsertError } = await supabase.from("metric_results").upsert(
      upsertPayload,
      {
        onConflict: "metric_id,period_type,period_start",
      }
    ).select();

    if (upsertError) {
      // ========== FULL ERROR CAPTURE ==========
      console.error("LEGACY_BRIDGE_UPSERT_ERROR", {
        metric_name: extracted.display_name,
        metric_key: extracted.metric_key,
        metric_id: metricId,
        period_key: periodKey,
        auth_user_id: authUserId,
        upsertPayload,
        supabase_error: {
          message: upsertError.message,
          details: upsertError.details,
          hint: upsertError.hint,
          code: upsertError.code
        }
      });

      results.push({
        metric_key: extracted.metric_key,
        display_name: extracted.display_name,
        value: extracted.value,
        status: "error",
        error_message: upsertError.message,
        error_details: upsertError.details,
        error_hint: upsertError.hint,
        error_code: upsertError.code,
        attempted_payload: upsertPayload,
      });
    } else {
      console.debug("LEGACY_BRIDGE_UPSERT_SUCCESS", {
        metric_key: extracted.metric_key,
        period_key: periodKey,
        returned_data: data
      });

      results.push({
        metric_key: extracted.metric_key,
        display_name: extracted.display_name,
        value: extracted.value,
        status: "inserted",
      });
    }
  }

  return { results, unverifiableSkipped };
}

/**
 * Main bridge function: extract metrics from a Lori payload and upsert to metric_results.
 * Only syncs VERIFIABLE metrics (see truth map).
 * 
 * GATING LOGIC:
 * - If month_has_data === false → skip entire month (NO_DATA)
 * - If blocking audit failures exist → skip entire month (BLOCKED)
 * - Otherwise: upsert all verifiable metrics, including zeros
 * 
 * @param organizationId - The organization's UUID
 * @param periodKey - The period in YYYY-MM format
 * @param payload - The Lori workbook payload from legacy_monthly_reports
 * @param hasBlockingFailures - Optional: if audit found blocking failures, skip this month
 * @returns BridgeResult with summary of operations
 */
export async function bridgeLegacyToMetricResults(
  organizationId: string,
  periodKey: string,
  payload: LegacyMonthPayload,
  hasBlockingFailures: boolean = false
): Promise<BridgeResult> {
  const verifiableMappings = getVerifiableMappings();
  
  // ========== CAPTURE AUTH CONTEXT ==========
  const { data: authData } = await supabase.auth.getUser();
  const authUserId = authData?.user?.id || null;
  console.debug("BRIDGE_AUTH_CONTEXT", {
    user_id: authUserId,
    email: authData?.user?.email,
    period_key: periodKey
  });

  // ========== SCHEMA DEBUG ==========
  const schemaDebug = await debugFetchMetricResultsSchema();
  console.debug("METRIC_RESULTS_SCHEMA_PROBE", schemaDebug);
  
  // GATE 1: Check if month has meaningful data - skip NO_DATA months entirely
  // CRITICAL: Check both monthHasData function AND explicit verification metadata
  const hasDataByFunction = monthHasData(payload);
  const hasDataByVerification = (payload.verification as any)?.month_has_data;
  const effectiveMonthHasData = hasDataByVerification === false ? false : hasDataByFunction;
  
  console.debug("BRIDGE_MONTH_HAS_DATA_CHECK", {
    period_key: periodKey,
    hasDataByFunction,
    hasDataByVerification,
    effectiveMonthHasData,
  });
  
  if (!effectiveMonthHasData) {
    console.log(`[LegacyBridge] Skipping ${periodKey} - no meaningful data (NO_DATA month)`);
    return {
      period_key: periodKey,
      metrics_ensured: 0,
      metrics_created: 0,
      results: verifiableMappings.map(m => ({
        metric_key: m.metric_key,
        display_name: m.display_name,
        value: null,
        status: "skipped_no_data" as const,
      })),
      total_inserted: 0,
      total_updated: 0,
      total_skipped_null: 0,
      total_skipped_no_data: true,
      total_skipped_blocked: false,
      total_unverifiable_skipped: 0,
      auth_user_id: authUserId,
      debug_schema: schemaDebug,
    };
  }

  // GATE 2: Check for blocking audit failures - skip entire month if any exist
  if (hasBlockingFailures) {
    console.log(`[LegacyBridge] Skipping ${periodKey} - blocked by audit failures`);
    return {
      period_key: periodKey,
      metrics_ensured: 0,
      metrics_created: 0,
      results: verifiableMappings.map(m => ({
        metric_key: m.metric_key,
        display_name: m.display_name,
        value: null,
        status: "skipped_blocked" as const,
      })),
      total_inserted: 0,
      total_updated: 0,
      total_skipped_null: 0,
      total_skipped_no_data: false,
      total_skipped_blocked: true,
      total_unverifiable_skipped: 0,
      auth_user_id: authUserId,
      debug_schema: schemaDebug,
    };
  }

  // Month is real and not blocked - proceed with sync (including zeros)
  // Step 1: Extract all metrics from payload
  const extractedMetrics = extractMetricsFromPayload(payload);

  // Step 2: Ensure only verifiable metrics exist (create if missing)
  const { metricIdMap, created, ensured } = await ensureMetricsExist(
    organizationId,
    verifiableMappings
  );

  // Step 3: Upsert to metric_results (only verifiable, zeros allowed)
  const { results, unverifiableSkipped } = await upsertMetricResults(
    organizationId,
    periodKey,
    metricIdMap,
    extractedMetrics,
    authUserId
  );

  // Count statuses
  const totalInserted = results.filter(
    (r) => r.status === "inserted" || r.status === "updated"
  ).length;
  const totalSkippedNull = results.filter((r) => r.status === "skipped_null").length;

  return {
    period_key: periodKey,
    metrics_ensured: ensured,
    metrics_created: created,
    results,
    total_inserted: totalInserted,
    total_updated: 0,
    total_skipped_null: totalSkippedNull,
    total_skipped_no_data: false,
    total_skipped_blocked: false,
    total_unverifiable_skipped: unverifiableSkipped,
    auth_user_id: authUserId,
    debug_schema: schemaDebug,
  };
}

/**
 * Payload with period key for bridging
 */
export interface PayloadWithPeriod {
  period_key: string;
  payload: LegacyMonthPayload;
}

/**
 * Bridge multiple months at once (for batch Lori import)
 * 
 * @param organizationId - The organization's UUID
 * @param items - Array of payloads with period keys
 * @param blockingFailuresByMonth - Optional map of period_key → hasBlockingFailures
 */
export async function bridgeMultipleMonths(
  organizationId: string,
  items: PayloadWithPeriod[],
  blockingFailuresByMonth?: Map<string, boolean>
): Promise<BridgeResult[]> {
  const results: BridgeResult[] = [];

  for (const item of items) {
    try {
      const hasBlocking = blockingFailuresByMonth?.get(item.period_key) ?? false;
      const result = await bridgeLegacyToMetricResults(
        organizationId,
        item.period_key,
        item.payload,
        hasBlocking
      );
      results.push(result);
    } catch (error: any) {
      console.error(`[LegacyBridge] CRITICAL EXCEPTION for ${item.period_key}:`, {
        error_message: error.message,
        error_stack: error.stack,
        error_name: error.name
      });
      
      results.push({
        period_key: item.period_key,
        metrics_ensured: 0,
        metrics_created: 0,
        results: [{
          metric_key: "BRIDGE_EXCEPTION",
          display_name: "Bridge Exception",
          value: null,
          status: "error",
          error_message: error.message,
          error_details: error.stack,
        }],
        total_inserted: 0,
        total_updated: 0,
        total_skipped_null: 0,
        total_skipped_no_data: false,
        total_skipped_blocked: false,
        total_unverifiable_skipped: 0,
      });
    }
  }

  return results;
}

/**
 * Check if an organization is in "default" (legacy) data mode
 */
export async function isLegacyDataMode(organizationId: string): Promise<boolean> {
  const { data: team, error } = await supabase
    .from("teams")
    .select("data_mode")
    .eq("id", organizationId)
    .single();

  if (error) {
    console.error("[LegacyBridge] Failed to check data_mode:", error);
    return false;
  }

  // Default mode is 'default' (legacy), not 'jane'
  return team?.data_mode !== "jane";
}
