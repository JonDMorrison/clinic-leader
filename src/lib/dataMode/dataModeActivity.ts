/**
 * Fetches last-activity timestamps for each data source type.
 * Used to render proof lines in the "What happens next" card.
 */
import { supabase } from "@/integrations/supabase/client";

/**
 * Conservative allowlist of source_system values that represent
 * automated clinical system (Jane) deliveries.
 * Extend only when a new real integration tag is confirmed in production.
 */
export const JANE_SOURCE_SYSTEMS = ["jane", "jane_pipe"];

/**
 * Conservative allowlist for all automated EMR deliveries.
 * Used for hasRecentAutomatedDeliveries — avoids false positives
 * from internal/system sources by only matching known clinical integrations.
 */
export const AUTOMATED_SOURCE_SYSTEMS = [...JANE_SOURCE_SYSTEMS];

export interface LastDataActivity {
  janeLastDeliveryAt?: string;
  spreadsheetLastUploadAt?: string;
  manualLastEntryAt?: string;
  hasRecentAutomatedDeliveries?: boolean;
}

export async function getLastDataActivity(orgId: string): Promise<LastDataActivity> {
  const result: LastDataActivity = {};

  // Run all three queries in parallel
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [janeRes, spreadsheetRes, manualRes, automatedRes] = await Promise.all([
    // Jane deliveries from data_ingestion_ledger (strict allowlist)
    supabase
      .from("data_ingestion_ledger")
      .select("created_at")
      .eq("organization_id", orgId)
      .in("source_system", JANE_SOURCE_SYSTEMS)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Spreadsheet uploads from legacy_monthly_reports
    supabase
      .from("legacy_monthly_reports" as any)
      .select("created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Manual entries from metric_results
    supabase
      .from("metric_results")
      .select("created_at")
      .eq("source", "manual")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Conservative by design to avoid false positives.
    // Only counts deliveries from known automated clinical integrations.
    supabase
      .from("data_ingestion_ledger")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("source_system", AUTOMATED_SOURCE_SYSTEMS)
      .gte("created_at", thirtyDaysAgo),
  ]);

  if (janeRes.data?.created_at) {
    result.janeLastDeliveryAt = janeRes.data.created_at;
  }
  if ((spreadsheetRes.data as any)?.created_at) {
    result.spreadsheetLastUploadAt = (spreadsheetRes.data as any).created_at;
  }
  if (manualRes.data?.created_at) {
    result.manualLastEntryAt = manualRes.data.created_at;
  }
  result.hasRecentAutomatedDeliveries = (automatedRes.count ?? 0) > 0;

  return result;
}

/**
 * Format an ISO timestamp to a human-readable local date string.
 */
export function formatProofDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
