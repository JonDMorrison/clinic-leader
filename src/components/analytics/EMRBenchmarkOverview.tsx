/**
 * EMR Benchmark Overview Dashboard
 * Main page for comparing Jane vs Non-Jane performance
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, RefreshCw, TrendingUp, TrendingDown, Activity, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MetricComparisonChart } from "./MetricComparisonChart";
import { InterventionComparisonPanel } from "./InterventionComparisonPanel";
import { EMRImpactSummaryCard } from "./EMRImpactSummaryCard";
import { generateJaneImpactReport, exportReportAsJSON } from "@/lib/reports/generateJaneImpactReport";
import { useToast } from "@/hooks/use-toast";

interface EMRBenchmarkOverviewProps {
  periodKey?: string;
}

export function EMRBenchmarkOverview({ periodKey }: EMRBenchmarkOverviewProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const currentPeriod = periodKey || new Date().toISOString().substring(0, 7);

  // Fetch benchmark aggregates
  const { data: benchmarks, isLoading: benchmarksLoading, refetch } = useQuery({
    queryKey: ["benchmark-aggregates", currentPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benchmark_metric_aggregates")
        .select("*")
        .eq("period_key", currentPeriod)
        .order("metric_key");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch intervention EMR analysis
  const { data: interventionAnalysis, isLoading: interventionLoading } = useQuery({
    queryKey: ["intervention-emr-analysis", currentPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intervention_emr_analysis")
        .select("*")
        .eq("period_key", currentPeriod);

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate summary stats
  const summaryStats = {
    janeMetrics: benchmarks?.filter(b => b.emr_source_group === "jane").length || 0,
    nonJaneMetrics: benchmarks?.filter(b => b.emr_source_group === "non_jane").length || 0,
    janeAdvantageCount: 0,
    avgAdvantage: 0,
  };

  if (benchmarks && benchmarks.length > 0) {
    const janeMetrics = benchmarks.filter(b => b.emr_source_group === "jane");
    const nonJaneMetrics = benchmarks.filter(b => b.emr_source_group === "non_jane");

    let advantages = 0;
    let totalDelta = 0;
    let comparableCount = 0;

    for (const jane of janeMetrics) {
      const nonJane = nonJaneMetrics.find(n => n.metric_key === jane.metric_key);
      if (nonJane && nonJane.median_value !== 0) {
        const delta = ((jane.median_value - nonJane.median_value) / nonJane.median_value) * 100;
        totalDelta += delta;
        comparableCount++;
        if (delta > 0) advantages++;
      }
    }

    summaryStats.janeAdvantageCount = advantages;
    summaryStats.avgAdvantage = comparableCount > 0 ? totalDelta / comparableCount : 0;
  }

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      const metricKeys = [...new Set(benchmarks?.map(b => b.metric_key) || [])];
      const report = await generateJaneImpactReport(currentPeriod, metricKeys);
      
      if (!report) {
        toast({
          title: "Export Failed",
          description: "Insufficient data for report generation",
          variant: "destructive",
        });
        return;
      }

      const json = exportReportAsJSON(report);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jane-impact-report-${currentPeriod}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Report Exported",
        description: "Jane Impact Report downloaded successfully",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Could not generate report",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (benchmarksLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const insufficientData = (benchmarks?.length || 0) < 2;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">EMR Outcome Comparison</h1>
          <p className="text-muted-foreground">
            Anonymized benchmarks comparing Jane-integrated vs other EMR sources
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            size="sm" 
            onClick={handleExportReport}
            disabled={insufficientData || isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Privacy Notice */}
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          All data is aggregated and anonymized. Minimum 5 organizations per group required.
          Individual clinic data is never exposed.
        </AlertDescription>
      </Alert>

      {insufficientData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Insufficient Data</h3>
            <p className="text-muted-foreground mt-2">
              EMR benchmarks require at least 5 organizations per group.
              Current data does not meet privacy thresholds.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <EMRImpactSummaryCard
              title="Overall Performance"
              value={`${summaryStats.avgAdvantage > 0 ? "+" : ""}${summaryStats.avgAdvantage.toFixed(1)}%`}
              description="Jane vs non-Jane median"
              trend={summaryStats.avgAdvantage > 0 ? "up" : summaryStats.avgAdvantage < 0 ? "down" : "neutral"}
              icon={summaryStats.avgAdvantage > 0 ? TrendingUp : TrendingDown}
            />
            <EMRImpactSummaryCard
              title="Metrics Analyzed"
              value={summaryStats.janeMetrics.toString()}
              description="With sufficient sample size"
              trend="neutral"
              icon={Activity}
            />
            <EMRImpactSummaryCard
              title="Jane Advantages"
              value={`${summaryStats.janeAdvantageCount}/${summaryStats.janeMetrics}`}
              description="Metrics with better performance"
              trend={summaryStats.janeAdvantageCount > summaryStats.janeMetrics / 2 ? "up" : "neutral"}
              icon={TrendingUp}
            />
            <EMRImpactSummaryCard
              title="Period"
              value={currentPeriod}
              description="Current analysis window"
              trend="neutral"
              icon={Activity}
            />
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="performance" className="space-y-4">
            <TabsList>
              <TabsTrigger value="performance">Performance Comparison</TabsTrigger>
              <TabsTrigger value="quality">Data Quality</TabsTrigger>
              <TabsTrigger value="interventions">Intervention Outcomes</TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Metric Performance by EMR Source</CardTitle>
                  <CardDescription>
                    Comparing median values with percentile bands (anonymized, min 5 orgs/group)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MetricComparisonChart benchmarks={benchmarks || []} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quality" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Data Quality Comparison</CardTitle>
                  <CardDescription>
                    Completeness, latency, and consistency scores by EMR source
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Quality comparison data will be available after next scheduled aggregation.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interventions" className="space-y-4">
              <InterventionComparisonPanel 
                analysis={interventionAnalysis || []} 
                isLoading={interventionLoading}
              />
            </TabsContent>
          </Tabs>

          {/* Methodology Footer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Methodology & Limitations</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Normalization:</strong> Metrics are size-adjusted using provider count, 
                visit volume, and patient panel size.
              </p>
              <p>
                <strong>Privacy:</strong> Minimum 5 organizations per comparison group. 
                No individual organization data is exposed.
              </p>
              <p>
                <strong>Limitations:</strong> Correlation does not imply causation. 
                Regional, specialty, and selection biases may exist.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
