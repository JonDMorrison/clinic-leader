import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./useCurrentUser";
import { getStorage, setStorage } from "@/lib/storage/versionedStorage";

// Default stat slots if user hasn't customized
const DEFAULT_STATS = ["new_patients", "completed_rocks", "open_issues", "active_kpis"];

interface DashboardPreferences {
  statSlots: string[];
}

export function useDashboardPreferences() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  // For now, use localStorage until we add a preferences table
  const getPreferences = (): DashboardPreferences => {
    if (!currentUser?.id) return { statSlots: DEFAULT_STATS };
    
    try {
      const stored = getStorage<DashboardPreferences>(`dashboard_prefs_${currentUser.id}`);
      if (stored) {
        return stored;
      }
    } catch {
      // Ignore parse errors
    }
    return { statSlots: DEFAULT_STATS };
  };

  const { data: preferences } = useQuery({
    queryKey: ["dashboard-preferences", currentUser?.id],
    queryFn: getPreferences,
    enabled: !!currentUser?.id,
    staleTime: Infinity,
  });

  const updateStatSlot = useMutation({
    mutationFn: async ({ slotIndex, statId }: { slotIndex: number; statId: string }) => {
      if (!currentUser?.id) throw new Error("Not authenticated");
      
      const current = getPreferences();
      const newSlots = [...current.statSlots];
      
      // If the stat is already in another slot, swap them
      const existingIndex = newSlots.indexOf(statId);
      if (existingIndex !== -1 && existingIndex !== slotIndex) {
        // Swap: put the current slot's stat into the existing position
        newSlots[existingIndex] = newSlots[slotIndex];
      }
      
      newSlots[slotIndex] = statId;
      
      const newPrefs = { ...current, statSlots: newSlots };
      setStorage(`dashboard_prefs_${currentUser.id}`, newPrefs);
      
      return newPrefs;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-preferences"] });
    },
  });

  return {
    preferences: preferences || { statSlots: DEFAULT_STATS },
    updateStatSlot: (slotIndex: number, statId: string) => 
      updateStatSlot.mutate({ slotIndex, statId }),
    isUpdating: updateStatSlot.isPending,
  };
}
