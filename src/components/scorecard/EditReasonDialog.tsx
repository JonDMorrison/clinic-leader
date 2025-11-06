import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface EditReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  metricName: string;
  weekStart: string;
  oldValue: number | null;
  newValue: number | null;
}

export function EditReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  metricName,
  weekStart,
  oldValue,
  newValue,
}: EditReasonDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
  };

  const handleCancel = () => {
    onOpenChange(false);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Metric Value</DialogTitle>
          <DialogDescription>
            You are updating <strong>{metricName}</strong> for week of {weekStart}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="text-center">
              <div className="text-muted-foreground mb-1">Previous</div>
              <div className="text-lg font-semibold">
                {oldValue !== null ? oldValue.toLocaleString() : "—"}
              </div>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="text-center">
              <div className="text-muted-foreground mb-1">New</div>
              <div className="text-lg font-semibold">
                {newValue !== null ? newValue.toLocaleString() : "—"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for change (optional)</Label>
            <Textarea
              id="reason"
              placeholder="E.g., Corrected data entry error, manual override of Jane sync..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
