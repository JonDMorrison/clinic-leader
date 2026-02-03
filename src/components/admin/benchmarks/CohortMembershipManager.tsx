import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Cohort {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  member_count: number;
}

interface CohortMember {
  team_id: string;
  team_name: string;
  joined_at: string;
}

interface Team {
  id: string;
  name: string;
}

export function CohortMembershipManager() {
  const queryClient = useQueryClient();
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  // Get cohorts list
  const { data: cohorts } = useQuery({
    queryKey: ["benchmark-cohorts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("bench_get_cohorts");
      if (error) throw error;
      return data as Cohort[];
    },
  });

  // Get members of selected cohort
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["cohort-members", selectedCohortId],
    queryFn: async () => {
      if (!selectedCohortId) return [];
      const { data, error } = await supabase.rpc("bench_get_cohort_members", {
        _cohort_id: selectedCohortId,
      });
      if (error) throw error;
      return data as CohortMember[];
    },
    enabled: !!selectedCohortId,
  });

  // Use secure RPC for team search (master admin can see all teams)
  const { data: searchResults } = useQuery({
    queryKey: ["search-teams", searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      const { data, error } = await (supabase.rpc as any)("bench_search_teams", {
        _search: searchTerm,
      });
      if (error) throw error;
      return data as Team[];
    },
    enabled: searchTerm.length >= 2,
  });

  // Filter out teams already in cohort
  const availableTeams = searchResults?.filter(
    (team) => !members?.some((m) => m.team_id === team.id)
  );

  // Use secure RPC instead of direct table access
  const addMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await (supabase.rpc as any)("bench_add_cohort_member", {
        _cohort_id: selectedCohortId,
        _team_id: teamId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cohort-members", selectedCohortId] });
      queryClient.invalidateQueries({ queryKey: ["benchmark-cohorts"] });
      setSelectedTeamId("");
      setSearchTerm("");
      toast.success("Team added to cohort");
    },
    onError: (err: Error) => {
      toast.error(`Failed to add team: ${err.message}`);
    },
  });

  // Use secure RPC instead of direct table access
  const removeMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await (supabase.rpc as any)("bench_remove_cohort_member", {
        _cohort_id: selectedCohortId,
        _team_id: teamId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cohort-members", selectedCohortId] });
      queryClient.invalidateQueries({ queryKey: ["benchmark-cohorts"] });
      toast.success("Team removed from cohort");
    },
    onError: (err: Error) => {
      toast.error(`Failed to remove team: ${err.message}`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Cohort Membership
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cohort selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Cohort</label>
          <Select value={selectedCohortId} onValueChange={setSelectedCohortId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a cohort..." />
            </SelectTrigger>
            <SelectContent>
              {cohorts?.map((cohort) => (
                <SelectItem key={cohort.id} value={cohort.id}>
                  {cohort.name} ({cohort.member_count} members)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCohortId && (
          <>
            {/* Add team search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Add Team</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Search teams by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {availableTeams && availableTeams.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                      {availableTeams.map((team) => (
                        <button
                          key={team.id}
                          className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                          onClick={() => {
                            setSelectedTeamId(team.id);
                            setSearchTerm(team.name);
                          }}
                        >
                          {team.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => addMutation.mutate(selectedTeamId)}
                  disabled={!selectedTeamId || addMutation.isPending}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            {/* Members table */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Current Members ({members?.length || 0})
              </label>
              {membersLoading ? (
                <div className="text-muted-foreground">Loading members...</div>
              ) : !members?.length ? (
                <div className="text-muted-foreground text-center py-8 border rounded-md">
                  No teams in this cohort yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.team_id}>
                        <TableCell className="font-medium">
                          {member.team_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(member.joined_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Remove this team from the cohort?")) {
                                removeMutation.mutate(member.team_id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
