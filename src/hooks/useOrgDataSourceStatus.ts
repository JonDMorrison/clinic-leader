import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./useCurrentUser";
import { formatDistanceToNow, subDays } from "date-fns";

/**
 * Canonical data source types used throughout the application
 */
export type DataSourceType = 
  | "jane_pipe" 
  | "jane" 
  | "legacy_workbook" 
  | "google_sheet" 
  | "csv" 
  | "manual" 
  | "unknown";

/**
 * Flow status representing data pipeline health
 */
export type FlowStatus = 
  | "flowing"           // Data received within expected window
  | "connected_waiting" // Integration active but no recent data
  | "stale"             // Data exists but is old
  | "not_configured"    // No data source set up
  | "error";            // Integration has errors

/**
 * Organization data mode (routing mode)
 */
export type DataMode = "jane" | "standard";

export interface OrgDataSourceStatus {
  /** Routing mode from teams.data_mode */
  mode: DataMode;
  
  /** Primary data source based on recent metric_results */
  primarySource: DataSourceType;
  
  /** Secondary sources (top 1-2) */
  secondarySources: DataSourceType[];
  
  /** Last updated timestamp for primary source */
  lastUpdatedAt: Date | null;
  
  /** Relative time string (e.g., "2 days ago") */
  lastUpdatedRelative: string | null;
  
  /** Coverage window: earliest and latest periods */
  coverageWindow: {
    earliest: string | null;
    latest: string | null;
  };
  
  /** Jane integration connection status */
  janeConnectionStatus: "active" | "pending" | "inactive" | "error" | null;
  
  /** Overall flow status */
  flowStatus: FlowStatus;
  
  /** Human-readable flow status label */
  flowStatusLabel: string;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: Error | null;
}

/**
 * Source labels for display
 */
export const SOURCE_LABELS: Record<DataSourceType, string> = {
  jane_pipe: "Jane",
  jane: "Jane",
  legacy_workbook: "Spreadsheet",
  google_sheet: "Google Sheet",
  csv: "CSV",
  manual: "Manual",
  unknown: "Unknown",
};

interface MetricResultRow {
  source: string | null;
  period_start: string;
  created_at: string;
}

interface SourceStatsResult {
  primarySource: DataSourceType;
  secondarySources: DataSourceType[];
  lastUpdatedAt: Date | null;
  coverageWindow: { earliest: string | null; latest: string | null };
}

/**
 * Helper function to fetch source stats - extracted to avoid deep type inference
 */
