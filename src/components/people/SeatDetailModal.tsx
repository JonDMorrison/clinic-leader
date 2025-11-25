import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Plus, X } from "lucide-react";

interface SeatDetailModalProps {
  seat: {
    id: string;
    title: string;
    responsibilities: string[];
    user_id: string | null;
    users?: {
      full_name: string;
    } | null;
  } | null;
  users: Array<{ id: string; full_name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  isManager: boolean;
}

export const SeatDetailModal = ({ seat, users, open, onOpenChange, onUpdate, isManager }: SeatDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const handleEdit = () => {
    if (seat) {
      setTitle(seat.title);
      setResponsibilities([...seat.responsibilities]);
      setUserId(seat.user_id);
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTitle("");
    setResponsibilities([]);
    setUserId(null);
  };

  const handleSave = async () => {
    if (!seat) return;

    const { error } = await supabase
      .from("seats")
      .update({
        title,
        responsibilities,
        user_id: userId === "unassigned" ? null : userId,
      })
      .eq("id", seat.id);

    if (error) {
      toast.error("Failed to update seat");
      return;
    }

    toast.success("Seat updated successfully");
    setIsEditing(false);
    onUpdate();
  };

  const handleDelete = async () => {
    if (!seat) return;

    const { error } = await supabase
      .from("seats")
      .delete()
      .eq("id", seat.id);

    if (error) {
      toast.error("Failed to delete seat");
      return;
    }

    toast.success("Seat deleted successfully");
    setShowDeleteDialog(false);
    onOpenChange(false);
    onUpdate();
  };

  const addResponsibility = () => {
    setResponsibilities([...responsibilities, ""]);
  };

  const updateResponsibility = (index: number, value: string) => {
    const newResp = [...responsibilities];
    newResp[index] = value;
    setResponsibilities(newResp);
  };

  const removeResponsibility = (index: number) => {
    setResponsibilities(responsibilities.filter((_, i) => i !== index));
  };

  if (!seat) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {isEditing ? "Edit Seat" : seat.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">Seat Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Clinic Manager"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Responsibilities</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addResponsibility}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {responsibilities.map((resp, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={resp}
                          onChange={(e) => updateResponsibility(idx, e.target.value)}
                          placeholder="Enter responsibility"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeResponsibility(idx)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user">Assigned User</Label>
                  <Select value={userId || "unassigned"} onValueChange={setUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                {seat.responsibilities.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase">
                      Responsibilities
                    </h4>
                    <ul className="space-y-2">
                      {seat.responsibilities.map((resp, idx) => (
                        <li key={idx} className="text-sm flex gap-2">
                          <span className="text-brand">•</span>
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-3 pt-3 border-t border-border">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase">
                    Assigned User
                  </h4>
                  <p className="text-sm">
                    {seat.users?.full_name || (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex justify-between gap-2">
            <div>
              {isManager && !isEditing && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Seat
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save Changes</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                  {isManager && (
                    <Button onClick={handleEdit}>Edit Seat</Button>
                  )}
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Seat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{seat.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
