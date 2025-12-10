import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HealthPanelProps {
  onRetry: () => void;
}

export const HealthPanel = ({ onRetry }: HealthPanelProps) => {
  const { data: ingestLogs, refetch } = useQuery({
    queryKey: ["ingest-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("file_ingest_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const lastSuccess = ingestLogs?.find((log) => log.status === "success");

  const handleRetry = async () => {
    await refetch();
    onRetry();
    toast.info("Retrying failed imports...");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "error":
        return <XCircle className="w-4 h-4 text-danger" />;
      case "processing":
        return <Clock className="w-4 h-4 text-warning" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="success">Success</Badge>;
      case "error":
        return <Badge variant="danger">Error</Badge>;
      case "processing":
        return <Badge variant="warning">Processing</Badge>;
      default:
        return <Badge variant="muted">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Import Health</CardTitle>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Failed
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastSuccess && (
          <div className="p-3 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">Last Successful Import</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(lastSuccess.created_at).toLocaleString()}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Recent Imports</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {ingestLogs && ingestLogs.length > 0 ? (
              ingestLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {getStatusIcon(log.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {log.file_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                        <span>•</span>
                        <span>{log.rows} rows</span>
                        {log.checksum && (
                          <>
                            <span>•</span>
                            <span className="truncate font-mono" title={log.checksum}>
                              {log.checksum.substring(0, 8)}...
                            </span>
                          </>
                        )}
                      </div>
                      {log.error && (
                        <p className="text-xs text-danger mt-1 truncate" title={log.error}>
                          {log.error}
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(log.status)}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No imports yet
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