async function fetchSourceStats(orgId: string): Promise<SourceStatsResult> {
  const sixtyDaysAgo = subDays(new Date(), 60).toISOString().split('T')[0];
  
  // Use Supabase client - RLS policies will filter by organization
  // The metric_results table uses RLS, not an explicit organization_id column
  const { data, error } = await supabase
    .from("metric_results")
    .select("source, period_start, created_at")
    .gte("period_start", sixtyDaysAgo)
    .order("period_start", { ascending: false });
  
  if (error) {
    throw new Error(`Failed to fetch metric results: ${error.message}`);
  }
  
  if (!data || data.length === 0) {
    return {
      primarySource: "unknown",
      secondarySources: [],
      lastUpdatedAt: null,
      coverageWindow: { earliest: null, latest: null },
    };
  }
  
  // Count sources with recency weighting
  const sourceCounts: Record<string, number> = {};
  const sourceLastUpdated: Record<string, Date> = {};
  const now = new Date();
  
  for (const row of data) {
    const source = row.source || "manual";
    const resultDate = new Date(row.period_start);
    const daysSinceResult = Math.max(1, Math.floor((now.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Recency weighting: more recent results count more
    const weight = 60 / daysSinceResult;
    sourceCounts[source] = (sourceCounts[source] || 0) + weight;
    
    // Track last updated per source
    if (!sourceLastUpdated[source] || resultDate > sourceLastUpdated[source]) {
      sourceLastUpdated[source] = resultDate;
    }
  }
  
  // Sort sources by weighted count
  const sortedSources = Object.entries(sourceCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([source]) => source as DataSourceType);
  
  const primarySource = sortedSources[0] || "unknown";
  const secondarySources = sortedSources.slice(1, 3);
  
  // Coverage window
  const periodStarts = data.map(r => r.period_start).sort();
  
  return {
    primarySource,
    secondarySources,
    lastUpdatedAt: sourceLastUpdated[primarySource] || null,
    coverageWindow: {
      earliest: periodStarts[0] || null,
      latest: periodStarts[periodStarts.length - 1] || null,
    },
  };
}

/**
 * Hook to determine organization's data source status
 * 
 * Computes:
 * - Mode from teams.data_mode
 * - Primary/secondary sources from recent metric_results (60-day window with recency weighting)
 * - Flow status from jane_integrations + data_ingestion_ledger
 */
export function useOrgDataSourceStatus(): OrgDataSourceStatus {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const orgId = currentUser?.team_id;

  // Fetch team data_mode
  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["org-data-mode", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("teams")
        .select("data_mode")
        .eq("id", orgId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch Jane integration status
  const { data: janeIntegration, isLoading: janeLoading } = useQuery({
    queryKey: ["jane-integration-status", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("jane_integrations")
        .select("status, last_sync")
        .eq("organization_id", orgId)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });

  // Fetch bulk connector status (for Jane bulk analytics)
  const { data: bulkConnector, isLoading: bulkLoading } = useQuery({
    queryKey: ["bulk-connector-status", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      // Unique constraint uq_org_source guarantees at most one row
      const { data, error } = await supabase
        .from("bulk_analytics_connectors")
        .select("status, last_received_at, last_processed_at, last_error, source_system")
        .eq("organization_id", orgId)
        .eq("source_system", "jane")
        .single();
      if (error && error.code === "PGRST116") return null; // not found
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });

  // Fetch recent metric_results to compute primary source
  const { data: sourceStats, isLoading: statsLoading } = useQuery<SourceStatsResult | null>({
    queryKey: ["metric-source-stats", orgId],
    queryFn: async (): Promise<SourceStatsResult | null> => {
      if (!orgId) return null;
      return fetchSourceStats(orgId);
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch recent ingestion ledger for flow status
  const { data: recentIngests, isLoading: ingestLoading } = useQuery({
    queryKey: ["recent-ingests", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      
      const { data, error } = await supabase
        .from("data_ingestion_ledger")
        .select("timestamp, status, source_system")
        .eq("organization_id", orgId)
        .gte("timestamp", sevenDaysAgo)
        .order("timestamp", { ascending: false })
        .limit(5);
      
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });

  // Compute derived values
  const isLoading = userLoading || teamLoading || janeLoading || bulkLoading || statsLoading || ingestLoading;
  
  // Derive mode purely from active connectors — teams.data_mode kept for display only
  const hasJaneConnector = bulkConnector?.source_system === "jane" && 
    ["active", "receiving_data"].includes(bulkConnector?.status ?? "");
  const mode: DataMode = hasJaneConnector ? "jane" : "standard";
  
  // Jane connection status - map from actual DB enum values to our simplified status
  let janeConnectionStatus: "active" | "pending" | "inactive" | "error" | null = null;
  
  if (janeIntegration?.status) {
    const status = janeIntegration.status;
    if (status === "active") {
      janeConnectionStatus = "active";
    } else if (status === "pending") {
      janeConnectionStatus = "pending";
    } else if (status === "inactive") {
      janeConnectionStatus = "inactive";
    } else if (status === "error") {
      janeConnectionStatus = "error";
    }
  } else if (bulkConnector?.status) {
    // Map bulk_connector_status enum to our simplified status
    const status = bulkConnector.status;
    if (status === "receiving_data") {
      janeConnectionStatus = "active";
    } else if (status === "awaiting_first_file" || status === "awaiting_jane_setup" || status === "requested") {
      janeConnectionStatus = "pending";
    } else if (status === "paused") {
      janeConnectionStatus = "inactive";
    } else if (status === "error") {
      janeConnectionStatus = "error";
    }
  }

  // Compute flow status
  let flowStatus: FlowStatus = "not_configured";
  let flowStatusLabel = "Not configured";

  if (mode === "jane") {
    // Jane mode: check integration + recent deliveries
    if (janeConnectionStatus === "active") {
      const hasRecentDeliveries = recentIngests && recentIngests.length > 0;
      const hasRecentBulk = bulkConnector?.last_received_at && 
        new Date(bulkConnector.last_received_at) > subDays(new Date(), 7);
      if (hasRecentDeliveries || hasRecentBulk) {
        flowStatus = "flowing";
        flowStatusLabel = "Data flowing";
      } else {
        flowStatus = "connected_waiting";
        flowStatusLabel = "Connected, waiting for data";
      }
    } else if (janeConnectionStatus === "pending") {
      flowStatus = "connected_waiting";
      flowStatusLabel = "Setup pending";
    } else if (janeConnectionStatus === "error" || bulkConnector?.last_error) {
      flowStatus = "error";
      flowStatusLabel = "Connection error";
    } else {
      flowStatus = "not_configured";
      flowStatusLabel = "Not connected";
    }
  } else {
    // Standard mode: check based on recent metric_results
    if (sourceStats?.lastUpdatedAt) {
      const daysSinceUpdate = Math.floor(
        (new Date().getTime() - sourceStats.lastUpdatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceUpdate <= 30) {
        flowStatus = "flowing";
        flowStatusLabel = "Recently updated";
      } else {
        flowStatus = "stale";
        flowStatusLabel = "Data may be stale";
      }
    } else {
      flowStatus = "not_configured";
      flowStatusLabel = "No data imported";
    }
  }

  // Relative time for last updated
  const lastUpdatedRelative = sourceStats?.lastUpdatedAt
    ? formatDistanceToNow(sourceStats.lastUpdatedAt, { addSuffix: true })
    : null;

  return {
    mode,
    primarySource: sourceStats?.primarySource || "unknown",
    secondarySources: sourceStats?.secondarySources || [],
    lastUpdatedAt: sourceStats?.lastUpdatedAt || null,
    lastUpdatedRelative,
    coverageWindow: sourceStats?.coverageWindow || { earliest: null, latest: null },
    janeConnectionStatus,
    flowStatus,
    flowStatusLabel,
    isLoading,
    error: null,
  };
}
