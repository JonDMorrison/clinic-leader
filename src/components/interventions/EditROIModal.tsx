import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, DollarSign, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditROIModalProps {
  open: boolean;
  onClose: () => void;
  intervention: {
    id: string;
    estimated_hours?: number | null;
    estimated_cost?: number | null;
    actual_hours?: number | null;
    actual_cost?: number | null;
    roi_notes?: string | null;
  };
  onUpdate?: () => void;
}

export function EditROIModal({ open, onClose, intervention, onUpdate }: EditROIModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [estimatedHours, setEstimatedHours] = useState<string>("");
  const [estimatedCost, setEstimatedCost] = useState<string>("");
  const [actualHours, setActualHours] = useState<string>("");
  const [actualCost, setActualCost] = useState<string>("");
  const [roiNotes, setRoiNotes] = useState<string>("");

  // Reset form when intervention changes or modal opens
  useEffect(() => {
    if (open) {
      setEstimatedHours(intervention.estimated_hours?.toString() || "");
      setEstimatedCost(intervention.estimated_cost?.toString() || "");
      setActualHours(intervention.actual_hours?.toString() || "");
      setActualCost(intervention.actual_cost?.toString() || "");
      setRoiNotes(intervention.roi_notes || "");
    }
  }, [intervention, open]);

  const parseNumber = (value: string): number | null => {
    if (!value.trim()) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("interventions")
        .update({
          estimated_hours: parseNumber(estimatedHours),
          estimated_cost: parseNumber(estimatedCost),
          actual_hours: parseNumber(actualHours),
          actual_cost: parseNumber(actualCost),
          roi_notes: roiNotes.trim() || null,
        })
        .eq("id", intervention.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intervention", intervention.id] });
      toast({
        title: "ROI data updated",
        description: "Your changes have been saved.",
      });
      onUpdate?.();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update ROI data",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Edit ROI Tracking</DialogTitle>
          <DialogDescription>
            Track estimated and actual investment for this intervention.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Estimates Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Estimates</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="estimatedHours" className="text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Estimated Hours
                </Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="e.g., 40"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="estimatedCost" className="text-xs flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Estimated Cost ($)
                </Label>
                <Input
                  id="estimatedCost"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g., 5000"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Actuals Section */}
          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-sm font-medium">Actuals</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="actualHours" className="text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Actual Hours
                </Label>
                <Input
                  id="actualHours"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="e.g., 52"
                  value={actualHours}
                  onChange={(e) => setActualHours(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="actualCost" className="text-xs flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Actual Cost ($)
                </Label>
                <Input
                  id="actualCost"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g., 6200"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="grid gap-1.5 pt-2 border-t">
            <Label htmlFor="roiNotes" className="text-xs">Notes</Label>
            <Textarea
              id="roiNotes"
              placeholder="ROI assumptions, calculation notes, or context..."
              value={roiNotes}
              onChange={(e) => setRoiNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
