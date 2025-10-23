import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface NewRecallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewRecallModal({ open, onOpenChange }: NewRecallModalProps) {
  const [patientHash, setPatientHash] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [kind, setKind] = useState<"Appointment" | "Staff Follow Up">("Appointment");
  const [notes, setNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const queryClient = useQueryClient();

  const handleCreate = async () => {
    if (!patientHash || !dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userData } = await supabase
        .from("users")
        .select("team_id")
        .eq("email", user.email)
        .single();

      if (!userData?.team_id) throw new Error("User has no organization");

      const { error } = await supabase.from("recalls").insert({
        organization_id: userData.team_id,
        patient_hash: patientHash,
        due_date: dueDate,
        kind,
        status: "Open",
        notes: notes || null,
      });

      if (error) throw error;

      toast.success("Recall created successfully");
      queryClient.invalidateQueries({ queryKey: ["recalls"] });
      queryClient.invalidateQueries({ queryKey: ["recall-metrics"] });
      
      // Reset form
      setPatientHash("");
      setDueDate("");
      setKind("Appointment");
      setNotes("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating recall:", error);
      toast.error("Failed to create recall");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Recall</DialogTitle>
          <DialogDescription>
            Add a new recall for patient follow-up. Patient identifier will be hashed for privacy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="patient">Patient ID</Label>
            <Input
              id="patient"
              placeholder="Enter patient identifier"
              value={patientHash}
              onChange={(e) => setPatientHash(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use chart number or unique identifier (no PHI)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due-date">Due Date</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Recall Type</Label>
            <RadioGroup value={kind} onValueChange={(v: any) => setKind(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Appointment" id="appointment" />
                <Label htmlFor="appointment" className="cursor-pointer font-normal">
                  Appointment <span className="text-muted-foreground text-xs">(patient gets reminder)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Staff Follow Up" id="staff" />
                <Label htmlFor="staff" className="cursor-pointer font-normal">
                  Staff Follow Up <span className="text-muted-foreground text-xs">(internal only)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any relevant notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Recall"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
