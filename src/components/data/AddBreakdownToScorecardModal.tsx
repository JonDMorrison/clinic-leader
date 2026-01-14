import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Database, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";

interface AddBreakdownToScorecardModalProps {
  open: boolean;
  onClose: () => void;
  parentMetricName: string;
  dimensionType: string; // e.g., "Clinician", "Location"
  dimensionLabel: string; // e.g., "Dr. Sarah Chen", "Main Clinic"
  unit: string;
}

// Infer configuration based on parent metric and unit
function inferConfig(parentMetricName: string, unit: string) {
  const lower = parentMetricName.toLowerCase();
  
  let direction: "up" | "down" = "up";
  let category = "Operations";
  
  if (lower.includes("cancel") || lower.includes("no show")) {
    direction = "down";
  }
  
  if (lower.includes("visit") || lower.includes("appointment")) {
    category = "Appointments";
  } else if (lower.includes("revenue") || lower.includes("collected") || lower.includes("invoiced")) {
    category = "Revenue";
  } else if (lower.includes("patient")) {
    category = "Patients";
  }
  
  return { direction, category, unit };
}

export function AddBreakdownToScorecardModal({
  open,
  onClose,
  parentMetricName,
  dimensionType,
  dimensionLabel,
  unit,
}: AddBreakdownToScorecardModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  
  const metricName = `${parentMetricName} - ${dimensionLabel}`;
  const inferredConfig = inferConfig(parentMetricName, unit);
  
  const [target, setTarget] = useState("");
  const [ownerId, setOwnerId] = useState("");

  // Check if metric already exists
  const { data: existingMetric } = useQuery({
    queryKey: ["check-metric-exists", currentUser?.team_id, metricName],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;
      const { data } = await supabase
        .from("metrics")
        .select("id, name")
        .eq("organization_id", currentUser.team_id)
        .ilike("name", metricName)
        .single();
      return data;
    },
    enabled: !!currentUser?.team_id && open,
  });

  // Fetch team members for owner dropdown
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("team_id", currentUser.team_id)
        .order("full_name");
      return data || [];
    },
    enabled: !!currentUser?.team_id && open,
  });

  const addToScorecardMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.team_id) throw new Error("No organization");
      
      const { data, error } = await supabase
        .from("metrics")
        .insert({
          organization_id: currentUser.team_id,
          name: metricName,
          unit: inferredConfig.unit === "dollars" ? "number" : inferredConfig.unit === "%" ? "percent" : "number",
          direction: inferredConfig.direction === "up" ? "higher_is_better" : "lower_is_better",
          target: target ? parseFloat(target) : null,
          owner: ownerId || null,
          category: inferredConfig.category,
          is_active: true,
          sync_source: "jane", // Mark as Jane-sourced for tracking
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      queryClient.invalidateQueries({ queryKey: ["tracked-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["scorecard-metrics"] });
      toast.success(`${metricName} added to scorecard`);
      onClose();
      navigate("/scorecard");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add to scorecard");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addToScorecardMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Add to Scorecard
          </DialogTitle>
          <DialogDescription>
            Track {dimensionLabel} ({dimensionType}) as a separate metric on your scorecard.
          </DialogDescription>
        </DialogHeader>

        {existingMetric ? (
          <div className="py-4">
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning-foreground">
                A metric with this name already exists in your scorecard.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  onClose();
                  navigate("/scorecard");
                }}
              >
                View Scorecard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Pre-filled info */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Metric Name</Label>
                <p className="font-medium">{metricName}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Unit</Label>
                  <Badge variant="secondary" className="capitalize">
                    {inferredConfig.unit}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Direction</Label>
                  <Badge variant="secondary">
                    {inferredConfig.direction === 'up' ? '↑ Higher better' : '↓ Lower better'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Category</Label>
                  <Badge variant="secondary">{inferredConfig.category}</Badge>
                </div>
              </div>

              <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground flex items-center gap-2">
                <Database className="w-3.5 h-3.5" />
                Breakdown from: {parentMetricName}
              </div>

              {/* User-configurable fields */}
              <div className="space-y-2">
                <Label htmlFor="target">Target Value</Label>
                <Input
                  id="target"
                  type="number"
                  placeholder={unit === '%' ? "e.g., 90" : "e.g., 100"}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {unit === '%' 
                    ? "Enter as a whole number (e.g., 90 for 90%)"
                    : unit === 'dollars'
                    ? "Enter amount without currency symbol"
                    : "Enter your target value"
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner">Owner (optional)</Label>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No owner</SelectItem>
                    {teamMembers?.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={addToScorecardMutation.isPending}>
                {addToScorecardMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add to Scorecard
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
