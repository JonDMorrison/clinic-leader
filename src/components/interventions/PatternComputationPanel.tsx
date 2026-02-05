/**
 * Admin panel for managing pattern cluster computation
 * 
 * Features:
 * - Manual recomputation trigger
 * - Audit log viewer
 * - Cluster statistics
 */

import { useIsAdmin } from "@/hooks/useIsAdmin";
import { 
  usePatternAuditLogs, 
  usePatternClusterCount, 
  useTriggerPatternComputation 
} from "@/hooks/usePatternClusterComputation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Database, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function PatternComputationPanel() {
  const { data: adminData, isLoading: adminLoading } = useIsAdmin();
  const { data: auditLogs, isLoading: logsLoading } = usePatternAuditLogs(5);
  const { data: clusterCount, isLoading: countLoading } = usePatternClusterCount();
  const isAdmin = adminData?.isAdmin ?? false;
  const triggerMutation = useTriggerPatternComputation();

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const lastSuccessfulRun = auditLogs?.find(
    (log) => !log.error_message && log.version !== "manual_trigger" && log.version !== "cache_invalidated"
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Pattern Cluster Computation
            </CardTitle>
            <CardDescription>
              Manage intervention pattern aggregation for recommendations
            </CardDescription>
          </div>
          <Button
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending}
            variant="outline"
          >
            {triggerMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Computing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recompute Now
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">Active Patterns</div>
            <div className="text-2xl font-semibold">
              {countLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                clusterCount || 0
              )}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">Last Successful Run</div>
            <div className="text-sm font-medium">
              {lastSuccessfulRun ? (
                formatDistanceToNow(new Date(lastSuccessfulRun.computed_at), { addSuffix: true })
              ) : (
                <span className="text-muted-foreground">Never</span>
              )}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">Outcomes Processed</div>
            <div className="text-2xl font-semibold">
              {lastSuccessfulRun?.interventions_analyzed || 0}
            </div>
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Computation Runs
          </h4>
          {logsLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : auditLogs && auditLogs.length > 0 ? (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-md border p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {log.error_message ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                    <span>
                      {formatDistanceToNow(new Date(log.computed_at), { addSuffix: true })}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      v{log.version}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    {log.error_message ? (
                      <span className="text-destructive text-xs truncate max-w-[200px]">
                        {log.error_message}
                      </span>
                    ) : (
                      <>
                        <span>{log.patterns_generated} patterns</span>
                        {log.computation_duration_ms && (
                          <span>{log.computation_duration_ms}ms</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No computation runs yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
