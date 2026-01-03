import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";

export function useHiddenJaneResources() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const { data: hiddenResources = [], isLoading } = useQuery({
    queryKey: ["hidden-jane-resources", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      
      const { data, error } = await supabase
        .from("hidden_jane_resources")
        .select("resource_key")
        .eq("organization_id", currentUser.team_id);
      
      if (error) throw error;
      return data?.map(r => r.resource_key) || [];
    },
    enabled: !!currentUser?.team_id,
  });

  const hideResource = useMutation({
    mutationFn: async (resourceKey: string) => {
      if (!currentUser?.team_id || !currentUser?.id) throw new Error("No user");
      
      const { error } = await supabase
        .from("hidden_jane_resources")
        .insert({
          organization_id: currentUser.team_id,
          resource_key: resourceKey,
          hidden_by: currentUser.id,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, resourceKey) => {
      queryClient.invalidateQueries({ queryKey: ["hidden-jane-resources"] });
      toast.success("Resource hidden", {
        description: "You can restore it from the hidden section anytime.",
      });
    },
    onError: (error) => {
      toast.error("Failed to hide resource", {
        description: error.message,
      });
    },
  });

  const unhideResource = useMutation({
    mutationFn: async (resourceKey: string) => {
      if (!currentUser?.team_id) throw new Error("No organization");
      
      const { error } = await supabase
        .from("hidden_jane_resources")
        .delete()
        .eq("organization_id", currentUser.team_id)
        .eq("resource_key", resourceKey);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hidden-jane-resources"] });
      toast.success("Resource restored");
    },
    onError: (error) => {
      toast.error("Failed to restore resource", {
        description: error.message,
      });
    },
  });

  return {
    hiddenResources,
    isLoading,
    hideResource: hideResource.mutate,
    unhideResource: unhideResource.mutate,
    isHiding: hideResource.isPending,
    isUnhiding: unhideResource.isPending,
  };
}
