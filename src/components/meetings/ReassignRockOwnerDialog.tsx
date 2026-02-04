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
import { Loader2 } from "lucide-react";

interface ReassignRockOwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  rockId: string;
  rockTitle: string;
  currentOwnerId: string | null;
  onSuccess?: () => void;
}

export function ReassignRockOwnerDialog({
  open,
  onOpenChange,
  organizationId,
  rockId,
  rockTitle,
  currentOwnerId,
  onSuccess,
}: ReassignRockOwnerDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newOwnerId, setNewOwnerId] = useState<string>(currentOwnerId || "");

  useEffect(() => {
    if (open) {
      setNewOwnerId(currentOwnerId || "");
    }
  }, [open, currentOwnerId]);

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

  const reassignMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("rocks")
        .update({ owner_id: newOwnerId || null })
        .eq("id", rockId)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rock owner updated" });
      queryClient.invalidateQueries({ queryKey: ["rocks"] });
      queryClient.invalidateQueries({ queryKey: ["meeting-rock-data"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update owner",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Reassign Rock Owner</DialogTitle>
          <DialogDescription className="truncate">
            {rockTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>New Owner</Label>
            <Select value={newOwnerId || "none"} onValueChange={(val) => setNewOwnerId(val === "none" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {(users || []).map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={reassignMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => reassignMutation.mutate()}
              disabled={reassignMutation.isPending}
            >
              {reassignMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
