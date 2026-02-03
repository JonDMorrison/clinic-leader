/**
 * RecommendationDetailModal - Full details and evidence for a recommendation
 * 
 * HARDENED: Shows complete explainability including formula, evidence, and exclusions
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  X,
  BarChart3,
  Clock,
  TrendingUp,
  Target,
  AlertCircle,
  FileText,
} from "lucide-react";
import {
  getConfidenceLabel,
  formatConfidenceExplanation,
} from "@/lib/interventions/recommendationSummaryAI";
import type {
  RecommendationCandidate,
  RecommendationReason,
} from "@/lib/interventions/generateRecommendations";
import { RecommendationEvidencePanel } from "./RecommendationEvidencePanel";

interface StoredRecommendation {
  id: string;
  recommended_intervention_template: RecommendationCandidate;
  confidence_score: number;
  evidence_summary: string;
  recommendation_reason: RecommendationReason;
}

interface RecommendationDetailModalProps {
  open: boolean;
  onClose: () => void;
  recommendation: StoredRecommendation;
  onAccept: () => void;
  onDismiss: (reason?: string) => void;
  canAccept?: boolean;
  isAccepting?: boolean;
  isDismissing?: boolean;
}

export function RecommendationDetailModal({
  open,
  onClose,
  recommendation,
  onAccept,
  onDismiss,
  canAccept = true,
  isAccepting = false,
  isDismissing = false,
}: RecommendationDetailModalProps) {
  const [dismissMode, setDismissMode] = useState(false);
  const [dismissReason, setDismissReason] = useState("");

  const template = recommendation.recommended_intervention_template;
  const reason = recommendation.recommendation_reason;
  const confidenceLabel = getConfidenceLabel(recommendation.confidence_score);
  const confidenceExplanations = formatConfidenceExplanation(reason.confidence_components);
  const confidencePercent = Math.round(recommendation.confidence_score * 100);

  const handleDismiss = () => {
    if (dismissMode) {
      onDismiss(dismissReason || undefined);
      setDismissMode(false);
      setDismissReason("");
    } else {
      setDismissMode(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant={confidenceLabel.variant as any}>
              {confidencePercent}% confidence
            </Badge>
            <Badge variant="outline" className="capitalize">
              {template.intervention_type.replace("_", " ")}
            </Badge>
          </div>
          <DialogTitle>{template.template_name}</DialogTitle>
          <DialogDescription>{recommendation.evidence_summary}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="evidence" className="gap-1">
              <FileText className="h-3 w-3" />
              Full Evidence
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4 mt-4">
            {/* Confidence breakdown */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Confidence Analysis</h4>
              <Progress value={confidencePercent} className="h-2" />
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {confidenceExplanations.map((exp, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-green-600" />
                    {exp}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* Historical stats */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Historical Evidence</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cases analyzed</p>
                    <p className="text-sm font-medium">{reason.matched_cases_count}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Success rate</p>
                    <p className="text-sm font-medium">{reason.historical_success_rate}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Avg improvement</p>
                    <p className="text-sm font-medium text-green-600">
                      +{reason.avg_improvement_percent.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time to results</p>
                    <p className="text-sm font-medium">
                      ~{reason.typical_time_to_result_days} days
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Context notes */}
            {reason.similar_context_notes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Evidence Notes</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {reason.similar_context_notes.map((note, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Suggested actions */}
            {template.suggested_actions.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Common Actions from Past Interventions</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {template.suggested_actions.map((action, i) => (
                      <Badge key={i} variant="secondary">
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Dismiss reason input */}
            {dismissMode && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="dismiss-reason">Why are you dismissing this? (optional)</Label>
                  <Textarea
                    id="dismiss-reason"
                    placeholder="This helps improve future recommendations..."
                    value={dismissReason}
                    onChange={(e) => setDismissReason(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}

            {!canAccept && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 text-warning text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Manager permission required to create interventions</span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="evidence" className="mt-4">
            <RecommendationEvidencePanel
              recommendationId={recommendation.id}
              confidenceComponents={reason.confidence_components}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          {dismissMode ? (
            <>
              <Button variant="outline" onClick={() => setDismissMode(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDismiss}
                disabled={isDismissing}
              >
                <X className="h-4 w-4 mr-1" />
                Confirm Dismiss
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleDismiss}
                disabled={isAccepting || isDismissing}
              >
                <X className="h-4 w-4 mr-1" />
                Dismiss
              </Button>
              <Button
                onClick={onAccept}
                disabled={isAccepting || isDismissing || !canAccept}
              >
                {isAccepting ? (
                  "Creating..."
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Accept & Create Intervention
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
