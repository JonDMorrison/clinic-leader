/**
 * PatternInsightCard - Displays pattern cluster insights from cross-org learning
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Brain, 
  TrendingUp, 
  Users, 
  Clock, 
  BarChart3,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import type { PatternCluster, PatternRecommendation } from "@/lib/interventions/interventionPatternService";

interface PatternInsightCardProps {
  pattern: PatternCluster;
  matchScore?: number;
  reasoning?: string;
  variant?: "compact" | "full";
}

const TYPE_LABELS: Record<string, string> = {
  staffing: "Staffing",
  process: "Process",
  technology: "Technology",
  training: "Training",
  marketing: "Marketing",
  financial: "Financial",
  other: "Other",
};

export function PatternInsightCard({
  pattern,
  matchScore,
  reasoning,
  variant = "full",
}: PatternInsightCardProps) {
  const successColor = pattern.successRate >= 70 
    ? "text-green-600 dark:text-green-400" 
    : pattern.successRate >= 40 
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-destructive";

  const confidenceVariant = pattern.patternConfidence >= 70 
    ? "default" 
    : pattern.patternConfidence >= 40 
      ? "secondary" 
      : "outline";

  if (variant === "compact") {
    return (
      <div className="border rounded-lg p-3 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium">
                {TYPE_LABELS[pattern.interventionType] || pattern.interventionType}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {pattern.orgSizeBand}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className={successColor}>{pattern.successRate.toFixed(0)}% success</span>
              <span>n={pattern.sampleSize}</span>
            </div>
          </div>
          {matchScore !== undefined && (
            <Badge variant="secondary" className="text-[10px]">
              {matchScore}% match
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Pattern Insight
          </CardTitle>
          {matchScore !== undefined && (
            <Badge variant="secondary">{matchScore}% match</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pattern Type & Context */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {TYPE_LABELS[pattern.interventionType] || pattern.interventionType}
          </Badge>
          <Badge variant="outline">{pattern.orgSizeBand} orgs</Badge>
          <Badge variant="outline">{pattern.timeHorizonBand}</Badge>
          {pattern.specialtyType && (
            <Badge variant="outline">{pattern.specialtyType}</Badge>
          )}
        </div>

        {/* Success Rate */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Success Rate
            </span>
            <span className={`font-semibold ${successColor}`}>
              {pattern.successRate.toFixed(0)}%
            </span>
          </div>
          <Progress value={pattern.successRate} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">Sample Size</p>
                  <p className="font-medium">{pattern.sampleSize} interventions</p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">From anonymized cross-organization data</p>
            </TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Avg. Effect</p>
              <p className="font-medium">
                {pattern.avgEffectMagnitude !== null 
                  ? `${pattern.avgEffectMagnitude > 0 ? "+" : ""}${pattern.avgEffectMagnitude.toFixed(1)}%`
                  : "—"
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Confidence</p>
              <Badge variant={confidenceVariant} className="text-xs mt-0.5">
                {pattern.patternConfidence.toFixed(0)}%
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Time Horizon</p>
              <p className="font-medium">{pattern.timeHorizonBand}</p>
            </div>
          </div>
        </div>

        {/* Reasoning */}
        {reasoning && (
          <div className="pt-2 border-t">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">{reasoning}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PatternRecommendationListProps {
  recommendations: PatternRecommendation[];
  variant?: "compact" | "full";
}

export function PatternRecommendationList({
  recommendations,
  variant = "full",
}: PatternRecommendationListProps) {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Brain className="h-4 w-4 text-primary" />
        Cross-Org Pattern Insights
        <Badge variant="outline" className="text-[10px]">
          {recommendations.length}
        </Badge>
      </h4>
      <div className={variant === "compact" ? "space-y-2" : "space-y-3"}>
        {recommendations.map((rec) => (
          <PatternInsightCard
            key={rec.pattern.id}
            pattern={rec.pattern}
            matchScore={rec.matchScore}
            reasoning={rec.reasoning}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
}
