import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Target, CheckCircle2, X } from "lucide-react";
import { ScorecardAlignmentDialog } from "@/components/scorecard/ScorecardAlignmentDialog";
import { RockAlignmentDialog } from "@/components/rocks/RockAlignmentDialog";

export function VTOAlignmentBanner() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [scorecardDialogOpen, setScorecardDialogOpen] = useState(false);
  const [rocksDialogOpen, setRocksDialogOpen] = useState(false);

  // Fetch team alignment status
  const { data: alignmentStatus, isLoading } = useQuery({
    queryKey: ["alignment-status", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;

      const { data, error } = await supabase
        .from("teams")
        .select("needs_scorecard_review, needs_rocks_review")
        .eq("id", currentUser.team_id)
        .single();

      if (error) throw error;
      return data;
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

  if (isLoading || !alignmentStatus || dismissed) return null;

  const needsScorecardReview = alignmentStatus.needs_scorecard_review;
  const needsRocksReview = alignmentStatus.needs_rocks_review;

  if (!needsScorecardReview && !needsRocksReview) return null;

  return (
    <>
      <Alert className="border-warning/50 bg-warning/5 mb-6">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-medium">Your V/TO has changed.</span>
            <span className="text-muted-foreground text-sm">
              Your Scorecard and Rocks may no longer fully align. You can review them at any time.
            </span>
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
