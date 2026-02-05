/**
 * Hook for managing intervention pattern cluster computation
 * 
 * Provides admin controls for:
 * - Triggering manual recomputation
 * - Viewing computation status
 * - Accessing audit logs
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ComputationResult {
  success: boolean;
  runId?: string;
  patterns?: number;
  outcomesProcessed?: number;
  durationMs?: number;
  version?: string;
  error?: string;
}

interface AuditRecord {
  id: string;
  patterns_generated: number;
  interventions_analyzed: number;
  orgs_included: number;
  computation_duration_ms: number | null;
  error_message: string | null;
  version: string;
  computed_at: string;
}

/**
 * Fetch recent pattern computation audit logs
 */
export function usePatternAuditLogs(limit = 10) {
  return useQuery({
    queryKey: ["pattern-audit-logs", limit],
    queryFn: async (): Promise<AuditRecord[]> => {
      const { data, error } = await supabase
        .from("intervention_pattern_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
  });
}

/**
 * Fetch current pattern cluster count
 */
export function usePatternClusterCount() {
  return useQuery({
    queryKey: ["pattern-cluster-count"],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("intervention_pattern_clusters")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
  });
}

/**
 * Trigger manual pattern recomputation (admin only)
 */
export function useTriggerPatternComputation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<ComputationResult> => {
      // First, log the manual trigger via RPC (returns run_id)
      const { data: runId, error: rpcError } = await supabase.rpc("recompute_intervention_patterns");
      
      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // Then call the edge function
      const { data, error } = await supabase.functions.invoke<ComputationResult>(
        "compute-intervention-pattern-clusters",
        {
          body: { source: "admin_manual", triggered_at: new Date().toISOString(), run_id: runId },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      return data || { success: false, error: "No response from function" };
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Pattern computation complete`, {
          description: `Generated ${result.patterns} patterns from ${result.outcomesProcessed} outcomes`,
        });
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ["pattern-audit-logs"] });
        queryClient.invalidateQueries({ queryKey: ["pattern-cluster-count"] });
        queryClient.invalidateQueries({ queryKey: ["intervention-recommendations"] });
        queryClient.invalidateQueries({ queryKey: ["playbook-candidates"] });
      } else {
        toast.error("Pattern computation failed", {
          description: result.error || "Unknown error",
        });
      }
    },
    onError: (error) => {
      toast.error("Failed to trigger computation", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}

/**
 * Invalidate recommendation caches (called after successful computation)
 */
export function useInvalidateRecommendationCaches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("invalidate_recommendation_caches");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intervention-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["playbook-candidates"] });
    },
  });
}
