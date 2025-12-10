import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Target, CheckCircle2, X } from "lucide-react";

export function VTOAlignmentBanner() {
  const { data: currentUser } = useCurrentUser();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

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

  if (isLoading || !alignmentStatus || dismissed) return null;

  const needsScorecardReview = alignmentStatus.needs_scorecard_review;
  const needsRocksReview = alignmentStatus.needs_rocks_review;

  if (!needsScorecardReview && !needsRocksReview) return null;

  return (
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
              onClick={() => navigate("/scorecard")}
            >
              <Target className="w-4 h-4 mr-2" />
              Review Scorecard
            </Button>
          )}
          {needsRocksReview && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/rocks")}
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
  );
}
