import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./useCurrentUser";

/**
 * Hook to check if the current user has admin/manager privileges
 * Admin roles: 'owner', 'director'
 * Manager roles: 'owner', 'director', 'manager'
 */
export const useIsAdmin = () => {
  const { data: currentUser } = useCurrentUser();

  return useQuery({
    queryKey: ["user-is-admin", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return { isAdmin: false, isManager: false };

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking user role:", error);
        return { isAdmin: false, isManager: false };
      }

      const role = data?.role;
      const isAdmin = role === 'owner' || role === 'director';
      const isManager = isAdmin || role === 'manager';

      return { isAdmin, isManager, role };
    },
    enabled: !!currentUser?.id,
  });
};
