import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, Target, CheckCircle2, X, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { ScorecardAlignmentDialog } from "@/components/scorecard/ScorecardAlignmentDialog";
import { RockAlignmentDialog } from "@/components/rocks/RockAlignmentDialog";

interface ImpactResult {
  changed_sections: string[];
  impact_score: number;
  scorecard_impact: boolean;
  rocks_impact: boolean;
  reasoning: string;
  section_details: {
    section: string;
    change_type: string;
    description: string;
  }[];
}

const SECTION_NAMES: Record<string, string> = {
  core_values: "Core Values",
  core_focus: "Core Focus",
  ten_year_target: "10-Year Target",
  marketing_strategy: "Marketing Strategy",
  three_year_picture: "3-Year Picture",
  one_year_plan: "1-Year Plan",
  quarterly_rocks: "Quarterly Rocks",
};

function getImpactLevel(score: number): { label: string; color: string } {
  if (score >= 0.7) return { label: "High", color: "text-destructive" };
  if (score >= 0.45) return { label: "Medium", color: "text-warning" };
  if (score >= 0.15) return { label: "Low", color: "text-muted-foreground" };
  return { label: "Minimal", color: "text-muted-foreground" };
}

export function VTOAlignmentBanner() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [scorecardDialogOpen, setScorecardDialogOpen] = useState(false);
  const [rocksDialogOpen, setRocksDialogOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch team alignment status and impact result
  const { data: alignmentData, isLoading } = useQuery({
    queryKey: ["alignment-status", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;

      const { data, error } = await supabase
        .from("teams")
        .select("needs_scorecard_review, needs_rocks_review, vto_last_impact_result")
        .eq("id", currentUser.team_id)
        .single();

      if (error) throw error;
      return {
        needs_scorecard_review: data.needs_scorecard_review,
        needs_rocks_review: data.needs_rocks_review,
        vto_last_impact_result: data.vto_last_impact_result as unknown as ImpactResult | null,
      };
    },
    enabled: !!currentUser?.team_id,
  });

  // Mutation to clear the review flag after alignment review is complete
  const clearFlagMutation = useMutation({
    mutationFn: async (flagType: "scorecard" | "rocks") => {
      if (!currentUser?.team_id) return;
      
      const updateData = flagType === "scorecard" 
        ? { needs_scorecard_review: false }
        : { needs_rocks_review: false };

      const { error } = await supabase
        .from("teams")
        .update(updateData)
        .eq("id", currentUser.team_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alignment-status"] });
    },
  });

  const handleScorecardComplete = () => {
    clearFlagMutation.mutate("scorecard");
  };

  const handleRocksComplete = () => {
    clearFlagMutation.mutate("rocks");
  };

  if (isLoading || !alignmentData || dismissed) return null;

  const needsScorecardReview = alignmentData.needs_scorecard_review;
  const needsRocksReview = alignmentData.needs_rocks_review;
  const impactResult = alignmentData.vto_last_impact_result;

  if (!needsScorecardReview && !needsRocksReview) return null;

  const impactLevel = impactResult ? getImpactLevel(impactResult.impact_score) : null;

  return (
    <>
      <Alert className="border-warning/50 bg-warning/5 mb-6">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertDescription className="flex flex-col w-full gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-medium">Your V/TO has changed.</span>
              {impactResult && (
                <Badge variant="outline" className={impactLevel?.color}>
                  Impact: {impactLevel?.label} ({Math.round(impactResult.impact_score * 100)}%)
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {needsScorecardReview && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setScorecardDialogOpen(true)}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Review Scorecard
                </Button>
              )}
              {needsRocksReview && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRocksDialogOpen(true)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Review Rocks
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDismissed(true)}
                title="Dismiss for this session"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Impact Details Collapsible */}
          {impactResult && impactResult.section_details?.length > 0 && (
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between px-2 py-1 h-auto">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="w-3 h-3" />
                    Why this review is recommended
                  </span>
                  {showDetails ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="bg-background/50 rounded-lg p-3 space-y-3">
                  {/* Changed Sections */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Changed Sections:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {impactResult.section_details.map((detail, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {SECTION_NAMES[detail.section] || detail.section}
                          {detail.description && (
                            <span className="ml-1 text-muted-foreground">({detail.description})</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Impact Analysis */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Target className="w-3 h-3 text-muted-foreground" />
                      <span>Scorecard Impact:</span>
                      <span className={impactResult.scorecard_impact ? "text-warning font-medium" : "text-muted-foreground"}>
                        {impactResult.scorecard_impact ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
                      <span>Rocks Impact:</span>
                      <span className={impactResult.rocks_impact ? "text-warning font-medium" : "text-muted-foreground"}>
                        {impactResult.rocks_impact ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>

                  {/* Reasoning */}
                  {impactResult.reasoning && (
                    <p className="text-xs text-muted-foreground italic">
                      {impactResult.reasoning}
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </AlertDescription>
      </Alert>

      <ScorecardAlignmentDialog
        open={scorecardDialogOpen}
        onOpenChange={setScorecardDialogOpen}
        onComplete={handleScorecardComplete}
      />

      <RockAlignmentDialog
        open={rocksDialogOpen}
        onOpenChange={setRocksDialogOpen}
        onComplete={handleRocksComplete}
      />
    </>
  );
}