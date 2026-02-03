/**
 * InterventionTimeline - Visualizes the cause-and-effect timeline for an intervention
 * Shows baseline, intervention start, metric updates, outcomes, and completion
 */

import { useMemo } from "react";
import { format, parseISO, isAfter, isBefore, startOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Flag, 
  Play, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  CheckCircle2, 
  Circle,
  Clock,
  BarChart3,
} from "lucide-react";

interface LinkedMetric {
  metric_id: string;
  metric?: { id: string; name: string } | null;
  baseline_period_start: string | null;
  baseline_value: number | null;
}

interface MetricResult {
  metric_id: string;
  period_start: string;
  value: number;
  period_type: string;
}

interface Outcome {
  metric_id: string;
  metric?: { name: string } | null;
  evaluated_at: string;
  actual_delta_value: number | null;
  actual_delta_percent: number | null;
}

interface InterventionData {
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  title: string;
}

interface InterventionTimelineProps {
  intervention: InterventionData;
  linkedMetrics: LinkedMetric[];
  metricResults: MetricResult[];
  outcomes: Outcome[];
}

type TimelineEventType = 
  | "baseline" 
  | "started" 
  | "metric_update" 
  | "outcome_evaluated" 
  | "completed";

interface TimelineEvent {
  id: string;
  date: Date;
  type: TimelineEventType;
  label: string;
  sublabel?: string;
  value?: number;
  delta?: number;
  deltaPercent?: number;
  metricName?: string;
}

