import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { formatDistanceToNow, format } from "date-fns";
import {
  Database,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
} from "lucide-react";

type SourceStatus = "healthy" | "delayed" | "failed" | "inactive";

interface DataSourceInfo {
  id: string;
  name: string;
  icon: React.ElementType;
  status: SourceStatus;
  lastSuccess: string | null;
  lastAttempt: string | null;
  recordsProcessed: number | null;
  logs: { time: string; status: string; message: string; records?: number }[];
}

const getStatusBadge = (status: SourceStatus) => {
  switch (status) {
    case "healthy":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Healthy
        </Badge>
      );
    case "delayed":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Clock className="w-3 h-3 mr-1" />
          Delayed
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    case "inactive":
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground">
          Not Configured
        </Badge>
      );
  }
};

const formatTime = (timestamp: string | null) => {
  if (!timestamp) return "—";
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return "—";
  }
};

const formatFullTime = (timestamp: string | null) => {
  if (!timestamp) return "—";
  try {
    return format(new Date(timestamp), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return "—";
  }
};

const DataSourceRow = ({ source }: { source: DataSourceInfo }) => {
  const [open, setOpen] = useState(false);
  const Icon = source.icon;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border rounded-lg bg-card">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Icon className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">{source.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {source.lastSuccess
                    ? `Last sync: ${formatTime(source.lastSuccess)}`
                    : "No successful syncs yet"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {getStatusBadge(source.status)}

              {source.status !== "inactive" && source.logs.length > 0 && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs">
                    View logs
                    {open ? (
                      <ChevronDown className="w-4 h-4 ml-1" />
                    ) : (
                      <ChevronRight className="w-4 h-4 ml-1" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>

          {/* Quick stats row */}
          {source.status !== "inactive" && (
            <div className="mt-3 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Last attempt:</span>
                <span className="font-medium text-foreground">
                  {formatTime(source.lastAttempt)}
                </span>
              </div>
              {source.recordsProcessed !== null && (
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Records:</span>
                  <span className="font-medium text-foreground">
                    {source.recordsProcessed.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <CollapsibleContent>
          <div className="border-t px-4 py-3 bg-muted/30">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Recent Activity (Last 5)
            </h5>
            <div className="space-y-2">
              {source.logs.map((log, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {log.status === "completed" || log.status === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : log.status === "failed" ? (
                      <XCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                    <span className="text-foreground">{log.message}</span>
                    {log.records !== undefined && (
                      <span className="text-muted-foreground">
                        ({log.records} records)
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatFullTime(log.time)}
                  </span>
                </div>
              ))}
              {source.logs.length === 0 && (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export const DataSourcesCard = () => {
  const userQuery = useCurrentUser();
  const currentUser = userQuery.data;
  const orgId = currentUser?.team_id;

  const { data: dataSources, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["data-sources-health", orgId],
    queryFn: async (): Promise<DataSourceInfo[]> => {
      if (!orgId) return [];

      const sources: DataSourceInfo[] = [];

      // 1. Jane Integration
      const { data: janeIntegration } = await supabase
        .from("jane_integrations")
        .select("id, status, last_sync")
        .eq("organization_id", orgId)
        .maybeSingle();

      if (janeIntegration) {
        const { data: janeLogs } = await supabase
          .from("jane_sync_logs")
          .select("*")
          .eq("integration_id", janeIntegration.id)
          .order("created_at", { ascending: false })
          .limit(5);

        const lastSuccess = janeLogs?.find(
          (l) => l.status === "completed" || l.status === "success"
        );
        const lastAttempt = janeLogs?.[0];
        const hasRecentFailure =
          lastAttempt && lastAttempt.status === "failed";
        const totalRecords =
          janeLogs
            ?.filter((l) => l.status === "completed" || l.status === "success")
            .reduce((sum, l) => sum + (l.records_synced || 0), 0) || 0;

        // Determine status
        let janeStatus: SourceStatus = "inactive";
        if (janeIntegration.status === "connected") {
          if (hasRecentFailure) {
            janeStatus = "failed";
          } else if (lastSuccess) {
            // Check if last success was more than 25 hours ago (for daily sync)
            const successTime = new Date(lastSuccess.completed_at || lastSuccess.created_at);
            const hoursSince = (Date.now() - successTime.getTime()) / (1000 * 60 * 60);
            janeStatus = hoursSince > 25 ? "delayed" : "healthy";
          } else {
            janeStatus = "delayed";
          }
        }

        sources.push({
          id: "jane",
          name: "Jane App",
          icon: Database,
          status: janeStatus,
          lastSuccess: lastSuccess?.completed_at || lastSuccess?.created_at || null,
          lastAttempt: lastAttempt?.created_at || null,
          recordsProcessed: totalRecords,
          logs:
            janeLogs?.map((l) => ({
              time: l.completed_at || l.created_at || "",
              status: l.status,
              message: l.status === "failed" ? l.error_message || "Sync failed" : `${l.sync_type} sync`,
              records: l.records_synced || undefined,
            })) || [],
        });
      }

      // 2. File Uploads (from file_ingest_log)
      const { data: ingestLogs } = await supabase
        .from("file_ingest_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (ingestLogs && ingestLogs.length > 0) {
        const lastSuccess = ingestLogs.find((l) => l.status === "success");
        const lastAttempt = ingestLogs[0];
        const hasRecentFailure = lastAttempt && lastAttempt.status === "error";
        const totalRecords = ingestLogs
          .filter((l) => l.status === "success")
          .reduce((sum, l) => sum + (l.rows || 0), 0);

        sources.push({
          id: "uploads",
          name: "Manual Uploads",
          icon: Upload,
          status: hasRecentFailure ? "failed" : lastSuccess ? "healthy" : "delayed",
          lastSuccess: lastSuccess?.created_at || null,
          lastAttempt: lastAttempt?.created_at || null,
          recordsProcessed: totalRecords,
          logs: ingestLogs.slice(0, 5).map((l) => ({
            time: l.created_at,
            status: l.status === "error" ? "failed" : l.status,
            message: l.status === "error" ? l.error || "Import failed" : l.file_name,
            records: l.rows || undefined,
          })),
        });
      }

      // 3. Google Sheets (check for any metrics with sync_source = 'google_sheet')
      const { data: googleSheetMetrics } = await supabase
        .from("metrics")
        .select("id, name, updated_at")
        .eq("organization_id", orgId)
        .eq("sync_source", "google_sheet")
        .limit(5);

      if (googleSheetMetrics && googleSheetMetrics.length > 0) {
        const latestUpdate = googleSheetMetrics.reduce((latest, m) => {
          return new Date(m.updated_at) > new Date(latest) ? m.updated_at : latest;
        }, googleSheetMetrics[0].updated_at);

        sources.push({
          id: "google_sheets",
          name: "Google Sheets",
          icon: FileSpreadsheet,
          status: "healthy",
          lastSuccess: latestUpdate,
          lastAttempt: latestUpdate,
          recordsProcessed: googleSheetMetrics.length,
          logs: googleSheetMetrics.map((m) => ({
            time: m.updated_at,
            status: "completed",
            message: `Synced: ${m.name}`,
          })),
        });
      }

      return sources;
    },
    enabled: !!orgId,
    staleTime: 60 * 1000, // 1 minute
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-brand" />
            <CardTitle>Data Sources</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !dataSources || dataSources.length === 0 ? (
          <div className="text-center py-8">
            <Database className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">
              No data sources configured
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Connect Jane, upload files, or link Google Sheets to see them here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dataSources.map((source) => (
              <DataSourceRow key={source.id} source={source} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
