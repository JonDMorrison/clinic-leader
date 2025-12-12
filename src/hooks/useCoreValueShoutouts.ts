import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./useCurrentUser";
import { useToast } from "./use-toast";
import type { CoreValueShoutout } from "@/lib/core-values/types";

export function useCoreValueShoutouts(meetingId?: string) {
  const currentUserQuery = useCurrentUser();
  const user = currentUserQuery.data;
  const orgId = user?.team_id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: shoutouts,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["core-value-shoutouts", orgId, meetingId],
    queryFn: async () => {
      if (!orgId) return [];

      let query = supabase
        .from("core_value_shoutouts")
        .select(`
          *,
          recognized_user:users!core_value_shoutouts_recognized_user_id_fkey(full_name),
          created_by_user:users!core_value_shoutouts_created_by_fkey(full_name),
          core_value:org_core_values!core_value_shoutouts_core_value_id_fkey(title)
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (meetingId) {
        query = query.eq("meeting_id", meetingId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return (data || []) as unknown as CoreValueShoutout[];
    },
    enabled: !!orgId,
  });

  const createShoutout = useMutation({
    mutationFn: async (shoutout: {
      recognized_user_id: string;
      core_value_id: string;
      note?: string;
      meeting_id?: string;
    }) => {
      if (!orgId || !user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("core_value_shoutouts")
        .insert({
          organization_id: orgId,
          created_by: user.id,
          recognized_user_id: shoutout.recognized_user_id,
          core_value_id: shoutout.core_value_id,
          note: shoutout.note,
          meeting_id: shoutout.meeting_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["core-value-shoutouts", orgId] });
      toast({ title: "Shout-out added! 🎉" });
    },
    onError: () => {
      toast({ title: "Failed to add shout-out", variant: "destructive" });
    },
  });

  const deleteShoutout = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("core_value_shoutouts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["core-value-shoutouts", orgId] });
      toast({ title: "Shout-out removed" });
    },
  });

  return {
    shoutouts: shoutouts || [],
    isLoading,
    createShoutout,
    deleteShoutout,
    refetch,
  };
}
