import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Loader2 } from "lucide-react";
import DataJaneHome from "./DataJaneHome";
import DataDefaultHome from "./DataDefaultHome";

export default function DataHomeRouter() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  // Fetch team's data_mode
  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["team-data-mode", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;
      
      const { data, error } = await supabase
        .from("teams")
        .select("data_mode")
        .eq("id", currentUser.team_id)
        .single();
      
      if (error) {
        console.error("Error fetching team data_mode:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  // Loading state
  if (userLoading || teamLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  // Route based on data_mode
  if (team?.data_mode === "jane") {
    return <DataJaneHome />;
  }

  // Default mode (includes 'default' and any fallback)
  return <DataDefaultHome />;
}
