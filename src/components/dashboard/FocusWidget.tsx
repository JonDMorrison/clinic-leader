import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRecurringIssues } from "@/hooks/useRecurringIssues";
import { getMonthlyPeriodSelection, periodKeyToStart } from "@/lib/scorecard/periodHelper";
import { metricStatus } from "@/lib/scorecard/metricStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Focus, TrendingDown, Target, RotateCcw, ArrowRight } from "lucide-react";

export function FocusWidget() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const organizationId = currentUser?.team_id;

  // Fetch period selection
  const { data: periodSelection } = useQuery({
    queryKey: ["focus-widget-period", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      return getMonthlyPeriodSelection(organizationId);
    },
    enabled: !!organizationId,
  });

  const selectedPeriod = periodSelection?.selectedPeriodKey || "";

  // Fetch off-track metrics count
  const { data: offTrackCount = 0, isLoading: metricsLoading } = useQuery({
    queryKey: ["focus-widget-metrics", organizationId, selectedPeriod],
    queryFn: async () => {
      if (!organizationId || !selectedPeriod) return 0;

      const periodStart = periodKeyToStart(selectedPeriod);

      const { data: metrics } = await supabase
        .from("metrics")
        .select("id, target, direction, owner")
        .eq("organization_id", organizationId)
        .eq("is_active", true);

      if (!metrics?.length) return 0;

      const { data: results } = await supabase
        .from("metric_results")
        .select("metric_id, value")
        .in("metric_id", metrics.map(m => m.id))
        .eq("period_type", "monthly")
        .eq("period_start", periodStart);

      const resultsMap = Object.fromEntries((results || []).map(r => [r.metric_id, r]));

      let count = 0;
      for (const metric of metrics) {
        const result = resultsMap[metric.id];
        const statusResult = metricStatus(
          { target: metric.target, direction: metric.direction, owner: metric.owner },
          result ? { value: result.value } : null,
          selectedPeriod
        );
        if (statusResult.status === "off_track") count++;
      }

      return count;
    },
    enabled: !!organizationId && !!selectedPeriod,
  });

  // Fetch rocks with gaps count
  const { data: rocksCount = 0, isLoading: rocksLoading } = useQuery({
    queryKey: ["focus-widget-rocks", organizationId, selectedPeriod],
    queryFn: async () => {
      if (!organizationId || !selectedPeriod) return 0;

      const { data: rocks } = await supabase
        .from("rocks")
        .select("id")
        .eq("organization_id", organizationId)
        .neq("status", "done");

      if (!rocks?.length) return 0;

      const { data: links } = await supabase
        .from("rock_metric_links")
        .select("rock_id, metric_id")
        .in("rock_id", rocks.map(r => r.id));

      const metricIds = [...new Set((links || []).map(l => l.metric_id))];
      if (metricIds.length === 0) return 0;

      const { data: metrics } = await supabase
        .from("metrics")
        .select("id, target, direction, owner")
        .in("id", metricIds);

      const metricsMap = Object.fromEntries((metrics || []).map(m => [m.id, m]));

      const periodStart = periodKeyToStart(selectedPeriod);
      const { data: results } = await supabase
        .from("metric_results")
        .select("metric_id, value")
        .in("metric_id", metricIds)
        .eq("period_type", "monthly")
        .eq("period_start", periodStart);

      const resultsMap = Object.fromEntries((results || []).map(r => [r.metric_id, r]));

      const linksByRock = (links || []).reduce((acc, l) => {
        if (!acc[l.rock_id]) acc[l.rock_id] = [];
        acc[l.rock_id].push(l.metric_id);
        return acc;
      }, {} as Record<string, string[]>);

      let count = 0;
      for (const rock of rocks) {
        const linkedMetricIds = linksByRock[rock.id] || [];
        let hasGap = false;

        for (const metricId of linkedMetricIds) {
          const metric = metricsMap[metricId];
          const result = resultsMap[metricId];
          if (!metric) continue;

          const statusResult = metricStatus(
            { target: metric.target, direction: metric.direction, owner: metric.owner },
            result ? { value: result.value } : null,
            selectedPeriod
          );

          if (statusResult.status === "off_track" || statusResult.status === "needs_data") {
            hasGap = true;
            break;
          }
        }

        if (hasGap) count++;
      }

      return count;
    },
    enabled: !!organizationId && !!selectedPeriod,
  });

  // Recurring issues
  const { data: recurringIssues } = useRecurringIssues({ organizationId });
  const recurringCount = recurringIssues?.length || 0;

  const isLoading = userLoading || metricsLoading || rocksLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">This Month's Focus</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  const totalAttention = offTrackCount + rocksCount + recurringCount;

  return (
    <Card className="glass hover-scale">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Focus className="w-4 h-4 text-primary" />
          This Month's Focus
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <span className="font-semibold">{offTrackCount}</span>
              <span className="text-xs text-muted-foreground">off-track</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-warning" />
              <span className="font-semibold">{rocksCount}</span>
              <span className="text-xs text-muted-foreground">rocks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-primary" />
              <span className="font-semibold">{recurringCount}</span>
              <span className="text-xs text-muted-foreground">recurring</span>
            </div>
          </div>
          {totalAttention > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalAttention} items
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link to="/focus">
            Open Focus
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
