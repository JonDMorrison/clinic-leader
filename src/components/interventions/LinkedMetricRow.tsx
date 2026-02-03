import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ExpectedDirection } from "@/lib/interventions/types";
import { logInterventionEventAsync } from "@/lib/interventions/eventLogger";

interface LinkedMetricRowProps {
  linkId: string;
  interventionId: string;
  metricName: string;
  expectedDirection: ExpectedDirection;
  expectedMagnitudePercent: number | null;
  baselineValue: number | null;
  baselinePeriodStart: string | null;
  canEdit: boolean;
}

export function LinkedMetricRow({
  linkId,
  interventionId,
  metricName,
  expectedDirection,
  expectedMagnitudePercent,
  baselineValue,
  baselinePeriodStart,
  canEdit,
}: LinkedMetricRowProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("intervention_metric_links")
        .delete()
        .eq("id", linkId);

      if (error) {
        // Handle RLS failures
        if (error.code === "42501" || error.message.includes("permission")) {
          throw new Error("You don't have permission to unlink this metric.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intervention-metrics", interventionId] });
      
      // Log event asynchronously
      logInterventionEventAsync(interventionId, "unlink_metric", {
        link_id: linkId,
        metric_name: metricName,
      });
      
      toast({
        title: "Metric unlinked",
        description: "The metric has been removed from this intervention.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unlink metric",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const directionIcon = expectedDirection === "up" ? "↑" : expectedDirection === "down" ? "↓" : "→";
  const directionColor =
    expectedDirection === "up"
      ? "text-green-600 dark:text-green-400"
      : expectedDirection === "down"
      ? "text-red-600 dark:text-red-400"
      : "text-gray-600 dark:text-gray-400";

  const formatBaselinePeriod = (periodStart: string | null) => {
    if (!periodStart) return null;
    try {
      return format(new Date(periodStart + "T00:00:00"), "MMM yyyy");
    } catch {
      return null;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <span className="font-medium">{metricName}</span>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`gap-1 ${directionColor}`}>
            <span className="text-lg leading-none">{directionIcon}</span>
            {expectedMagnitudePercent !== null && (
              <span>{expectedMagnitudePercent}%</span>
            )}
          </Badge>

          {/* Baseline info */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {baselinePeriodStart ? (
              <span>
                {formatBaselinePeriod(baselinePeriodStart)}:{" "}
                <span className="font-medium text-foreground">
                  {baselineValue !== null ? baselineValue.toLocaleString() : (
                    <span className="italic text-muted-foreground">No baseline yet</span>
                  )}
                </span>
              </span>
            ) : (
              <span className="italic">No baseline yet</span>
            )}
          </div>
        </div>
      </div>

      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => unlinkMutation.mutate()}
          disabled={unlinkMutation.isPending}
          className="text-muted-foreground hover:text-destructive shrink-0"
        >
          {unlinkMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
