/**
 * Intervention Simulation Panel
 * 
 * Admin-only UI for generating synthetic intervention data
 * and testing the intelligence pipeline.
 * 
 * SECURITY: Requires master admin access
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  FlaskConical, 
  Play, 
  RefreshCw, 
  Trash2, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  Zap,
  ShieldAlert,
  Tag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InterventionTypeBackfillPanel } from "./InterventionTypeBackfillPanel";
import {
  generateSyntheticIntervention,
  generateBatchSyntheticInterventions,
  triggerClusterRecompute,
  getSyntheticDataCounts,
  purgeSyntheticData,
  type SimulationConfig,
  type BatchSimulationConfig,
  type BatchSize,
  type EffectDistribution,
  type BaselineQuality,
} from "@/lib/interventions/interventionSimulationService";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMasterAdmin } from "@/hooks/useMasterAdmin";

const INTERVENTION_TYPES = [
  "workflow_change",
  "staffing_change",
  "technology_upgrade",
  "training_program",
  "policy_change",
  "process_improvement",
];

export function InterventionSimulationPanel() {
  const { data: currentUser } = useCurrentUser();
  const { data: isMasterAdmin, isLoading: isAdminLoading } = useMasterAdmin();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  // Single intervention config
  const [singleConfig, setSingleConfig] = useState({
    metricId: "",
    interventionType: "workflow_change",
    baselineValue: 50,
    expectedDirection: "up" as "up" | "down",
    effectMagnitude: 10,
    executionHealthScore: 75,
    baselineQuality: "good" as BaselineQuality,
    timeHorizonDays: 30,
  });

  // Batch config
  const [batchConfig, setBatchConfig] = useState({
    batchSize: 10 as BatchSize,
    effectDistribution: "mixed" as EffectDistribution,
    baselineRange: { min: 20, max: 80 },
    effectRange: { min: 5, max: 30 },
    executionHealthRange: { min: 40, max: 95 },
    baselineQualityMix: { good: 60, iffy: 30, bad: 10 },
    timeHorizonRange: { min: 14, max: 90 },
  });

  const [includeSyntheticInRecompute, setIncludeSyntheticInRecompute] = useState(false);

  // Fetch metrics for selection
  const { data: metrics } = useQuery({
    queryKey: ["admin-metrics-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("metrics")
        .select("id, name")
        .order("name");
      return data || [];
    },
  });

  // Use currentUser directly for team_id
  const userId = currentUser?.id;
  const teamId = currentUser?.team_id;

  // Fetch synthetic data counts
  const { data: syntheticCounts, refetch: refetchCounts } = useQuery({
    queryKey: ["synthetic-data-counts"],
    queryFn: getSyntheticDataCounts,
    refetchInterval: 10000,
  });

  // SECURITY: Block access for non-admin users (after all hooks)
  if (isAdminLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isMasterAdmin) {
    return (
      <Alert variant="destructive" className="m-4">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          This simulation harness is restricted to platform administrators only.
          Synthetic data generation requires elevated privileges.
        </AlertDescription>
      </Alert>
    );
  }

  const handleGenerateSingle = async () => {
    if (!singleConfig.metricId || !teamId || !userId) {
      toast.error("Please select a metric");
      return;
    }

    setIsGenerating(true);
    try {
      const config: SimulationConfig = {
        ...singleConfig,
        organizationId: teamId,
        createdBy: userId,
      };

      const result = await generateSyntheticIntervention(config);

      if (result.success) {
        toast.success("Synthetic intervention created", {
          description: `ID: ${result.interventionId}`,
        });
        setLastResult(`Created intervention ${result.interventionId}`);
        refetchCounts();
      } else {
        toast.error("Generation failed", { description: result.error });
      }
    } catch (error) {
      toast.error("Error generating intervention");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateBatch = async () => {
    if (!singleConfig.metricId || !teamId || !userId) {
      toast.error("Please select a metric");
      return;
    }

    setIsGenerating(true);
    try {
      const config: BatchSimulationConfig = {
        metricId: singleConfig.metricId,
        interventionType: singleConfig.interventionType,
        organizationId: teamId,
        createdBy: userId,
        ...batchConfig,
      };

      const result = await generateBatchSyntheticInterventions(config);

      toast.success(`Generated ${result.successful}/${result.totalGenerated} interventions`, {
        description: result.failed > 0 ? `${result.failed} failed` : undefined,
      });

      setLastResult(
        `Batch complete: ${result.successful} created, ${result.failed} failed`
      );
      refetchCounts();
    } catch (error) {
      toast.error("Batch generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRecomputeClusters = async () => {
    setIsRecomputing(true);
    try {
      const result = await triggerClusterRecompute(includeSyntheticInRecompute);

      if (result.success) {
        toast.success("Cluster recomputation complete", {
          description: `${result.clusterCount} clusters from ${result.outcomesProcessed} outcomes`,
        });
        setLastResult(
          `Run ${result.runId}: ${result.clusterCount} clusters in ${result.durationMs}ms`
        );
      } else {
        toast.error("Recomputation failed", { description: result.error });
      }
    } catch (error) {
      toast.error("Error triggering recomputation");
    } finally {
      setIsRecomputing(false);
    }
  };

  const handlePurgeSynthetic = async () => {
    if (!confirm("Are you sure you want to delete ALL synthetic data?")) return;

    setIsPurging(true);
    try {
      const result = await purgeSyntheticData();

      if (result.success) {
        toast.success("Synthetic data purged", {
          description: `Deleted ${result.deleted.interventions} interventions`,
        });
        refetchCounts();
      } else {
        toast.error("Purge failed", { description: result.error });
      }
    } catch (error) {
      toast.error("Error purging data");
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Intervention Simulation Harness</h2>
            <p className="text-sm text-muted-foreground">
              Generate synthetic data to test intelligence pipeline
            </p>
          </div>
        </div>

        <Badge variant="outline" className="gap-1.5">
          <Database className="h-3 w-3" />
          {syntheticCounts?.interventions || 0} synthetic interventions
        </Badge>
      </div>

      {/* Warning Banner */}
      <Alert variant="default" className="border-warning/50 bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertTitle>Simulation Mode</AlertTitle>
        <AlertDescription>
          All data generated here is flagged as synthetic and excluded from production
          learning by default. Use responsibly for testing only.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="single" className="space-y-4">
        <TabsList>
          <TabsTrigger value="single">Single Intervention</TabsTrigger>
          <TabsTrigger value="batch">Batch Generation</TabsTrigger>
          <TabsTrigger value="backfill">Type Backfill</TabsTrigger>
          <TabsTrigger value="clusters">Cluster Recompute</TabsTrigger>
        </TabsList>

        {/* Single Intervention Tab */}
        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generate Single Intervention</CardTitle>
              <CardDescription>
                Create one synthetic intervention with specific parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Metric</Label>
                  <Select
                    value={singleConfig.metricId}
                    onValueChange={(v) =>
                      setSingleConfig((c) => ({ ...c, metricId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select metric..." />
                    </SelectTrigger>
                    <SelectContent>
                      {metrics?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Intervention Type</Label>
                  <Select
                    value={singleConfig.interventionType}
                    onValueChange={(v) =>
                      setSingleConfig((c) => ({ ...c, interventionType: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVENTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Baseline Value: {singleConfig.baselineValue}</Label>
                  <Slider
                    value={[singleConfig.baselineValue]}
                    onValueChange={([v]) =>
                      setSingleConfig((c) => ({ ...c, baselineValue: v }))
                    }
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Effect Magnitude: {singleConfig.effectMagnitude}%</Label>
                  <Slider
                    value={[singleConfig.effectMagnitude]}
                    onValueChange={([v]) =>
                      setSingleConfig((c) => ({ ...c, effectMagnitude: v }))
                    }
                    min={-50}
                    max={50}
                    step={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Execution Health: {singleConfig.executionHealthScore}</Label>
                  <Slider
                    value={[singleConfig.executionHealthScore]}
                    onValueChange={([v]) =>
                      setSingleConfig((c) => ({ ...c, executionHealthScore: v }))
                    }
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Time Horizon: {singleConfig.timeHorizonDays} days</Label>
                  <Slider
                    value={[singleConfig.timeHorizonDays]}
                    onValueChange={([v]) =>
                      setSingleConfig((c) => ({ ...c, timeHorizonDays: v }))
                    }
                    min={7}
                    max={180}
                    step={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expected Direction</Label>
                  <Select
                    value={singleConfig.expectedDirection}
                    onValueChange={(v: "up" | "down") =>
                      setSingleConfig((c) => ({ ...c, expectedDirection: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="up">Up (improvement)</SelectItem>
                      <SelectItem value="down">Down (reduction)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Baseline Quality</Label>
                  <Select
                    value={singleConfig.baselineQuality}
                    onValueChange={(v: BaselineQuality) =>
                      setSingleConfig((c) => ({ ...c, baselineQuality: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="iffy">Iffy</SelectItem>
                      <SelectItem value="bad">Bad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleGenerateSingle}
                disabled={isGenerating || !singleConfig.metricId}
                className="w-full"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Generate Intervention
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Generation Tab */}
        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Batch Generation</CardTitle>
              <CardDescription>
                Generate multiple interventions with randomized parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Metric</Label>
                  <Select
                    value={singleConfig.metricId}
                    onValueChange={(v) =>
                      setSingleConfig((c) => ({ ...c, metricId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select metric..." />
                    </SelectTrigger>
                    <SelectContent>
                      {metrics?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Batch Size</Label>
                  <Select
                    value={String(batchConfig.batchSize)}
                    onValueChange={(v) =>
                      setBatchConfig((c) => ({
                        ...c,
                        batchSize: Number(v) as BatchSize,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 interventions</SelectItem>
                      <SelectItem value="10">10 interventions</SelectItem>
                      <SelectItem value="25">25 interventions</SelectItem>
                      <SelectItem value="50">50 interventions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Effect Distribution</Label>
                <Select
                  value={batchConfig.effectDistribution}
                  onValueChange={(v: EffectDistribution) =>
                    setBatchConfig((c) => ({ ...c, effectDistribution: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Mostly Positive Effects</SelectItem>
                    <SelectItem value="negative">Mostly Negative Effects</SelectItem>
                    <SelectItem value="mixed">Mixed Effects</SelectItem>
                    <SelectItem value="neutral">Neutral (minimal effect)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Good Baselines: {batchConfig.baselineQualityMix.good}%</Label>
                  <Slider
                    value={[batchConfig.baselineQualityMix.good]}
                    onValueChange={([v]) =>
                      setBatchConfig((c) => ({
                        ...c,
                        baselineQualityMix: { ...c.baselineQualityMix, good: v },
                      }))
                    }
                    min={0}
                    max={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Iffy Baselines: {batchConfig.baselineQualityMix.iffy}%</Label>
                  <Slider
                    value={[batchConfig.baselineQualityMix.iffy]}
                    onValueChange={([v]) =>
                      setBatchConfig((c) => ({
                        ...c,
                        baselineQualityMix: { ...c.baselineQualityMix, iffy: v },
                      }))
                    }
                    min={0}
                    max={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bad Baselines: {batchConfig.baselineQualityMix.bad}%</Label>
                  <Slider
                    value={[batchConfig.baselineQualityMix.bad]}
                    onValueChange={([v]) =>
                      setBatchConfig((c) => ({
                        ...c,
                        baselineQualityMix: { ...c.baselineQualityMix, bad: v },
                      }))
                    }
                    min={0}
                    max={100}
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerateBatch}
                disabled={isGenerating || !singleConfig.metricId}
                className="w-full"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Generate {batchConfig.batchSize} Interventions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Type Backfill Tab */}
        <TabsContent value="backfill" className="space-y-4">
          <InterventionTypeBackfillPanel />
        </TabsContent>

        {/* Cluster Recompute Tab */}
        <TabsContent value="clusters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recompute Pattern Clusters</CardTitle>
              <CardDescription>
                Trigger cluster computation to update pattern learning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Include Synthetic Data</p>
                  <p className="text-xs text-muted-foreground">
                    Include synthetic interventions in cluster computation
                  </p>
                </div>
                <Switch
                  checked={includeSyntheticInRecompute}
                  onCheckedChange={setIncludeSyntheticInRecompute}
                />
              </div>

              <Button
                onClick={handleRecomputeClusters}
                disabled={isRecomputing}
                className="w-full"
              >
                {isRecomputing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Recompute Pattern Clusters
              </Button>

              {lastResult && (
                <div className="p-3 rounded-lg bg-muted text-sm">
                  <p className="font-medium">Last Result:</p>
                  <p className="text-muted-foreground">{lastResult}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Purge Controls */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Permanently delete all synthetic data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={handlePurgeSynthetic}
                disabled={isPurging || (syntheticCounts?.interventions || 0) === 0}
                className="w-full"
              >
                {isPurging ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Purge All Synthetic Data ({syntheticCounts?.interventions || 0} items)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
