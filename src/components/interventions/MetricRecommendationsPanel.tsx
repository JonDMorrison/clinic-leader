/**
 * MetricRecommendationsPanel - Shows intervention recommendations for a metric
 * Displays when metric is off-track and recommendations exist
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { RecommendationCard } from "./RecommendationCard";
import { PlaybookSuggestionPanel } from "./PlaybookSuggestionPanel";
import { RecommendationDetailModal } from "./RecommendationDetailModal";
import {
  generateRecommendationsForMetric,
  storeRecommendations,
  getActiveRecommendations,
  type RecommendationCandidate,
  type RecommendationReason,
} from "@/lib/interventions/generateRecommendations";
import { canCreateIntervention } from "@/lib/interventions/permissions";

interface MetricRecommendationsPanelProps {
  metricId: string;
  metricName: string;
  periodKey: string;
  currentValue: number | null;
  isOffTrack: boolean;
}

interface StoredRecommendation {
  id: string;
  recommended_intervention_template: RecommendationCandidate;
  confidence_score: number;
  evidence_summary: string;
  recommendation_reason: RecommendationReason;
}

export function MetricRecommendationsPanel({
  metricId,
  metricName,
  periodKey,
  currentValue,
  isOffTrack,
}: MetricRecommendationsPanelProps) {
  const { data: currentUser } = useCurrentUser();
  const { data: roleData } = useIsAdmin();
  const queryClient = useQueryClient();
  const [selectedRec, setSelectedRec] = useState<StoredRecommendation | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const organizationId = currentUser?.team_id;
  const canCreate = canCreateIntervention(roleData);

  // Fetch existing recommendations
  const { data: recommendations = [], isLoading, refetch } = useQuery({
    queryKey: ["metric-recommendations", metricId, periodKey],
    queryFn: async () => {
      if (!organizationId) return [];
      const recs = await getActiveRecommendations(organizationId, metricId, periodKey);
      return recs as unknown as StoredRecommendation[];
    },
    enabled: !!organizationId && !!metricId && isOffTrack,
  });

  // Generate new recommendations
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");
      const newRecs = await generateRecommendationsForMetric(
        organizationId,
        metricId,
        periodKey,
        currentValue
      );
      if (newRecs.length > 0) {
        await storeRecommendations(newRecs);
      }
      return newRecs.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["metric-recommendations", metricId] });
      if (count > 0) {
        toast.success(`Generated ${count} recommendation${count > 1 ? "s" : ""}`);
      } else {
        toast.info("No recommendations available. Need more historical data.");
      }
    },
    onError: (error) => {
      toast.error("Failed to generate recommendations: " + (error as Error).message);
    },
  });

  // Accept recommendation - create intervention
  const acceptMutation = useMutation({
    mutationFn: async (recId: string) => {
      const rec = recommendations.find((r) => r.id === recId);
      if (!rec) throw new Error("Recommendation not found");

      const template = rec.recommended_intervention_template;

      // Create intervention from template
      const { data: intervention, error: intError } = await supabase
        .from("interventions")
        .insert({
          organization_id: organizationId!,
          title: `${template.template_name} - ${metricName}`,
          description: template.evidence_summary,
          intervention_type: template.intervention_type,
          status: "planned",
          expected_time_horizon_days: template.suggested_duration_days,
          tags: template.suggested_actions,
          created_by: currentUser!.id,
          owner_user_id: currentUser!.id,
        })
        .select()
        .single();

      if (intError) throw intError;

      // Link metric with baseline capture
      const { error: linkError } = await supabase
        .from("intervention_metric_links")
        .insert({
          intervention_id: intervention.id,
          metric_id: metricId,
          baseline_value: currentValue,
          baseline_period_start: `${periodKey}-01`,
          expected_direction: "up",
        });

      if (linkError) throw linkError;

      // Mark recommendation as accepted
      await supabase
        .from("intervention_recommendations")
        .update({
          accepted: true,
          accepted_at: new Date().toISOString(),
          accepted_by: currentUser!.id,
          accepted_intervention_id: intervention.id,
        })
        .eq("id", recId);

      return intervention;
    },
    onSuccess: (intervention) => {
      queryClient.invalidateQueries({ queryKey: ["metric-recommendations", metricId] });
      queryClient.invalidateQueries({ queryKey: ["interventions"] });
      toast.success("Intervention created from recommendation", {
        action: {
          label: "View",
          onClick: () => window.location.href = `/interventions/${intervention.id}`,
        },
      });
      setAcceptingId(null);
    },
    onError: (error) => {
      toast.error("Failed to create intervention: " + (error as Error).message);
      setAcceptingId(null);
    },
  });

  // Dismiss recommendation
  const dismissMutation = useMutation({
    mutationFn: async ({ recId, reason }: { recId: string; reason?: string }) => {
      await supabase
        .from("intervention_recommendations")
        .update({
          dismissed: true,
          dismissed_at: new Date().toISOString(),
          dismissed_by: currentUser!.id,
          dismissed_reason: reason || null,
        })
        .eq("id", recId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-recommendations", metricId] });
      toast.success("Recommendation dismissed");
      setDismissingId(null);
    },
    onError: (error) => {
      toast.error("Failed to dismiss: " + (error as Error).message);
      setDismissingId(null);
    },
  });

  const handleAccept = (recId: string) => {
    setAcceptingId(recId);
    acceptMutation.mutate(recId);
  };

  const handleDismiss = (recId: string, reason?: string) => {
    setDismissingId(recId);
    dismissMutation.mutate({ recId, reason });
  };

  // Don't show if not off-track
  if (!isOffTrack) return null;

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Lightbulb className="h-4 w-4" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lightbulb className="h-4 w-4 text-primary" />
              Recommended Interventions
              {recommendations.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {recommendations.length}
                </Badge>
              )}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1" />
              )}
              {recommendations.length > 0 ? "Refresh" : "Generate"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Based on historical intervention outcomes for this metric
          </p>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No recommendations available. Click "Generate" to analyze historical patterns,
                or build more intervention history for this metric.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  id={rec.id}
                  interventionType={rec.recommended_intervention_template.intervention_type}
                  templateName={rec.recommended_intervention_template.template_name}
                  confidenceScore={rec.confidence_score}
                  evidenceSummary={rec.evidence_summary}
                  reason={rec.recommendation_reason}
                  suggestedDurationDays={rec.recommended_intervention_template.suggested_duration_days}
                  suggestedActions={rec.recommended_intervention_template.suggested_actions}
                  onAccept={handleAccept}
                  onDismiss={handleDismiss}
                  isAccepting={acceptingId === rec.id}
                  isDismissing={dismissingId === rec.id}
                  canAccept={canCreate}
                />
              ))}
            </div>
          )}
          
          {/* Playbooks Section */}
          <PlaybookSuggestionPanel 
            metricId={metricId} 
            className="mt-4 border-t pt-4"
          />
        </CardContent>
      </Card>

      {selectedRec && (
        <RecommendationDetailModal
          open={!!selectedRec}
          onClose={() => setSelectedRec(null)}
          recommendation={selectedRec}
          onAccept={() => handleAccept(selectedRec.id)}
          onDismiss={(reason) => handleDismiss(selectedRec.id, reason)}
          canAccept={canCreate}
        />
      )}
    </>
  );
}
