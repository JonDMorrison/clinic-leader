/**
 * DiagnosticsPanel - Dev-only internal diagnostics for Interventions
 * Shows org context, permissions, and data counts for debugging
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Bug, Database, Shield, User, Activity } from "lucide-react";
import { format } from "date-fns";
import { getInterventionProgress, getProgressStatusStyle, type InterventionInput } from "@/lib/interventions/interventionStatus";

interface DiagnosticsPanelProps {
  interventionId?: string; // Optional - if provided, shows intervention-specific data
  linkedMetricIds?: string[]; // Metric IDs linked to this intervention
  showOutcomesDiagnostics?: boolean; // Show detailed outcomes after evaluation
  interventionData?: InterventionInput; // For computing progress
}

export function DiagnosticsPanel({ 
  interventionId, 
  linkedMetricIds = [],
  showOutcomesDiagnostics = true,
  interventionData,
}: DiagnosticsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const { data: adminData } = useIsAdmin();

  // Only show in development
  const isDev = import.meta.env.DEV;
  if (!isDev) return null;

  // Fetch counts
  const { data: counts } = useQuery({
    queryKey: ["diagnostics-counts", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;

      const [interventionsRes, linksRes, outcomesRes] = await Promise.all([
        supabase
          .from("interventions")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", currentUser.team_id),
        supabase
          .from("intervention_metric_links")
          .select("id, intervention_id", { count: "exact" })
          .in(
            "intervention_id",
            (
              await supabase
                .from("interventions")
                .select("id")
                .eq("organization_id", currentUser.team_id)
            ).data?.map((i) => i.id) || []
          ),
        supabase
          .from("intervention_outcomes")
          .select("id, intervention_id", { count: "exact" })
          .in(
            "intervention_id",
            (
              await supabase
                .from("interventions")
                .select("id")
                .eq("organization_id", currentUser.team_id)
            ).data?.map((i) => i.id) || []
          ),
      ]);

      return {
        interventions: interventionsRes.count || 0,
        links: linksRes.data?.length || 0,
        outcomes: outcomesRes.data?.length || 0,
      };
    },
    enabled: !!currentUser?.team_id && isOpen,
  });

  // Fetch auth user
  const { data: authUser } = useQuery({
    queryKey: ["diagnostics-auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
    enabled: isOpen,
  });

  // Fetch last 5 metric_results for each linked metric
  const { data: metricResults } = useQuery({
    queryKey: ["diagnostics-metric-results", linkedMetricIds],
    queryFn: async () => {
      if (linkedMetricIds.length === 0) return {};

      const results: Record<
        string,
        { period_start: string; value: number; source: string; metric_name: string }[]
      > = {};

      for (const metricId of linkedMetricIds) {
        // Get metric name
        const { data: metric } = await supabase
          .from("metrics")
          .select("name")
          .eq("id", metricId)
          .single();

        const { data } = await supabase
          .from("metric_results")
          .select("period_start, value, source")
          .eq("metric_id", metricId)
          .order("period_start", { ascending: false })
          .limit(5);

        results[metricId] = (data || []).map((r) => ({
          ...r,
          metric_name: metric?.name || "Unknown",
        }));
      }

      return results;
    },
    enabled: linkedMetricIds.length > 0 && isOpen,
  });

  // Fetch intervention outcomes for diagnostics
  const { data: outcomesDiagnostics } = useQuery({
    queryKey: ["diagnostics-outcomes", interventionId],
    queryFn: async () => {
      if (!interventionId) return null;

      const { data: outcomes, error } = await supabase
        .from("intervention_outcomes")
        .select("*, metrics:metric_id(name)")
        .eq("intervention_id", interventionId);

      if (error) throw error;

      // Get links to show baseline info
      const { data: links } = await supabase
        .from("intervention_metric_links")
        .select("metric_id, baseline_value, baseline_period_start")
        .eq("intervention_id", interventionId);

      const linksMap = new Map(
        (links || []).map((l) => [l.metric_id, l])
      );

      return {
        count: outcomes?.length || 0,
        items: (outcomes || []).map((o) => {
          const link = linksMap.get(o.metric_id);
          const baseline = link?.baseline_value ?? null;
          const current = baseline !== null && o.actual_delta_value !== null
            ? baseline + o.actual_delta_value
            : null;
          return {
            metric_id: o.metric_id,
            metric_name: (o.metrics as { name: string } | null)?.name || "Unknown",
            baseline_value: baseline,
            current_value: current,
            current_period: o.evaluation_period_end,
            delta_value: o.actual_delta_value,
            delta_percent: o.actual_delta_percent,
            evaluated_at: o.evaluated_at,
            status: baseline !== null && current !== null ? "computed" : "insufficient_data",
          };
        }),
      };
    },
    enabled: !!interventionId && isOpen && showOutcomesDiagnostics,
  });

  // Compute progress status for diagnostics
  const progressDiagnostics = useMemo(() => {
    if (!interventionData || !isOpen) return null;
    
    const outcomes = outcomesDiagnostics?.items.map((i) => ({
      actual_delta_value: i.delta_value,
      actual_delta_percent: i.delta_percent,
    })) || [];

    const progress = getInterventionProgress({
      intervention: interventionData,
      outcomes,
    });

    return {
      ...progress,
      created_at: interventionData.created_at,
      expected_time_horizon_days: interventionData.expected_time_horizon_days,
      db_status: interventionData.status,
    };
  }, [interventionData, outcomesDiagnostics, isOpen]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-800/50"
          >
            <Bug className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
            <span className="text-amber-700 dark:text-amber-300">Dev Diagnostics</span>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 ml-2" />
            ) : (
              <ChevronUp className="h-4 w-4 ml-2" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <Card className="mt-2 w-96 max-h-[70vh] overflow-y-auto border-amber-300 dark:border-amber-700 bg-amber-50/95 dark:bg-amber-950/95 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <Bug className="h-4 w-4" />
                Interventions Diagnostics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* Identity */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
                  <User className="h-3 w-3" />
                  Identity
                </div>
                <div className="grid grid-cols-2 gap-1 pl-5">
                  <span className="text-muted-foreground">org_id:</span>
                  <code className="font-mono text-[10px] truncate" title={currentUser?.team_id}>
                    {currentUser?.team_id?.slice(0, 8)}...
                  </code>

                  <span className="text-muted-foreground">auth_user_id:</span>
                  <code className="font-mono text-[10px] truncate" title={authUser?.id}>
                    {authUser?.id?.slice(0, 8)}...
                  </code>

                  <span className="text-muted-foreground">email:</span>
                  <span className="truncate" title={authUser?.email}>
                    {authUser?.email}
                  </span>
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
                  <Shield className="h-3 w-3" />
                  Permissions
                </div>
                <div className="pl-5 flex gap-2">
                  <Badge
                    variant={adminData?.isAdmin ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {adminData?.isAdmin ? "Admin" : "Member"}
                  </Badge>
                  {adminData?.role && (
                    <Badge variant="outline" className="text-[10px]">
                      {adminData.role}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Counts */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
                  <Database className="h-3 w-3" />
                  Data Counts
                </div>
                <div className="grid grid-cols-3 gap-2 pl-5">
                  <div className="text-center p-2 bg-white/50 dark:bg-black/20 rounded">
                    <div className="font-bold text-lg">{counts?.interventions ?? "—"}</div>
                    <div className="text-muted-foreground">Interventions</div>
                  </div>
                  <div className="text-center p-2 bg-white/50 dark:bg-black/20 rounded">
                    <div className="font-bold text-lg">{counts?.links ?? "—"}</div>
                    <div className="text-muted-foreground">Links</div>
                  </div>
                  <div className="text-center p-2 bg-white/50 dark:bg-black/20 rounded">
                    <div className="font-bold text-lg">{counts?.outcomes ?? "—"}</div>
                    <div className="text-muted-foreground">Outcomes</div>
                  </div>
                </div>
              </div>

              {/* Intervention-specific */}
              {interventionId && (
                <div className="space-y-2">
                  <div className="font-medium text-amber-700 dark:text-amber-300">
                    Current Intervention
                  </div>
                  <div className="pl-5">
                    <code className="font-mono text-[10px]">{interventionId}</code>
                  </div>
                </div>
              )}

              {/* Progress Status Diagnostics */}
              {progressDiagnostics && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
                    <Activity className="h-3 w-3" />
                    Progress Status
                  </div>
                  <div className="grid grid-cols-2 gap-1 pl-5 text-[10px]">
                    <span className="text-muted-foreground">created_at:</span>
                    <span className="font-mono">
                      {format(new Date(progressDiagnostics.created_at), "yyyy-MM-dd")}
                    </span>
                    
                    <span className="text-muted-foreground">horizon_days:</span>
                    <span className="font-mono">{progressDiagnostics.expected_time_horizon_days}</span>
                    
                    <span className="text-muted-foreground">horizon_end_date:</span>
                    <span className="font-mono">
                      {format(progressDiagnostics.horizon_end_date, "yyyy-MM-dd")}
                    </span>
                    
                    <span className="text-muted-foreground">days_elapsed:</span>
                    <span className="font-mono">{progressDiagnostics.days_elapsed}</span>
                    
                    <span className="text-muted-foreground">days_remaining:</span>
                    <span className={`font-mono ${progressDiagnostics.days_remaining < 0 ? "text-red-500" : ""}`}>
                      {progressDiagnostics.days_remaining}
                    </span>
                    
                    <span className="text-muted-foreground">db_status:</span>
                    <span className="font-mono">{progressDiagnostics.db_status}</span>
                    
                    <span className="text-muted-foreground">computed_status:</span>
                    <Badge
                      className={`${getProgressStatusStyle(progressDiagnostics.status).className} text-[8px] px-1 py-0 h-4`}
                    >
                      {progressDiagnostics.status}
                    </Badge>
                    
                    <span className="text-muted-foreground">has_outcomes:</span>
                    <span className="font-mono">{progressDiagnostics.has_any_outcomes ? "true" : "false"}</span>
                    
                    <span className="text-muted-foreground">has_positive_delta:</span>
                    <span className="font-mono">{progressDiagnostics.has_any_positive_delta ? "true" : "false"}</span>
                    
                    <span className="text-muted-foreground col-span-2 pt-1">reason:</span>
                    <span className="col-span-2 text-[9px] italic text-muted-foreground">
                      {progressDiagnostics.reason}
                    </span>
                  </div>
                </div>
              )}

              {/* Linked Metric Results */}
              {linkedMetricIds.length > 0 && metricResults && (
                <div className="space-y-2">
                  <div className="font-medium text-amber-700 dark:text-amber-300">
                    Linked Metrics ({linkedMetricIds.length})
                  </div>
                  <div className="space-y-3 pl-2">
                    {Object.entries(metricResults).map(([metricId, results]) => (
                      <div key={metricId} className="space-y-1">
                        <div className="font-medium text-[11px]">
                          {results[0]?.metric_name || "Unknown"}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {metricId.slice(0, 8)}...
                        </div>
                        {results.length === 0 ? (
                          <div className="text-muted-foreground italic">No results</div>
                        ) : (
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr className="border-b border-amber-200 dark:border-amber-800">
                                <th className="text-left py-1">Period</th>
                                <th className="text-right py-1">Value</th>
                                <th className="text-right py-1">Source</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.map((r, i) => (
                                <tr
                                  key={i}
                                  className="border-b border-amber-100 dark:border-amber-900/50"
                                >
                                  <td className="py-1">
                                    {format(new Date(r.period_start), "MMM yyyy")}
                                  </td>
                                  <td className="text-right font-mono">{r.value}</td>
                                  <td className="text-right text-muted-foreground">
                                    {r.source || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outcomes Diagnostics */}
              {interventionId && showOutcomesDiagnostics && outcomesDiagnostics && (
                <div className="space-y-2">
                  <div className="font-medium text-amber-700 dark:text-amber-300">
                    Evaluated Outcomes ({outcomesDiagnostics.count})
                  </div>
                  {outcomesDiagnostics.items.length === 0 ? (
                    <div className="pl-5 text-muted-foreground italic text-[10px]">
                      No outcomes evaluated yet
                    </div>
                  ) : (
                    <div className="space-y-2 pl-2">
                      {outcomesDiagnostics.items.map((item) => (
                        <div
                          key={item.metric_id}
                          className="p-2 bg-white/50 dark:bg-black/20 rounded text-[10px] space-y-1"
                        >
                          <div className="font-medium">{item.metric_name}</div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                            <span className="text-muted-foreground">metric_id:</span>
                            <code className="font-mono truncate">{item.metric_id.slice(0, 8)}...</code>
                            
                            <span className="text-muted-foreground">baseline:</span>
                            <span className="font-mono">
                              {item.baseline_value !== null ? item.baseline_value : "null"}
                            </span>
                            
                            <span className="text-muted-foreground">current:</span>
                            <span className="font-mono">
                              {item.current_value !== null ? item.current_value : "null"}
                            </span>
                            
                            <span className="text-muted-foreground">current_period:</span>
                            <span className="font-mono">
                              {item.current_period ? format(new Date(item.current_period), "MMM yyyy") : "—"}
                            </span>
                            
                            <span className="text-muted-foreground">delta_value:</span>
                            <span className="font-mono">
                              {item.delta_value !== null ? item.delta_value : "null"}
                            </span>
                            
                            <span className="text-muted-foreground">delta_percent:</span>
                            <span className="font-mono">
                              {item.delta_percent !== null ? `${item.delta_percent.toFixed(2)}%` : "null"}
                            </span>
                            
                            <span className="text-muted-foreground">status:</span>
                            <Badge
                              variant={item.status === "computed" ? "default" : "secondary"}
                              className="text-[8px] px-1 py-0 h-4"
                            >
                              {item.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <div className="text-[10px] text-muted-foreground text-center pt-2 border-t border-amber-200 dark:border-amber-800">
                Rendered: {new Date().toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
