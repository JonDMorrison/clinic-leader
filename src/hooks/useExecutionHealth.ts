/**
 * Hook for fetching and updating intervention execution health score
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getInterventionExecutionHealth, 
  updateInterventionExecutionHealth,
  type ExecutionHealthMetrics 
} from "@/lib/interventions/executionHealthScore";

interface UseExecutionHealthOptions {
  interventionId: string | undefined;
  enabled?: boolean;
}

export function useExecutionHealth({
  interventionId,
  enabled = true,
}: UseExecutionHealthOptions) {
  const queryClient = useQueryClient();

  // Fetch current health metrics
  const { data: healthMetrics, isLoading, refetch } = useQuery<ExecutionHealthMetrics | null>({
    queryKey: ["intervention-execution-health", interventionId],
    queryFn: async () => {
      if (!interventionId) return null;
      return getInterventionExecutionHealth(interventionId);
    },
    enabled: enabled && !!interventionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation to recalculate and update health score
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      if (!interventionId) throw new Error("No intervention ID");
      return updateInterventionExecutionHealth(interventionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["intervention-execution-health", interventionId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["intervention-detail", interventionId] 
      });
    },
  });

  return {
    healthMetrics,
    isLoading,
    refetch,
    recalculate: recalculateMutation.mutate,
    isRecalculating: recalculateMutation.isPending,
  };
}
