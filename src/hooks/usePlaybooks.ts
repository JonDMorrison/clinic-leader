/**
 * Hook for managing intervention playbooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import {
  fetchPlaybooks,
  fetchPendingPlaybooks,
  scanForPlaybookCandidates,
  generatePlaybookCandidate,
  savePlaybookCandidate,
  approvePlaybook,
  rejectPlaybook,
  archivePlaybook,
  type Playbook,
  type PlaybookStatus,
  type PlaybookCandidate,
  PLAYBOOK_THRESHOLDS,
} from "@/lib/interventions/playbookGenerator";
import type { PatternCluster } from "@/lib/interventions/interventionPatternService";

interface UsePlaybooksOptions {
  status?: PlaybookStatus;
  enabled?: boolean;
}

/**
 * Fetch all playbooks for the organization
 */
export function usePlaybooks({ status, enabled = true }: UsePlaybooksOptions = {}) {
  const { data: currentUser } = useCurrentUser();
  const organizationId = currentUser?.team_id;

  return useQuery<Playbook[]>({
    queryKey: ["playbooks", organizationId, status],
    queryFn: () => {
      if (!organizationId) return [];
      return fetchPlaybooks(organizationId, status);
    },
    enabled: enabled && !!organizationId,
  });
}

/**
 * Fetch pending playbooks for approval
 */
export function usePendingPlaybooks() {
  const { data: currentUser } = useCurrentUser();
  const organizationId = currentUser?.team_id;

  return useQuery<Playbook[]>({
    queryKey: ["playbooks", organizationId, "pending_approval"],
    queryFn: () => {
      if (!organizationId) return [];
      return fetchPendingPlaybooks(organizationId);
    },
    enabled: !!organizationId,
  });
}

/**
 * Fetch approved playbooks for recommendations UI
 */
export function useApprovedPlaybooks() {
  const { data: currentUser } = useCurrentUser();
  const organizationId = currentUser?.team_id;

  return useQuery<Playbook[]>({
    queryKey: ["playbooks", organizationId, "approved"],
    queryFn: () => {
      if (!organizationId) return [];
      return fetchPlaybooks(organizationId, "approved");
    },
    enabled: !!organizationId,
  });
}

/**
 * Scan for playbook candidates
 */
export function usePlaybookCandidates() {
  const { data: currentUser } = useCurrentUser();
  const organizationId = currentUser?.team_id;

  return useQuery<PatternCluster[]>({
    queryKey: ["playbook-candidates", organizationId],
    queryFn: () => {
      if (!organizationId) return [];
      return scanForPlaybookCandidates(organizationId, PLAYBOOK_THRESHOLDS);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Generate and save a playbook from a pattern
 */
export function useGeneratePlaybook() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const organizationId = currentUser?.team_id;

  return useMutation({
    mutationFn: async (pattern: PatternCluster) => {
      if (!organizationId) throw new Error("No organization");

      const candidate = await generatePlaybookCandidate(pattern, organizationId);
      if (!candidate) {
        throw new Error("Could not generate playbook from pattern");
      }

      const playbookId = await savePlaybookCandidate(organizationId, candidate);
      if (!playbookId) {
        throw new Error("Failed to save playbook");
      }

      return { playbookId, candidate };
    },
    onSuccess: ({ candidate }) => {
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
      queryClient.invalidateQueries({ queryKey: ["playbook-candidates"] });
      toast.success(`Playbook "${candidate.title}" created for approval`);
    },
    onError: (error) => {
      toast.error("Failed to generate playbook: " + (error as Error).message);
    },
  });
}

/**
 * Approve a playbook
 */
export function useApprovePlaybook() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playbookId: string) => {
      if (!currentUser?.id) throw new Error("Not authenticated");
      const success = await approvePlaybook(playbookId, currentUser.id);
      if (!success) throw new Error("Failed to approve playbook");
      return playbookId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
      toast.success("Playbook approved");
    },
    onError: (error) => {
      toast.error("Failed to approve: " + (error as Error).message);
    },
  });
}

/**
 * Reject a playbook
 */
export function useRejectPlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playbookId, reason }: { playbookId: string; reason: string }) => {
      const success = await rejectPlaybook(playbookId, reason);
      if (!success) throw new Error("Failed to reject playbook");
      return playbookId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
      toast.success("Playbook rejected");
    },
    onError: (error) => {
      toast.error("Failed to reject: " + (error as Error).message);
    },
  });
}

/**
 * Archive a playbook
 */
export function useArchivePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playbookId: string) => {
      const success = await archivePlaybook(playbookId);
      if (!success) throw new Error("Failed to archive playbook");
      return playbookId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
      toast.success("Playbook archived");
    },
    onError: (error) => {
      toast.error("Failed to archive: " + (error as Error).message);
    },
  });
}
