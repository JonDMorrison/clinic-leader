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

  const { data: connectors = [], isLoading } = useQuery({
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

  const hasActiveConnector = (source: string): boolean =>
    connectors.some((c) => c.source_system === source);

  const hasAnyActiveConnector = (): boolean => connectors.length > 0;

  const activeSourceSystems = connectors.map((c) => c.source_system);

  return {
    connectors,
    isLoading,
    hasActiveConnector,
    hasAnyActiveConnector,
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
