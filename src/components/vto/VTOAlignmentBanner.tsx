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

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: async (type: "scorecard" | "rocks" | "all") => {
      if (!currentUser?.team_id) return;

      const updates: Record<string, boolean> = {};
      if (type === "scorecard" || type === "all") {
        updates.needs_scorecard_review = false;
      }
      if (type === "rocks" || type === "all") {
        updates.needs_rocks_review = false;
      }

      const { error } = await supabase
        .from("teams")
        .update(updates)
        .eq("id", currentUser.team_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alignment-status"] });
    },
  });

  if (isLoading || !alignmentStatus) return null;

  const needsScorecardReview = alignmentStatus.needs_scorecard_review;
  const needsRocksReview = alignmentStatus.needs_rocks_review;

  if (!needsScorecardReview && !needsRocksReview) return null;

  return (
    <>
      <Alert className="border-primary/50 bg-primary/5 mb-6">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <AlertDescription className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="font-medium">Your V/TO has changed.</span>
            <span className="text-muted-foreground">
              Would you like to review Scorecard and Rock alignment?
            </span>
          </div>
          <div className="flex items-center gap-2">
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
              onClick={() => dismissMutation.mutate("all")}
              disabled={dismissMutation.isPending}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <ScorecardAlignmentDialog
        open={scorecardDialogOpen}
        onOpenChange={setScorecardDialogOpen}
        onComplete={() => {
          setScorecardDialogOpen(false);
          dismissMutation.mutate("scorecard");
        }}
      />

      <RockAlignmentDialog
        open={rocksDialogOpen}
        onOpenChange={setRocksDialogOpen}
        onComplete={() => {
          setRocksDialogOpen(false);
          dismissMutation.mutate("rocks");
        }}
      />
    </>
  );
}
