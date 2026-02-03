/**
 * LinkedInterventionsPanel - Shows interventions linked to a specific metric
 * Provides bidirectional navigation from Scorecard → Intervention
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { ArrowRight, Beaker, Calendar } from "lucide-react";
import { format } from "date-fns";
import { getProgressStatusStyle, getInterventionProgress } from "@/lib/interventions/interventionStatus";
import type { InterventionStatus } from "@/lib/interventions/types";

interface LinkedInterventionsPanelProps {
  metricId: string;
}

interface LinkedIntervention {
  id: string;
  title: string;
  status: InterventionStatus;
  intervention_type: string;
  created_at: string;
  expected_time_horizon_days: number;
  baseline_value: number | null;
  owner?: { full_name: string } | null;
}

export function LinkedInterventionsPanel({ metricId }: LinkedInterventionsPanelProps) {
  const { data: interventions = [], isLoading } = useQuery({
    queryKey: ["metric-linked-interventions", metricId],
    queryFn: async () => {
      // Get all intervention links for this metric
      const { data: links, error: linksError } = await supabase
        .from("intervention_metric_links")
        .select("intervention_id, baseline_value")
        .eq("metric_id", metricId);

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      const interventionIds = links.map((l) => l.intervention_id);
      const baselineMap = new Map(links.map((l) => [l.intervention_id, l.baseline_value]));

      // Fetch intervention details
      const { data: interventionsData, error: interventionsError } = await supabase
        .from("interventions")
        .select(`
          id, title, status, intervention_type, created_at, expected_time_horizon_days,
          owner_user_id
        `)
        .in("id", interventionIds)
        .order("created_at", { ascending: false });

      if (interventionsError) throw interventionsError;

      // Get owner names
      const ownerIds = (interventionsData || [])
        .map((i) => i.owner_user_id)
        .filter(Boolean) as string[];

      let ownersMap = new Map<string, { full_name: string }>();
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from("users")
          .select("id, full_name")
          .in("id", ownerIds);
        ownersMap = new Map((owners || []).map((o) => [o.id, { full_name: o.full_name || "Unknown" }]));
      }

      return (interventionsData || []).map((i) => ({
        ...i,
        baseline_value: baselineMap.get(i.id) ?? null,
        owner: i.owner_user_id ? ownersMap.get(i.owner_user_id) : null,
      })) as LinkedIntervention[];
    },
    enabled: !!metricId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Beaker className="h-4 w-4" />
            Linked Interventions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (interventions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Beaker className="h-4 w-4" />
            Linked Interventions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No interventions are currently targeting this metric.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Beaker className="h-4 w-4" />
          Linked Interventions ({interventions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {interventions.map((intervention) => {
            const progress = getInterventionProgress({
              intervention: {
                created_at: intervention.created_at,
                expected_time_horizon_days: intervention.expected_time_horizon_days,
                status: intervention.status,
              },
              outcomes: [],
            });
            const statusStyle = getProgressStatusStyle(progress.status);

            return (
              <Link
                key={intervention.id}
                to={`/interventions/${intervention.id}`}
                className="block"
              >
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">
                        {intervention.title}
                      </h4>
                      <Badge className={statusStyle.className} variant="outline">
                        {statusStyle.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="capitalize">{intervention.intervention_type.replace("_", " ")}</span>
                      {intervention.baseline_value !== null && (
                        <span>Baseline: {intervention.baseline_value.toLocaleString()}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(intervention.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
