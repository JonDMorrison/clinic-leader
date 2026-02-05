/**
 * Intervention Intelligence Diagnostics Panel
 * 
 * Observability dashboard for pattern clusters, recommendations,
 * reliability, and synthetic data management.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  Layers,
  TrendingDown,
  Shield,
  FlaskConical,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  generateValidationReport,
  getSyntheticDataCounts,
  type ValidationReport,
} from "@/lib/interventions/interventionSimulationService";

export function InterventionIntelligenceDiagnosticsPanel() {
  const [isRunningValidation, setIsRunningValidation] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);

  // Pattern cluster distribution
  const { data: clusterStats, isLoading: clustersLoading } = useQuery({
    queryKey: ["diagnostics-cluster-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("intervention_pattern_clusters")
        .select("metric_id, intervention_type, sample_size, success_rate, pattern_confidence");

      if (!data) return { total: 0, byMetric: [], byType: [] };

      const byMetric = data.reduce((acc, c) => {
        acc[c.metric_id] = (acc[c.metric_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byType = data.reduce((acc, c) => {
        acc[c.intervention_type] = (acc[c.intervention_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total: data.length,
        avgSampleSize: data.reduce((sum, c) => sum + c.sample_size, 0) / data.length || 0,
        avgSuccessRate: data.reduce((sum, c) => sum + c.success_rate, 0) / data.length || 0,
        avgConfidence: data.reduce((sum, c) => sum + c.pattern_confidence, 0) / data.length || 0,
        byMetric: Object.entries(byMetric).map(([id, count]) => ({ id, count })),
        byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
      };
    },
  });

  // Recommendation tier distribution (uses reliability_summary instead of recommendation_tier)
  const { data: recommendationStats } = useQuery({
    queryKey: ["diagnostics-recommendation-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("recommendation_runs")
        .select("id, reliability_summary, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!data) return { total: 0, byTier: {}, downgrades: 0 };

      const byTier = data.reduce((acc, r) => {
        const tier = (r.reliability_summary as any)?.effective_tier || "unknown";
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const downgrades = data.filter(
        (r) => (r.reliability_summary as any)?.tier_downgraded
      ).length;

      return {
        total: data.length,
        byTier,
        downgrades,
        downgradePercent: data.length > 0 ? (downgrades / data.length) * 100 : 0,
      };
    },
  });

  // Reliability tier distribution
  const { data: reliabilityStats } = useQuery({
    queryKey: ["diagnostics-reliability-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("recommendation_runs")
        .select("reliability_summary")
        .not("reliability_summary", "is", null)
        .limit(100);

      if (!data) return { byTier: {} };

      const byTier = data.reduce((acc, r) => {
        const tier = (r.reliability_summary as any)?.reliability_tier || "unknown";
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Count downgrade reasons
      const reasonCounts = data.reduce((acc, r) => {
        const reasons = (r.reliability_summary as any)?.downgrade_reason_codes || [];
        reasons.forEach((reason: string) => {
          acc[reason] = (acc[reason] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>);

      return { byTier, reasonCounts };
    },
  });

  // Cluster computation history
  const { data: auditHistory } = useQuery({
    queryKey: ["diagnostics-audit-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("intervention_pattern_audit")
        .select("*")
        .order("start_time", { ascending: false })
        .limit(10);

      return data || [];
    },
  });

  // Synthetic data counts
  const { data: syntheticCounts } = useQuery({
    queryKey: ["diagnostics-synthetic-counts"],
    queryFn: getSyntheticDataCounts,
  });

  const handleRunValidation = async () => {
    setIsRunningValidation(true);
    try {
      const report = await generateValidationReport();
      setValidationReport(report);
    } finally {
      setIsRunningValidation(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Intelligence Diagnostics</h2>
            <p className="text-sm text-muted-foreground">
              System health and pattern learning observability
            </p>
          </div>
        </div>

        <Button onClick={handleRunValidation} disabled={isRunningValidation}>
          {isRunningValidation ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Run Validation
        </Button>
      </div>

      {/* Validation Report */}
      {validationReport && (
        <Card className={validationReport.overallPassed ? "border-green-500/50" : "border-destructive/50"}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {validationReport.overallPassed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                Validation Report
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {format(new Date(validationReport.timestamp), "PPp")}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(validationReport.checks).map(([key, check]) => (
              <div key={key} className="flex items-start gap-2">
                {check.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                  <p className="text-xs text-muted-foreground">{check.message}</p>
                </div>
              </div>
            ))}

            <Separator />

            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Synthetic: {validationReport.syntheticDataCount.interventions} interventions</span>
              <span>{validationReport.syntheticDataCount.outcomes} outcomes</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pattern Clusters</span>
            </div>
            <p className="text-2xl font-bold mt-1">{clusterStats?.total || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Avg confidence: {(clusterStats?.avgConfidence || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Recommendations</span>
            </div>
            <p className="text-2xl font-bold mt-1">{recommendationStats?.total || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Recent runs analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Tier Downgrades</span>
            </div>
            <p className="text-2xl font-bold mt-1">{recommendationStats?.downgrades || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(recommendationStats?.downgradePercent || 0).toFixed(1)}% of recommendations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Synthetic Data</span>
            </div>
            <p className="text-2xl font-bold mt-1">{syntheticCounts?.interventions || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Interventions for testing
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clusters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clusters">Cluster Distribution</TabsTrigger>
          <TabsTrigger value="reliability">Reliability Tiers</TabsTrigger>
          <TabsTrigger value="history">Computation History</TabsTrigger>
        </TabsList>

        {/* Cluster Distribution Tab */}
        <TabsContent value="clusters" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">By Intervention Type</CardTitle>
              </CardHeader>
              <CardContent>
                {clusterStats?.byType.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No clusters yet</p>
                ) : (
                  <div className="space-y-2">
                    {clusterStats?.byType.slice(0, 6).map(({ type, count }) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm">{type.replace(/_/g, " ")}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cluster Quality</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Avg Sample Size</span>
                    <span>{(clusterStats?.avgSampleSize || 0).toFixed(1)}</span>
                  </div>
                  <Progress value={Math.min(100, (clusterStats?.avgSampleSize || 0) * 4)} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Avg Success Rate</span>
                    <span>{(clusterStats?.avgSuccessRate || 0).toFixed(1)}%</span>
                  </div>
                  <Progress value={clusterStats?.avgSuccessRate || 0} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Avg Confidence</span>
                    <span>{(clusterStats?.avgConfidence || 0).toFixed(1)}%</span>
                  </div>
                  <Progress value={clusterStats?.avgConfidence || 0} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reliability Tiers Tab */}
        <TabsContent value="reliability" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Reliability Tier Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(reliabilityStats?.byTier || {}).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reliability data yet</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(reliabilityStats?.byTier || {}).map(([tier, count]) => (
                      <div key={tier} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{tier.replace(/_/g, " ")}</span>
                        <Badge
                          variant={
                            tier === "strong_evidence"
                              ? "default"
                              : tier === "reliable_pattern"
                              ? "secondary"
                              : tier === "emerging_pattern"
                              ? "outline"
                              : "destructive"
                          }
                        >
                          {String(count)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Downgrade Reasons</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(reliabilityStats?.reasonCounts || {}).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No downgrades recorded</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(reliabilityStats?.reasonCounts || {})
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .slice(0, 6)
                      .map(([reason, count]) => (
                        <div key={reason} className="flex items-center justify-between">
                          <span className="text-sm">{reason.replace(/_/g, " ")}</span>
                          <span className="text-sm text-muted-foreground">{count}</span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Computation History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cluster Computation Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run ID</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Outcomes</TableHead>
                      <TableHead>Clusters</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditHistory?.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="font-mono text-xs">
                          {run.cluster_run_id?.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(run.start_time), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={run.status === "success" ? "default" : "destructive"}
                          >
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{run.outcome_count_processed}</TableCell>
                        <TableCell>{run.cluster_count_generated}</TableCell>
                        <TableCell>
                          {run.computation_duration_ms
                            ? `${run.computation_duration_ms}ms`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
