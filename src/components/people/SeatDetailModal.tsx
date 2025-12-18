import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Plus, X, Shield, ChevronUp, Users } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface SeatUser {
  id: string;
  user_id: string;
  is_primary: boolean;
  users: {
    id: string;
    full_name: string;
  } | null;
}

interface SeatDetailModalProps {
  seat: {
    id: string;
    title: string;
    responsibilities: string[];
    user_id: string | null;
    reports_to_seat_id: string | null;
    clearance_level?: number | null;
    users?: {
      full_name: string;
    } | null;
    seat_users?: SeatUser[];
    reports_to_seat?: {
      id: string;
      title: string;
    } | null;
  } | null;
  users: Array<{ id: string; full_name: string }>;
  allSeats: Array<{ id: string; title: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  isManager: boolean;
}

const CLEARANCE_OPTIONS = [
  { value: "1", label: "Level 1 - Basic" },
  { value: "2", label: "Level 2 - Standard" },
  { value: "3", label: "Level 3 - Elevated" },
  { value: "4", label: "Level 4 - High" },
  { value: "5", label: "Level 5 - Full Access" },
];

export const SeatDetailModal = ({ seat, users, allSeats, open, onOpenChange, onUpdate, isManager }: SeatDetailModalProps) => {
  const { data: currentUser } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [reportsToSeatId, setReportsToSeatId] = useState<string | null>(null);
  const [clearanceLevel, setClearanceLevel] = useState<number>(3);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string>("");

  // Get assigned users from seat_users or legacy user_id
  const getAssignedUsers = () => {
    if (seat?.seat_users && seat.seat_users.length > 0) {
      return seat.seat_users
        .filter(su => su.users)
        .map(su => ({
          id: su.users!.id,
          name: su.users!.full_name,
          isPrimary: su.is_primary,
        }));
    }
    if (seat?.users && seat.user_id) {
      return [{ id: seat.user_id, name: seat.users.full_name, isPrimary: true }];
    }
    return [];
  };

  const handleEdit = () => {
    if (seat) {
      setTitle(seat.title);
      setResponsibilities([...seat.responsibilities]);
      setUserId(seat.user_id);
      setReportsToSeatId(seat.reports_to_seat_id);
      setClearanceLevel(seat.clearance_level || 3);
      setAssignedUserIds(getAssignedUsers().map(u => u.id));
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTitle("");
    setResponsibilities([]);
    setUserId(null);
    setReportsToSeatId(null);
    setClearanceLevel(3);
    setAssignedUserIds([]);
    setSelectedUserToAdd("");
  };

  const handleSave = async () => {
    if (!seat || !currentUser?.team_id) return;

    // Update seat details
    const { error: seatError } = await supabase
      .from("seats")
      .update({
        title,
        responsibilities,
        user_id: assignedUserIds.length > 0 ? assignedUserIds[0] : null,
        reports_to_seat_id: reportsToSeatId === "none" ? null : reportsToSeatId,
        clearance_level: clearanceLevel,
      })
      .eq("id", seat.id);

    if (seatError) {
      toast.error("Failed to update seat");
      return;
    }

    // Update seat_users
    // First, remove all existing assignments
    await supabase
      .from("seat_users")
      .delete()
      .eq("seat_id", seat.id);

    // Then add new assignments
    if (assignedUserIds.length > 0) {
      const seatUsersToInsert = assignedUserIds.map((uid, idx) => ({
        seat_id: seat.id,
        user_id: uid,
        organization_id: currentUser.team_id,
        is_primary: idx === 0, // First user is primary
      }));

      const { error: seatUsersError } = await supabase
        .from("seat_users")
        .insert(seatUsersToInsert);

      if (seatUsersError) {
        console.error("Failed to update seat_users:", seatUsersError);
      }
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

  const addUser = () => {
    if (selectedUserToAdd && !assignedUserIds.includes(selectedUserToAdd)) {
      setAssignedUserIds([...assignedUserIds, selectedUserToAdd]);
      setSelectedUserToAdd("");
    }
  };

  const removeUser = (userId: string) => {
    setAssignedUserIds(assignedUserIds.filter(id => id !== userId));
  };

  const availableUsersToAdd = users.filter(u => !assignedUserIds.includes(u.id));

  if (!seat) return null;

  const assignedUsers = getAssignedUsers();

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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clearance">Clearance Level</Label>
                    <Select 
                      value={clearanceLevel.toString()} 
                      onValueChange={(v) => setClearanceLevel(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select clearance" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLEARANCE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
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
                        {allSeats
                          .filter((s) => s.id !== seat?.id)
                          .map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                  <Label>Assigned Users</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {assignedUserIds.map((uid, idx) => {
                      const user = users.find(u => u.id === uid);
                      return (
                        <Badge key={uid} variant="secondary" className="text-sm py-1 px-2 gap-1">
                          {user?.full_name || "Unknown"}
                          {idx === 0 && assignedUserIds.length > 1 && (
                            <span className="text-muted-foreground">(primary)</span>
                          )}
                          <button 
                            onClick={() => removeUser(uid)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    {assignedUserIds.length === 0 && (
                      <span className="text-sm text-muted-foreground">No users assigned</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Select value={selectedUserToAdd} onValueChange={setSelectedUserToAdd}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select user to add" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsersToAdd.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addUser}
                      disabled={!selectedUserToAdd}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The first user added will be the primary occupant. Additional users share this seat equally.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Info badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Shield className="w-3 h-3" />
                    Clearance Level {seat.clearance_level || 3}
                  </Badge>
                  {seat.reports_to_seat && (
                    <Badge variant="secondary" className="gap-1">
                      <ChevronUp className="w-3 h-3" />
                      Reports to: {seat.reports_to_seat.title}
                    </Badge>
                  )}
                </div>

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
                  <h4 className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {assignedUsers.length > 1 ? "Assigned Users" : "Assigned User"}
                  </h4>
                  {assignedUsers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {assignedUsers.map((user) => (
                        <Badge key={user.id} variant="secondary" className="text-sm">
                          {user.name}
                          {user.isPrimary && assignedUsers.length > 1 && (
                            <span className="ml-1 text-muted-foreground">(primary)</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Unassigned</p>
                  )}
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