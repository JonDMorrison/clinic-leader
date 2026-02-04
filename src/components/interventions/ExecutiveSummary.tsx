import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Target, 
  User, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Clock,
  DollarSign,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";

interface ExecutiveSummaryProps {
  intervention: {
    title: string;
    intervention_type: string;
    status: string;
    owner?: { full_name: string } | null;
    start_date?: string | null;
    end_date?: string | null;
    actual_hours?: number | null;
    actual_cost?: number | null;
    ai_summary?: string | null;
  };
  outcomes: Array<{
    metric_id: string;
    metric?: { name: string } | null;
    baseline_value?: number | null;
    current_value?: number | null;
    actual_delta_value?: number | null;
    actual_delta_percent?: number | null;
  }>;
  linkedMetrics: Array<{
    metric_id: string;
    baseline_value?: number | null;
    metric?: { name: string } | null;
  }>;
}

const TYPE_LABELS: Record<string, string> = {
  staffing: "Staffing",
  process: "Process",
  technology: "Technology",
  training: "Training",
  marketing: "Marketing",
  financial: "Financial",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  active: "Active",
  completed: "Completed",
  abandoned: "Abandoned",
};

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  active: "bg-primary text-primary-foreground",
  completed: "bg-success text-success-foreground",
  abandoned: "bg-destructive/20 text-destructive",
};

export function ExecutiveSummary({ intervention, outcomes, linkedMetrics }: ExecutiveSummaryProps) {
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number | null | undefined, decimals = 1) => {
    if (value == null) return "—";
    return value.toLocaleString(undefined, { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  // Get primary outcome (first with delta)
  const primaryOutcome = outcomes.find(o => o.actual_delta_value != null || o.actual_delta_percent != null);
  
  // Build metric summaries
  const metricSummaries = outcomes
    .filter(o => o.metric?.name)
    .map(outcome => {
      const linkedMetric = linkedMetrics.find(lm => lm.metric_id === outcome.metric_id);
      const baseline = linkedMetric?.baseline_value ?? outcome.baseline_value;
      const current = outcome.current_value;
      const delta = outcome.actual_delta_percent;

      return {
        name: outcome.metric?.name || "Unknown Metric",
        baseline,
        current,
        delta,
      };
    });

  const hasDelta = primaryOutcome?.actual_delta_percent != null;
  const deltaValue = primaryOutcome?.actual_delta_percent ?? 0;
  const isPositive = deltaValue > 0;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-muted/30 shadow-lg print:shadow-none print:border">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
              Executive Summary
            </p>
            <h2 className="text-xl font-bold leading-tight">{intervention.title}</h2>
          </div>
          <Badge className={STATUS_COLORS[intervention.status] || "bg-muted"}>
            {STATUS_LABELS[intervention.status] || intervention.status}
          </Badge>
        </div>

        {/* Quick Info Row */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            <span>{TYPE_LABELS[intervention.intervention_type] || intervention.intervention_type}</span>
          </div>
          {intervention.owner?.full_name && (
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>{intervention.owner.full_name}</span>
            </div>
          )}
          {(intervention.start_date || intervention.end_date) && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {intervention.start_date && format(new Date(intervention.start_date), "MMM d")}
                {intervention.start_date && intervention.end_date && " → "}
                {intervention.end_date && format(new Date(intervention.end_date), "MMM d, yyyy")}
              </span>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Metric Impact Section */}
        {metricSummaries.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              {hasDelta ? (
                isPositive ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-destructive" />
                )
              ) : (
                <Minus className="w-4 h-4 text-muted-foreground" />
              )}
              Metric Impact
            </h3>

            {metricSummaries.map((metric, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="font-medium text-sm">{metric.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Baseline: {formatNumber(metric.baseline)} → Current: {formatNumber(metric.current)}
                  </p>
                </div>
                {metric.delta != null && (
                  <div className={`text-right ${metric.delta > 0 ? "text-success" : metric.delta < 0 ? "text-destructive" : ""}`}>
                    <p className="text-lg font-bold">
                      {metric.delta > 0 ? "+" : ""}{formatNumber(metric.delta)}%
                    </p>
                    <p className="text-xs text-muted-foreground">change</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
            No outcome data recorded yet
          </div>
        )}

        {/* Investment Section */}
        {(intervention.actual_hours != null || intervention.actual_cost != null) && (
          <>
            <Separator className="my-4" />
            <div className="flex gap-6">
              {intervention.actual_hours != null && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time Invested</p>
                    <p className="font-semibold">{intervention.actual_hours.toLocaleString()} hours</p>
                  </div>
                </div>
              )}
              {intervention.actual_cost != null && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cost</p>
                    <p className="font-semibold">{formatCurrency(intervention.actual_cost)}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* AI Summary */}
        {intervention.ai_summary && (
          <>
            <Separator className="my-4" />
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Analysis
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {intervention.ai_summary}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
