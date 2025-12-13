import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Plus, ExternalLink, Loader2 } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { calculateMetricStatus, formatMetricValue, type MetricStatus } from "@/lib/scorecard/metricStatus";

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
  currentValue: number | null;
  currentPeriod: string | null;
  status: MetricStatus;
  delta: number | null;
  trend: 'up' | 'down' | 'stable';
}

export function RealityGapBadge({ rockId, rockTitle, onCreateIssue }: RealityGapBadgeProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);

  const { data: gapData, isLoading } = useQuery({
    queryKey: ['reality-gap', rockId],
    queryFn: async () => {
      // Get linked metrics for this rock
      const { data: links } = await supabase
        .from('rock_metric_links')
        .select('metric_id')
        .eq('rock_id', rockId);

      if (!links?.length) return { offTrackCount: 0, metrics: [], latestPeriod: null };

      const metricIds = links.map(l => l.metric_id);

      // Get metrics
      const { data: metrics } = await supabase
        .from('metrics')
        .select('*')
        .in('id', metricIds)
        .eq('is_active', true);

      // Get last 3 months of results
      const periods = Array.from({ length: 3 }, (_, i) => 
        format(startOfMonth(subMonths(new Date(), i)), 'yyyy-MM-dd')
      );

      const { data: results } = await supabase
        .from('metric_results')
        .select('*')
        .in('metric_id', metricIds)
        .eq('period_type', 'monthly')
        .in('period_start', periods)
        .order('period_start', { ascending: false });

      const resultsByMetric = results?.reduce((acc, r) => {
        if (!acc[r.metric_id]) acc[r.metric_id] = [];
        acc[r.metric_id].push(r);
        return acc;
      }, {} as Record<string, any[]>) || {};

      let offTrackCount = 0;
      let latestPeriod: string | null = null;
      const linkedMetrics: LinkedMetricData[] = [];

      for (const metric of metrics || []) {
        const metricResults = resultsByMetric[metric.id] || [];
        const current = metricResults[0];
        const previous = metricResults[1];

        if (current?.period_start && (!latestPeriod || current.period_start > latestPeriod)) {
          latestPeriod = current.period_start;
        }

        // Use shared helper for status calculation
        const statusResult = calculateMetricStatus(
          current?.value ?? null,
          metric.target,
          metric.direction,
          current?.period_start ?? null
        );

        if (statusResult.status === 'off_track') offTrackCount++;

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (current && previous) {
          if (current.value > previous.value) trend = 'up';
          else if (current.value < previous.value) trend = 'down';
        }

        linkedMetrics.push({
          id: metric.id,
          name: metric.name,
          target: metric.target,
          direction: metric.direction,
          unit: metric.unit,
          currentValue: current?.value ?? null,
          currentPeriod: current?.period_start ?? null,
          status: statusResult.status,
          delta: statusResult.delta,
          trend,
        });
      }

      return { offTrackCount, metrics: linkedMetrics, latestPeriod };
    },
    enabled: !!rockId,
    staleTime: 5 * 60 * 1000,
  });

  const createIssueMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.team_id || !gapData) throw new Error('Missing data');

      const offTrackMetrics = gapData.metrics.filter(m => m.status === 'off_track');
      if (offTrackMetrics.length === 0) throw new Error('No off-track metrics');

      const metricDetails = offTrackMetrics.map(m => 
        `• ${m.name}: ${formatMetricValue(m.currentValue, m.unit)} (Target: ${formatMetricValue(m.target, m.unit)})`
      ).join('\n');

      const periodLabel = gapData.latestPeriod 
        ? format(new Date(gapData.latestPeriod), 'MMMM yyyy')
        : 'Latest month';

      const { data, error } = await supabase
        .from('issues')
        .insert({
          organization_id: currentUser.team_id,
          title: `Reality gap for Rock: ${rockTitle}`,
          context: `Based on ${periodLabel} data:\n\n${metricDetails}`,
          priority: offTrackMetrics.length >= 3 ? 1 : 2,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      toast.success('Issue created from reality gap');
      setOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create issue');
    },
  });

  const handleCreateIssue = async () => {
    setIsCreatingIssue(true);
    try {
      await createIssueMutation.mutateAsync();
      onCreateIssue?.();
    } finally {
      setIsCreatingIssue(false);
    }
  };

  if (isLoading || !gapData || gapData.metrics.length === 0) return null;

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-success" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-destructive" />;
      default: return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: MetricStatus) => {
    switch (status) {
      case 'off_track': return <Badge variant="destructive" className="text-xs">Off Track</Badge>;
      case 'needs_target': return <Badge variant="outline" className="text-xs text-warning border-warning">Needs Target</Badge>;
      case 'needs_data': return <Badge variant="muted" className="text-xs">Needs Data</Badge>;
      default: return <Badge variant="outline" className="text-xs text-success border-success">On Track</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Badge 
          variant={gapData.offTrackCount > 0 ? "destructive" : "outline"}
          className="cursor-pointer gap-1 hover:opacity-80 transition-opacity text-xs"
        >
          {gapData.offTrackCount > 0 && <AlertTriangle className="w-3 h-3" />}
          Gap: {gapData.offTrackCount}
        </Badge>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className={gapData.offTrackCount > 0 ? "text-destructive" : "text-muted-foreground"} />
            Reality Gap
          </SheetTitle>
          <SheetDescription>
            {gapData.latestPeriod && (
              <span>Based on: {format(new Date(gapData.latestPeriod), 'MMMM yyyy')} data</span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="font-medium text-sm">Rock: {rockTitle}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {gapData.offTrackCount} of {gapData.metrics.length} linked metrics off track
            </p>
          </div>

          <div className="space-y-3">
            {gapData.metrics.map(metric => (
              <div 
                key={metric.id} 
                className={`p-3 rounded-lg border ${metric.status === 'off_track' ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{metric.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className={metric.status === 'off_track' ? 'text-destructive font-medium' : 'text-foreground'}>
                        Current: {formatMetricValue(metric.currentValue, metric.unit)}
                      </span>
                      <span className="text-muted-foreground">
                        Target: {formatMetricValue(metric.target, metric.unit)}
                      </span>
                      {getTrendIcon(metric.trend)}
                    </div>
                    {metric.delta !== null && metric.status === 'off_track' && (
                      <p className="text-xs text-destructive mt-1">
                        {metric.direction === 'up' ? 'Under' : 'Over'} by {formatMetricValue(Math.abs(metric.delta), metric.unit)}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(metric.status)}
                </div>
              </div>
            ))}
          </div>

          {gapData.offTrackCount > 0 && (
            <div className="pt-4 border-t space-y-2">
              <Button 
                className="w-full" 
                variant="default"
                onClick={handleCreateIssue}
                disabled={isCreatingIssue}
              >
                {isCreatingIssue ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Issue from Gap
              </Button>
              <Button 
                className="w-full" 
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  navigate('/scorecard/off-track');
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View All Off Track Metrics
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
