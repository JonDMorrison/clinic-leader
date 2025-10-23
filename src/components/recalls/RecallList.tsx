import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RecallRow } from "./RecallRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Phone } from "lucide-react";

interface RecallListProps {
  filterType: "past-due" | "due-today" | "upcoming";
}

export function RecallList({ filterType }: RecallListProps) {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data } = await supabase
        .from("users")
        .select("*, teams(name)")
        .eq("email", user.email)
        .single();
      
      return data;
    },
  });

  const { data: recalls, isLoading } = useQuery({
    queryKey: ["recalls", filterType, user?.team_id],
    queryFn: async () => {
      if (!user?.team_id) return [];

      let query = supabase
        .from("recalls")
        .select("*")
        .eq("organization_id", user.team_id)
        .eq("status", "Open")
        .order("due_date", { ascending: true });

      const today = new Date().toISOString().split('T')[0];

      if (filterType === "past-due") {
        query = query.lt("due_date", today);
      } else if (filterType === "due-today") {
        query = query.eq("due_date", today);
      } else {
        query = query.gt("due_date", today);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.team_id,
  });

  const handleRecallUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ["recalls"] });
    queryClient.invalidateQueries({ queryKey: ["recall-metrics"] });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading recalls...</div>;
  }

  if (!recalls || recalls.length === 0) {
    return (
      <div className="text-center py-12">
        <Phone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No recalls found</h3>
        <p className="text-muted-foreground">
          No {filterType.replace('-', ' ')} recalls to display.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recalls.map((recall) => (
        <RecallRow
          key={recall.id}
          recall={recall}
          onUpdate={handleRecallUpdate}
        />
      ))}
    </div>
  );
}
