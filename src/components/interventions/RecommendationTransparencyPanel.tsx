/**
 * RecommendationTransparencyPanel - Enhanced evidence breakdown for recommendations
 * 
 * Displays:
 * - Similar interventions count
 * - Success rate
 * - Average impact
 * - Cohort description
 * - Last seen timestamp
 * - Similarity factors breakdown
 * - Confidence calculation components
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  TrendingUp,
  BarChart3,
  Clock,
  Calculator,
  Layers,
  Target,
  GitCompare,
  CalendarClock,
  Info,
  Brain,
} from "lucide-react";
import type { RecommendationReason } from "@/lib/interventions/generateRecommendations";

interface RecommendationTransparencyPanelProps {
  reason: RecommendationReason;
  metricName?: string;
  interventionType: string;
  suggestedDurationDays: number;
}

interface ConfidenceComponentRowProps {
  label: string;
  value: number;
  weight: number;
  description: string;
  icon: React.ReactNode;
}

function ConfidenceComponentRow({ 
  label, 
  value, 
  weight, 
  description, 
  icon 
}: ConfidenceComponentRowProps) {
  const normalizedValue = Math.round(value * 100);
  const weightedContribution = Math.round(value * weight * 100);
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{label}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs">{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {normalizedValue}% × {weight * 100}%
          </span>
          <span className="font-medium w-12 text-right">
            = {weightedContribution}
          </span>
        </div>
      </div>
      <Progress value={normalizedValue} className="h-1.5" />
    </div>
  );
}

export function RecommendationTransparencyPanel({
  reason,
  metricName,
  interventionType,
  suggestedDurationDays,
}: RecommendationTransparencyPanelProps) {
  const { confidence_components, crossOrgPatternInsight } = reason;
  
  // Calculate total confidence
  const totalConfidence = Math.round(
    (confidence_components.historicalSuccessRate * 0.35 +
      confidence_components.sampleSizeScore * 0.25 +
      confidence_components.similarityScore * 0.25 +
      confidence_components.recencyScore * 0.15) * 100
  );

  // Format cohort description
  const cohortDescription = [
    `${reason.matched_cases_count} similar interventions`,
    interventionType && `of type "${interventionType.replace(/_/g, " ")}"`,
    metricName && `targeting "${metricName}"`,
  ].filter(Boolean).join(" ");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Why This Recommendation?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Key Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Similar Cases</span>
            </div>
            <p className="text-lg font-semibold">{reason.matched_cases_count}</p>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Success Rate</span>
            </div>
            <p className="text-lg font-semibold text-green-600">
              {reason.historical_success_rate}%
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Avg. Impact</span>
            </div>
            <p className="text-lg font-semibold text-blue-600">
              +{reason.avg_improvement_percent.toFixed(1)}%
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Typical Duration</span>
            </div>
            <p className="text-lg font-semibold">{suggestedDurationDays}d</p>
          </div>
        </div>

        {/* Cohort Description */}
        <div className="p-3 rounded-lg border bg-background">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Cohort Description</span>
          </div>
          <p className="text-sm text-muted-foreground">{cohortDescription}</p>
          {reason.typical_time_to_result_days > 0 && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              <span>
                Typical time to see results: {reason.typical_time_to_result_days} days
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Similarity Factors */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-primary" />
            Similarity Factors
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-muted/30 flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Same metric category</span>
            </div>
            <div className="p-2 rounded bg-muted/30 flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Same intervention type</span>
            </div>
            <div className="p-2 rounded bg-muted/30 flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Similar deviation range</span>
            </div>
            <div className="p-2 rounded bg-muted/30 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Similar time horizon</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Confidence Calculation Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              Confidence Calculation
            </h4>
            <Badge variant="secondary">
              Total: {totalConfidence}%
            </Badge>
          </div>
          
          <div className="space-y-4">
            <ConfidenceComponentRow
              label="Historical Success"
              value={confidence_components.historicalSuccessRate}
              weight={0.35}
              description="How often this intervention type succeeded historically (weighted 35%)"
              icon={<TrendingUp className="h-4 w-4 text-green-600" />}
            />
            
            <ConfidenceComponentRow
              label="Sample Size"
              value={confidence_components.sampleSizeScore}
              weight={0.25}
              description="Statistical confidence from number of similar cases (weighted 25%, optimal at 10+)"
              icon={<Users className="h-4 w-4 text-blue-600" />}
            />
            
            <ConfidenceComponentRow
              label="Similarity Match"
              value={confidence_components.similarityScore}
              weight={0.25}
              description="How similar current conditions are to historical cases (weighted 25%)"
              icon={<GitCompare className="h-4 w-4 text-purple-600" />}
            />
            
            <ConfidenceComponentRow
              label="Recency"
              value={confidence_components.recencyScore}
              weight={0.15}
              description="Recent patterns weighted higher, decays over 180 days (weighted 15%)"
              icon={<CalendarClock className="h-4 w-4 text-orange-600" />}
            />
          </div>
        </div>

        {/* Cross-Org Pattern Insight */}
        {crossOrgPatternInsight && (
          <>
            <Separator />
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Cross-Organization Insight</span>
                <Badge variant="outline" className="text-[10px]">
                  Anonymized
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Pattern Confidence</p>
                  <p className="font-medium">{crossOrgPatternInsight.patternConfidence.toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cross-Org Success Rate</p>
                  <p className="font-medium text-green-600">
                    {crossOrgPatternInsight.patternSuccessRate.toFixed(0)}%
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Sample Across Organizations</p>
                  <p className="font-medium">{crossOrgPatternInsight.patternSampleSize} interventions</p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
