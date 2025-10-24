import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface VTOLink {
  id: string;
  vto_version_id: string;
  link_type: 'kpi' | 'rock' | 'issue' | 'doc';
  link_id: string;
  goal_key: string;
  weight: number;
  vto_version?: {
    vto: {
      team_id: string;
    };
    one_year_plan: any;
    quarterly_rocks: any[];
  };
}

/**
 * Hook to fetch VTO links for a specific entity (KPI, Rock, Issue, or Doc)
 */
export function useVTOLinks(linkType: 'kpi' | 'rock' | 'issue' | 'doc', linkId: string) {
  return useQuery({
    queryKey: ["vto-links", linkType, linkId],
    queryFn: async () => {
      if (!linkId) return [];

      const { data, error } = await supabase
        .from("vto_links")
        .select(`
          *,
          vto_version:vto_versions(
            vto:vto!inner(team_id),
            one_year_plan,
            quarterly_rocks
          )
        `)
        .eq("link_type", linkType)
        .eq("link_id", linkId);

      if (error) throw error;

      return data as VTOLink[];
    },
    enabled: !!linkId,
  });
}

/**
 * Get human-readable goal description from goal_key
 */
export function getGoalDescription(goalKey: string, vtoData: any): string {
  if (!vtoData) return goalKey;

  // Parse goal_key format: 'one_year_plan.goals[0]' or 'quarterly_rock'
  if (goalKey.includes('one_year_plan.goals')) {
    const match = goalKey.match(/\[(\d+)\]/);
    if (match && vtoData.one_year_plan?.goals) {
      const index = parseInt(match[1]);
      return vtoData.one_year_plan.goals[index] || goalKey;
    }
  } else if (goalKey === 'quarterly_rock' && vtoData.quarterly_rocks) {
    return "Quarterly Rock";
  } else if (goalKey.includes('three_year_picture')) {
    return "3-Year Picture";
  }

  return goalKey;
}
