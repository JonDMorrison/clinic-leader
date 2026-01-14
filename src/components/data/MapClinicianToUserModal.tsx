import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Loader2, User2, Link2, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";

interface MapClinicianToUserModalProps {
  open: boolean;
  onClose: () => void;
  clinicianDimensionId: string;
  clinicianLabel: string;
}

/**
 * Modal to map a Jane clinician (from breakdown data) to a user in the system.
 * This is the inverse of LinkToJaneClinicianModal - here we start with the clinician
 * and pick which user to link.
 */
export function MapClinicianToUserModal({
  open,
  onClose,
  clinicianDimensionId,
  clinicianLabel,
}: MapClinicianToUserModalProps) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const [selectedUserId, setSelectedUserId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch team members who can be linked
  const { data: teamMembers, isLoading: loadingMembers } = useQuery({
    queryKey: ["team-members-for-clinician-mapping", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, jane_staff_member_guid")
        .eq("team_id", currentUser.team_id)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.team_id && open,
  });

  // Check if this clinician is already linked to someone
  const currentlyLinkedUser = useMemo(() => {
    return teamMembers?.find((u) => u.jane_staff_member_guid === clinicianDimensionId);
  }, [teamMembers, clinicianDimensionId]);

  // Filter members by search term
  const filteredMembers = useMemo(() => {
    if (!teamMembers) return [];
    if (!searchTerm) return teamMembers;
    const term = searchTerm.toLowerCase();
    return teamMembers.filter(
      (m) =>
        m.full_name?.toLowerCase().includes(term) ||
        m.email?.toLowerCase().includes(term)
    );
  }, [teamMembers, searchTerm]);

  // Check if selected user already has a different clinician linked
  const selectedUserCurrentLink = useMemo(() => {
    if (!selectedUserId || !teamMembers) return null;
    const user = teamMembers.find((u) => u.id === selectedUserId);
    if (user?.jane_staff_member_guid && user.jane_staff_member_guid !== clinicianDimensionId) {
      return user.jane_staff_member_guid;
    }
    return null;
  }, [selectedUserId, teamMembers, clinicianDimensionId]);

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error("Please select a team member");

      // Clear any existing link TO this clinician (from another user)
      const { error: clearClinicianError } = await supabase
        .from("users")
        .update({ jane_staff_member_guid: null })
        .eq("jane_staff_member_guid", clinicianDimensionId);

      if (clearClinicianError) throw clearClinicianError;

      // Link the selected user to this clinician
      const { error } = await supabase
        .from("users")
        .update({ jane_staff_member_guid: clinicianDimensionId })
        .eq("id", selectedUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinician-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["team-members-for-clinician-mapping"] });
      queryClient.invalidateQueries({ queryKey: ["team-members-for-linking"] });
      queryClient.invalidateQueries({ queryKey: ["org-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-detail"] });
      toast.success(`${clinicianLabel} mapped to team member`);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to map clinician");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    linkMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" />
            Map Clinician to User
          </DialogTitle>
          <DialogDescription>
            Link this Jane clinician's data to a team member for identity attribution.
          </DialogDescription>
        </DialogHeader>

        {/* Clinician Info */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{clinicianLabel}</p>
              <p className="text-xs text-muted-foreground">Jane Clinician</p>
            </div>
          </div>
        </div>

        {currentlyLinkedUser ? (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm">
                  Currently mapped to: <strong>{currentlyLinkedUser.full_name}</strong>
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              To change the mapping, select a different team member below.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <User2 className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700 dark:text-amber-400">
                Not mapped to any team member
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="user">Select Team Member</Label>
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-2"
              />
              {loadingMembers ? (
                <div className="h-10 rounded-md border bg-muted/50 animate-pulse" />
              ) : filteredMembers.length === 0 ? (
                <div className="p-3 rounded-lg border text-center text-sm text-muted-foreground">
                  {searchTerm ? "No team members match" : "No team members found"}
                </div>
              ) : (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <User2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{m.full_name || m.email}</span>
                          {m.jane_staff_member_guid && m.jane_staff_member_guid !== clinicianDimensionId && (
                            <Badge variant="outline" className="text-xs ml-1">
                              Has link
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedUserCurrentLink && (
                <p className="text-xs text-amber-600">
                  Note: This user is currently linked to a different clinician. That link will be replaced.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={linkMutation.isPending || !selectedUserId}>
              {linkMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Map to User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
