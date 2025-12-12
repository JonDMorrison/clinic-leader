import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Seat {
  id: string;
  title: string;
  responsibilities: string[] | null;
  user_id: string | null;
  organization_id: string | null;
  reports_to_seat_id: string | null;
}

interface SeatManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seats: Seat[];
  onUpdate: () => void;
  organizationId: string | null;
}

export const SeatManagementDialog = ({
  open,
  onOpenChange,
  seats,
  onUpdate,
  organizationId,
}: SeatManagementDialogProps) => {
  const { toast } = useToast();
  const [editingSeatId, setEditingSeatId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [responsibilitiesText, setResponsibilitiesText] = useState("");
  const [reportsToSeatId, setReportsToSeatId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setResponsibilitiesText("");
    setReportsToSeatId(null);
    setEditingSeatId(null);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please enter a seat title", variant: "destructive" });
      return;
    }

    const responsibilities = responsibilitiesText
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    try {
      if (editingSeatId) {
        const { error } = await supabase
          .from("seats")
          .update({ title, responsibilities, reports_to_seat_id: reportsToSeatId })
          .eq("id", editingSeatId);

        if (error) throw error;
        toast({ title: "Seat updated successfully" });
      } else {
        const { error } = await supabase
          .from("seats")
          .insert({ title, responsibilities, organization_id: organizationId, reports_to_seat_id: reportsToSeatId });

        if (error) throw error;
        toast({ title: "Seat created successfully" });
      }

      resetForm();
      onUpdate();
    } catch (error: any) {
      toast({ title: "Error saving seat", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (seat: Seat) => {
    setTitle(seat.title);
    setResponsibilitiesText((seat.responsibilities || []).join("\n"));
    setReportsToSeatId(seat.reports_to_seat_id);
    setEditingSeatId(seat.id);
    setIsCreating(false);
  };

  const handleDelete = async (seatId: string) => {
    try {
      const { error } = await supabase.from("seats").delete().eq("id", seatId);

      if (error) throw error;
      toast({ title: "Seat deleted successfully" });
      onUpdate();
      setDeleteConfirmId(null);
    } catch (error: any) {
      toast({ title: "Error deleting seat", description: error.message, variant: "destructive" });
    }
  };

  const startCreating = () => {
    resetForm();
    setIsCreating(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Organizational Seats</DialogTitle>
            <DialogDescription>
              Create, edit, and delete seats that define key roles in your organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Create/Edit Form */}
            {(isCreating || editingSeatId) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {editingSeatId ? "Edit Seat" : "Create New Seat"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Seat Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Clinic Manager, Lead Provider"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="responsibilities">
                      Responsibilities (one per line)
                    </Label>
                    <Textarea
                      id="responsibilities"
                      placeholder="Oversee daily operations&#10;Manage staff schedules&#10;Ensure patient satisfaction"
                      value={responsibilitiesText}
                      onChange={(e) => setResponsibilitiesText(e.target.value)}
                      rows={5}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reportsTo">Reports To</Label>
                    <Select 
                      value={reportsToSeatId || "none"} 
                      onValueChange={(v) => setReportsToSeatId(v === "none" ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a seat" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Top Level)</SelectItem>
                        {seats
                          .filter((s) => s.id !== editingSeatId)
                          .map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave}>Save Seat</Button>
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Create Button */}
            {!isCreating && !editingSeatId && (
              <Button onClick={startCreating} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Create New Seat
              </Button>
            )}

            {/* Existing Seats List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">
                Existing Seats ({seats.length})
              </h3>
              {seats.map((seat) => (
                <Card key={seat.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{seat.title}</h4>
                        {seat.responsibilities && seat.responsibilities.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {seat.responsibilities.map((resp, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground">
                                • {resp}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(seat)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmId(seat.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Seat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the seat from your organization. Any user currently assigned
              to this seat will be unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