function getEventIcon(type: TimelineEventType, delta?: number) {
  switch (type) {
    case "baseline":
      return <Flag className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    case "started":
      return <Play className="h-4 w-4 text-green-600 dark:text-green-400" />;
    case "metric_update":
      if (delta !== undefined) {
        return delta >= 0 
          ? <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          : <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      }
      return <BarChart3 className="h-4 w-4 text-muted-foreground" />;
    case "outcome_evaluated":
      return <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

function getEventColor(type: TimelineEventType): string {
  switch (type) {
    case "baseline":
      return "border-blue-500 bg-blue-50 dark:bg-blue-950/30";
    case "started":
      return "border-green-500 bg-green-50 dark:bg-green-950/30";
    case "metric_update":
      return "border-muted bg-muted/30";
    case "outcome_evaluated":
      return "border-purple-500 bg-purple-50 dark:bg-purple-950/30";
    case "completed":
      return "border-gray-500 bg-gray-50 dark:bg-gray-950/30";
    default:
      return "border-muted bg-muted/30";
  }
}

export function InterventionTimeline({
  intervention,
  linkedMetrics,
  metricResults,
  outcomes,
}: InterventionTimelineProps) {
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];

    // Build a map of metric names
    const metricNamesMap = new Map<string, string>();
    linkedMetrics.forEach((lm) => {
      if (lm.metric?.name) {
        metricNamesMap.set(lm.metric_id, lm.metric.name);
      }
    });

    // Build a map of baseline values by metric
    const baselineValuesMap = new Map<string, number>();
    linkedMetrics.forEach((lm) => {
      if (lm.baseline_value !== null) {
        baselineValuesMap.set(lm.metric_id, lm.baseline_value);
      }
    });

    // Find earliest baseline date across all linked metrics
    let earliestBaseline: Date | null = null;
    linkedMetrics.forEach((lm) => {
      if (lm.baseline_period_start && lm.baseline_value !== null) {
        const baselineDate = parseISO(lm.baseline_period_start);
        if (!earliestBaseline || isBefore(baselineDate, earliestBaseline)) {
          earliestBaseline = baselineDate;
        }
        
        events.push({
          id: `baseline-${lm.metric_id}`,
          date: baselineDate,
          type: "baseline",
          label: `Baseline captured`,
          sublabel: metricNamesMap.get(lm.metric_id) || "Metric",
          value: lm.baseline_value,
          metricName: metricNamesMap.get(lm.metric_id),
        });
      }
    });

    // Intervention started event
    const startDate = intervention.start_date 
      ? parseISO(intervention.start_date) 
      : parseISO(intervention.created_at);
    
    events.push({
      id: "started",
      date: startDate,
      type: "started",
      label: "Intervention started",
    });

    // Metric updates - only show those AFTER baseline
    if (earliestBaseline) {
      // Group results by month to avoid duplicates
      const monthlyUpdates = new Map<string, { date: Date; metrics: { id: string; name: string; value: number; baseline: number | null }[] }>();
      
      metricResults.forEach((result) => {
        // Only include monthly results
        if (result.period_type !== "monthly") return;
        
        const resultDate = parseISO(result.period_start);
        const resultMonth = startOfMonth(resultDate);
        
        // Only show updates AFTER the baseline period
        if (!isAfter(resultMonth, earliestBaseline as Date)) return;
        
        const monthKey = format(resultMonth, "yyyy-MM");
        const existing = monthlyUpdates.get(monthKey);
        const metricName = metricNamesMap.get(result.metric_id) || "Unknown metric";
        const baseline = baselineValuesMap.get(result.metric_id) ?? null;
        
        if (existing) {
          existing.metrics.push({ id: result.metric_id, name: metricName, value: result.value, baseline });
        } else {
          monthlyUpdates.set(monthKey, {
            date: resultMonth,
            metrics: [{ id: result.metric_id, name: metricName, value: result.value, baseline }],
          });
        }
      });

      // Convert grouped updates to events
      monthlyUpdates.forEach((update, monthKey) => {
        update.metrics.forEach((metric) => {
          const delta = metric.baseline !== null ? metric.value - metric.baseline : undefined;
          const deltaPercent = metric.baseline !== null && metric.baseline !== 0 
            ? ((delta ?? 0) / metric.baseline) * 100 
            : undefined;

          events.push({
            id: `update-${monthKey}-${metric.id}`,
            date: update.date,
            type: "metric_update",
            label: `Metric update`,
            sublabel: metric.name,
            value: metric.value,
            delta,
            deltaPercent,
            metricName: metric.name,
          });
        });
      });
    }

    // Outcome evaluated events
    outcomes.forEach((outcome) => {
      const metricName = outcome.metric?.name || metricNamesMap.get(outcome.metric_id) || "Unknown metric";
      
      events.push({
        id: `outcome-${outcome.metric_id}`,
        date: parseISO(outcome.evaluated_at),
        type: "outcome_evaluated",
        label: "Outcome evaluated",
        sublabel: metricName,
        delta: outcome.actual_delta_value ?? undefined,
        deltaPercent: outcome.actual_delta_percent ?? undefined,
        metricName,
      });
    });

    // Intervention completed
    if (intervention.status === "completed" && intervention.end_date) {
      events.push({
        id: "completed",
        date: parseISO(intervention.end_date),
        type: "completed",
        label: "Intervention completed",
      });
    }

    // Sort by date
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    return events;
  }, [intervention, linkedMetrics, metricResults, outcomes]);

  if (linkedMetrics.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>No metrics linked to this intervention.</p>
            <p className="text-sm mt-1">Link metrics to see the decision-outcome timeline.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (timelineEvents.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>No timeline data available yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Decision → Outcome Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-4">
            {timelineEvents.map((event, index) => (
              <div key={event.id} className="relative flex items-start gap-4 pl-2">
                {/* Icon circle */}
                <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${getEventColor(event.type)}`}>
                  {getEventIcon(event.type, event.delta)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium text-sm">{event.label}</span>
                    {event.sublabel && (
                      <span className="text-sm text-muted-foreground">
                        — {event.sublabel}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {format(event.date, "MMM d, yyyy")}
                    </span>
                    
                    {event.value !== undefined && (
                      <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">
                        {event.value.toLocaleString()}
                      </span>
                    )}
                    
                    {event.type === "metric_update" && event.delta !== undefined && (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        event.delta >= 0 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" 
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                      }`}>
                        {event.delta >= 0 ? "+" : ""}{event.delta.toLocaleString()}
                        {event.deltaPercent !== undefined && (
                          <> ({event.deltaPercent >= 0 ? "+" : ""}{event.deltaPercent.toFixed(1)}%)</>
                        )}
                      </span>
                    )}
                    
                    {event.type === "outcome_evaluated" && event.deltaPercent !== undefined && (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        event.deltaPercent >= 0 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" 
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      }`}>
                        {event.deltaPercent >= 0 ? "+" : ""}{event.deltaPercent.toFixed(1)}% improvement
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
