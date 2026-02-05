/**
 * OutcomeIntelligenceCard - Executive-friendly intervention outcome summary
 * 
 * Displays:
 * - Intervention title
 * - Linked metric
 * - Expected vs actual direction
 * - Actual delta %
 * - Confidence level
 * - Execution health score
 * - Baseline quality indicator
 * - AI summary narrative
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Sparkles,
  Activity,
  ShieldCheck,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { 
  classifyOutcome, 
  getConfidenceLabel, 
  getConfidenceVariant,
  type OutcomeClassification 
} from "@/lib/interventions/outcomeClassification";
import { BaselineQualityBadge } from "./BaselineQualityBadge";
import { ExecutionHealthBadge } from "./ExecutionHealthBadge";
import type { BaselineQualityFlag } from "@/lib/interventions/baselineValidation";

export interface OutcomeIntelligenceData {
  interventionId: string;
  interventionTitle: string;
  interventionStatus: string;
  interventionType: string;
  metricName: string | null;
  metricId?: string | null;
  expectedDirection: string | null;
  actualDeltaPercent: number | null;
  confidenceScore: number | null;
  executionHealthScore: number | null;
  baselineQualityFlag: BaselineQualityFlag | null;
  aiSummary: string | null;
  evaluatedAt: string | null;
}

interface OutcomeIntelligenceCardProps {
  data: OutcomeIntelligenceData;
  variant?: "compact" | "full";
  showLink?: boolean;
  className?: string;
}

export function OutcomeIntelligenceCard({
  data,
  variant = "full",
  showLink = true,
  className = "",
}: OutcomeIntelligenceCardProps) {
  const classification = classifyOutcome({
    actualDeltaPercent: data.actualDeltaPercent,
    confidenceScore: data.confidenceScore,
    interventionStatus: data.interventionStatus,
    expectedDirection: data.expectedDirection,
  });

  const DirectionIcon = data.actualDeltaPercent === null 
    ? Minus 
    : data.actualDeltaPercent > 0 
      ? TrendingUp 
      : TrendingDown;

  const ExpectedIcon = data.expectedDirection === "up" 
    ? ArrowUpRight 
    : data.expectedDirection === "down" 
      ? ArrowDownRight 
      : Minus;

  const formatDelta = (delta: number | null) => {
    if (delta === null) return "—";
    const sign = delta > 0 ? "+" : "";
    return `${sign}${delta.toFixed(1)}%`;
  };

  if (variant === "compact") {
    return (
      <div 
        className={`border rounded-lg p-3 ${classification.bgColor} ${classification.borderColor} ${className}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="text-sm font-medium truncate">{data.interventionTitle}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {data.metricName && (
                <Badge variant="outline" className="text-[10px]">
                  {data.metricName}
                </Badge>
              )}
              <Badge variant={getConfidenceVariant(data.confidenceScore)} className="text-[10px]">
                {getConfidenceLabel(data.confidenceScore)}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`text-lg font-bold ${classification.color}`}>
              {formatDelta(data.actualDeltaPercent)}
            </div>
            {showLink && (
              <Link to={`/interventions/${data.interventionId}`}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`${classification.borderColor} border-l-4 ${className}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-primary flex-shrink-0" />
              <h4 className="font-semibold truncate">{data.interventionTitle}</h4>
            </div>
            {data.metricName && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                <span>{data.metricName}</span>
              </div>
            )}
          </div>
          
          {/* Classification Badge */}
          <Badge className={`${classification.bgColor} ${classification.color} border ${classification.borderColor}`}>
            {classification.label}
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {/* Actual Delta */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Actual Change
            </p>
            <div className={`flex items-center gap-1 text-lg font-bold ${
              data.actualDeltaPercent === null ? "text-muted-foreground" :
              data.actualDeltaPercent > 0 ? "text-green-600 dark:text-green-400" : 
              data.actualDeltaPercent < 0 ? "text-destructive" : "text-muted-foreground"
            }`}>
              <DirectionIcon className="h-4 w-4" />
              {formatDelta(data.actualDeltaPercent)}
            </div>
          </div>

          {/* Expected Direction */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Expected
            </p>
            <div className="flex items-center gap-1 text-sm">
              <ExpectedIcon className="h-4 w-4" />
              <span className="capitalize">{data.expectedDirection || "—"}</span>
            </div>
          </div>

          {/* Confidence */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Confidence
            </p>
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <Badge variant={getConfidenceVariant(data.confidenceScore)} className="text-xs">
                {getConfidenceLabel(data.confidenceScore)}
              </Badge>
            </div>
          </div>

          {/* Execution Health */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Exec. Health
            </p>
            {data.executionHealthScore !== null ? (
              <ExecutionHealthBadge score={data.executionHealthScore} />
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>

        {/* Baseline Quality */}
        {data.baselineQualityFlag && data.baselineQualityFlag !== "good" && (
          <div className="flex items-center gap-2 mb-3 py-2 px-3 rounded-md bg-muted/50">
            <span className="text-xs text-muted-foreground">Baseline:</span>
            <BaselineQualityBadge flag={data.baselineQualityFlag} size="sm" />
          </div>
        )}

        {/* AI Summary */}
        {data.aiSummary && (
          <div className="pt-3 border-t">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {data.aiSummary}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        {showLink && (
          <div className="pt-3 mt-3 border-t flex justify-end">
            <Link to={`/interventions/${data.interventionId}`}>
              <Button variant="ghost" size="sm" className="h-8">
                View Details
                <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OutcomeIntelligenceCardSkeleton({ variant = "full" }: { variant?: "compact" | "full" }) {
  if (variant === "compact") {
    return (
      <div className="border rounded-lg p-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
