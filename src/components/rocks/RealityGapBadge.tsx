import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Plus, ExternalLink } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { useNavigate } from "react-router-dom";

interface RealityGapBadgeProps {
  rockId: string;
  rockTitle: string;
  onCreateIssue?: () => void;
}

interface LinkedMetricStatus {
  id: string;
  name: string;
  target: number | null;
  direction: string;
  unit: string;
  currentValue: number | null;
  previousValue: number | null;
  currentPeriod: string | null;
  isOffTrack: boolean;
  trend: 'up' | 'down' | 'stable';
}

export function RealityGapBadge({ rockId, rockTitle, onCreateIssue }: RealityGapBadgeProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

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
        .in('id', metricIds);

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
      const linkedMetrics: LinkedMetricStatus[] = [];

      for (const metric of metrics || []) {
        const metricResults = resultsByMetric[metric.id] || [];
        const current = metricResults[0];
        const previous = metricResults[1];

        if (current?.period_start && (!latestPeriod || current.period_start > latestPeriod)) {
          latestPeriod = current.period_start;
        }

        let isOffTrack = false;
        if (metric.target && current) {
          isOffTrack = metric.direction === 'up' 
            ? current.value < metric.target
            : current.value > metric.target;
          if (isOffTrack) offTrackCount++;
        }

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
          previousValue: previous?.value ?? null,
          currentPeriod: current?.period_start ?? null,
          isOffTrack,
          trend,
        });
      }

      return { offTrackCount, metrics: linkedMetrics, latestPeriod };
    },
    enabled: !!rockId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !gapData || gapData.metrics.length === 0) return null;

  const formatValue = (value: number | null, unit: string) => {
    if (value === null) return '-';
    if (unit === '$') return `$${value.toLocaleString()}`;
    if (unit === '%') return `${value}%`;
    return value.toLocaleString();
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-success" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-destructive" />;
      default: return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Badge 
          variant={gapData.offTrackCount > 0 ? "destructive" : "outline"}
          className="cursor-pointer gap-1 hover:opacity-80 transition-opacity"
        >
          {gapData.offTrackCount > 0 && <AlertTriangle className="w-3 h-3" />}
          Reality Gap: {gapData.offTrackCount}
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
                className={`p-3 rounded-lg border ${metric.isOffTrack ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{metric.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className={metric.isOffTrack ? 'text-destructive font-medium' : 'text-foreground'}>
                        Current: {formatValue(metric.currentValue, metric.unit)}
                      </span>
                      <span className="text-muted-foreground">
                        Target: {formatValue(metric.target, metric.unit)}
                      </span>
                      {getTrendIcon(metric.trend)}
                    </div>
                  </div>
                  {metric.isOffTrack && (
                    <Badge variant="destructive" className="text-xs shrink-0">Off Track</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {gapData.offTrackCount > 0 && (
            <div className="pt-4 border-t space-y-2">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  onCreateIssue?.();
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
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
