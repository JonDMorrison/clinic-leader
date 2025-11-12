import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "./useImpersonation";

/**
 * Hook to get the current user, with proper impersonation support.
 * 
 * When impersonating:
 * - Returns the impersonated user's data (from localStorage + database)
 * 
 * When not impersonating:
 * - Returns the authenticated user's data (from auth + database)
 */
export const useCurrentUser = () => {
  const { isImpersonating, impersonationData } = useImpersonation();

  return useQuery({
    queryKey: ["current-user", isImpersonating, impersonationData?.targetUserId],
    queryFn: async () => {
      // If impersonating, fetch the target user's data by ID
      if (isImpersonating && impersonationData?.targetUserId) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", impersonationData.targetUserId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching impersonated user:", error);
          throw error;
        }

        console.log("[useCurrentUser] Impersonation active, fetched user:", data?.email);
        return data;
      }

      // Not impersonating - fetch current auth user as normal
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", user.email)
        .maybeSingle();

      if (error) {
        console.error("Error fetching current user:", error);
        throw error;
      }

      console.log("[useCurrentUser] Normal mode, fetched user:", data?.email);
      return data;
    },
  });
};
