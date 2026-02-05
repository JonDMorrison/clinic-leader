/**
 * TimelineTab - Full timeline visualization for intervention detail view
 * 
 * Features:
 * - Lazy loading of timeline data
 * - Per-metric visualization with charts
 * - Outcome narrative blocks
 * - Multi-intervention overlay toggle
 */

import { useState, Suspense, lazy } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  TrendingUp, 
  Layers, 
  ChevronDown, 
  ChevronUp,
  BarChart3,
} from "lucide-react";
import { InterventionTimelineChart } from "./InterventionTimelineChart";
import { OutcomeNarrativeBlock } from "./OutcomeNarrativeBlock";
import { InterventionTimeline } from "./InterventionTimeline";
import type { ExpectedDirection } from "@/lib/interventions/types";

interface LinkedMetricData {
  id: string;
  metric_id: string;
  metric: { id: string; name: string } | null;
  expected_direction: ExpectedDirection;
  expected_magnitude_percent: number | null;
  baseline_value: number | null;
  baseline_period_start: string | null;
  baseline_quality_flag: "good" | "iffy" | "bad" | null;
}

interface OutcomeData {
  id: string;
  metric_id: string;
  metric: { id: string; name: string } | null;
  evaluation_period_start: string;
  evaluation_period_end: string;
  actual_delta_value: number | null;
  actual_delta_percent: number | null;
  confidence_score: number;
  ai_summary: string | null;
  baseline_value: number | null;
  current_value: number | null;
  evaluated_at: string;
}

interface InterventionForTimeline {
  id: string;
  organization_id: string;
  title: string;
  status: string;
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  expected_time_horizon_days: number;
}

interface TimelineTabProps {
  intervention: InterventionForTimeline;
  linkedMetrics: LinkedMetricData[];
  outcomes: OutcomeData[];
}

