import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X, Users } from "lucide-react";

interface AddCollaboratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  rockId: string;
  rockTitle: string;
  currentOwnerId: string | null;
  onSuccess?: () => void;
}

export function AddCollaboratorDialog({
  open,
  onOpenChange,
  organizationId,
  rockId,
  rockTitle,
  currentOwnerId,
  onSuccess,
}: AddCollaboratorDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Fetch org users
  const { data: users } = useQuery({
    queryKey: ["org-users", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("team_id", organizationId)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!organizationId,
  });

  // Fetch current collaborators
  const { data: collaborators, refetch: refetchCollaborators } = useQuery({
    queryKey: ["rock-collaborators", rockId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rock_collaborators")
        .select("id, user_id, users(id, full_name)")
        .eq("rock_id", rockId)
        .eq("organization_id", organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!rockId && !!organizationId,
  });

  const collaboratorIds = new Set(collaborators?.map(c => c.user_id) || []);

  // Filter users to exclude owner and existing collaborators
  const availableUsers = (users || []).filter(
    (u) => u.id !== currentOwnerId && !collaboratorIds.has(u.id)
  );

  const addMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("rock_collaborators")
        .insert({
          organization_id: organizationId,
          rock_id: rockId,
          user_id: userId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Collaborator added" });
      setSelectedUserId("");
      refetchCollaborators();
      queryClient.invalidateQueries({ queryKey: ["meeting-rock-data"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add collaborator",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (collaboratorId: string) => {
      const { error } = await supabase
        .from("rock_collaborators")
        .delete()
        .eq("id", collaboratorId)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Collaborator removed" });
      refetchCollaborators();
      queryClient.invalidateQueries({ queryKey: ["meeting-rock-data"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove collaborator",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    if (selectedUserId) {
      addMutation.mutate(selectedUserId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Rock Collaborators
          </DialogTitle>
          <DialogDescription className="truncate">
            {rockTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current collaborators */}
          <div className="space-y-2">
            <Label>Current Collaborators</Label>
            {(collaborators || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No collaborators yet
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(collaborators || []).map((collab) => (
                  <Badge
                    key={collab.id}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {(collab.users as any)?.full_name || "Unknown"}
                    <button
                      type="button"
                      className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                      onClick={() => removeMutation.mutate(collab.id)}
                      disabled={removeMutation.isPending}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Add new collaborator */}
          <div className="space-y-2">
            <Label>Add Collaborator</Label>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <SelectItem value="no-members" disabled>
                      No available members
                    </SelectItem>
                  ) : (
                    availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || "Unknown"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAdd}
                disabled={!selectedUserId || addMutation.isPending}
              >
                {addMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Add"
                )}
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
