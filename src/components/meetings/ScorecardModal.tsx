import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { metricStatus, MetricStatus, formatMetricValue } from "@/lib/scorecard/metricStatus";
import { CreateIssueFromMetricModal } from "@/components/scorecard/CreateIssueFromMetricModal";

interface ScorecardModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  periodKey: string;
}

export function ScorecardModal({ open, onClose, organizationId, periodKey }: ScorecardModalProps) {
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["scorecard-modal-metrics", organizationId, periodKey],
    queryFn: async () => {
      const { data: metrics } = await supabase
        .from("metrics")
        .select("id, name, target, direction, unit, owner, category, is_active")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("category")
        .order("name");

      if (!metrics?.length) return [];

      const ownerIds = [...new Set(metrics.map(m => m.owner).filter(Boolean))];
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", ownerIds);

      const userMap = users?.reduce((acc, u) => {
        acc[u.id] = u.full_name;
        return acc;
      }, {} as Record<string, string>) || {};

      const metricIds = metrics.map(m => m.id);
      const { data: results } = await supabase
        .from("metric_results")
        .select("metric_id, value, period_key")
        .in("metric_id", metricIds)
        .eq("period_type", "monthly")
        .eq("period_key", periodKey);

      const resultsByMetric = results?.reduce((acc, r) => {
        acc[r.metric_id] = r;
        return acc;
      }, {} as Record<string, any>) || {};

      return metrics.map(metric => ({
        id: metric.id,
        name: metric.name,
        target: metric.target,
        direction: metric.direction,
        unit: metric.unit,
        owner: metric.owner,
        owner_name: metric.owner ? userMap[metric.owner] : null,
        current_value: resultsByMetric[metric.id]?.value ?? null,
      }));
    },
    enabled: open && !!organizationId && !!periodKey,
  });

  // Existing issues for these metrics
  const { data: existingIssues } = useQuery({
    queryKey: ["metric-issues-modal", organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("issues")
        .select("metric_id")
        .eq("organization_id", organizationId)
        .neq("status", "solved");
      return new Set(data?.map(i => i.metric_id).filter(Boolean));
    },
    enabled: open && !!organizationId,
  });

  const getStatusIcon = (status: MetricStatus) => {
    switch (status) {
      case 'on_track':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'off_track':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <AlertCircle className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusVariant = (status: MetricStatus) => {
    switch (status) {
      case 'on_track': return 'success' as const;
      case 'off_track': return 'destructive' as const;
      default: return 'secondary' as const;
    }
  };

  const metrics = data || [];
  const onTrack = metrics.filter(m => {
    const s = metricStatus({ target: m.target, direction: m.direction, owner: m.owner_name }, { value: m.current_value }, periodKey);
    return s.status === 'on_track';
  }).length;
  const offTrack = metrics.filter(m => {
    const s = metricStatus({ target: m.target, direction: m.direction, owner: m.owner_name }, { value: m.current_value }, periodKey);
    return s.status === 'off_track';
  }).length;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scorecard — {periodKey}</DialogTitle>
            <DialogDescription>
              {metrics.length > 0 && (
                <span className="flex gap-3 mt-1">
                  <Badge variant="success" className="text-xs">{onTrack} On Track</Badge>
                  {offTrack > 0 && <Badge variant="destructive" className="text-xs">{offTrack} Off Track</Badge>}
                  <Badge variant="secondary" className="text-xs">{metrics.length - onTrack - offTrack} Other</Badge>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading metrics…</div>
          ) : metrics.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No active metrics found.</div>
          ) : (
            <div className="space-y-1">
              {metrics.map(metric => {
                const statusResult = metricStatus(
                  { target: metric.target, direction: metric.direction, owner: metric.owner_name },
                  { value: metric.current_value },
                  periodKey
                );
                const hasIssue = existingIssues?.has(metric.id);
                const canCreate = (statusResult.status === 'off_track' || statusResult.status === 'needs_data') && !hasIssue;

                return (
                  <div key={metric.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50">
                    <div className="flex items-center gap-3 min-w-0">
                      {getStatusIcon(statusResult.status)}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{metric.name}</p>
                        <p className="text-xs text-muted-foreground">{metric.owner_name || "Unassigned"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-mono text-sm font-semibold">{formatMetricValue(metric.current_value, metric.unit)}</p>
                        <p className="text-xs text-muted-foreground">
                          Target: {metric.target !== null ? formatMetricValue(metric.target, metric.unit) : "—"}
                        </p>
                      </div>
                      <Badge variant={getStatusVariant(statusResult.status)} className="text-xs">
                        {statusResult.label}
                      </Badge>
                      {canCreate && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => {
                            setSelectedMetric(metric);
                            setIssueModalOpen(true);
                          }}
                          title="Create issue"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                      {hasIssue && (
                        <Badge variant="outline" className="text-xs">Has Issue</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedMetric && (
        <CreateIssueFromMetricModal
          open={issueModalOpen}
          onClose={() => { setIssueModalOpen(false); setSelectedMetric(null); }}
          organizationId={organizationId}
          metric={{
            id: selectedMetric.id,
            name: selectedMetric.name,
            target: selectedMetric.target,
            direction: selectedMetric.direction || 'up',
            unit: selectedMetric.unit,
            currentValue: selectedMetric.current_value,
            status: metricStatus(
              { target: selectedMetric.target, direction: selectedMetric.direction, owner: selectedMetric.owner_name },
              { value: selectedMetric.current_value },
              periodKey
            ).status,
          }}
          periodKey={periodKey}
          periodLabel={periodKey}
        />
      )}
    </>
  );
}
