import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Zap,
  Clock,
  CheckCircle,
  ArrowRight,
  Plus,
  Loader2,
} from "lucide-react";
import { format, subDays, differenceInDays, parseISO } from "date-fns";
import { STATUS_COLORS, INTERVENTION_TYPE_OPTIONS } from "@/lib/interventions/types";

type StatusFilter = "all" | "active" | "completed";

interface InterventionWithOutcome {
  id: string;
  title: string;
  status: string;
  intervention_type: string;
  start_date: string | null;
  expected_time_horizon_days: number;
  created_at: string;
  outcome_delta_percent: number | null;
  has_outcome: boolean;
  days_overdue: number | null;
}

export function InterventionsTab() {
  const { data: currentUser } = useCurrentUser();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Fetch all relevant interventions with outcomes
  const { data, isLoading, error } = useQuery({
    queryKey: ["interventions-dashboard", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;

      const ninetyDaysAgo = subDays(new Date(), 90).toISOString();

      // Fetch interventions
      const { data: interventions, error: intError } = await supabase
        .from("interventions")
        .select("id, title, status, intervention_type, start_date, expected_time_horizon_days, created_at, updated_at")
        .eq("organization_id", currentUser.team_id)
        .in("status", ["active", "completed", "planned"]);

      if (intError) throw intError;

      // Fetch outcomes for all interventions
      const interventionIds = (interventions || []).map((i) => i.id);
      let outcomesMap = new Map<string, { metric_id: string; actual_delta_percent: number | null }[]>();

      if (interventionIds.length > 0) {
        const { data: outcomes } = await supabase
          .from("intervention_outcomes")
          .select("intervention_id, metric_id, actual_delta_percent")
          .in("intervention_id", interventionIds);

        // Group outcomes by intervention
        (outcomes || []).forEach((o) => {
          const existing = outcomesMap.get(o.intervention_id) || [];
          existing.push(o);
          outcomesMap.set(o.intervention_id, existing);
        });
      }

      // Compute stats
      const now = new Date();
      const processed: InterventionWithOutcome[] = (interventions || []).map((int) => {
        const intOutcomes = outcomesMap.get(int.id) || [];
        const hasOutcome = intOutcomes.length > 0;

        // Get max absolute delta percent for sorting
        let maxAbsDeltaPercent: number | null = null;
        intOutcomes.forEach((o) => {
          if (o.actual_delta_percent !== null) {
            const abs = Math.abs(o.actual_delta_percent);
            if (maxAbsDeltaPercent === null || abs > maxAbsDeltaPercent) {
              maxAbsDeltaPercent = o.actual_delta_percent;
            }
          }
        });

        // Calculate if overdue (active + past time horizon + no outcomes)
        let daysOverdue: number | null = null;
        if (int.status === "active" && int.start_date) {
          const startDate = parseISO(int.start_date);
          const expectedEndDate = new Date(startDate);
          expectedEndDate.setDate(expectedEndDate.getDate() + int.expected_time_horizon_days);
          if (now > expectedEndDate && !hasOutcome) {
            daysOverdue = differenceInDays(now, expectedEndDate);
          }
        }

        return {
          id: int.id,
          title: int.title,
          status: int.status,
          intervention_type: int.intervention_type,
          start_date: int.start_date,
          expected_time_horizon_days: int.expected_time_horizon_days,
          created_at: int.created_at,
          outcome_delta_percent: maxAbsDeltaPercent,
          has_outcome: hasOutcome,
          days_overdue: daysOverdue,
        };
      });

      // Counts
      const activeCount = processed.filter((i) => i.status === "active").length;
      const completedLast90 = processed.filter(
        (i) => i.status === "completed" && i.created_at >= ninetyDaysAgo
      ).length;

      // Most impactful (top 5 by absolute delta percent)
      const withOutcomes = processed.filter((i) => i.outcome_delta_percent !== null);
      withOutcomes.sort((a, b) => Math.abs(b.outcome_delta_percent!) - Math.abs(a.outcome_delta_percent!));
      const mostImpactful = withOutcomes.slice(0, 5);

      // At risk (active, overdue, no outcomes)
      const atRisk = processed
        .filter((i) => i.days_overdue !== null && i.days_overdue > 0)
        .sort((a, b) => (b.days_overdue || 0) - (a.days_overdue || 0));

      return {
        all: processed,
        activeCount,
        completedLast90,
        mostImpactful,
        atRisk,
      };
    },
    enabled: !!currentUser?.team_id,
  });

  const getTypeLabel = (type: string) =>
    INTERVENTION_TYPE_OPTIONS.find((t) => t.value === type)?.label || type;

  // Filter interventions based on status
  const filteredInterventions = data?.all.filter((i) => {
    if (statusFilter === "all") return true;
    return i.status === statusFilter;
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Failed to load interventions data</p>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!data || data.all.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Zap className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Interventions Yet</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            Create interventions to track initiatives and measure their impact on your metrics.
          </p>
          <Button asChild>
            <Link to="/interventions">
              <Plus className="w-4 h-4 mr-2" />
              Create Intervention
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Interventions</p>
                <p className="text-3xl font-bold">{data.activeCount}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed (Last 90 Days)</p>
                <p className="text-3xl font-bold">{data.completedLast90}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Impactful + At Risk */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Most Impactful */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Most Impactful
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.mostImpactful.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No evaluated outcomes yet. Run evaluations on active interventions.
              </p>
            ) : (
              <div className="space-y-2">
                {data.mostImpactful.map((int) => (
                  <Link
                    key={int.id}
                    to={`/interventions/${int.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{int.title}</p>
                      <p className="text-xs text-muted-foreground">{getTypeLabel(int.intervention_type)}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        int.outcome_delta_percent !== null && int.outcome_delta_percent > 0
                          ? "text-green-600 dark:text-green-400"
                          : int.outcome_delta_percent !== null && int.outcome_delta_percent < 0
                          ? "text-red-600 dark:text-red-400"
                          : ""
                      }
                    >
                      {int.outcome_delta_percent !== null && int.outcome_delta_percent > 0 && (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      )}
                      {int.outcome_delta_percent !== null && int.outcome_delta_percent < 0 && (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {int.outcome_delta_percent !== null
                        ? `${int.outcome_delta_percent > 0 ? "+" : ""}${int.outcome_delta_percent.toFixed(1)}%`
                        : "—"}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* At Risk */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.atRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No at-risk interventions. All active interventions are on track!
              </p>
            ) : (
              <div className="space-y-2">
                {data.atRisk.slice(0, 5).map((int) => (
                  <Link
                    key={int.id}
                    to={`/interventions/${int.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{int.title}</p>
                      <p className="text-xs text-muted-foreground">{getTypeLabel(int.intervention_type)}</p>
                    </div>
                    <Badge variant="outline" className="text-amber-600 dark:text-amber-400 gap-1">
                      <Clock className="h-3 w-3" />
                      {int.days_overdue}d overdue
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Interventions with Filter */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">All Interventions</CardTitle>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3 h-7">All</TabsTrigger>
              <TabsTrigger value="active" className="text-xs px-3 h-7">Active</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs px-3 h-7">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredInterventions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No {statusFilter !== "all" ? statusFilter : ""} interventions found.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredInterventions.slice(0, 10).map((int) => (
                <Link
                  key={int.id}
                  to={`/interventions/${int.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Badge className={STATUS_COLORS[int.status as keyof typeof STATUS_COLORS]}>
                      {int.status.charAt(0).toUpperCase() + int.status.slice(1)}
                    </Badge>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{int.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {getTypeLabel(int.intervention_type)} • {format(new Date(int.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
              {filteredInterventions.length > 10 && (
                <div className="pt-2 text-center">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/interventions">
                      View all {filteredInterventions.length} interventions
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
