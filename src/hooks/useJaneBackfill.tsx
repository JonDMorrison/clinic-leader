import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, subWeeks, format } from "date-fns";
import { JobTracker } from "@/utils/jobTracker";

interface BackfillResult {
  success: boolean;
  inserted: number;
  skipped: number;
  errors: number;
  totalMetrics: number;
  totalWeeks: number;
}

export const useJaneBackfill = (organizationId: string | undefined) => {
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const backfillMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) {
        throw new Error("No organization ID provided");
      }

      const job = await JobTracker.startJob("jane-sync-backfill", { organizationId });

      try {
        // Generate last 12 weeks (Mondays)
        const weekStarts = Array.from({ length: 12 }, (_, i) => {
          const date = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
          return format(date, "yyyy-MM-dd");
        }).reverse();

        setProgress(10);

        const { data, error } = await supabase.functions.invoke('backfill-jane-history', {
          body: { organizationId, weekStarts }
        });

        if (error) {
          await job.complete(false, error);
          throw error;
        }

        setProgress(100);
        await job.complete(true, data);
        return data as BackfillResult;
      } catch (e) {
        await job.complete(false, e);
        throw e;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["metric-results"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });

      toast({
        title: "Backfill complete",
        description: `✓ ${data.inserted} entries added, ${data.skipped} skipped, ${data.errors} errors across ${data.totalMetrics} metrics.`,
      });

      setProgress(0);
    },
    onError: (error) => {
      toast({
        title: "Backfill failed",
        description: String(error),
        variant: "destructive",
      });
      setProgress(0);
    },
  });

  return {
    backfill: backfillMutation.mutate,
    isBackfilling: backfillMutation.isPending,
    progress,
  };
};
