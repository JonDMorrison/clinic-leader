/**
 * RecommendationCard - Displays a single intervention recommendation
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Lightbulb,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Clock,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import {
  getConfidenceLabel,
  formatConfidenceExplanation,
} from "@/lib/interventions/recommendationSummaryAI";
import type { RecommendationReason } from "@/lib/interventions/generateRecommendations";

interface RecommendationCardProps {
  id: string;
  interventionType: string;
  templateName: string;
  confidenceScore: number;
  evidenceSummary: string;
  reason: RecommendationReason;
  suggestedDurationDays: number;
  suggestedActions: string[];
  onAccept: (id: string) => void;
  onDismiss: (id: string, reason?: string) => void;
  isAccepting?: boolean;
  isDismissing?: boolean;
  canAccept?: boolean;
}

export function RecommendationCard({
  id,
  interventionType,
  templateName,
  confidenceScore,
  evidenceSummary,
  reason,
  suggestedDurationDays,
  suggestedActions,
  onAccept,
  onDismiss,
  isAccepting = false,
  isDismissing = false,
  canAccept = true,
}: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const confidenceLabel = getConfidenceLabel(confidenceScore);
  const confidenceExplanations = formatConfidenceExplanation(reason.confidence_components);
  const confidencePercent = Math.round(confidenceScore * 100);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">
                {templateName}
              </CardTitle>
              <p className="text-xs text-muted-foreground capitalize">
                {interventionType.replace("_", " ")} intervention
              </p>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant={confidenceLabel.variant as any}>
                  {confidencePercent}% confidence
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="font-medium mb-1">{confidenceLabel.label} Confidence</p>
                <ul className="text-xs space-y-0.5">
                  {confidenceExplanations.map((exp, i) => (
                    <li key={i}>• {exp}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Evidence summary */}
        <p className="text-sm text-muted-foreground">{evidenceSummary}</p>

        {/* Key stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{reason.matched_cases_count} cases</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
            <span>{reason.historical_success_rate}% success</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{suggestedDurationDays} days</span>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-medium">{confidencePercent}%</span>
          </div>
          <Progress value={confidencePercent} className="h-1.5" />
        </div>

        {/* Expandable details */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between px-2 h-7"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-xs">View evidence</span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>

        {expanded && (
          <div className="space-y-3 pt-2 border-t">
            {/* Historical stats */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium">Historical Performance</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-background">
                  <p className="text-muted-foreground">Avg improvement</p>
                  <p className="font-medium text-green-600">
                    +{reason.avg_improvement_percent.toFixed(1)}%
                  </p>
                </div>
                <div className="p-2 rounded bg-background">
                  <p className="text-muted-foreground">Median improvement</p>
                  <p className="font-medium text-green-600">
                    +{reason.median_improvement_percent.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Context notes */}
            {reason.similar_context_notes.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium">Evidence Notes</h4>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {reason.similar_context_notes.map((note, i) => (
                    <li key={i}>• {note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested actions */}
            {suggestedActions.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium">Common Actions</h4>
                <div className="flex flex-wrap gap-1">
                  {suggestedActions.map((action, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {action}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onAccept(id)}
            disabled={isAccepting || isDismissing || !canAccept}
          >
            {isAccepting ? (
              <>Creating...</>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 mr-1" />
                Accept
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDismiss(id)}
            disabled={isAccepting || isDismissing}
          >
            {isDismissing ? (
              <>...</>
            ) : (
              <>
                <X className="h-3.5 w-3.5 mr-1" />
                Dismiss
              </>
            )}
          </Button>
        </div>

        {!canAccept && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            <span>Manager permission required to create interventions</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
