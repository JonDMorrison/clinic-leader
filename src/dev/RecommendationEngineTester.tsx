/**
 * RecommendationEngineTester - Dev-only test harness for recommendation system
 * Allows simulation of off-track scenarios and visualization of scoring
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FlaskConical,
  ChevronDown,
  Play,
  BarChart3,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  calculateConfidence,
  CONFIDENCE_THRESHOLDS,
  type ConfidenceInputs,
} from "@/lib/interventions/calculateRecommendationConfidence";
import {
  buildInterventionTemplates,
} from "@/lib/interventions/buildInterventionPatterns";
import {
  generateRecommendationsForMetric,
  storeRecommendations,
} from "@/lib/interventions/generateRecommendations";

export function RecommendationEngineTester() {
  const { data: currentUser } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const [buildResult, setBuildResult] = useState<{
    created: number;
    updated: number;
    patterns: { intervention_type: string; metric_name: string; success_rate: number; sample_size: number }[];
  } | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [testValue, setTestValue] = useState<string>("50");
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);

  // Confidence calculator inputs
  const [confInputs, setConfInputs] = useState<ConfidenceInputs>({
    historicalSuccessRate: 0.75,
    sampleSize: 5,
    baselineDeviationPercent: 15,
    historicalAvgDeviationPercent: 12,
    daysSinceMostRecentCase: 30,
  });

  const organizationId = currentUser?.team_id;

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  // Fetch metrics for testing
  const { data: metrics = [] } = useQuery({
    queryKey: ["test-metrics", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("metrics")
        .select("id, name, target, direction, unit")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .limit(20);
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Build templates from history
  const handleBuildTemplates = async () => {
    if (!organizationId) return;
    setIsBuilding(true);
    try {
      const result = await buildInterventionTemplates(organizationId);
      setBuildResult(result);
      toast.success(`Built ${result.created} new, updated ${result.updated} templates`);
    } catch (error) {
      toast.error("Failed to build templates: " + (error as Error).message);
    }
    setIsBuilding(false);
  };

  // Generate recommendations for test metric
  const handleGenerateRecommendations = async () => {
    if (!organizationId || !selectedMetric) return;
    setIsGenerating(true);
    try {
      const periodKey = new Date().toISOString().slice(0, 7); // YYYY-MM
      const testValueNum = parseFloat(testValue) || null;
      const recs = await generateRecommendationsForMetric(
        organizationId,
        selectedMetric,
        periodKey,
        testValueNum
      );
      if (recs.length > 0) {
        await storeRecommendations(recs);
      }
      setGeneratedCount(recs.length);
      toast.success(`Generated ${recs.length} recommendation(s)`);
    } catch (error) {
      toast.error("Failed to generate: " + (error as Error).message);
    }
    setIsGenerating(false);
  };

  // Calculate confidence with current inputs
  const confidenceResult = calculateConfidence(confInputs);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/10">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-purple-100/50 dark:hover:bg-purple-900/20 transition-colors">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-purple-600" />
                <span className="text-purple-700 dark:text-purple-400">
                  Recommendation Engine Tester (Dev Only)
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Template Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Pattern Learning</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBuildTemplates}
                  disabled={isBuilding}
                >
                  {isBuilding ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Build Templates
                </Button>
              </div>
              {buildResult && (
                <div className="p-3 rounded-lg border bg-background">
                  <div className="flex gap-2 mb-2">
                    <Badge variant="secondary">{buildResult.created} created</Badge>
                    <Badge variant="outline">{buildResult.updated} updated</Badge>
                    <Badge>{buildResult.patterns.length} patterns</Badge>
                  </div>
                  {buildResult.patterns.length > 0 && (
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {buildResult.patterns.map((p, i) => (
                          <div key={i} className="text-xs p-1 rounded bg-muted">
                            <span className="font-medium capitalize">
                              {p.intervention_type.replace("_", " ")}
                            </span>
                            {" → "}
                            {p.metric_name}:{" "}
                            <span className="text-green-600">
                              {Math.round(p.success_rate * 100)}% success
                            </span>
                            {" "}({p.sample_size} cases)
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Recommendation Generator */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Test Recommendation Generation</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Metric</Label>
                  <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select metric..." />
                    </SelectTrigger>
                    <SelectContent>
                      {metrics.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Test Value (off-track)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={testValue}
                      onChange={(e) => setTestValue(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={handleGenerateRecommendations}
                      disabled={isGenerating || !selectedMetric}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              {generatedCount !== null && (
                <div className="flex items-center gap-2 text-sm">
                  {generatedCount > 0 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Generated {generatedCount} recommendation(s)
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                      No recommendations (insufficient data or not off-track)
                    </>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Confidence Calculator */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Confidence Score Calculator
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs">Historical Success Rate (0-1)</Label>
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={confInputs.historicalSuccessRate}
                    onChange={(e) =>
                      setConfInputs((p) => ({
                        ...p,
                        historicalSuccessRate: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sample Size</Label>
                  <Input
                    type="number"
                    min="0"
                    value={confInputs.sampleSize}
                    onChange={(e) =>
                      setConfInputs((p) => ({
                        ...p,
                        sampleSize: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Current Deviation %</Label>
                  <Input
                    type="number"
                    value={confInputs.baselineDeviationPercent}
                    onChange={(e) =>
                      setConfInputs((p) => ({
                        ...p,
                        baselineDeviationPercent: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Historical Avg Deviation %</Label>
                  <Input
                    type="number"
                    value={confInputs.historicalAvgDeviationPercent}
                    onChange={(e) =>
                      setConfInputs((p) => ({
                        ...p,
                        historicalAvgDeviationPercent: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Days Since Recent Case</Label>
                  <Input
                    type="number"
                    min="0"
                    value={confInputs.daysSinceMostRecentCase}
                    onChange={(e) =>
                      setConfInputs((p) => ({
                        ...p,
                        daysSinceMostRecentCase: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Result */}
              <div className="p-3 rounded-lg border bg-background">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Confidence Score</span>
                  <Badge
                    variant={
                      confidenceResult.score >= CONFIDENCE_THRESHOLDS.MIN_CONFIDENCE
                        ? "default"
                        : "destructive"
                    }
                  >
                    {Math.round(confidenceResult.score * 100)}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {confidenceResult.explanation}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    Historical: {(confidenceResult.components.historicalSuccessRate * 100).toFixed(0)}%
                  </div>
                  <div>
                    Sample: {(confidenceResult.components.sampleSizeScore * 100).toFixed(0)}%
                  </div>
                  <div>
                    Similarity: {(confidenceResult.components.similarityScore * 100).toFixed(0)}%
                  </div>
                  <div>
                    Recency: {(confidenceResult.components.recencyScore * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
