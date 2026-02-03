/**
 * MetricGovernanceDevSeeder
 * 
 * Creates test data for governance feature testing:
 * - Two competing sources for same metric/month
 * - Source policies with different priorities
 * - Audit requirement scenarios
 * - Precedence override
 * 
 * DEV ONLY - Do not use in production!
 */

import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format } from "date-fns";

interface SeedResult {
  success: boolean;
  metricId: string | null;
  metricName: string;
  resultsCreated: number;
  policiesCreated: number;
  overridesCreated: number;
  error?: string;
}

const TEST_METRIC_NAME = "[DEV] Governance Test Metric";
const TEST_METRIC_IMPORT_KEY = "dev_governance_test";

export async function seedGovernanceTestData(organizationId: string): Promise<SeedResult> {
  if (!organizationId) {
    return { 
      success: false, 
      metricId: null, 
      metricName: TEST_METRIC_NAME,
      resultsCreated: 0, 
      policiesCreated: 0, 
      overridesCreated: 0,
      error: "No organization ID provided" 
    };
  }

  console.log("[GovernanceSeeder] Starting seed for org:", organizationId);

  try {
    // 1. Create or get test metric
    let metricId: string;
    
    const { data: existingMetric } = await supabase
      .from("metrics")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("import_key", TEST_METRIC_IMPORT_KEY)
      .maybeSingle();

    if (existingMetric) {
      metricId = existingMetric.id;
      console.log("[GovernanceSeeder] Using existing test metric:", metricId);
    } else {
      const { data: newMetric, error: metricError } = await supabase
        .from("metrics")
        .insert({
          organization_id: organizationId,
          name: TEST_METRIC_NAME,
          import_key: TEST_METRIC_IMPORT_KEY,
          category: "Development",
          cadence: "monthly",
          unit: "count",
          is_active: true,
          direction: "up", // Required field
        })
        .select("id")
        .single();

      if (metricError) throw metricError;
      metricId = newMetric.id;
      console.log("[GovernanceSeeder] Created test metric:", metricId);
    }

    // 2. Create metric definition
    const { error: defError } = await supabase
      .from("metric_definitions")
      .upsert({
        metric_id: metricId,
        canonical_name: TEST_METRIC_NAME,
        canonical_description: "Test metric for governance feature validation. Has competing sources with different priorities.",
        unit: "count",
        higher_is_better: true,
        default_period_type: "month",
      }, { onConflict: "metric_id" });

    if (defError) console.warn("[GovernanceSeeder] Definition upsert warning:", defError);

    // 3. Create competing metric_results for last month
    const testMonth = startOfMonth(subMonths(new Date(), 1));
    const periodStart = format(testMonth, "yyyy-MM-dd");

    // Clear existing test results for this metric/period
    await supabase
      .from("metric_results")
      .delete()
      .eq("metric_id", metricId)
      .eq("period_start", periodStart);

    // Generate period_key (format: YYYY-MM for monthly)
    const periodKey = format(testMonth, "yyyy-MM");

    // Create competing sources
    const testResults = [
      {
        metric_id: metricId,
        value: 100,
        source: "jane_pipe",
        period_start: periodStart,
        period_type: "monthly",
        period_key: periodKey,
        week_start: periodStart, // Use period_start for monthly
        selection_meta: { audit_status: "N/A" },
      },
      {
        metric_id: metricId,
        value: 95,
        source: "legacy_workbook",
        period_start: periodStart,
        period_type: "monthly",
        period_key: periodKey,
        week_start: periodStart,
        selection_meta: { audit_status: "PASS" },
      },
      {
        metric_id: metricId,
        value: 110,
        source: "manual",
        period_start: periodStart,
        period_type: "monthly",
        period_key: periodKey,
        week_start: periodStart,
        selection_meta: {},
      },
    ];

    const { error: resultsError } = await supabase
      .from("metric_results")
      .insert(testResults);

    if (resultsError) throw resultsError;
    console.log("[GovernanceSeeder] Created", testResults.length, "competing results");

    // 4. Create source policies
    // Clear existing policies for this metric
    await supabase
      .from("metric_source_policies")
      .delete()
      .eq("metric_id", metricId);

    const policies = [
      {
        metric_id: metricId,
        source: "jane_pipe",
        is_allowed: true,
        priority: 10,
        requires_audit_pass: false,
      },
      {
        metric_id: metricId,
        source: "legacy_workbook",
        is_allowed: true,
        priority: 20,
        requires_audit_pass: true, // Requires audit pass!
      },
      {
        metric_id: metricId,
        source: "manual",
        is_allowed: true,
        priority: 90,
        requires_audit_pass: false,
      },
    ];

    const { error: policiesError } = await supabase
      .from("metric_source_policies")
      .insert(policies);

    if (policiesError) throw policiesError;
    console.log("[GovernanceSeeder] Created", policies.length, "source policies");

    // 5. Create a precedence override (initially disabled - for testing)
    // Clear existing overrides
    await supabase
      .from("metric_precedence_overrides")
      .delete()
      .eq("metric_id", metricId)
      .eq("organization_id", organizationId);

    // Get current user for created_by
    const { data: { user } } = await supabase.auth.getUser();

    const { error: overrideError } = await supabase
      .from("metric_precedence_overrides")
      .insert({
        organization_id: organizationId,
        metric_id: metricId,
        period_type: "month",
        source: "legacy_workbook",
        reason: "[DEV] Test override to force legacy_workbook despite lower priority",
        created_by: user?.id,
      });

    if (overrideError) console.warn("[GovernanceSeeder] Override insert warning:", overrideError);

    console.log("[GovernanceSeeder] Seed complete!");

    return {
      success: true,
      metricId,
      metricName: TEST_METRIC_NAME,
      resultsCreated: testResults.length,
      policiesCreated: policies.length,
      overridesCreated: 1,
    };
  } catch (error) {
    console.error("[GovernanceSeeder] Error:", error);
    return {
      success: false,
      metricId: null,
      metricName: TEST_METRIC_NAME,
      resultsCreated: 0,
      policiesCreated: 0,
      overridesCreated: 0,
      error: String(error),
    };
  }
}

/**
 * Clean up test data created by the seeder
 */
export async function cleanupGovernanceTestData(organizationId: string): Promise<{ success: boolean; error?: string }> {
  if (!organizationId) {
    return { success: false, error: "No organization ID provided" };
  }

  console.log("[GovernanceSeeder] Cleaning up test data for org:", organizationId);

  try {
    // Find the test metric
    const { data: metric } = await supabase
      .from("metrics")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("import_key", TEST_METRIC_IMPORT_KEY)
      .maybeSingle();

    if (!metric) {
      return { success: true }; // Nothing to clean
    }

    // Delete in order (respecting FK constraints)
    await supabase.from("metric_precedence_overrides").delete().eq("metric_id", metric.id);
    await supabase.from("metric_source_policies").delete().eq("metric_id", metric.id);
    await supabase.from("metric_normalization_rules").delete().eq("metric_id", metric.id);
    await supabase.from("metric_definitions").delete().eq("metric_id", metric.id);
    await supabase.from("metric_canonical_results").delete().eq("metric_id", metric.id);
    await supabase.from("metric_selection_audit_log").delete().eq("metric_id", metric.id);
    await supabase.from("metric_results").delete().eq("metric_id", metric.id);
    await supabase.from("metrics").delete().eq("id", metric.id);

    console.log("[GovernanceSeeder] Cleanup complete");
    return { success: true };
  } catch (error) {
    console.error("[GovernanceSeeder] Cleanup error:", error);
    return { success: false, error: String(error) };
  }
}
