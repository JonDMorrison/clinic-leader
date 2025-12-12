import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./useCurrentUser";
import type { CoreValuesAck } from "@/lib/core-values/types";

export function useCoreValuesAck() {
  const currentUserQuery = useCurrentUser();
  const user = currentUserQuery.data;
  const orgId = user?.team_id;
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: ack, isLoading } = useQuery({
    queryKey: ["core-values-ack", orgId, userId],
    queryFn: async () => {
      if (!orgId || !userId) return null;

      const { data, error } = await supabase
        .from("core_values_ack")
        .select("*")
        .eq("organization_id", orgId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data as CoreValuesAck | null;
    },
    enabled: !!orgId && !!userId,
  });

  const acknowledge = useMutation({
    mutationFn: async (versionHash: string) => {
      if (!orgId || !userId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("core_values_ack")
        .upsert({
          organization_id: orgId,
          user_id: userId,
          acknowledged_at: new Date().toISOString(),
          version_hash: versionHash,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["core-values-ack", orgId, userId] });
    },
  });

  const hasAcknowledged = !!ack;

  return {
    ack,
    hasAcknowledged,
    isLoading,
    acknowledge,
  };
}
