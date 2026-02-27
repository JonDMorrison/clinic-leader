/**
 * useActiveConnectors
 *
 * Single source of truth for determining which data connectors are active
 * for the current organization. Replaces scattered teams.data_mode === 'jane' checks.
 *
 * Queries bulk_analytics_connectors and exposes helpers:
 *   - connectors: full list of active/receiving connectors
 *   - hasActiveConnector(source): check for a specific source_system
 *   - hasAnyActiveConnector(): any connector active?
 *   - activeSourceSystems: string[] of active source_system values
 *   - isReceivingData: at least one connector in 'receiving_data'
 *   - lastIngestAt: most recent ingestion timestamp from data_ingestion_ledger
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./useCurrentUser";

const ACTIVE_STATUSES = ["active", "receiving_data"] as const;

export interface ActiveConnector {
  id: string;
  source_system: string;
  status: string;
  last_received_at: string | null;
  last_processed_at: string | null;
  last_error: string | null;
}

export function useActiveConnectors() {
  const { data: currentUser } = useCurrentUser();
  const orgId = currentUser?.team_id;

  const { data: connectors = [], isLoading: connectorsLoading } = useQuery({
    queryKey: ["active-connectors", orgId],
    queryFn: async (): Promise<ActiveConnector[]> => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("bulk_analytics_connectors")
        .select("id, source_system, status, last_received_at, last_processed_at, last_error")
        .eq("organization_id", orgId)
        .in("status", [...ACTIVE_STATUSES]);

      if (error) throw error;
      return (data ?? []) as ActiveConnector[];
    },
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });

  // Fetch most recent ingest timestamp from data_ingestion_ledger
  const { data: lastIngestAt, isLoading: ingestLoading } = useQuery({
    queryKey: ["last-ingest-at", orgId],
    queryFn: async (): Promise<string | null> => {
      if (!orgId) return null;

      const { data, error } = await supabase
        .from("data_ingestion_ledger")
        .select("timestamp")
        .eq("organization_id", orgId)
        .eq("status", "success")
        .order("timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.timestamp ?? null;
    },
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });

  const isLoading = connectorsLoading || ingestLoading;

  const hasActiveConnector = (source: string): boolean =>
    connectors.some((c) => c.source_system === source);

  const hasAnyActiveConnector = (): boolean => connectors.length > 0;

  const isReceivingData = connectors.some((c) => c.status === "receiving_data");

  const activeSourceSystems = connectors.map((c) => c.source_system);

  return {
    connectors,
    isLoading,
    hasActiveConnector,
    hasAnyActiveConnector,
    isReceivingData,
    lastIngestAt,
    activeSourceSystems,
  };
}

/**
 * Standalone fetcher (non-hook) for use outside React components.
 * Returns active connectors for the given org.
 */
export async function getActiveConnectorsForOrg(orgId: string): Promise<ActiveConnector[]> {
  const { data, error } = await supabase
    .from("bulk_analytics_connectors")
    .select("id, source_system, status, last_received_at, last_processed_at, last_error")
    .eq("organization_id", orgId)
    .in("status", [...ACTIVE_STATUSES]);

  if (error) throw error;
  return (data ?? []) as ActiveConnector[];
}

/**
 * Check if an org has any active connector for the given source.
 * Non-hook utility for use in async functions (replaces teams.data_mode checks).
 */
export async function hasActiveConnectorForOrg(orgId: string, source?: string): Promise<boolean> {
  const connectors = await getActiveConnectorsForOrg(orgId);
  if (source) return connectors.some((c) => c.source_system === source);
  return connectors.length > 0;
}
