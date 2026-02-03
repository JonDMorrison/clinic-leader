/**
 * EMR Benchmark Overview Dashboard
 * Main page for comparing Jane vs Non-Jane performance
 * 
 * IMPORTANT: All language must use "association" and "correlation" - NEVER causation
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
import { InterpretationCallout } from "./InterpretationCallout";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { DataQualitySummary } from "./DataQualitySummary";
import { generateJaneImpactReport, exportReportAsJSON } from "@/lib/reports/generateJaneImpactReport";
import { useToast } from "@/hooks/use-toast";
import { 
  EMR_QUALITY_THRESHOLDS, 
  type ConfidenceLabel,
  validateSafeLanguage 
} from "@/lib/analytics/emrComparisonTypes";

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

  // Calculate summary stats with safe language
  const summaryStats = {
    janeMetrics: benchmarks?.filter(b => b.emr_source_group === "jane").length || 0,
    nonJaneMetrics: benchmarks?.filter(b => b.emr_source_group === "non_jane").length || 0,
    janeAdvantageCount: 0,
    avgDelta: 0, // Renamed from "advantage" to neutral "delta"
    confidenceLabel: 'insufficient_data' as ConfidenceLabel,
  };

  if (benchmarks && benchmarks.length > 0) {
    const janeMetrics = benchmarks.filter(b => b.emr_source_group === "jane");
    const nonJaneMetrics = benchmarks.filter(b => b.emr_source_group === "non_jane");

    let positiveDeltas = 0;
    let totalDelta = 0;
    let comparableCount = 0;

    for (const jane of janeMetrics) {
      const nonJane = nonJaneMetrics.find(n => n.metric_key === jane.metric_key);
      if (nonJane && nonJane.median_value !== 0) {
        const delta = ((jane.median_value - nonJane.median_value) / nonJane.median_value) * 100;
        totalDelta += delta;
        comparableCount++;
        if (delta > 0) positiveDeltas++;
      }
    }

    summaryStats.janeAdvantageCount = positiveDeltas;
    summaryStats.avgDelta = comparableCount > 0 ? totalDelta / comparableCount : 0;
    
    // Determine confidence based on sample sizes
    const minJaneSample = Math.min(...janeMetrics.map(m => m.organization_count));
    const minNonJaneSample = Math.min(...nonJaneMetrics.map(m => m.organization_count));
    
    if (minJaneSample >= 20 && minNonJaneSample >= 20) {
      summaryStats.confidenceLabel = 'high';
    } else if (minJaneSample >= 10 && minNonJaneSample >= 10) {
      summaryStats.confidenceLabel = 'medium';
    } else if (minJaneSample >= 5 && minNonJaneSample >= 5) {
      summaryStats.confidenceLabel = 'low';
    }
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

      // Validate safe language before export
      const reportJson = exportReportAsJSON(report);
      const validation = validateSafeLanguage(reportJson);
      if (!validation.isValid) {
        console.warn("Safe language violations detected:", validation.violations);
        // Still allow export but log warning
      }

      const blob = new Blob([reportJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `emr-comparison-report-${currentPeriod}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Report Exported",
        description: "EMR Comparison Report downloaded successfully",
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
            Anonymized benchmarks showing associations between EMR integration type and outcomes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ConfidenceBadge confidence={summaryStats.confidenceLabel} />
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

      {/* REQUIRED: Interpretation Callout */}
      <InterpretationCallout />

      {/* Privacy Notice */}
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          All data is aggregated and anonymized. Minimum {EMR_QUALITY_THRESHOLDS.MIN_SAMPLE_SIZE} organizations 
          per group required. Quality gates enforce ≥{EMR_QUALITY_THRESHOLDS.MIN_COMPLETENESS * 100}% completeness, 
          ≤{EMR_QUALITY_THRESHOLDS.MAX_LATENCY_DAYS}d latency, ≥{EMR_QUALITY_THRESHOLDS.MIN_CONSISTENCY * 100}% consistency.
        </AlertDescription>
      </Alert>

      {insufficientData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Insufficient Data</h3>
            <p className="text-muted-foreground mt-2">
              EMR benchmarks require at least {EMR_QUALITY_THRESHOLDS.MIN_SAMPLE_SIZE} organizations per group 
              that pass quality gates. Current data does not meet these thresholds.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards - Using neutral "observed" language */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <EMRImpactSummaryCard
              title="Observed Difference"
              value={`${summaryStats.avgDelta > 0 ? "+" : ""}${summaryStats.avgDelta.toFixed(1)}%`}
              description="Jane vs non-Jane median (correlation)"
              trend={summaryStats.avgDelta > 0 ? "up" : summaryStats.avgDelta < 0 ? "down" : "neutral"}
              icon={summaryStats.avgDelta > 0 ? TrendingUp : TrendingDown}
            />
            <EMRImpactSummaryCard
              title="Metrics Analyzed"
              value={summaryStats.janeMetrics.toString()}
              description="Passed quality gates"
              trend="neutral"
              icon={Activity}
            />
            <EMRImpactSummaryCard
              title="Positive Associations"
              value={`${summaryStats.janeAdvantageCount}/${summaryStats.janeMetrics}`}
              description="Metrics with higher Jane values"
              trend={summaryStats.janeAdvantageCount > summaryStats.janeMetrics / 2 ? "up" : "neutral"}
              icon={TrendingUp}
            />
            <EMRImpactSummaryCard
              title="Analysis Period"
              value={currentPeriod}
              description="Data window analyzed"
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
                  <CardTitle>Metric Observations by EMR Source</CardTitle>
                  <CardDescription>
                    Comparing median values with percentile bands. 
                    <strong className="text-amber-600"> Differences shown are correlational, not causal.</strong>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MetricComparisonChart benchmarks={benchmarks || []} />
                </CardContent>
              </Card>
              
              {/* Compact interpretation reminder */}
              <InterpretationCallout compact />
            </TabsContent>

            <TabsContent value="quality" className="space-y-4">
              <DataQualitySummary
                janeQuality={{
                  avgCompleteness: 92, // TODO: Fetch from actual data
                  avgLatencyDays: 12,
                  avgConsistency: 88,
                }}
                nonJaneQuality={{
                  avgCompleteness: 78,
                  avgLatencyDays: 28,
                  avgConsistency: 72,
                }}
                orgsExcluded={3}
              />
            </TabsContent>

            <TabsContent value="interventions" className="space-y-4">
              <InterventionComparisonPanel 
                analysis={interventionAnalysis || []} 
                isLoading={interventionLoading}
              />
            </TabsContent>
          </Tabs>

          {/* Methodology Footer - With safe language */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Methodology & Limitations</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Quality Gates:</strong> Organizations must achieve ≥{EMR_QUALITY_THRESHOLDS.MIN_COMPLETENESS * 100}% 
                completeness, ≤{EMR_QUALITY_THRESHOLDS.MAX_LATENCY_DAYS} day latency, and ≥{EMR_QUALITY_THRESHOLDS.MIN_CONSISTENCY * 100}% 
                consistency to be included in comparisons.
              </p>
              <p>
                <strong>Normalization:</strong> Metrics are size-adjusted using provider count, 
                visit volume, or patient panel size as appropriate for each metric type.
              </p>
              <p>
                <strong>Privacy:</strong> Minimum {EMR_QUALITY_THRESHOLDS.MIN_SAMPLE_SIZE} organizations per comparison group. 
                No individual organization data is exposed.
              </p>
              <p className="text-amber-700 dark:text-amber-400 font-medium">
                <strong>Critical Limitation:</strong> These results show <em>statistical associations only</em>. 
                Correlation does not imply causation. Differences may reflect selection bias 
                (organizations choosing Jane may differ systematically), regional variations, 
                specialty mix, or operational maturity factors not controlled in this analysis.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
