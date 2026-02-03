import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check if the current user is a master admin (platform-level role).
 * This is separate from org-level admin roles and grants cross-org access.
 */
export const useMasterAdmin = () => {
  return useQuery({
    queryKey: ["is-master-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_master_admin");
      
      if (error) {
        console.error("Error checking master admin status:", error);
        return false;
      }
      
      return data === true;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
