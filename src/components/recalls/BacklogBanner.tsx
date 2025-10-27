import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface BacklogBannerProps {
  pastDue: number;
  dueToday: number;
  upcoming: number;
}

export function BacklogBanner({ pastDue, dueToday, upcoming }: BacklogBannerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const handleCreateIssue = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("recalls-create-issue", {
        body: { pastDue, dueToday, upcoming },
      });

      if (error) throw error;

      toast.success("Issue created for meeting review");
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    } catch (error) {
      console.error("Error creating issue:", error);
      toast.error("Failed to create issue");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="text-lg font-semibold">Recall Backlog Alert</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>
          The recall backlog has exceeded the threshold with <strong>{pastDue} past due</strong> recalls.
          This requires immediate attention to prevent patient follow-up gaps.
        </p>
        <div className="flex gap-4 text-sm">
          <span>Past Due: <strong>{pastDue}</strong></span>
          <span>Due Today: <strong>{dueToday}</strong></span>
          <span>Upcoming: <strong>{upcoming}</strong></span>
        </div>
        <Button
          onClick={handleCreateIssue}
          disabled={isCreating}
          size="sm"
          className="mt-2"
        >
          {isCreating ? "Creating Issue..." : "Create Issue for Meeting"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
