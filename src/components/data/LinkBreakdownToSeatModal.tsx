import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Armchair, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";

interface LinkBreakdownToSeatModalProps {
  open: boolean;
  onClose: () => void;
  dimensionId: string; // e.g., "staff_001"
  dimensionLabel: string; // e.g., "Dr. Sarah Chen"
  dimensionType: string; // e.g., "clinician"
  importKey: string; // e.g., "jane_total_visits"
  parentMetricName: string; // e.g., "Total Visits"
}

export function LinkBreakdownToSeatModal({
  open,
  onClose,
  dimensionId,
  dimensionLabel,
  dimensionType,
  importKey,
  parentMetricName,
}: LinkBreakdownToSeatModalProps) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  
  const [selectedSeatId, setSelectedSeatId] = useState("");

  // Fetch seats
  const { data: seats, isLoading: loadingSeats } = useQuery({
    queryKey: ["seats-for-linking", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data } = await supabase
        .from("seats")
        .select(`
          id, 
          title,
          seat_users(user_id, users(full_name))
        `)
        .eq("organization_id", currentUser.team_id)
        .order("title");
      return data || [];
    },
    enabled: !!currentUser?.team_id && open,
  });

  // Check for existing seat_metrics link using the new schema
  const { data: existingLink } = useQuery({
    queryKey: ["seat-metric-link", currentUser?.team_id, dimensionId, importKey],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;
      const { data, error } = await supabase
        .from("seat_metrics")
        .select(`
          id,
          seat_id,
          seats(title)
        `)
        .eq("organization_id", currentUser.team_id)
        .eq("dimension_id", dimensionId)
        .eq("import_key", importKey)
        .maybeSingle();
      if (error) {
        console.error("Error fetching seat metric link:", error);
        return null;
      }
      return data;
    },
    enabled: !!currentUser?.team_id && open,
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSeatId || !currentUser?.team_id) throw new Error("Please select a seat");
      
      // If there's an existing link, update it; otherwise insert
      if (existingLink) {
        const { error } = await supabase
          .from("seat_metrics")
          .update({ seat_id: selectedSeatId })
          .eq("id", existingLink.id);
        if (error) throw error;
      } else {
        // Use new canonical schema: import_key + dimension fields only
        const { error } = await supabase
          .from("seat_metrics")
          .insert({
            seat_id: selectedSeatId,
            organization_id: currentUser.team_id,
            dimension_type: dimensionType,
            dimension_id: dimensionId,
            dimension_label: dimensionLabel,
            import_key: importKey,
            period_type: "weekly",
            created_by: currentUser.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seat-metric-link"] });
      queryClient.invalidateQueries({ queryKey: ["seat-metrics"] });
      toast.success(`${dimensionLabel} linked to seat`);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to link breakdown to seat");
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      if (!existingLink) throw new Error("No link to remove");
      
      const { error } = await supabase
        .from("seat_metrics")
        .delete()
        .eq("id", existingLink.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seat-metric-link"] });
      queryClient.invalidateQueries({ queryKey: ["seat-metrics"] });
      toast.success("Link removed from seat");
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

  // Helper to get seat occupant name
  const getSeatOccupant = (seat: any): string => {
    const seatUsers = seat.seat_users || [];
    if (seatUsers.length === 0) return "Empty seat";
    const names = seatUsers.map((su: any) => su.users?.full_name).filter(Boolean);
    return names.join(", ") || "Empty seat";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Armchair className="w-5 h-5 text-primary" />
            Link to Seat
          </DialogTitle>
          <DialogDescription>
            Link this {dimensionType}'s metrics to an accountability seat. This makes the seat accountable for these numbers.
          </DialogDescription>
        </DialogHeader>

        {/* Breakdown Info */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{dimensionLabel}</p>
              <p className="text-xs text-muted-foreground">{parentMetricName}</p>
            </div>
            <Badge variant="secondary" className="capitalize text-xs">
              {dimensionType}
            </Badge>
          </div>
        </div>

        {existingLink ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Already linked</p>
                  <p className="text-xs text-muted-foreground">
                    {dimensionLabel} is linked to seat: <strong>{(existingLink as any).seats?.title}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Change Seat</Label>
              <Select value={selectedSeatId} onValueChange={setSelectedSeatId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a different seat..." />
                </SelectTrigger>
                <SelectContent>
                  {seats?.map((seat: any) => (
                    <SelectItem key={seat.id} value={seat.id}>
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-medium">{seat.title}</span>
                        <span className="text-xs text-muted-foreground">{getSeatOccupant(seat)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="flex gap-2">
              <Button 
                variant="destructive" 
                onClick={() => unlinkMutation.mutate()}
                disabled={isPending}
              >
                {unlinkMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Remove Link
              </Button>
              <Button 
                onClick={() => linkMutation.mutate()}
                disabled={isPending || !selectedSeatId}
              >
                {linkMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Seat
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="seat">Select Seat</Label>
                {loadingSeats ? (
                  <div className="h-10 rounded-md border bg-muted/50 animate-pulse" />
                ) : seats?.length === 0 ? (
                  <div className="p-3 rounded-lg border text-center text-sm text-muted-foreground">
                    No seats found. Create seats in the Accountability Chart first.
                  </div>
                ) : (
                  <Select value={selectedSeatId} onValueChange={setSelectedSeatId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a seat..." />
                    </SelectTrigger>
                    <SelectContent>
                      {seats?.map((seat: any) => (
                        <SelectItem key={seat.id} value={seat.id}>
                          <div className="flex items-center gap-2">
                            <Armchair className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-medium">{seat.title}</span>
                            <span className="text-xs text-muted-foreground">({getSeatOccupant(seat)})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  The seat will become accountable for {dimensionLabel}'s performance metrics.
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !selectedSeatId}>
                {linkMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Link to Seat
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
