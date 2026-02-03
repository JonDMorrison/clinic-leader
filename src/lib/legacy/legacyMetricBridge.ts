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

export interface DerivedMetricResult {
  metric_key: string;
  display_name: string;
  value: number | null;
  status: "inserted" | "updated" | "skipped_null" | "skipped_unverifiable" | "skipped_no_data" | "skipped_blocked" | "error";
  error_message?: string;
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
}

/**
 * Get only verifiable mappings for bridge operations
 */
function getVerifiableMappings(): LegacyMetricMapping[] {
  return LEGACY_METRIC_MAPPINGS.filter(m => isMetricVerifiable(m.metric_key));
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
 */
async function upsertMetricResults(
  organizationId: string,
  periodKey: string,
  metricIdMap: Map<string, string>,
  extractedMetrics: { metric_key: string; value: number | null; display_name: string }[]
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

    // Upsert to metric_results - ALWAYS use source='legacy_workbook' for bridged metrics
    // Note: metric_results table does NOT have organization_id column - it's linked via metric_id
    // Zero values are allowed here since month_has_data was verified at the caller level
    const { error: upsertError } = await supabase.from("metric_results").upsert(
      {
        metric_id: metricId,
        value: extracted.value, // Can be 0 - that's valid for real months
        period_type: "monthly",
        period_start: periodStart,
        period_key: periodKey,
        week_start: periodStart, // Required legacy field
        source: "legacy_workbook", // ALWAYS tag as legacy_workbook
        note: `Derived from Lori workbook import`,
      },
      {
        onConflict: "metric_id,period_type,period_start",
      }
    );

    if (upsertError) {
      results.push({
        metric_key: extracted.metric_key,
        display_name: extracted.display_name,
        value: extracted.value,
        status: "error",
        error_message: upsertError.message,
      });
    } else {
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
  
  // GATE 1: Check if month has meaningful data - skip NO_DATA months entirely
  if (!monthHasData(payload)) {
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
    extractedMetrics
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
      results.push({
        period_key: item.period_key,
        metrics_ensured: 0,
        metrics_created: 0,
        results: [],
        total_inserted: 0,
        total_updated: 0,
        total_skipped_null: 0,
        total_skipped_no_data: false,
        total_skipped_blocked: false,
        total_unverifiable_skipped: 0,
      });
      console.error(
        `[LegacyBridge] Failed to bridge ${item.period_key}:`,
        error
      );
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
