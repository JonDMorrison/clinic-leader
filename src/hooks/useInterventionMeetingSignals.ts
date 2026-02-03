/**
 * Hook for fetching intervention meeting signals
 * Only returns data for leadership roles (managers and above)
 */

import { useQuery } from "@tanstack/react-query";
import { useIsAdmin } from "./useIsAdmin";
import { getInterventionMeetingSignals, type InterventionMeetingSignals } from "@/lib/interventions/meetingSignals";

interface UseInterventionMeetingSignalsOptions {
  organizationId: string | undefined;
  enabled?: boolean;
}

export function useInterventionMeetingSignals({
  organizationId,
  enabled = true,
}: UseInterventionMeetingSignalsOptions) {
  const { data: roleData, isLoading: roleLoading } = useIsAdmin();

  // Only show to managers and above (leadership roles)
  const isLeadership = roleData?.isManager ?? false;

  return useQuery<InterventionMeetingSignals>({
    queryKey: ["intervention-meeting-signals", organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return {
          overdue_interventions: [],
          at_risk_interventions: [],
          newly_successful_interventions: [],
        };
      }
      return getInterventionMeetingSignals(organizationId);
    },
    enabled: enabled && !!organizationId && !roleLoading && isLeadership,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export type { InterventionMeetingSignals };
