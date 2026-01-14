import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, Link2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";

interface LinkBreakdownToPersonModalProps {
  open: boolean;
  onClose: () => void;
  dimensionId: string; // e.g., "staff_001"
  dimensionLabel: string; // e.g., "Dr. Sarah Chen"
  dimensionType: string; // e.g., "clinician"
  importKey: string; // e.g., "jane_total_visits"
}

export function LinkBreakdownToPersonModal({
  open,
  onClose,
  dimensionId,
  dimensionLabel,
  dimensionType,
  importKey,
}: LinkBreakdownToPersonModalProps) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  
  const [selectedUserId, setSelectedUserId] = useState("");

  // Fetch team members
  const { data: teamMembers, isLoading: loadingMembers } = useQuery({
    queryKey: ["team-members-for-linking", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data } = await supabase
        .from("users")
        .select("id, full_name, email, jane_staff_member_guid")
        .eq("team_id", currentUser.team_id)
        .order("full_name");
      return data || [];
    },
    enabled: !!currentUser?.team_id && open,
  });

  // Check if this dimension is already linked to someone
  const linkedUser = teamMembers?.find(u => u.jane_staff_member_guid === dimensionId);

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error("Please select a person");
      
      // First, clear any existing link for this dimension (another user had it)
      const { error: clearError } = await supabase
        .from("users")
        .update({ jane_staff_member_guid: null })
        .eq("jane_staff_member_guid", dimensionId);
      
      if (clearError) throw clearError;

      // Now link to the selected user
      const { error } = await supabase
        .from("users")
        .update({ jane_staff_member_guid: dimensionId })
        .eq("id", selectedUserId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members-for-linking"] });
      queryClient.invalidateQueries({ queryKey: ["org-users"] });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success(`${dimensionLabel} linked to person`);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to link breakdown to person");
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      if (!linkedUser) throw new Error("No link to remove");
      
      const { error } = await supabase
        .from("users")
        .update({ jane_staff_member_guid: null })
        .eq("id", linkedUser.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members-for-linking"] });
      queryClient.invalidateQueries({ queryKey: ["org-users"] });
      toast.success(`Link removed from ${linkedUser?.full_name}`);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove link");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    linkMutation.mutate();
  };

  const isPending = linkMutation.isPending || unlinkMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Link to Person
          </DialogTitle>
          <DialogDescription>
            Link this {dimensionType} to a team member so their metrics appear in the People Analyzer.
          </DialogDescription>
        </DialogHeader>

        {/* Breakdown Info */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{dimensionLabel}</p>
              <p className="text-xs text-muted-foreground capitalize">{dimensionType} • {importKey.replace('jane_', '').replace(/_/g, ' ')}</p>
            </div>
            <Badge variant="secondary" className="capitalize text-xs">
              {dimensionType}
            </Badge>
          </div>
        </div>

        {linkedUser ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Already linked</p>
                  <p className="text-xs text-muted-foreground">
                    {dimensionLabel} is linked to <strong>{linkedUser.full_name}</strong>
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => unlinkMutation.mutate()}
                disabled={isPending}
              >
                {unlinkMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Remove Link
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="person">Select Team Member</Label>
                {loadingMembers ? (
                  <div className="h-10 rounded-md border bg-muted/50 animate-pulse" />
                ) : (
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a person..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers?.filter(m => !m.jane_staff_member_guid).map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            {member.full_name || member.email}
                          </div>
                        </SelectItem>
                      ))}
                      {teamMembers?.filter(m => !m.jane_staff_member_guid).length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          All team members are already linked
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  This will mark the person as accountable for {dimensionLabel}'s metrics.
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !selectedUserId}>
                {linkMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Link Person
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
