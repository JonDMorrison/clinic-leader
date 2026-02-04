/**
 * AddLegacyMetricModal
 * 
 * Modal to add a legacy workbook row as a tracked metric on the scorecard.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { Loader2, ArrowRight, FileSpreadsheet } from "lucide-react";

function inferMetricConfig(metricName: string): {
  unit: 'number' | 'currency' | 'percent';
  direction: 'up' | 'down';
  category: string;
} {
  const name = metricName.toLowerCase();
  
  let unit: 'number' | 'currency' | 'percent' = 'number';
  if (name.includes('%') || name.includes('rate') || name.includes('ratio')) {
    unit = 'percent';
  } else if (name.includes('revenue') || name.includes('collected') || name.includes('sales') || name.includes('$') || name.includes('billing')) {
    unit = 'currency';
  }
  
  let direction: 'up' | 'down' = 'up';
  if (name.includes('cancellation') || name.includes('no show') || name.includes('wait')) {
    direction = 'down';
  }
  
  let category = 'Operations';
  if (name.includes('revenue') || name.includes('sales') || name.includes('collected') || name.includes('billing')) {
    category = 'Revenue';
  } else if (name.includes('patient') || name.includes('referral')) {
    category = 'Patients';
  } else if (name.includes('provider') || name.includes('therapist') || name.includes('staff')) {
    category = 'Team';
  }
  
  return { unit, direction, category };
}

interface AddLegacyMetricModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricName: string;
  sectionTitle: string;
  rowData: any[];
}

export function AddLegacyMetricModal({
  open,
  onOpenChange,
  metricName,
  sectionTitle,
  rowData,
}: AddLegacyMetricModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  
  const inferredConfig = inferMetricConfig(metricName);
  
  const [target, setTarget] = useState("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("team_id", currentUser.team_id);
      return data || [];
    },
    enabled: !!currentUser?.team_id && open,
  });

  const { data: existingMetric } = useQuery({
    queryKey: ["existing-metric", currentUser?.team_id, metricName],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;
      const { data } = await supabase
        .from("metrics")
        .select("id, name")
        .eq("organization_id", currentUser.team_id)
        .ilike("name", metricName)
        .maybeSingle();
      return data;
    },
    enabled: !!currentUser?.team_id && open,
  });

  const createMetric = useMutation({
    mutationFn: async () => {
      if (!currentUser?.team_id) throw new Error("No organization");
      
      const { data, error } = await supabase
        .from("metrics")
        .insert({
          organization_id: currentUser.team_id,
          name: metricName,
          category: inferredConfig.category,
          unit: inferredConfig.unit,
          direction: inferredConfig.direction,
          target: target ? parseFloat(target) : null,
          owner_id: ownerId || null,
          sync_source: "manual", // Legacy data is manual entry
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      toast.success(`${metricName} added to your scorecard`, {
        action: {
          label: "View Scorecard",
          onClick: () => navigate("/scorecard"),
        },
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to add metric", {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setTarget("");
    setOwnerId("");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createMetric.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Add to Scorecard
          </DialogTitle>
          <DialogDescription>
            Track "{metricName}" from {sectionTitle} on your scorecard.
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
                  onOpenChange(false);
                  navigate("/scorecard");
                }}
              >
                View Scorecard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
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
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Source: {sectionTitle} (manual entry)
              </div>

              <div className="space-y-2">
                <Label htmlFor="target">Target Value</Label>
                <Input
                  id="target"
                  type="number"
                  placeholder={inferredConfig.unit === 'percent' ? "e.g., 90" : "e.g., 100"}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner">Owner (optional)</Label>
                <Select value={ownerId || "none"} onValueChange={(val) => setOwnerId(val === "none" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No owner</SelectItem>
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
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !target}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Add to Scorecard
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
