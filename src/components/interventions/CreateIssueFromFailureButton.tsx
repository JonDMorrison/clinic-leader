/**
 * CreateIssueFromFailureButton - Button to create an issue from a failed intervention
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  detectFailedInterventions, 
  createIssueFromFailedIntervention 
} from "@/lib/interventions/failedInterventionDetection";

interface CreateIssueFromFailureButtonProps {
  interventionId: string;
  organizationId: string;
  interventionTitle: string;
  disabled?: boolean;
  hasExistingIssue: boolean;
}

export function CreateIssueFromFailureButton({
  interventionId,
  organizationId,
  interventionTitle,
  disabled = false,
  hasExistingIssue,
}: CreateIssueFromFailureButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createIssueMutation = useMutation({
    mutationFn: async () => {
      // First detect if this intervention has failed
      const detection = await detectFailedInterventions(organizationId);
      
      const failedIntervention = detection.failed_interventions.find(
        (f) => f.id === interventionId
      );

      if (!failedIntervention) {
        throw new Error("This intervention has not failed or hasn't been evaluated yet");
      }

      if (detection.already_have_issues.includes(interventionId)) {
        throw new Error("An issue already exists for this intervention");
      }

      const issueId = await createIssueFromFailedIntervention(failedIntervention);
      if (!issueId) {
        throw new Error("Failed to create issue");
      }

      return issueId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intervention-linked-issue", interventionId] });
      toast({
        title: "Issue created",
        description: "An issue has been created for this failed intervention.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cannot create issue",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (hasExistingIssue) {
    return null; // Don't show button if issue already exists
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => createIssueMutation.mutate()}
      disabled={disabled || createIssueMutation.isPending}
      className="border-orange-500/50 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30"
    >
      {createIssueMutation.isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <AlertTriangle className="h-4 w-4 mr-2" />
      )}
      Create Issue from Failure
    </Button>
  );
}
