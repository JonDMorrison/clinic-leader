import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { metricStatus, MetricStatus } from "@/lib/scorecard/metricStatus";

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scorecard Review (5 min)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Review each KPI - are we on track?
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {metrics.map((metric) => {
            const statusResult = getStatusResult(metric);
            
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
  );
};
