/**
 * OutcomeNarrativeBlock - Story-first display of intervention outcomes
 * 
 * Features:
 * - Delta visualization with before/after
 * - AI summary display
 * - Confidence level indicator
 * - Evaluation period context
 */

import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, TrendingUp, TrendingDown, Minus, Calendar, Shield, AlertTriangle } from "lucide-react";

interface OutcomeNarrativeBlockProps {
  metricName: string;
  baselineValue: number | null;
  currentValue: number | null;
  actualDeltaValue: number | null;
  actualDeltaPercent: number | null;
  confidenceScore: number;
  evaluationPeriodStart: string;
  evaluationPeriodEnd: string;
  aiSummary: string | null;
  expectedDirection: "up" | "down" | "stable";
  baselineQualityFlag?: "good" | "iffy" | "bad" | null;
}

export function OutcomeNarrativeBlock({
  metricName,
  baselineValue,
  currentValue,
  actualDeltaValue,
  actualDeltaPercent,
  confidenceScore,
  evaluationPeriodStart,
  evaluationPeriodEnd,
  aiSummary,
  expectedDirection,
  baselineQualityFlag = "good",
}: OutcomeNarrativeBlockProps) {
  // Determine if outcome matched expectations
  const isPositive = actualDeltaValue !== null && actualDeltaValue > 0;
  const isNegative = actualDeltaValue !== null && actualDeltaValue < 0;
  
  const matchedExpectation = 
    (expectedDirection === "up" && isPositive) ||
    (expectedDirection === "down" && isNegative) ||
    (expectedDirection === "stable" && Math.abs(actualDeltaPercent || 0) < 5);

  // Direction icon
  const DirectionIcon = isPositive 
    ? TrendingUp 
    : isNegative 
      ? TrendingDown 
      : Minus;

  const directionColor = matchedExpectation
    ? "text-green-600 dark:text-green-400"
    : isPositive || isNegative
      ? "text-orange-600 dark:text-orange-400"
      : "text-muted-foreground";

  // Confidence level display
  const getConfidenceLabel = (score: number) => {
    if (score >= 4) return { label: "High", color: "bg-green-500" };
    if (score >= 3) return { label: "Medium", color: "bg-yellow-500" };
    return { label: "Low", color: "bg-red-500" };
  };

  const confidence = getConfidenceLabel(confidenceScore);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DirectionIcon className={`h-5 w-5 ${directionColor}`} />
            {metricName}
          </CardTitle>
          <Badge
            variant={matchedExpectation ? "default" : "secondary"}
            className={matchedExpectation 
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" 
              : "bg-muted text-muted-foreground"
            }
          >
            {matchedExpectation ? "Met Expectations" : "Did Not Meet Expectations"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {/* Delta Visualization */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Baseline</p>
            <p className="text-2xl font-bold">
              {baselineValue !== null ? baselineValue.toLocaleString() : "—"}
            </p>
          </div>
          
          <div className="flex flex-col items-center px-4">
            <DirectionIcon className={`h-6 w-6 ${directionColor}`} />
            {actualDeltaPercent !== null && (
              <span className={`text-sm font-semibold ${directionColor}`}>
                {actualDeltaPercent >= 0 ? "+" : ""}{actualDeltaPercent.toFixed(1)}%
              </span>
            )}
          </div>
          
          <div className="flex-1 text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Current</p>
            <p className="text-2xl font-bold">
              {currentValue !== null ? currentValue.toLocaleString() : "—"}
            </p>
          </div>
        </div>

        {/* Actual Delta */}
        {actualDeltaValue !== null && (
          <div className="text-center">
            <Badge
              variant="outline"
              className={`text-lg px-4 py-1 ${
                isPositive
                  ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300"
                  : isNegative
                    ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {actualDeltaValue >= 0 ? "+" : ""}{actualDeltaValue.toLocaleString()} change
            </Badge>
          </div>
        )}

        {/* Confidence Level */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span>Confidence Level</span>
            </div>
            <span className="font-medium">{confidence.label}</span>
          </div>
          <Progress value={(confidenceScore / 5) * 100} className="h-2" />
          
          {baselineQualityFlag && baselineQualityFlag !== "good" && (
            <div className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-3 w-3" />
              <span>
                {baselineQualityFlag === "bad" 
                  ? "Confidence limited by unreliable baseline data" 
                  : "Confidence affected by uncertain baseline data"}
              </span>
            </div>
          )}
        </div>

        {/* Evaluation Period */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            Evaluated: {format(new Date(evaluationPeriodStart), "MMM d, yyyy")} — {format(new Date(evaluationPeriodEnd), "MMM d, yyyy")}
          </span>
        </div>

        {/* AI Summary */}
        {aiSummary && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Insight</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {aiSummary}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
