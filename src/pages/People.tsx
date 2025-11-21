import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users as UsersIcon, Settings } from "lucide-react";
import { HelpHint } from "@/components/help/HelpHint";
import { SeatTile } from "@/components/people/SeatTile";
import { ValuesList } from "@/components/people/ValuesList";
import { PeopleAnalyzer } from "@/components/people/PeopleAnalyzer";
import { SeatManagementDialog } from "@/components/people/SeatManagementDialog";
import { Button } from "@/components/ui/button";

const People = () => {
  const [seatManagementOpen, setSeatManagementOpen] = useState(false);
  
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", user.email)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: seats, refetch: refetchSeats } = useQuery({
    queryKey: ["seats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seats")
        .select("*, users(full_name)")
        .order("title");

      if (error) throw error;
      return data;
    },
  });

  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, role")
        .eq("team_id", currentUser?.team_id)
        .order("full_name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.team_id,
  });

  const { data: coreValues } = useQuery({
    queryKey: ["core-values"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_values")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  const { data: valueRatings, refetch: refetchRatings } = useQuery({
    queryKey: ["value-ratings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("value_ratings")
        .select("*");

      if (error) throw error;
      return data || [];
    },
  });

  const isManager =
    currentUser?.role === "manager" ||
    currentUser?.role === "director" ||
    currentUser?.role === "owner";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
          People
          <HelpHint term="People Analyzer" context="people_header" />
        </h1>
        <p className="text-muted-foreground">Accountability and core values</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Seats</h2>
              {isManager && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSeatManagementOpen(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Seats
                </Button>
              )}
            </div>
            {seats && seats.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {seats.map((seat) => (
                  <SeatTile
                    key={seat.id}
                    seat={seat}
                    users={users || []}
                    onUpdate={refetchSeats}
                    isManager={isManager}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<UsersIcon className="w-12 h-12" />}
                title="No seats defined"
                description="Contact your administrator to set up organizational seats."
              />
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
              People Analyzer
              <HelpHint term="People Analyzer" context="people_analyzer_section" size="sm" />
            </h2>
            <PeopleAnalyzer
              users={users || []}
              coreValues={coreValues || []}
              valueRatings={valueRatings || []}
              onUpdate={() => {
                refetchRatings();
                refetchUsers();
              }}
              isManager={isManager}
            />
          </div>
        </div>

        <div className="lg:col-span-1">
          <ValuesList values={coreValues || []} />
        </div>
      </div>

      {/* Seat Management Dialog */}
      <SeatManagementDialog
        open={seatManagementOpen}
        onOpenChange={setSeatManagementOpen}
        seats={seats || []}
        onUpdate={refetchSeats}
        organizationId={currentUser?.team_id || null}
      />
    </div>
  );
};

export default People;
