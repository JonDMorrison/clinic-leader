import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Target, 
  Clock, 
  ClipboardCheck,
  TrendingUp,
  ArrowRight,
  Trophy,
  User,
} from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Navigate } from "react-router-dom";
import { format, subDays } from "date-fns";

export default function ExecutionDashboard() {
  const { data: roleData, isLoading: roleLoading } = useIsAdmin();
  const isLeadership = roleData?.isManager ?? false;

  // Fetch organization ID
  const { data: organizationId, isLoading: orgLoading } = useQuery({
    queryKey: ["current-user-team-execution"],
    queryFn: async () => {
      const { data } = await supabase.rpc("current_user_team");
      return data as string | null;
    },
  });

  // Date boundaries
  const now = new Date();
  const last90Days = format(subDays(now, 90), "yyyy-MM-dd");
  const last30Days = format(subDays(now, 30), "yyyy-MM-dd");
  const last180Days = format(subDays(now, 180), "yyyy-MM-dd");

  // 1. IDS Follow-through (last 90 days)
  const { data: idsMetrics } = useQuery({
    queryKey: ["execution-ids-followthrough", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      // Get resolved issues with resolution_type in last 90 days
      const { data: issues, error } = await supabase
        .from("issues")
        .select("id, resolution_type, resolved_at")
        .eq("organization_id", organizationId)
        .gte("resolved_at", last90Days)
        .not("resolved_at", "is", null);

      if (error) throw error;

      const total = issues?.length || 0;
      const withIntervention = issues?.filter(i => i.resolution_type === "intervention_created").length || 0;
      const excluded = issues?.filter(i => i.resolution_type === "defer" || i.resolution_type === "unknown").length || 0;
      const denominator = total - excluded;
      const rate = denominator > 0 ? (withIntervention / denominator) * 100 : 0;

      return { total, withIntervention, denominator, rate };
    },
    enabled: !!organizationId && isLeadership,
  });

  // 2. Active interventions count (planned or active)
  const { data: activeCount } = useQuery({
    queryKey: ["execution-active-interventions", organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;

      const { count, error } = await supabase
        .from("interventions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("status", ["planned", "active"]);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!organizationId && isLeadership,
  });

  // 3. Overdue interventions count
  const { data: overdueCount } = useQuery({
    queryKey: ["execution-overdue-interventions", organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;

      const today = format(now, "yyyy-MM-dd");
      const { count, error } = await supabase
        .from("interventions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("status", ["planned", "active"])
        .lt("end_date", today);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!organizationId && isLeadership,
  });

  // 4. Interventions evaluated (last 30 days)
  const { data: evaluatedCount } = useQuery({
    queryKey: ["execution-evaluated-interventions", organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;

      // Get interventions that have outcomes evaluated in last 30 days
      const { data: outcomes, error } = await supabase
        .from("intervention_outcomes")
        .select("intervention_id, evaluated_at")
        .gte("evaluated_at", last30Days)
        .not("evaluated_at", "is", null);

      if (error) throw error;

      // Get unique intervention IDs
      const uniqueInterventionIds = new Set(outcomes?.map(o => o.intervention_id) || []);
      return uniqueInterventionIds.size;
    },
    enabled: !!organizationId && isLeadership,
  });

  // 5. Execution Funnel data
  const { data: funnelData } = useQuery({
    queryKey: ["execution-funnel", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      // Step 1: Issues resolved (last 90 days)
      const { count: resolvedCount } = await supabase
        .from("issues")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .gte("resolved_at", last90Days)
        .not("resolved_at", "is", null);

      // Step 2: Interventions created from issues (last 90 days)
      const { count: fromIssuesCount } = await supabase
        .from("interventions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("origin_type", "issue")
        .gte("created_at", last90Days);

      // Step 3: Interventions with outcomes evaluated (last 90 days)
      const { data: outcomes } = await supabase
        .from("intervention_outcomes")
        .select("intervention_id")
        .gte("evaluated_at", last90Days)
        .not("computed_at", "is", null);

      const evaluatedSet = new Set(outcomes?.map(o => o.intervention_id) || []);

      const step1 = resolvedCount || 0;
      const step2 = fromIssuesCount || 0;
      const step3 = evaluatedSet.size;

      return {
        steps: [
          { label: "Issues Resolved", count: step1, rate: 100 },
          { label: "Interventions Created", count: step2, rate: step1 > 0 ? (step2 / step1) * 100 : 0 },
          { label: "Outcomes Evaluated", count: step3, rate: step2 > 0 ? (step3 / step2) * 100 : 0 },
        ],
      };
    },
    enabled: !!organizationId && isLeadership,
  });

  // 6. Intervention Leaderboard
  const { data: leaderboard } = useQuery({
    queryKey: ["execution-leaderboard", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Get completed interventions in last 180 days (owner_user_id is the correct field)
      const { data: interventions, error: intError } = await supabase
        .from("interventions")
        .select("id, owner_user_id, status, end_date")
        .eq("organization_id", organizationId)
        .eq("status", "completed")
        .gte("end_date", last180Days);

      if (intError) throw intError;
      if (!interventions?.length) return [];

      const interventionIds = interventions.map(i => i.id);

      // Get outcomes with delta_percent
      const { data: outcomes, error: outError } = await supabase
        .from("intervention_outcomes")
        .select("intervention_id, actual_delta_percent, computed_at")
        .in("intervention_id", interventionIds)
        .not("computed_at", "is", null)
        .not("actual_delta_percent", "is", null);

      if (outError) throw outError;

      // Build owner stats
      const ownerStats = new Map<string, { completed: number; deltas: number[] }>();

      for (const intervention of interventions) {
        if (!intervention.owner_user_id) continue;
        
        if (!ownerStats.has(intervention.owner_user_id)) {
          ownerStats.set(intervention.owner_user_id, { completed: 0, deltas: [] });
        }
        ownerStats.get(intervention.owner_user_id)!.completed++;
      }

      // Add deltas
      for (const outcome of outcomes || []) {
        const intervention = interventions.find(i => i.id === outcome.intervention_id);
        if (!intervention?.owner_user_id) continue;
        
        if (ownerStats.has(intervention.owner_user_id) && outcome.actual_delta_percent !== null) {
          ownerStats.get(intervention.owner_user_id)!.deltas.push(Math.abs(outcome.actual_delta_percent));
        }
      }

      // Get user names
      const ownerIds = Array.from(ownerStats.keys());
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", ownerIds);

      const userMap = new Map(users?.map(u => [u.id, u.full_name]) || []);

      // Build leaderboard
      const leaderboardData = Array.from(ownerStats.entries())
        .map(([ownerId, stats]) => ({
          ownerId,
          ownerName: userMap.get(ownerId) || "Unknown",
          completed: stats.completed,
          avgDelta: stats.deltas.length > 0 
            ? stats.deltas.reduce((a, b) => a + b, 0) / stats.deltas.length 
            : null,
        }))
        .sort((a, b) => b.completed - a.completed)
        .slice(0, 10);

      return leaderboardData;
    },
    enabled: !!organizationId && isLeadership,
  });

  // Role gate - redirect non-leadership
  if (!roleLoading && !isLeadership) {
    return <Navigate to="/dashboard" replace />;
  }

  if (orgLoading || roleLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Execution Dashboard</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Execution Dashboard</h1>
        <p className="text-muted-foreground">
          Track intervention habits and follow-through across your organization
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* IDS Follow-through */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              IDS Follow-through
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {idsMetrics?.rate?.toFixed(0) ?? "—"}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {idsMetrics?.withIntervention ?? 0} of {idsMetrics?.denominator ?? 0} issues → interventions
            </p>
            <Badge variant="outline" className="mt-2 text-xs">Last 90 days</Badge>
          </CardContent>
        </Card>

        {/* Active Interventions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Active Interventions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeCount ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently planned or in progress
            </p>
          </CardContent>
        </Card>

        {/* Overdue Interventions */}
        <Card className={overdueCount && overdueCount > 0 ? "border-destructive/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-destructive" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${overdueCount && overdueCount > 0 ? "text-destructive" : ""}`}>
              {overdueCount ?? "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Past end date, not yet completed
            </p>
          </CardContent>
        </Card>

        {/* Evaluated */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-success" />
              Evaluated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{evaluatedCount ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Outcomes measured
            </p>
            <Badge variant="outline" className="mt-2 text-xs">Last 30 days</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Execution Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Execution Funnel
            <Badge variant="outline" className="ml-2 text-xs">Last 90 days</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {funnelData ? (
            <div className="flex items-center justify-between gap-4">
              {funnelData.steps.map((step, index) => (
                <div key={step.label} className="flex-1 flex items-center">
                  <div className="flex-1">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{step.count}</div>
                      <p className="text-sm text-muted-foreground">{step.label}</p>
                      {index > 0 && (
                        <Badge 
                          variant={step.rate >= 50 ? "default" : "secondary"} 
                          className="mt-1 text-xs"
                        >
                          {step.rate.toFixed(0)}% conversion
                        </Badge>
                      )}
                    </div>
                  </div>
                  {index < funnelData.steps.length - 1 && (
                    <ArrowRight className="w-6 h-6 text-muted-foreground mx-2 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Loading funnel data...</p>
          )}
        </CardContent>
      </Card>

      {/* Intervention Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4 text-warning" />
            Intervention Leaderboard
            <Badge variant="outline" className="ml-2 text-xs">Last 180 days</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div 
                  key={entry.ownerId} 
                  className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? "bg-warning text-warning-foreground" :
                      index === 1 ? "bg-muted-foreground text-background" :
                      index === 2 ? "bg-accent text-accent-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{entry.ownerName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <span className="font-bold">{entry.completed}</span>
                      <span className="text-muted-foreground ml-1">completed</span>
                    </div>
                    {entry.avgDelta !== null && (
                      <div className="text-right min-w-[80px]">
                        <span className="font-bold text-success">
                          {entry.avgDelta.toFixed(1)}%
                        </span>
                        <span className="text-muted-foreground ml-1">avg Δ</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : leaderboard?.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No completed interventions in the last 180 days
            </p>
          ) : (
            <p className="text-muted-foreground">Loading leaderboard...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
