/**
 * RecommendationEvidencePanel
 * Shows full explainability for a recommendation including formula, evidence, and exclusions
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Calculator, 
  Database, 
  Filter, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info
} from "lucide-react";
import { 
  getRecommendationRunForRecommendation, 
  formatEvidenceSummary,
  formatFilteredReasons,
  type RecommendationRunRecord 
} from "@/lib/interventions/recommendationRunLogger";
import { CONFIDENCE_THRESHOLDS } from "@/lib/interventions/calculateRecommendationConfidence";

interface RecommendationEvidencePanelProps {
  recommendationId: string;
  confidenceComponents: {
    historicalSuccessRate: number;
    sampleSizeScore: number;
    similarityScore: number;
    recencyScore: number;
  };
}

export function RecommendationEvidencePanel({
  recommendationId,
  confidenceComponents,
}: RecommendationEvidencePanelProps) {
  const [runData, setRunData] = useState<RecommendationRunRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvidence() {
      setLoading(true);
      const data = await getRecommendationRunForRecommendation(recommendationId);
      setRunData(data);
      setLoading(false);
    }
    loadEvidence();
  }, [recommendationId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="h-4 w-4 animate-pulse" />
            Loading evidence...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Formula Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Confidence Formula Components
          </CardTitle>
          <CardDescription>
            Deterministic calculation: no AI estimation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FormulaComponent
            label="Historical Success Rate"
            weight={0.35}
            value={confidenceComponents.historicalSuccessRate}
            description="Success rate of past interventions of this type"
          />
          <FormulaComponent
            label="Sample Size Score"
            weight={0.25}
            value={confidenceComponents.sampleSizeScore}
            description={`Logarithmic scaling, optimal at ${CONFIDENCE_THRESHOLDS.OPTIMAL_SAMPLE_SIZE}+ cases`}
          />
          <FormulaComponent
            label="Similarity Score"
            weight={0.25}
            value={confidenceComponents.similarityScore}
            description="How similar current deviation is to historical cases"
          />
          <FormulaComponent
            label="Recency Score"
            weight={0.15}
            value={confidenceComponents.recencyScore}
            description={`Exponential decay with ${CONFIDENCE_THRESHOLDS.RECENCY_HALF_LIFE_DAYS}-day half-life`}
          />
          
          <Separator className="my-2" />
          
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Final Confidence Score</span>
            <Badge variant="outline">
              {(
                confidenceComponents.historicalSuccessRate * 0.35 +
                confidenceComponents.sampleSizeScore * 0.25 +
                confidenceComponents.similarityScore * 0.25 +
                confidenceComponents.recencyScore * 0.15
              ).toFixed(3)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Evidence Snapshot */}
      {runData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Frozen Evidence Snapshot
            </CardTitle>
            <CardDescription>
              Data captured at {new Date(runData.createdAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {/* Inputs */}
              <AccordionItem value="inputs">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Input Values at Generation
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-muted rounded">
                      <span className="text-muted-foreground">Current Value:</span>
                      <span className="ml-2 font-medium">
                        {runData.inputs.currentValue ?? "N/A"}
                      </span>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <span className="text-muted-foreground">Target:</span>
                      <span className="ml-2 font-medium">
                        {runData.inputs.target ?? "N/A"}
                      </span>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <span className="text-muted-foreground">Deviation:</span>
                      <span className="ml-2 font-medium">
                        {runData.inputs.deviationPercent?.toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <span className="text-muted-foreground">Threshold:</span>
                      <span className="ml-2 font-medium">
                        {runData.inputs.thresholdUsed}%
                      </span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Historical Cases */}
              <AccordionItem value="cases">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Historical Cases ({runData.evidence.totalCasesAnalyzed})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {formatEvidenceSummary(runData.evidence).map((summary, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>{summary}</span>
                      </div>
                    ))}
                    
                    {runData.evidence.historicalCases.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          Sample of cases used (anonymized):
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {runData.evidence.historicalCases.slice(0, 5).map((c, i) => {
                            // Check if this is a legacy (untyped) intervention
                            const isLegacy = !c.interventionTypeId;
                            const typeName = c.interventionTypeName || c.interventionType?.replace("_", " ") || "Unknown";
                            
                            return (
                              <div key={i} className="text-xs bg-muted p-1.5 rounded flex items-center gap-2">
                                <Badge 
                                  variant={isLegacy ? "secondary" : "outline"} 
                                  className={`text-[10px] ${isLegacy ? "opacity-70" : ""}`}
                                >
                                  {typeName}
                                  {isLegacy && " (legacy)"}
                                </Badge>
                                <span className={c.wasSuccessful ? "text-primary" : "text-destructive"}>
                                  {c.wasSuccessful ? "+" : ""}{c.improvementPercent?.toFixed(1)}%
                                </span>
                                <span className="text-muted-foreground">
                                  ({c.durationDays}d)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Filtered Items */}
              {runData.evidence.filteredReasons.length > 0 && (
                <AccordionItem value="filtered">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filtered Recommendations ({runData.evidence.filteredReasons.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {formatFilteredReasons(runData.evidence.filteredReasons).map((reason, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <XCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span className="text-muted-foreground">{reason}</span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* No Evidence Warning */}
      {!runData && !loading && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Missing Evidence Snapshot</AlertTitle>
          <AlertDescription>
            This recommendation was generated before evidence tracking was implemented.
            Future recommendations will include full traceability.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function FormulaComponent({
  label,
  weight,
  value,
  description,
}: {
  label: string;
  weight: number;
  value: number;
  description: string;
}) {
  const contribution = value * weight;
  const percent = Math.round(value * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">×{weight}</span>
          <Badge variant="secondary" className="text-xs">
            {percent}%
          </Badge>
          <span className="text-xs">=</span>
          <span className="font-medium">{contribution.toFixed(3)}</span>
        </div>
      </div>
      <Progress value={percent} className="h-1.5" />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
