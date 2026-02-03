import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export function CohortList() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data: cohorts, isLoading } = useQuery({
    queryKey: ["benchmark-cohorts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("bench_get_cohorts");
      if (error) throw error;
      return data as Cohort[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("benchmark_cohorts")
        .insert({ name: newName, description: newDescription || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["benchmark-cohorts"] });
      setIsCreateOpen(false);
      setNewName("");
      setNewDescription("");
      toast.success("Cohort created successfully");
    },
    onError: (err: Error) => {
      toast.error(`Failed to create cohort: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (cohortId: string) => {
      const { error } = await supabase
        .from("benchmark_cohorts")
        .delete()
        .eq("id", cohortId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["benchmark-cohorts"] });
      toast.success("Cohort deleted");
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete cohort: ${err.message}`);
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Benchmark Cohorts
        </CardTitle>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Cohort
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Cohort</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="e.g., Multi-Location Clinics"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Optional description..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newName.trim() || createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? "Creating..." : "Create Cohort"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground">Loading cohorts...</div>
        ) : !cohorts?.length ? (
          <div className="text-muted-foreground text-center py-8">
            No cohorts created yet. Create your first benchmark cohort.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohorts.map((cohort) => (
                <TableRow key={cohort.id}>
                  <TableCell className="font-medium">{cohort.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {cohort.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{cohort.member_count} teams</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(cohort.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Delete this cohort?")) {
                          deleteMutation.mutate(cohort.id);
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
      </CardContent>
    </Card>
  );
}
