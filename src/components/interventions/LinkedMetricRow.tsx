import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ExpectedDirection } from "@/lib/interventions/types";

interface LinkedMetricRowProps {
  linkId: string;
  interventionId: string;
  metricName: string;
  expectedDirection: ExpectedDirection;
  expectedMagnitudePercent: number | null;
  baselineValue: number | null;
  canEdit: boolean;
}

export function LinkedMetricRow({
  linkId,
  interventionId,
  metricName,
  expectedDirection,
  expectedMagnitudePercent,
  baselineValue,
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

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intervention-metrics", interventionId] });
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

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-4">
        <span className="font-medium">{metricName}</span>
        <Badge variant="outline" className={`gap-1 ${directionColor}`}>
          <span className="text-lg leading-none">{directionIcon}</span>
          {expectedMagnitudePercent !== null && (
            <span>{expectedMagnitudePercent}%</span>
          )}
        </Badge>
        {baselineValue !== null && (
          <span className="text-sm text-muted-foreground">
            Baseline: {baselineValue}
          </span>
        )}
      </div>

      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => unlinkMutation.mutate()}
          disabled={unlinkMutation.isPending}
          className="text-muted-foreground hover:text-destructive"
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
