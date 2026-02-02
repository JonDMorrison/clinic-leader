/**
 * Legacy Metric Bridge
 * 
 * PHASE 2 SCOPE (LOCKED):
 * - Org-level totals only (no location breakdown)
 * - Monthly cadence only (period_type = 'monthly')
 * - 12 canonical KPIs (see legacyMetricMapping.ts)
 * - Manual issue creation only (no auto-create/close)
 * - Source tagged as 'legacy_workbook'
 * 
 * Bridges Lori workbook data (legacy_monthly_reports) to the metric_results table
 * so that Scorecard, off-track detection, and meeting agenda generation work for
 * organizations in "default" (Legacy) data_mode.
 * 
 * Flow:
 * 1. After Lori payload is upserted to legacy_monthly_reports
 * 2. Call bridgeLegacyToMetricResults()
 * 3. This ensures metrics exist (creates if missing)
 * 4. Upserts extracted values to metric_results
 * 
 * @see docs/audits/phase2_scope.md for full scope definition
 */

import { supabase } from "@/integrations/supabase/client";
import type { LegacyMonthPayload } from "@/components/data/LegacyMonthlyReportView";
import {
  LEGACY_METRIC_MAPPINGS,
  extractMetricsFromPayload,
  type LegacyMetricMapping,
} from "./legacyMetricMapping";

export interface DerivedMetricResult {
  metric_key: string;
  display_name: string;
  value: number | null;
  status: "inserted" | "updated" | "skipped_null" | "error";
  error_message?: string;
}

export interface BridgeResult {
  period_key: string;
  metrics_ensured: number;
  metrics_created: number;
  results: DerivedMetricResult[];
  total_inserted: number;
  total_updated: number;
  total_skipped: number;
}

/**
 * Ensure all legacy metrics exist for an organization.
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

  // Build lookup of existing import_keys
  const existingKeyMap = new Map<string, string>();
  for (const m of existingMetrics || []) {
    if (m.import_key) {
      existingKeyMap.set(m.import_key.toLowerCase(), m.id);
    }
  }

  // Process each mapping
  for (const mapping of mappings) {
    const keyLower = mapping.metric_key.toLowerCase();
    const existingId = existingKeyMap.get(keyLower);

    if (existingId) {
      // Metric already exists
      metricIdMap.set(mapping.metric_key, existingId);
      ensured++;
    } else {
      // Create new metric
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
          target: mapping.default_target,
          cadence: "monthly",
          is_active: true,
          category: mapping.category,
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
 * Upsert extracted metrics into metric_results
 */
async function upsertMetricResults(
  organizationId: string,
  periodKey: string,
  metricIdMap: Map<string, string>,
  extractedMetrics: { metric_key: string; value: number | null; display_name: string }[]
): Promise<DerivedMetricResult[]> {
  const results: DerivedMetricResult[] = [];

  // Prepare period fields
  const periodStart = `${periodKey}-01`;

  for (const extracted of extractedMetrics) {
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

    if (extracted.value === null) {
      results.push({
        metric_key: extracted.metric_key,
        display_name: extracted.display_name,
        value: null,
        status: "skipped_null",
      });
      continue;
    }

    // Upsert to metric_results
    const { error: upsertError } = await supabase.from("metric_results").upsert(
      {
        organization_id: organizationId,
        metric_id: metricId,
        value: extracted.value,
        period_type: "monthly",
        period_start: periodStart,
        period_key: periodKey,
        week_start: periodStart, // Required legacy field
        source: "legacy_workbook",
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
      // We don't know if it was insert or update, just mark as inserted
      // (upsert doesn't tell us which)
      results.push({
        metric_key: extracted.metric_key,
        display_name: extracted.display_name,
        value: extracted.value,
        status: "inserted",
      });
    }
  }

  return results;
}

/**
 * Main bridge function: extract metrics from a Lori payload and upsert to metric_results.
 * 
 * @param organizationId - The organization's UUID
 * @param periodKey - The period in YYYY-MM format
 * @param payload - The Lori workbook payload from legacy_monthly_reports
 * @returns BridgeResult with summary of operations
 */
export async function bridgeLegacyToMetricResults(
  organizationId: string,
  periodKey: string,
  payload: LegacyMonthPayload
): Promise<BridgeResult> {
  // Step 1: Extract all metrics from payload
  const extractedMetrics = extractMetricsFromPayload(payload);

  // Step 2: Ensure all metrics exist (create if missing)
  const { metricIdMap, created, ensured } = await ensureMetricsExist(
    organizationId,
    LEGACY_METRIC_MAPPINGS
  );

  // Step 3: Upsert to metric_results
  const results = await upsertMetricResults(
    organizationId,
    periodKey,
    metricIdMap,
    extractedMetrics
  );

  // Count statuses
  const totalInserted = results.filter(
    (r) => r.status === "inserted" || r.status === "updated"
  ).length;
  const totalSkipped = results.filter((r) => r.status === "skipped_null").length;

  return {
    period_key: periodKey,
    metrics_ensured: ensured,
    metrics_created: created,
    results,
    total_inserted: totalInserted,
    total_updated: 0, // Can't distinguish from insert in upsert
    total_skipped: totalSkipped,
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
 */
export async function bridgeMultipleMonths(
  organizationId: string,
  items: PayloadWithPeriod[]
): Promise<BridgeResult[]> {
  const results: BridgeResult[] = [];

  for (const item of items) {
    try {
      const result = await bridgeLegacyToMetricResults(
        organizationId,
        item.period_key,
        item.payload
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
        total_skipped: 0,
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
