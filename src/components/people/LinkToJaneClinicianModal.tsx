import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, User2, Link2, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";

interface LinkToJaneClinicianModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  currentJaneGuid: string | null;
}

export function LinkToJaneClinicianModal({
  open,
  onClose,
  userId,
  userName,
  currentJaneGuid,
}: LinkToJaneClinicianModalProps) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  
  const [selectedClinicianId, setSelectedClinicianId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch distinct clinicians from metric_breakdowns
  const { data: clinicians, isLoading: loadingClinicians } = useQuery({
    queryKey: ["available-clinicians", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      
      // Get distinct clinicians from metric_breakdowns
      const { data, error } = await supabase
        .from("metric_breakdowns")
        .select("dimension_id, dimension_label")
        .eq("organization_id", currentUser.team_id)
        .eq("dimension_type", "clinician")
        .order("dimension_label");
      
      if (error) throw error;
      
      // Deduplicate by dimension_id
      const uniqueClinicians = new Map<string, string>();
      data?.forEach((row) => {
        if (row.dimension_id && !uniqueClinicians.has(row.dimension_id)) {
          uniqueClinicians.set(row.dimension_id, row.dimension_label || row.dimension_id);
        }
      });
      
      return Array.from(uniqueClinicians.entries()).map(([id, label]) => ({
        dimension_id: id,
        dimension_label: label,
      }));
    },
    enabled: !!currentUser?.team_id && open,
  });

  // Check if selected clinician is already linked to another user
  const { data: existingUserWithGuid } = useQuery({
    queryKey: ["user-with-jane-guid", selectedClinicianId],
    queryFn: async () => {
      if (!selectedClinicianId) return null;
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("jane_staff_member_guid", selectedClinicianId)
        .neq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClinicianId,
  });

  // Filter clinicians by search term
  const filteredClinicians = useMemo(() => {
    if (!searchTerm) return clinicians || [];
    const term = searchTerm.toLowerCase();
    return (clinicians || []).filter((c) => 
      c.dimension_label.toLowerCase().includes(term)
    );
  }, [clinicians, searchTerm]);

  // Get current linked clinician name
  const currentClinicianName = useMemo(() => {
    if (!currentJaneGuid || !clinicians) return null;
    const found = clinicians.find((c) => c.dimension_id === currentJaneGuid);
    return found?.dimension_label || currentJaneGuid;
  }, [currentJaneGuid, clinicians]);

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClinicianId) throw new Error("Please select a clinician");
      
      // Clear any existing link to this clinician (from another user)
      const { error: clearError } = await supabase
        .from("users")
        .update({ jane_staff_member_guid: null })
        .eq("jane_staff_member_guid", selectedClinicianId);
      
      if (clearError) throw clearError;

      // Link to the selected user
      const { error } = await supabase
        .from("users")
        .update({ jane_staff_member_guid: selectedClinicianId })
        .eq("id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-detail", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-jane-guid", userId] });
      queryClient.invalidateQueries({ queryKey: ["users-jane-guids"] });
      toast.success(`${userName} linked to Jane clinician`);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to link to clinician");
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("users")
        .update({ jane_staff_member_guid: null })
        .eq("id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-detail", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-jane-guid", userId] });
      queryClient.invalidateQueries({ queryKey: ["users-jane-guids"] });
      toast.success("Jane clinician link removed");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to unlink clinician");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    linkMutation.mutate();
  };

  const isPending = linkMutation.isPending || unlinkMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User2 className="w-5 h-5 text-primary" />
            Link to Jane Clinician
          </DialogTitle>
          <DialogDescription>
            Connect {userName}'s profile to a Jane clinician for data attribution. This is NOT accountability—it only links their identity to existing clinic data.
          </DialogDescription>
        </DialogHeader>

        {/* Current User Info */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{userName}</p>
              <p className="text-xs text-muted-foreground">Identity Mapping</p>
            </div>
            {currentJaneGuid && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Linked
              </Badge>
            )}
          </div>
        </div>

        {currentJaneGuid ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Currently linked to:</p>
                  <p className="text-sm text-muted-foreground">{currentClinicianName}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Change Clinician</Label>
              <Input
                placeholder="Search clinicians..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-2"
              />
              <Select value={selectedClinicianId} onValueChange={setSelectedClinicianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a different clinician..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredClinicians.map((c) => (
                    <SelectItem key={c.dimension_id} value={c.dimension_id}>
                      {c.dimension_label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {existingUserWithGuid && (
                <p className="text-xs text-amber-600">
                  Note: {existingUserWithGuid.full_name} is currently linked to this clinician. They will be unlinked.
                </p>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button 
                variant="destructive" 
                onClick={() => unlinkMutation.mutate()}
                disabled={isPending}
              >
                {unlinkMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Unlink className="w-4 h-4 mr-2" />
                Unlink
              </Button>
              <Button 
                onClick={() => linkMutation.mutate()}
                disabled={isPending || !selectedClinicianId}
              >
                {linkMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Link
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="clinician">Select Jane Clinician</Label>
                <Input
                  placeholder="Search clinicians..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2"
                />
                {loadingClinicians ? (
                  <div className="h-10 rounded-md border bg-muted/50 animate-pulse" />
                ) : filteredClinicians.length === 0 ? (
                  <div className="p-3 rounded-lg border text-center text-sm text-muted-foreground">
                    {searchTerm ? "No clinicians match your search" : "No clinicians found in system data"}
                  </div>
                ) : (
                  <Select value={selectedClinicianId} onValueChange={setSelectedClinicianId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a clinician..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredClinicians.map((c) => (
                        <SelectItem key={c.dimension_id} value={c.dimension_id}>
                          <div className="flex items-center gap-2">
                            <User2 className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{c.dimension_label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {existingUserWithGuid && (
                  <p className="text-xs text-amber-600">
                    Note: {existingUserWithGuid.full_name} is currently linked to this clinician. They will be unlinked.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  This links {userName}'s profile to the selected Jane clinician's data for attribution purposes.
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !selectedClinicianId}>
                {linkMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Link to Clinician
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
