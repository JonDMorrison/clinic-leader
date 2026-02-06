/**
 * Recommendation Test Runner
 * 
 * Admin tool to test recommendation engine with specific scenarios
 * and verify reliability guardrails.
 * 
 * SECURITY: Requires master admin access
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  Loader2,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  evaluateReliability,
  type ReliabilityResult,
  type RecommendationTier,
  type ReliabilityInputs,
} from "@/lib/interventions/recommendationReliabilityEvaluator";
import { ReliabilityBadge, ReliabilityBreakdownPanel } from "@/components/interventions/ReliabilityBadge";
import { useMasterAdmin } from "@/hooks/useMasterAdmin";

interface TestScenario {
  name: string;
  patternClusterExists: boolean;
  clusterCount: number;
  patternSampleSize: number;
  successRate: number;
  patternVariance: number;
  patternConsistencyScore: number;
  patternRecencyDays: number;
  baselineQualityFlags: ("good" | "iffy" | "bad")[];
  avgExecutionHealth: number;
  dataPointsPer30Days: number;
  recommendationTier: RecommendationTier;
}

const PRESET_SCENARIOS: TestScenario[] = [
  {
    name: "Strong Evidence",
    patternClusterExists: true,
    clusterCount: 5,
    patternSampleSize: 30,
    successRate: 75,
    patternVariance: 10,
    patternConsistencyScore: 80,
    patternRecencyDays: 30,
    baselineQualityFlags: ["good", "good", "good", "good", "iffy"],
    avgExecutionHealth: 85,
    dataPointsPer30Days: 8,
    recommendationTier: "recommend",
  },
  {
    name: "Reliable Pattern",
    patternClusterExists: true,
    clusterCount: 3,
    patternSampleSize: 15,
    successRate: 65,
    patternVariance: 15,
    patternConsistencyScore: 65,
    patternRecencyDays: 60,
    baselineQualityFlags: ["good", "good", "iffy", "iffy"],
    avgExecutionHealth: 70,
    dataPointsPer30Days: 6,
    recommendationTier: "suggest",
  },
  {
    name: "Emerging Pattern",
    patternClusterExists: true,
    clusterCount: 2,
    patternSampleSize: 7,
    successRate: 55,
    patternVariance: 25,
    patternConsistencyScore: 50,
    patternRecencyDays: 90,
    baselineQualityFlags: ["good", "iffy", "iffy", "bad"],
    avgExecutionHealth: 60,
    dataPointsPer30Days: 4,
    recommendationTier: "suggest",
  },
  {
    name: "Insufficient Evidence",
    patternClusterExists: true,
    clusterCount: 1,
    patternSampleSize: 3,
    successRate: 40,
    patternVariance: 35,
    patternConsistencyScore: 30,
    patternRecencyDays: 120,
    baselineQualityFlags: ["iffy", "bad", "bad"],
    avgExecutionHealth: 45,
    dataPointsPer30Days: 2,
    recommendationTier: "recommend",
  },
  {
    name: "No Clusters",
    patternClusterExists: false,
    clusterCount: 0,
    patternSampleSize: 0,
    successRate: 0,
    patternVariance: 0,
    patternConsistencyScore: 0,
    patternRecencyDays: 0,
    baselineQualityFlags: [],
    avgExecutionHealth: 0,
    dataPointsPer30Days: 0,
    recommendationTier: "recommend",
  },
  {
    name: "High Variance",
    patternClusterExists: true,
    clusterCount: 4,
    patternSampleSize: 20,
    successRate: 60,
    patternVariance: 45,
    patternConsistencyScore: 35,
    patternRecencyDays: 45,
    baselineQualityFlags: ["good", "good", "iffy"],
    avgExecutionHealth: 75,
    dataPointsPer30Days: 6,
    recommendationTier: "recommend",
  },
  {
    name: "Bad Baselines",
    patternClusterExists: true,
    clusterCount: 3,
    patternSampleSize: 12,
    successRate: 70,
    patternVariance: 12,
    patternConsistencyScore: 70,
    patternRecencyDays: 30,
    baselineQualityFlags: ["bad", "bad", "bad", "iffy", "good"],
    avgExecutionHealth: 80,
    dataPointsPer30Days: 7,
    recommendationTier: "recommend",
  },
];

export function RecommendationTestRunner() {
  const { data: isMasterAdmin, isLoading: isAdminLoading } = useMasterAdmin();
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [customScenario, setCustomScenario] = useState<TestScenario>(PRESET_SCENARIOS[0]);
  const [result, setResult] = useState<ReliabilityResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Reliability guard toggles
  const [overrides, setOverrides] = useState({
    forceMissingClusters: false,
    forceLowSampleSize: false,
    forceHighVariance: false,
    forceMixedBaselines: false,
    forceLowExecutionHealth: false,
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
          This test runner is restricted to platform administrators only.
        </AlertDescription>
      </Alert>
    );
  }

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = PRESET_SCENARIOS.find((p) => p.name === presetName);
    if (preset) {
      setCustomScenario(preset);
    }
  };

  const handleRunTest = async () => {
    setIsRunning(true);

    // Apply overrides
    let testScenario = { ...customScenario };

    if (overrides.forceMissingClusters) {
      testScenario.patternClusterExists = false;
      testScenario.clusterCount = 0;
    }
    if (overrides.forceLowSampleSize) {
      testScenario.patternSampleSize = 3;
    }
    if (overrides.forceHighVariance) {
      testScenario.patternVariance = 50;
    }
    if (overrides.forceMixedBaselines) {
      testScenario.baselineQualityFlags = ["bad", "bad", "iffy", "iffy", "good"];
    }
    if (overrides.forceLowExecutionHealth) {
      testScenario.avgExecutionHealth = 30;
    }

    try {
      // Convert TestScenario to ReliabilityInputs
      const reliabilityInputs: ReliabilityInputs = {
        recommendationTier: testScenario.recommendationTier,
        confidenceScore: 70, // Default confidence for testing
        sampleSize: testScenario.patternSampleSize,
        successRate: testScenario.successRate,
        patternClusterExists: testScenario.patternClusterExists,
        patternClusterCount: testScenario.clusterCount,
        patternSampleSize: testScenario.patternSampleSize,
        patternVariance: testScenario.patternVariance,
        patternConsistencyScore: testScenario.patternConsistencyScore,
        patternRecencyDays: testScenario.patternRecencyDays,
        baselineQualityFlags: testScenario.baselineQualityFlags,
        executionHealthScores: testScenario.avgExecutionHealth > 0 
          ? [testScenario.avgExecutionHealth] 
          : [],
        dataPointCount: testScenario.dataPointsPer30Days,
        evaluationWindowDays: 30,
      };
      
      const reliabilityResult = evaluateReliability(reliabilityInputs);
      setResult(reliabilityResult);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Lightbulb className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Recommendation Test Runner</h2>
          <p className="text-sm text-muted-foreground">
            Test recommendation engine and reliability guardrails
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test Scenario</CardTitle>
            <CardDescription>
              Configure parameters or use a preset scenario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Preset Scenario</Label>
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a preset..." />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_SCENARIOS.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sample Size: {customScenario.patternSampleSize}</Label>
                <Slider
                  value={[customScenario.patternSampleSize]}
                  onValueChange={([v]) =>
                    setCustomScenario((c) => ({ ...c, patternSampleSize: v }))
                  }
                  min={0}
                  max={50}
                />
              </div>

              <div className="space-y-2">
                <Label>Success Rate: {customScenario.successRate}%</Label>
                <Slider
                  value={[customScenario.successRate]}
                  onValueChange={([v]) =>
                    setCustomScenario((c) => ({ ...c, successRate: v }))
                  }
                  min={0}
                  max={100}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Variance: {customScenario.patternVariance}%</Label>
                <Slider
                  value={[customScenario.patternVariance]}
                  onValueChange={([v]) =>
                    setCustomScenario((c) => ({ ...c, patternVariance: v }))
                  }
                  min={0}
                  max={100}
                />
              </div>

              <div className="space-y-2">
                <Label>Consistency: {customScenario.patternConsistencyScore}</Label>
                <Slider
                  value={[customScenario.patternConsistencyScore]}
                  onValueChange={([v]) =>
                    setCustomScenario((c) => ({ ...c, patternConsistencyScore: v }))
                  }
                  min={0}
                  max={100}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Original Recommendation Tier</Label>
              <Select
                value={customScenario.recommendationTier}
                onValueChange={(v: RecommendationTier) =>
                  setCustomScenario((c) => ({ ...c, recommendationTier: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="explore">Explore</SelectItem>
                  <SelectItem value="suggest">Suggest</SelectItem>
                  <SelectItem value="recommend">Recommend</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Override Toggles */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Reliability Guard Overrides</Label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Force Missing Clusters</span>
                  <Switch
                    checked={overrides.forceMissingClusters}
                    onCheckedChange={(v) =>
                      setOverrides((o) => ({ ...o, forceMissingClusters: v }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Force Low Sample Size (&lt;5)</span>
                  <Switch
                    checked={overrides.forceLowSampleSize}
                    onCheckedChange={(v) =>
                      setOverrides((o) => ({ ...o, forceLowSampleSize: v }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Force High Variance (50%)</span>
                  <Switch
                    checked={overrides.forceHighVariance}
                    onCheckedChange={(v) =>
                      setOverrides((o) => ({ ...o, forceHighVariance: v }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Force Mixed Baselines (bad-heavy)</span>
                  <Switch
                    checked={overrides.forceMixedBaselines}
                    onCheckedChange={(v) =>
                      setOverrides((o) => ({ ...o, forceMixedBaselines: v }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Force Low Execution Health (30)</span>
                  <Switch
                    checked={overrides.forceLowExecutionHealth}
                    onCheckedChange={(v) =>
                      setOverrides((o) => ({ ...o, forceLowExecutionHealth: v }))
                    }
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleRunTest} disabled={isRunning} className="w-full">
              {isRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Recommendation Test
            </Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test Results</CardTitle>
            <CardDescription>
              Reliability evaluation and tier outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Info className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Configure a scenario and run the test to see results
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {/* Tier Summary */}
                  <div className="p-4 rounded-lg border bg-muted/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Reliability Tier</span>
                      <ReliabilityBadge reliability={result} showDetails={false} />
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Effective Recommendation Tier</span>
                      <Badge
                        variant={
                          result.effective_tier === "recommend"
                            ? "default"
                            : result.effective_tier === "suggest"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {result.effective_tier}
                      </Badge>
                    </div>

                    {result.tier_downgraded && (
                      <Alert className="border-warning/50 bg-warning/10">
                        <TrendingDown className="h-4 w-4 text-warning" />
                        <AlertDescription className="text-xs">
                          Tier downgraded from "{result.original_tier}" due to
                          reliability concerns
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* UI Guardrails */}
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm font-medium mb-2">UI Guardrails</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Allow Recommend Tier:</span>
                        <span>{result.ui_guardrails.allow_recommend_tier ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Force Tier:</span>
                        <span className="capitalize">{result.ui_guardrails.force_tier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tone:</span>
                        <span className="capitalize">{result.ui_guardrails.tone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Full Breakdown */}
                  <ReliabilityBreakdownPanel reliability={result} />

                  {/* Downgrade Reasons */}
                  {result.downgrade_reason_codes.length > 0 && (
                    <div className="p-4 rounded-lg border border-destructive/50">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        Downgrade Reasons
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {result.downgrade_reason_codes.map((code) => (
                          <Badge key={code} variant="destructive" className="text-xs">
                            {code.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Explanations */}
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm font-medium mb-2">Evidence Explanations</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {result.reliability_explanations.map((exp, i) => (
                        <li key={i}>• {exp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
