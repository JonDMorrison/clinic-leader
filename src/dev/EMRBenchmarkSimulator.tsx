/**
 * EMR Benchmark Simulator
 * Dev tool for testing benchmark visualization with mock data
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { MetricComparisonChart } from "@/components/analytics/MetricComparisonChart";
import { InterventionComparisonPanel } from "@/components/analytics/InterventionComparisonPanel";
import { EMRImpactSummaryCard } from "@/components/analytics/EMRImpactSummaryCard";
import { TrendingUp, Activity, RefreshCw } from "lucide-react";

export default function EMRBenchmarkSimulator() {
  const [janeOrgCount, setJaneOrgCount] = useState(15);
  const [nonJaneOrgCount, setNonJaneOrgCount] = useState(20);
  const [janeAdvantagePercent, setJaneAdvantagePercent] = useState(12);
  const [volatilityRatio, setVolatilityRatio] = useState(0.7);
  
  // Generate mock benchmark data
  const generateMockBenchmarks = () => {
    const metrics = [
      "total_visits",
      "revenue_per_provider",
      "no_show_rate",
      "patient_retention",
      "avg_visit_duration",
      "cancellation_rate",
      "new_patients",
      "rebooking_rate",
    ];

    const benchmarks = [];
    
    for (const metric of metrics) {
      const baseValue = Math.random() * 1000 + 100;
      const janeValue = baseValue * (1 + (janeAdvantagePercent / 100) * (Math.random() * 0.5 + 0.75));
      const nonJaneValue = baseValue;
      
      // Jane benchmark
      benchmarks.push({
        id: `jane-${metric}`,
        metric_key: metric,
        period_key: "2026-01",
        emr_source_group: "jane",
        organization_count: janeOrgCount,
        median_value: janeValue,
        percentile_25: janeValue * 0.85,
        percentile_75: janeValue * 1.15,
        std_deviation: janeValue * 0.2 * volatilityRatio,
        sample_size: janeOrgCount,
      });
      
      // Non-Jane benchmark
      benchmarks.push({
        id: `nonjane-${metric}`,
        metric_key: metric,
        period_key: "2026-01",
        emr_source_group: "non_jane",
        organization_count: nonJaneOrgCount,
        median_value: nonJaneValue,
        percentile_25: nonJaneValue * 0.8,
        percentile_75: nonJaneValue * 1.2,
        std_deviation: nonJaneValue * 0.2,
        sample_size: nonJaneOrgCount,
      });
    }
    
    return benchmarks;
  };

  const generateMockInterventions = () => {
    const types = ["workflow_change", "staffing_adjustment", "training", "process_optimization"];
    const analysis = [];
    
    for (const type of types) {
      const baseSuccessRate = 0.4 + Math.random() * 0.3;
      const janeBoost = janeAdvantagePercent / 100;
      
      analysis.push({
        id: `jane-${type}`,
        period_key: "2026-01",
        emr_source_group: "jane",
        intervention_type: type,
        total_interventions: Math.floor(janeOrgCount * 2 + Math.random() * 10),
        successful_interventions: Math.floor(janeOrgCount * 2 * (baseSuccessRate + janeBoost)),
        success_rate: baseSuccessRate + janeBoost,
        avg_resolution_days: 25 - (janeAdvantagePercent * 0.3) + Math.random() * 5,
        avg_improvement_percent: 15 + janeAdvantagePercent * 0.5 + Math.random() * 10,
        sample_size: Math.floor(janeOrgCount * 2 + Math.random() * 10),
      });
      
      analysis.push({
        id: `nonjane-${type}`,
        period_key: "2026-01",
        emr_source_group: "non_jane",
        intervention_type: type,
        total_interventions: Math.floor(nonJaneOrgCount * 2 + Math.random() * 10),
        successful_interventions: Math.floor(nonJaneOrgCount * 2 * baseSuccessRate),
        success_rate: baseSuccessRate,
        avg_resolution_days: 25 + Math.random() * 10,
        avg_improvement_percent: 15 + Math.random() * 10,
        sample_size: Math.floor(nonJaneOrgCount * 2 + Math.random() * 10),
      });
    }
    
    return analysis;
  };

  const [benchmarks, setBenchmarks] = useState(generateMockBenchmarks());
  const [interventions, setInterventions] = useState(generateMockInterventions());

  const handleRegenerate = () => {
    setBenchmarks(generateMockBenchmarks());
    setInterventions(generateMockInterventions());
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">EMR Benchmark Simulator</h1>
          <p className="text-muted-foreground">
            Dev tool for testing benchmark visualizations with configurable mock data
          </p>
        </div>
        <Button onClick={handleRegenerate}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Regenerate Data
        </Button>
      </div>

      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Simulation Parameters</CardTitle>
          <CardDescription>Adjust parameters to test different scenarios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Jane Organizations</Label>
              <Input
                type="number"
                value={janeOrgCount}
                onChange={(e) => setJaneOrgCount(parseInt(e.target.value) || 5)}
                min={5}
                max={100}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Non-Jane Organizations</Label>
              <Input
                type="number"
                value={nonJaneOrgCount}
                onChange={(e) => setNonJaneOrgCount(parseInt(e.target.value) || 5)}
                min={5}
                max={100}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Jane Advantage (%)</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[janeAdvantagePercent]}
                  onValueChange={([v]) => setJaneAdvantagePercent(v)}
                  min={-20}
                  max={40}
                  step={1}
                />
                <span className="w-12 text-sm">{janeAdvantagePercent}%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Jane Volatility Ratio</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[volatilityRatio * 100]}
                  onValueChange={([v]) => setVolatilityRatio(v / 100)}
                  min={20}
                  max={150}
                  step={5}
                />
                <span className="w-12 text-sm">{(volatilityRatio * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EMRImpactSummaryCard
          title="Configured Advantage"
          value={`${janeAdvantagePercent > 0 ? "+" : ""}${janeAdvantagePercent}%`}
          description="Jane vs non-Jane target"
          trend={janeAdvantagePercent > 0 ? "up" : janeAdvantagePercent < 0 ? "down" : "neutral"}
          icon={TrendingUp}
        />
        <EMRImpactSummaryCard
          title="Total Sample Size"
          value={(janeOrgCount + nonJaneOrgCount).toString()}
          description={`${janeOrgCount} Jane / ${nonJaneOrgCount} non-Jane`}
          trend="neutral"
          icon={Activity}
        />
        <EMRImpactSummaryCard
          title="Volatility Setting"
          value={`${(volatilityRatio * 100).toFixed(0)}%`}
          description="Jane std dev relative to non-Jane"
          trend={volatilityRatio < 1 ? "up" : "down"}
          icon={Activity}
        />
      </div>

      {/* Chart Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Metric Comparison Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <MetricComparisonChart benchmarks={benchmarks} />
        </CardContent>
      </Card>

      {/* Intervention Preview */}
      <InterventionComparisonPanel analysis={interventions} isLoading={false} />

      {/* Privacy Check */}
      <Card className={janeOrgCount < 5 || nonJaneOrgCount < 5 ? "border-destructive" : "border-green-500"}>
        <CardContent className="py-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${janeOrgCount >= 5 && nonJaneOrgCount >= 5 ? "bg-green-500" : "bg-destructive"}`} />
            <span className="font-medium">
              Privacy Check: {janeOrgCount >= 5 && nonJaneOrgCount >= 5 ? "PASSED" : "FAILED"}
            </span>
            <span className="text-muted-foreground text-sm">
              (Minimum 5 organizations per group required)
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
