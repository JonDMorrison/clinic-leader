/**
 * Fetches last-activity timestamps for each data source type.
 * Used to render proof lines in the "What happens next" card.
 */
import { supabase } from "@/integrations/supabase/client";
import { getActiveConnectorsForOrg } from "@/hooks/useActiveConnectors";

export interface LastDataActivity {
  /** Last automated delivery from any active connector */
  automatedLastDeliveryAt?: string;
  /** Source system of that delivery (e.g. 'jane', 'advancedmd') */
  automatedSourceSystem?: string;
  spreadsheetLastUploadAt?: string;
  manualLastEntryAt?: string;
  hasRecentAutomatedDeliveries?: boolean;
  /** @deprecated Use automatedLastDeliveryAt. Kept for backward compat. */
  janeLastDeliveryAt?: string;
}

export async function getLastDataActivity(orgId: string): Promise<LastDataActivity> {
  const result: LastDataActivity = {};

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Dynamically resolve which source_systems are active for this org
  // instead of using a hardcoded allowlist
  const activeConnectors = await getActiveConnectorsForOrg(orgId);
  const activeSources = activeConnectors.map((c) => c.source_system);

  // If no active connectors, still check for legacy 'jane' / 'jane_pipe' entries
  const sourcesToCheck = activeSources.length > 0
    ? activeSources
    : ["jane", "jane_pipe"];

  const [automatedRes, spreadsheetRes, manualRes, recentCountRes] = await Promise.all([
    // Latest automated delivery from any active source
    supabase
      .from("data_ingestion_ledger")
      .select("created_at, source_system")
      .eq("organization_id", orgId)
      .in("source_system", sourcesToCheck)
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

    // Recent automated deliveries count (any active source)
    supabase
      .from("data_ingestion_ledger")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("source_system", sourcesToCheck)
      .gte("created_at", thirtyDaysAgo),
  ]);

  if (automatedRes.data?.created_at) {
    result.automatedLastDeliveryAt = automatedRes.data.created_at;
    result.automatedSourceSystem = (automatedRes.data as any).source_system;
    // Backward compat alias
    result.janeLastDeliveryAt = automatedRes.data.created_at;
  }
  if ((spreadsheetRes.data as any)?.created_at) {
    result.spreadsheetLastUploadAt = (spreadsheetRes.data as any).created_at;
  }
  if (manualRes.data?.created_at) {
    result.manualLastEntryAt = manualRes.data.created_at;
  }
  result.hasRecentAutomatedDeliveries = (recentCountRes.count ?? 0) > 0;

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
