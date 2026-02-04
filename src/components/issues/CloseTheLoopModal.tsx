import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Zap, X, Clock, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateInterventionFromIssueModal } from "./CreateInterventionFromIssueModal";
import { WhyAmISeeingThisDialog, WhyAmISeeingThisLink } from "@/components/shared/WhyAmISeeingThisDialog";
type ResolutionType = 'intervention_created' | 'no_intervention_needed' | 'defer' | 'unknown';

interface CloseTheLoopModalProps {
  open: boolean;
  onClose: () => void;
  issue: {
    id: string;
    title: string;
    context?: string | null;
    organization_id: string;
  };
  onResolved: () => void;
}

export const CloseTheLoopModal = ({
  open,
  onClose,
  issue,
  onResolved,
}: CloseTheLoopModalProps) => {
  const [resolutionNote, setResolutionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [showWhyDialog, setShowWhyDialog] = useState(false);
  const { toast } = useToast();
  const handleResolve = async (resolutionType: ResolutionType) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update issue with resolution fields
      const { error: updateError } = await supabase
        .from("issues")
        .update({
          status: "solved",
          solved_at: new Date().toISOString(),
          resolution_type: resolutionType,
          resolution_note: resolutionNote || null,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq("id", issue.id);

      if (updateError) throw updateError;

      // Log the resolution event
      const { error: eventError } = await supabase
        .from("issue_resolution_events")
        .insert({
          organization_id: issue.organization_id,
          issue_id: issue.id,
          event_type: "resolved",
          resolution_type: resolutionType,
          note: resolutionNote || null,
          created_by: user.id,
        });

      if (eventError) throw eventError;

      toast({
        title: "Issue resolved",
        description: resolutionType === 'no_intervention_needed' 
          ? "Issue closed without intervention" 
          : resolutionType === 'defer' 
            ? "Decision deferred for later"
            : "Issue marked as resolved",
      });

      onResolved();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateIntervention = () => {
    setShowInterventionModal(true);
  };

  const handleInterventionCreated = async (interventionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update issue with intervention link
      const { error: updateError } = await supabase
        .from("issues")
        .update({
          status: "solved",
          solved_at: new Date().toISOString(),
          resolution_type: 'intervention_created',
          resolution_note: resolutionNote || null,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          linked_intervention_id: interventionId,
        })
        .eq("id", issue.id);

      if (updateError) throw updateError;

      // Log resolved event
      await supabase
        .from("issue_resolution_events")
        .insert({
          organization_id: issue.organization_id,
          issue_id: issue.id,
          event_type: "resolved",
          resolution_type: 'intervention_created',
          linked_intervention_id: interventionId,
          note: resolutionNote || null,
          created_by: user.id,
        });

      // Log intervention linked event
      await supabase
        .from("issue_resolution_events")
        .insert({
          organization_id: issue.organization_id,
          issue_id: issue.id,
          event_type: "intervention_linked",
          linked_intervention_id: interventionId,
          created_by: user.id,
        });

      toast({
        title: "Issue resolved with intervention",
        description: "The solution is now being tracked as an intervention.",
      });

      setShowInterventionModal(false);
      onResolved();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error linking intervention",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open && !showInterventionModal} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Close the Loop
            </DialogTitle>
            <DialogDescription className="text-left">
              In EOS, IDS ends with execution. Did you create an intervention to implement this solution?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-medium text-foreground">{issue.title}</p>
              {issue.context && (
                <p className="text-xs text-muted-foreground mt-1">{issue.context}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution-note">Resolution notes (optional)</Label>
              <Textarea
                id="resolution-note"
                placeholder="What was decided? Any context for the team..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={2}
              />
            </div>

            {/* Explainability link */}
            <WhyAmISeeingThisLink onClick={() => setShowWhyDialog(true)} />
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={handleCreateIntervention}
              className="w-full justify-start gap-2"
              disabled={isSubmitting}
            >
              <Zap className="w-4 h-4" />
              Create Intervention
              <span className="ml-auto text-xs opacity-70">Recommended</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleResolve('no_intervention_needed')}
              className="w-full justify-start gap-2"
              disabled={isSubmitting}
            >
              <X className="w-4 h-4" />
              No intervention needed
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => handleResolve('defer')}
              className="w-full justify-start gap-2 text-muted-foreground"
              disabled={isSubmitting}
            >
              <Clock className="w-4 h-4" />
              Defer / decide later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateInterventionFromIssueModal
        open={showInterventionModal}
        onClose={() => setShowInterventionModal(false)}
        issue={{
          id: issue.id,
          title: issue.title,
          context: issue.context,
          organization_id: issue.organization_id,
        }}
        onSuccess={handleInterventionCreated}
      />

      <WhyAmISeeingThisDialog
        open={showWhyDialog}
        onClose={() => setShowWhyDialog(false)}
        context="issue-resolution"
      />
    </>
  );
};
