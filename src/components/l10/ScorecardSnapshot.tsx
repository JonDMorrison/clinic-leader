import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, AlertTriangle, Plus } from "lucide-react";
import { metricStatus, MetricStatus } from "@/lib/scorecard/metricStatus";
import { CreateIssueFromMetricModal } from "@/components/scorecard/CreateIssueFromMetricModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MetricData {
  id: string;
  name: string;
  target: number | null;
  direction: string | null;
  unit: string;
  owner_name: string | null;
  current_value: number | null;
  period_key?: string | null;
}

interface ScorecardSnapshotProps {
  metrics: MetricData[];
  periodKey?: string | null;
}

export const ScorecardSnapshot = ({ metrics, periodKey }: ScorecardSnapshotProps) => {
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricData | null>(null);
  const { data: currentUser } = useCurrentUser();
  const organizationId = currentUser?.team_id;

  // Check for existing active issues linked to metrics
  const { data: existingIssues } = useQuery({
    queryKey: ["metric-issues", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("issues")
        .select("metric_id, status")
        .eq("organization_id", organizationId)
        .neq("status", "solved");
      return data || [];
    },
    enabled: !!organizationId,
  });

  const existingIssueMetricIds = new Set(existingIssues?.map(i => i.metric_id).filter(Boolean));

  const getStatusResult = (metric: MetricData) => {
    return metricStatus(
      { target: metric.target, direction: metric.direction, owner: metric.owner_name },
      { value: metric.current_value },
      periodKey ?? null
    );
  };

  const getStatusIcon = (status: MetricStatus) => {
    switch (status) {
      case 'on_track':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'off_track':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'needs_data':
      case 'needs_target':
      case 'needs_owner':
        return <AlertCircle className="w-5 h-5 text-warning" />;
    }
  };

  const getStatusBadgeVariant = (status: MetricStatus): "success" | "destructive" | "warning" | "muted" => {
    switch (status) {
      case 'on_track':
        return 'success';
      case 'off_track':
        return 'destructive';
      case 'needs_data':
        return 'muted';
      case 'needs_target':
      case 'needs_owner':
        return 'warning';
    }
  };

  const formatValue = (value: number | null, unit: string) => {
    if (value === null || value === undefined) return "—";
    if (unit === "$") return `$${value.toLocaleString()}`;
    if (unit === "%") return `${value}%`;
    return value.toLocaleString();
  };

  const handleCreateIssue = (metric: MetricData) => {
    setSelectedMetric(metric);
    setIssueModalOpen(true);
  };

  // Guardrail: warn if scorecard exceeds recommended size
  const showSizeWarning = metrics.length > 15;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Scorecard Review (5 min)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Review each KPI - are we on track? Click + to escalate off-track metrics to Issues.
          </p>
        </CardHeader>
        <CardContent>
          {showSizeWarning && (
            <Alert className="mb-4 border-warning/50 bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning">
                Your scorecard has {metrics.length} metrics. EOS recommends 10-15 for effective weekly review.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            {metrics.map((metric) => {
              const statusResult = getStatusResult(metric);
              const hasExistingIssue = existingIssueMetricIds.has(metric.id);
              const canCreateIssue = statusResult.status === 'off_track' || statusResult.status === 'needs_data' || statusResult.status === 'needs_target';
              
              return (
                <div
                  key={metric.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(statusResult.status)}
                    <div>
                      <p className="font-medium">{metric.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Owner: {metric.owner_name || "Unassigned"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-mono font-semibold">
                        {formatValue(metric.current_value, metric.unit)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Target: {metric.target !== null ? formatValue(metric.target, metric.unit) : "—"}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(statusResult.status)}>
                      {statusResult.label}
                    </Badge>
                    {canCreateIssue && !hasExistingIssue && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => handleCreateIssue(metric)}
                        title="Create issue for this metric"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                    {hasExistingIssue && (
                      <Badge variant="outline" className="text-xs">
                        Has Issue
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
            {metrics.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No metrics to review. Add metrics to your scorecard first.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedMetric && organizationId && periodKey && (
        <CreateIssueFromMetricModal
          open={issueModalOpen}
          onClose={() => {
            setIssueModalOpen(false);
            setSelectedMetric(null);
          }}
          organizationId={organizationId}
          metric={{
            id: selectedMetric.id,
            name: selectedMetric.name,
            target: selectedMetric.target,
            direction: selectedMetric.direction || 'up',
            unit: selectedMetric.unit,
            currentValue: selectedMetric.current_value,
            status: getStatusResult(selectedMetric).status,
          }}
          periodKey={periodKey}
          periodLabel={periodKey}
        />
      )}
    </>
  );
};