export function TimelineTab({
  intervention,
  linkedMetrics,
  outcomes,
}: TimelineTabProps) {
  const [showHistorical, setShowHistorical] = useState(false);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(
    linkedMetrics[0]?.metric_id || null
  );

  // Lazy load metric results for the selected metric
  const { data: metricResults = [], isLoading: isLoadingResults } = useQuery({
    queryKey: ["timeline-metric-results", selectedMetricId, intervention.organization_id],
    queryFn: async () => {
      if (!selectedMetricId) return [];
      
      const { data, error } = await supabase
        .from("metric_results")
        .select("id, metric_id, period_start, value, period_type")
        .eq("metric_id", selectedMetricId)
        .eq("period_type", "monthly")
        .order("period_start", { ascending: true })
        .limit(24); // Last 2 years

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedMetricId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Lazy load historical interventions for the same metric
  const { data: historicalInterventions = [], isLoading: isLoadingHistorical } = useQuery({
    queryKey: ["historical-interventions", selectedMetricId, intervention.organization_id],
    queryFn: async () => {
      if (!selectedMetricId) return [];

      // Get all interventions that link to this metric (excluding current)
      const { data: links, error: linksError } = await supabase
        .from("intervention_metric_links")
        .select("intervention_id, baseline_value, baseline_period_start")
        .eq("metric_id", selectedMetricId);

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      const interventionIds = links
        .map((l) => l.intervention_id)
        .filter((id) => id !== intervention.id);

      if (interventionIds.length === 0) return [];

      const { data: interventions, error: intError } = await supabase
        .from("interventions")
        .select("id, title, status, start_date, end_date")
        .in("id", interventionIds)
        .eq("organization_id", intervention.organization_id)
        .order("start_date", { ascending: false })
        .limit(5);

      if (intError) throw intError;

      return (interventions || []).map((int) => {
        const link = links.find((l) => l.intervention_id === int.id);
        return {
          id: int.id,
          title: int.title,
          startDate: int.start_date || "",
          endDate: int.end_date,
          baselineDate: link?.baseline_period_start || null,
          baselineValue: link?.baseline_value || null,
          status: int.status,
          isCurrentIntervention: false,
        };
      });
    },
    enabled: showHistorical && !!selectedMetricId,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Get selected metric data
  const selectedMetric = linkedMetrics.find((m) => m.metric_id === selectedMetricId);
  const selectedOutcome = outcomes.find((o) => o.metric_id === selectedMetricId);

  // Build chart data
  const chartData = metricResults.map((r) => ({
    period: r.period_start,
    value: r.value,
    label: r.period_start,
  }));

  // Build current intervention marker
  const currentInterventionMarker = {
    id: intervention.id,
    title: intervention.title,
    startDate: intervention.start_date || intervention.created_at,
    endDate: intervention.end_date,
    baselineDate: selectedMetric?.baseline_period_start || null,
    baselineValue: selectedMetric?.baseline_value || null,
    status: intervention.status,
    isCurrentIntervention: true,
  };

  if (linkedMetrics.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Timeline Data</h3>
          <p className="text-muted-foreground">
            Link metrics to this intervention to see the cause-and-effect timeline.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Selector & Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Metric Performance Timeline
            </CardTitle>
            
            <div className="flex items-center gap-4">
              {/* Historical overlay toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  id="show-historical"
                  checked={showHistorical}
                  onCheckedChange={setShowHistorical}
                />
                <Label htmlFor="show-historical" className="text-sm">
                  <Layers className="h-4 w-4 inline mr-1" />
                  Show historical
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Metric Tabs */}
          {linkedMetrics.length > 1 && (
            <Tabs value={selectedMetricId || undefined} onValueChange={setSelectedMetricId}>
              <TabsList className="w-full justify-start overflow-x-auto">
                {linkedMetrics.map((lm) => (
                  <TabsTrigger key={lm.metric_id} value={lm.metric_id} className="text-xs">
                    {lm.metric?.name || "Unknown Metric"}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {/* Chart */}
          {isLoadingResults ? (
            <div className="h-64 flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <InterventionTimelineChart
              metricName={selectedMetric?.metric?.name || "Metric"}
              metricData={chartData}
              currentIntervention={currentInterventionMarker}
              historicalInterventions={showHistorical ? historicalInterventions : []}
              showHistorical={showHistorical}
              evaluationPeriodStart={selectedOutcome?.evaluation_period_start}
              evaluationPeriodEnd={selectedOutcome?.evaluation_period_end}
              currentValue={selectedOutcome?.current_value}
              actualDelta={selectedOutcome?.actual_delta_value}
            />
          )}

          {/* Historical interventions list */}
          {showHistorical && historicalInterventions.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Historical Interventions on this Metric</p>
              <div className="space-y-2">
                {historicalInterventions.map((hi) => (
                  <div 
                    key={hi.id}
                    className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                  >
                    <span className="font-medium truncate">{hi.title}</span>
                    <span className="text-muted-foreground text-xs capitalize">{hi.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outcome Narrative */}
      {selectedOutcome && selectedMetric && (
        <OutcomeNarrativeBlock
          metricName={selectedMetric.metric?.name || "Metric"}
          baselineValue={selectedOutcome.baseline_value}
          currentValue={selectedOutcome.current_value}
          actualDeltaValue={selectedOutcome.actual_delta_value}
          actualDeltaPercent={selectedOutcome.actual_delta_percent}
          confidenceScore={selectedOutcome.confidence_score}
          evaluationPeriodStart={selectedOutcome.evaluation_period_start}
          evaluationPeriodEnd={selectedOutcome.evaluation_period_end}
          aiSummary={selectedOutcome.ai_summary}
          expectedDirection={selectedMetric.expected_direction}
          baselineQualityFlag={selectedMetric.baseline_quality_flag}
        />
      )}

      {/* Event Timeline (existing component) */}
      <InterventionTimeline
        intervention={{
          created_at: intervention.created_at,
          start_date: intervention.start_date,
          end_date: intervention.end_date,
          status: intervention.status,
          title: intervention.title,
        }}
        linkedMetrics={linkedMetrics}
        metricResults={metricResults}
        outcomes={outcomes}
      />
    </div>
  );
}
