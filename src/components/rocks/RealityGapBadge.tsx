import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetTrigger 
} from "@/components/ui/sheet";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Plus, ExternalLink, Link as LinkIcon, Database } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { metricStatus, formatMetricValue, getStatusDisplay, type MetricStatus, type MetricStatusResult } from "@/lib/scorecard/metricStatus";
import { getMonthlyPeriodSelection, periodKeyToStart } from "@/lib/scorecard/periodHelper";
import { CreateIssueFromMetricModal } from "@/components/scorecard/CreateIssueFromMetricModal";

interface RealityGapBadgeProps {
  rockId: string;
  rockTitle: string;
  onCreateIssue?: () => void;
}

interface LinkedMetricData {
  id: string;
  name: string;
  target: number | null;
  direction: string;
  unit: string;
  owner: string | null;
  currentValue: number | null;
  status: MetricStatus;
  statusResult: MetricStatusResult;
  delta: number | null;
}

interface GapData {
  offTrackCount: number;
  needsDataCount: number;
  needsTargetCount: number;
  needsOwnerCount: number;
  onTrackCount: number;
  totalLinked: number;
  metrics: LinkedMetricData[];
  periodKey: string;
  periodLabel: string;
  hasAnyData: boolean;
}

export function RealityGapBadge({ rockId, rockTitle, onCreateIssue }: RealityGapBadgeProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [issueMetric, setIssueMetric] = useState<LinkedMetricData | null>(null);

  const { data: gapData, isLoading } = useQuery({
    queryKey: ['reality-gap', rockId, currentUser?.team_id],
    queryFn: async (): Promise<GapData | null> => {
      if (!currentUser?.team_id) return null;

      const orgId = currentUser.team_id;

      // Get period selection using shared helper
      const periodSelection = await getMonthlyPeriodSelection(orgId);
      const selectedPeriodKey = periodSelection.selectedPeriodKey;
      const periodStart = periodKeyToStart(selectedPeriodKey);

      // Get linked metrics for this rock - org scoped
      const { data: links } = await supabase
        .from('rock_metric_links')
        .select('metric_id')
        .eq('rock_id', rockId)
        .eq('organization_id', orgId);

      if (!links?.length) {
        return {
          offTrackCount: 0,
          needsDataCount: 0,
          needsTargetCount: 0,
          needsOwnerCount: 0,
          onTrackCount: 0,
          totalLinked: 0,
          metrics: [],
          periodKey: selectedPeriodKey,
          periodLabel: periodSelection.periodLabel,
          hasAnyData: periodSelection.hasAnyData,
        };
      }

      const metricIds = links.map(l => l.metric_id);

      // Get metrics - org scoped, active only
      const { data: metrics } = await supabase
        .from('metrics')
        .select('*')
        .in('id', metricIds)
        .eq('organization_id', orgId)
        .eq('is_active', true);

      if (!metrics?.length) {
        return {
          offTrackCount: 0,
          needsDataCount: 0,
          needsTargetCount: 0,
          needsOwnerCount: 0,
          onTrackCount: 0,
          totalLinked: 0,
          metrics: [],
          periodKey: selectedPeriodKey,
          periodLabel: periodSelection.periodLabel,
          hasAnyData: periodSelection.hasAnyData,
        };
      }

      // Get results for selected period
      const { data: results } = await supabase
        .from('metric_results')
        .select('*')
        .in('metric_id', metricIds)
        .eq('period_type', 'monthly')
        .eq('period_start', periodStart);

      const resultsByMetric = results?.reduce((acc, r) => {
        acc[r.metric_id] = r;
        return acc;
      }, {} as Record<string, any>) || {};

      let offTrackCount = 0;
      let needsDataCount = 0;
      let needsTargetCount = 0;
      let needsOwnerCount = 0;
      let onTrackCount = 0;
      const linkedMetrics: LinkedMetricData[] = [];

      for (const metric of metrics) {
        const result = resultsByMetric[metric.id];

        // Use authoritative metricStatus helper
        const statusResult = metricStatus(
          { target: metric.target, direction: metric.direction, owner: metric.owner },
          result ? { value: result.value } : null,
          selectedPeriodKey
        );

        switch (statusResult.status) {
          case 'off_track': offTrackCount++; break;
          case 'needs_data': needsDataCount++; break;
          case 'needs_target': needsTargetCount++; break;
          case 'needs_owner': needsOwnerCount++; break;
          case 'on_track': onTrackCount++; break;
        }

        linkedMetrics.push({
          id: metric.id,
          name: metric.name,
          target: metric.target,
          direction: metric.direction,
          unit: metric.unit,
          owner: metric.owner,
          currentValue: result?.value ?? null,
          status: statusResult.status,
          statusResult,
          delta: statusResult.delta,
        });
      }

      // Sort metrics: OFF_TRACK first (by abs delta desc), then NEEDS_DATA, NEEDS_TARGET, NEEDS_OWNER, ON_TRACK
      const statusOrder: Record<MetricStatus, number> = {
        'off_track': 0,
        'needs_data': 1,
        'needs_target': 2,
        'needs_owner': 3,
        'on_track': 4,
      };

      linkedMetrics.sort((a, b) => {
        const orderDiff = statusOrder[a.status] - statusOrder[b.status];
        if (orderDiff !== 0) return orderDiff;
        // For off_track, sort by largest absolute delta first
        if (a.status === 'off_track' && b.status === 'off_track') {
          const aDelta = Math.abs(a.delta ?? 0);
          const bDelta = Math.abs(b.delta ?? 0);
          return bDelta - aDelta;
        }
        return a.name.localeCompare(b.name);
      });

      return { 
        offTrackCount, 
        needsDataCount,
        needsTargetCount,
        needsOwnerCount,
        onTrackCount,
        totalLinked: metrics.length,
        metrics: linkedMetrics,
        periodKey: selectedPeriodKey,
        periodLabel: periodSelection.periodLabel,
        hasAnyData: periodSelection.hasAnyData,
      };
    },
    enabled: !!rockId && !!currentUser?.team_id,
    staleTime: 5 * 60 * 1000,
  });

  const getStatusBadge = (status: MetricStatus) => {
    const display = getStatusDisplay(status);
    return (
      <Badge variant={display.variant} className="text-xs">
        {display.label}
      </Badge>
    );
  };

  // If loading or no rock, show nothing
  if (isLoading) return null;

  // No linked metrics - show warning badge
  if (!gapData || gapData.totalLinked === 0) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Badge 
            variant="outline"
            className="cursor-pointer gap-1 hover:opacity-80 transition-opacity text-xs text-muted-foreground border-muted-foreground/30"
          >
            <LinkIcon className="w-3 h-3" />
            No KPIs linked
          </Badge>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Database className="text-muted-foreground" />
              Reality Gap
            </SheetTitle>
            <SheetDescription>
              No KPIs linked to this rock
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">Rock: {rockTitle}</p>
            </div>

            <div className="p-6 text-center border border-dashed rounded-lg">
              <Database className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No KPIs are linked to this Rock yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Link KPIs to track progress toward this priority.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Determine badge style based on gap counts
  const hasIssues = gapData.offTrackCount > 0 || gapData.needsDataCount > 0;
  const badgeVariant = gapData.offTrackCount > 0 ? "destructive" : hasIssues ? "outline" : "default";

  // Build badge text
  const buildBadgeText = () => {
    const parts = [];
    if (gapData.offTrackCount > 0) parts.push(`${gapData.offTrackCount} off-track`);
    if (gapData.needsDataCount > 0) parts.push(`${gapData.needsDataCount} needs data`);
    
    if (parts.length === 0) {
      return `${gapData.onTrackCount}/${gapData.totalLinked} on track`;
    }
    return `Gap: ${parts.join(', ')}`;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Badge 
            variant={badgeVariant}
            className="cursor-pointer gap-1 hover:opacity-80 transition-opacity text-xs"
          >
            {gapData.offTrackCount > 0 && <AlertTriangle className="w-3 h-3" />}
            {buildBadgeText()}
          </Badge>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className={gapData.offTrackCount > 0 ? "text-destructive" : "text-muted-foreground"} />
              Reality Gap
            </SheetTitle>
            <SheetDescription>
              Status for {gapData.periodLabel}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Rock info */}
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">Rock: {rockTitle}</p>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="text-lg font-bold text-destructive">{gapData.offTrackCount}</p>
                <p className="text-[10px] text-muted-foreground">Off Track</p>
              </div>
              <div className="p-2 rounded-lg border border-muted-foreground/30 bg-muted/50">
                <p className="text-lg font-bold">{gapData.needsDataCount}</p>
                <p className="text-[10px] text-muted-foreground">Needs Data</p>
              </div>
              <div className="p-2 rounded-lg border border-warning/30 bg-warning/5">
                <p className="text-lg font-bold text-warning">{gapData.needsTargetCount}</p>
                <p className="text-[10px] text-muted-foreground">Needs Target</p>
              </div>
              <div className="p-2 rounded-lg border border-success/30 bg-success/5">
                <p className="text-lg font-bold text-success">{gapData.onTrackCount}</p>
                <p className="text-[10px] text-muted-foreground">On Track</p>
              </div>
            </div>

            {/* Metrics table */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {gapData.metrics.map(metric => (
                <div 
                  key={metric.id} 
                  className={`p-3 rounded-lg border ${
                    metric.status === 'off_track' 
                      ? 'border-destructive/30 bg-destructive/5' 
                      : metric.status === 'needs_data' || metric.status === 'needs_target' || metric.status === 'needs_owner'
                      ? 'border-warning/30 bg-warning/5'
                      : 'border-success/30 bg-success/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{metric.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className={metric.status === 'off_track' ? 'text-destructive font-medium' : 'text-foreground'}>
                          Value: {formatMetricValue(metric.currentValue, metric.unit)}
                        </span>
                        <span className="text-muted-foreground">
                          Target: {formatMetricValue(metric.target, metric.unit)}
                        </span>
                      </div>
                      {metric.delta !== null && metric.status === 'off_track' && (
                        <p className="text-xs text-destructive mt-1">
                          {metric.direction === 'up' || metric.direction === 'higher_is_better' ? 'Under' : 'Over'} by {formatMetricValue(Math.abs(metric.delta), metric.unit)}
                        </p>
                      )}
                      {metric.owner && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Owner: {metric.owner}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(metric.status)}
                      {(metric.status === 'off_track' || metric.status === 'needs_data' || metric.status === 'needs_target' || metric.status === 'needs_owner') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIssueMetric(metric);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Issue
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer actions */}
            <div className="pt-4 border-t">
              <Button 
                className="w-full" 
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  navigate(`/scorecard/off-track?month=${gapData.periodKey}`);
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View in Off-Track Control Center
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Issue creation modal with rock context */}
      {issueMetric && currentUser?.team_id && (
        <CreateIssueFromMetricModal
          open={!!issueMetric}
          onClose={() => {
            setIssueMetric(null);
            queryClient.invalidateQueries({ queryKey: ['reality-gap', rockId] });
            onCreateIssue?.();
          }}
          organizationId={currentUser.team_id}
          metric={{
            id: issueMetric.id,
            name: issueMetric.name,
            target: issueMetric.target,
            direction: issueMetric.direction,
            unit: issueMetric.unit,
            currentValue: issueMetric.currentValue,
            status: issueMetric.status,
          }}
          periodKey={gapData.periodKey}
          periodLabel={gapData.periodLabel}
          rockId={rockId}
          rockTitle={rockTitle}
        />
      )}
    </>
  );
}
