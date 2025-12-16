import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./useCurrentUser";

export function useAlignmentStatus() {
  const { data: currentUser } = useCurrentUser();
  const organizationId = currentUser?.team_id;

  const { data, isLoading } = useQuery({
    queryKey: ["alignment-status", organizationId],
    queryFn: async () => {
      if (!organizationId) return { isAligned: false, isFlexible: false };

      const { data: team, error } = await supabase
        .from("teams")
        .select("scorecard_mode")
        .eq("id", organizationId)
        .single();

      if (error) {
        console.error("Error fetching alignment status:", error);
        return { isAligned: false, isFlexible: false };
      }

      const mode = team?.scorecard_mode;
      return {
        isAligned: mode === "aligned",
        isFlexible: mode === "flexible",
      };
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  return {
    isAligned: data?.isAligned ?? false,
    isFlexible: data?.isFlexible ?? false,
    isLoading,
  };
}
