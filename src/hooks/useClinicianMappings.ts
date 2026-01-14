import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClinicianMapping {
  dimension_id: string;
  userId: string | null;
  userName: string | null;
}

/**
 * Batch query to check which clinician dimension_ids are mapped to users
 * Uses jane_staff_member_guid to find mappings - tenant-safe via team_id filter
 */
export function useClinicianMappings(
  organizationId: string | undefined,
  dimensionIds: string[]
) {
  return useQuery({
    queryKey: ["clinician-mappings", organizationId, dimensionIds],
    queryFn: async (): Promise<Map<string, ClinicianMapping>> => {
      if (!organizationId || dimensionIds.length === 0) {
        return new Map();
      }

      // Query users where jane_staff_member_guid is in the list of dimension_ids
      // Scoped to org via team_id
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, jane_staff_member_guid")
        .eq("team_id", organizationId)
        .in("jane_staff_member_guid", dimensionIds);

      if (error) {
        console.error("Error fetching clinician mappings:", error);
        return new Map();
      }

      // Build a map of dimension_id -> { userId, userName }
      const mappings = new Map<string, ClinicianMapping>();
      
      // Initialize all dimension_ids as unmapped
      dimensionIds.forEach((dimId) => {
        mappings.set(dimId, {
          dimension_id: dimId,
          userId: null,
          userName: null,
        });
      });

      // Update with actual mappings
      data?.forEach((user) => {
        if (user.jane_staff_member_guid) {
          mappings.set(user.jane_staff_member_guid, {
            dimension_id: user.jane_staff_member_guid,
            userId: user.id,
            userName: user.full_name,
          });
        }
      });

      return mappings;
    },
    enabled: !!organizationId && dimensionIds.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}
