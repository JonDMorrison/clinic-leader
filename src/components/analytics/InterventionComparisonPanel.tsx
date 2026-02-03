/**
 * Intervention Comparison Panel
 * Shows intervention outcomes by EMR source group
 */

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Clock, Target, ArrowRight } from "lucide-react";

interface InterventionEMRAnalysis {
  id: string;
  period_key: string;
  emr_source_group: string;
  intervention_type: string;
  total_interventions: number;
  successful_interventions: number;
  success_rate: number | null;
  avg_resolution_days: number | null;
  avg_improvement_percent: number | null;
  sample_size: number;
}

interface InterventionComparisonPanelProps {
  analysis: InterventionEMRAnalysis[];
  isLoading: boolean;
}

export function InterventionComparisonPanel({ analysis, isLoading }: InterventionComparisonPanelProps) {
  const comparisonData = useMemo(() => {
    // Group by intervention type
    const grouped = new Map<string, { jane?: InterventionEMRAnalysis; nonJane?: InterventionEMRAnalysis }>();
    
    for (const item of analysis) {
      if (!grouped.has(item.intervention_type)) {
        grouped.set(item.intervention_type, {});
      }
      const entry = grouped.get(item.intervention_type)!;
      if (item.emr_source_group === "jane") {
        entry.jane = item;
      } else {
        entry.nonJane = item;
      }
    }

    return Array.from(grouped.entries())
      .filter(([_, v]) => v.jane || v.nonJane)
      .map(([type, { jane, nonJane }]) => ({
        type: formatInterventionType(type),
        jane,
        nonJane,
        successRateDelta: (jane?.success_rate ?? 0) - (nonJane?.success_rate ?? 0),
        resolutionDelta: (nonJane?.avg_resolution_days ?? 0) - (jane?.avg_resolution_days ?? 0),
      }));
  }, [analysis]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (comparisonData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Intervention Outcome Comparison</CardTitle>
          <CardDescription>Comparing intervention effectiveness by EMR source</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Insufficient intervention data for comparison.</p>
            <p className="text-sm mt-2">Minimum 5 interventions per group required.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary stats
  const avgSuccessRateDelta = comparisonData.reduce((a, b) => a + b.successRateDelta, 0) / comparisonData.length;
  const avgResolutionDelta = comparisonData.reduce((a, b) => a + b.resolutionDelta, 0) / comparisonData.length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${avgSuccessRateDelta > 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'}`}>
                <Target className={`h-6 w-6 ${avgSuccessRateDelta > 0 ? 'text-green-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate Advantage</p>
                <p className="text-2xl font-bold">
                  {avgSuccessRateDelta > 0 ? "+" : ""}{(avgSuccessRateDelta * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Jane vs Non-Jane</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${avgResolutionDelta > 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'}`}>
                <Clock className={`h-6 w-6 ${avgResolutionDelta > 0 ? 'text-green-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolution Speed</p>
                <p className="text-2xl font-bold">
                  {avgResolutionDelta > 0 ? "" : "+"}{Math.abs(avgResolutionDelta).toFixed(1)} days
                </p>
                <p className="text-xs text-muted-foreground">
                  {avgResolutionDelta > 0 ? "Faster for Jane" : "Slower for Jane"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>By Intervention Type</CardTitle>
          <CardDescription>
            Success rates and resolution times grouped by intervention category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {comparisonData.map((row) => (
              <div key={row.type} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">{row.type}</h4>
                  <Badge variant={row.successRateDelta > 0 ? "default" : "secondary"}>
                    {row.successRateDelta > 0 ? "+" : ""}{(row.successRateDelta * 100).toFixed(1)}% success
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Jane Stats */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="font-medium">Jane Integrated</span>
                    </div>
                    {row.jane ? (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Success Rate</span>
                          <span>{((row.jane.success_rate || 0) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={(row.jane.success_rate || 0) * 100} className="h-2" />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Avg Resolution</span>
                          <span>{row.jane.avg_resolution_days?.toFixed(1) ?? "N/A"} days</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          n={row.jane.sample_size} interventions
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Insufficient data</p>
                    )}
                  </div>

                  {/* Non-Jane Stats */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                      <span className="font-medium">Non-Jane</span>
                    </div>
                    {row.nonJane ? (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Success Rate</span>
                          <span>{((row.nonJane.success_rate || 0) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress 
                          value={(row.nonJane.success_rate || 0) * 100} 
                          className="h-2 bg-muted [&>div]:bg-muted-foreground" 
                        />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Avg Resolution</span>
                          <span>{row.nonJane.avg_resolution_days?.toFixed(1) ?? "N/A"} days</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          n={row.nonJane.sample_size} interventions
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Insufficient data</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center">
        Intervention outcomes are aggregated across organizations. Correlation does not imply causation.
        Sample sizes may vary by intervention type.
      </p>
    </div>
  );
}

function formatInterventionType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
