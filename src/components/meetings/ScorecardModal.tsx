import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Plus, ChevronLeft, ChevronRight } from "lucide-react";
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

function shiftMonth(periodKey: string, delta: number): string {
  const [year, month] = periodKey.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatPeriodLabel(pk: string): string {
  const [year, month] = pk.split("-").map(Number);
  const d = new Date(year, month - 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function ScorecardModal({ open, onClose, organizationId, periodKey: initialPeriodKey }: ScorecardModalProps) {
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<any>(null);
  const [viewingPeriod, setViewingPeriod] = useState(initialPeriodKey);

  // Reset to initial period when modal opens with new periodKey
  const [lastInitial, setLastInitial] = useState(initialPeriodKey);
  if (initialPeriodKey !== lastInitial) {
    setViewingPeriod(initialPeriodKey);
    setLastInitial(initialPeriodKey);
  }

  const isCurrentPeriod = viewingPeriod === initialPeriodKey;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const canGoForward = viewingPeriod < currentMonth;

  const { data, isLoading } = useQuery({
    queryKey: ["scorecard-modal-metrics", organizationId, viewingPeriod],
    queryFn: async () => {
      // For current period, show active metrics. For historical, show all metrics that have data.
      const isHistorical = viewingPeriod !== initialPeriodKey;

      // First, get results for this period to know which metrics have data
      const { data: periodResults } = await supabase
        .from("metric_results")
        .select("metric_id, value, period_key")
        .eq("period_type", "monthly")
        .eq("period_key", viewingPeriod);

      const resultsByMetric = (periodResults || []).reduce((acc, r) => {
        acc[r.metric_id] = r;
        return acc;
      }, {} as Record<string, any>);

      // Get metrics — for current period use active only, for historical get all that have data
      let metricsQuery = supabase
        .from("metrics")
        .select("id, name, target, direction, unit, owner, category, is_active")
        .eq("organization_id", organizationId)
        .order("category")
        .order("name");

      if (!isHistorical) {
        metricsQuery = metricsQuery.eq("is_active", true);
      }

      const { data: allMetrics } = await metricsQuery;
      if (!allMetrics?.length) return [];

      // For historical periods, only show metrics that have data for that period
      const metrics = isHistorical
        ? allMetrics.filter(m => resultsByMetric[m.id] !== undefined)
        : allMetrics;

      if (!metrics.length) return [];

      const ownerIds = [...new Set(metrics.map(m => m.owner).filter(Boolean))];
      const { data: users } = ownerIds.length > 0
        ? await supabase.from("users").select("id, full_name").in("id", ownerIds)
        : { data: [] };

      const userMap = (users || []).reduce((acc, u) => {
        acc[u.id] = u.full_name;
        return acc;
      }, {} as Record<string, string>);

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
    enabled: open && !!organizationId && !!viewingPeriod,
  });

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
  const withData = metrics.filter(m => m.current_value !== null);
  const onTrack = metrics.filter(m => {
    const s = metricStatus({ target: m.target, direction: m.direction, owner: m.owner_name }, { value: m.current_value }, viewingPeriod);
    return s.status === 'on_track';
  }).length;
  const offTrack = metrics.filter(m => {
    const s = metricStatus({ target: m.target, direction: m.direction, owner: m.owner_name }, { value: m.current_value }, viewingPeriod);
    return s.status === 'off_track';
  }).length;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Scorecard</span>
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                {/* Period navigator */}
                <div className="flex items-center justify-center gap-2 py-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setViewingPeriod(shiftMonth(viewingPeriod, -1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[140px] text-center">
                    {formatPeriodLabel(viewingPeriod)}
                    {isCurrentPeriod && (
                      <Badge variant="outline" className="ml-2 text-xs">Current</Badge>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setViewingPeriod(shiftMonth(viewingPeriod, 1))}
                    disabled={!canGoForward}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {metrics.length > 0 && (
                  <span className="flex gap-3">
                    <Badge variant="success" className="text-xs">{onTrack} On Track</Badge>
                    {offTrack > 0 && <Badge variant="destructive" className="text-xs">{offTrack} Off Track</Badge>}
                    <Badge variant="secondary" className="text-xs">{metrics.length - onTrack - offTrack} Other</Badge>
                    {withData.length < metrics.length && (
                      <Badge variant="outline" className="text-xs">{metrics.length - withData.length} Missing Data</Badge>
                    )}
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading metrics…</div>
          ) : metrics.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No active metrics found.</div>
          ) : withData.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-muted-foreground">No data for {formatPeriodLabel(viewingPeriod)}.</p>
              <p className="text-sm text-muted-foreground">
                Use the arrows above to check previous months.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {metrics.map(metric => {
                const statusResult = metricStatus(
                  { target: metric.target, direction: metric.direction, owner: metric.owner_name },
                  { value: metric.current_value },
                  viewingPeriod
                );
                const hasIssue = existingIssues?.has(metric.id);
                const canCreate = isCurrentPeriod && (statusResult.status === 'off_track' || statusResult.status === 'needs_data') && !hasIssue;

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
              viewingPeriod
            ).status,
          }}
          periodKey={viewingPeriod}
          periodLabel={formatPeriodLabel(viewingPeriod)}
        />
      )}
    </>
  );
}
