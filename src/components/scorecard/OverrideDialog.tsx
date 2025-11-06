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
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";

interface OverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newValue: number, reason: string) => void;
  metricName: string;
  weekStart: string;
  janeValue: number | null;
}

export function OverrideDialog({
  open,
  onOpenChange,
  onConfirm,
  metricName,
  weekStart,
  janeValue,
}: OverrideDialogProps) {
  const [newValue, setNewValue] = useState<string>(janeValue?.toString() || "");
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    const numValue = parseFloat(newValue);
    if (isNaN(numValue)) return;
    
    onConfirm(numValue, reason);
    setNewValue("");
    setReason("");
  };

  const handleCancel = () => {
    onOpenChange(false);
    setNewValue("");
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Override Jane Data
          </DialogTitle>
          <DialogDescription>
            You are overriding synchronized data from Jane for <strong>{metricName}</strong> (week of {weekStart}).
            The original Jane value will be preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
            <div className="text-sm">
              <span className="font-medium">Jane Value: </span>
              <span className="font-semibold">{janeValue !== null ? janeValue.toLocaleString() : "—"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="override-value">New Value *</Label>
            <Input
              id="override-value"
              type="number"
              step="0.01"
              placeholder="Enter new value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="override-reason">Reason for override *</Label>
            <Textarea
              id="override-reason"
              placeholder="E.g., Manual count was performed, Jane data is incomplete..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!newValue || !reason.trim()}
            variant="destructive"
          >
            Override Jane Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
