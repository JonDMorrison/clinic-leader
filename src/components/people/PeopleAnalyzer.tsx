import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserCircle2, Download, Trash2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface User {
  id: string;
  full_name: string;
}

interface CoreValue {
  id: string;
  name: string;
}

interface ValueRating {
  id: string;
  user_id: string;
  value_id: string;
  rating: "+" | "±" | "-";
  notes: string | null;
}

interface PeopleAnalyzerProps {
  users: User[];
  values: CoreValue[];
  ratings: ValueRating[];
  onUpdate: () => void;
  isManager: boolean;
}

export const PeopleAnalyzer = ({
  users,
  values,
  ratings,
  onUpdate,
  isManager,
}: PeopleAnalyzerProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || "");
  const [localRatings, setLocalRatings] = useState<Record<string, { rating: string; notes: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const getUserRating = (valueId: string) => {
    if (localRatings[valueId]) {
      return localRatings[valueId];
    }
    const existing = ratings.find((r) => r.user_id === selectedUserId && r.value_id === valueId);
    return { rating: existing?.rating || "", notes: existing?.notes || "" };
  };

  const handleRatingChange = (valueId: string, rating: string) => {
    setLocalRatings({
      ...localRatings,
      [valueId]: {
        rating,
        notes: getUserRating(valueId).notes,
      },
    });
  };

  const handleNotesChange = (valueId: string, notes: string) => {
    setLocalRatings({
      ...localRatings,
      [valueId]: {
        rating: getUserRating(valueId).rating,
        notes,
      },
    });
  };

  const handleSave = async () => {
    if (!selectedUserId) return;

    setIsSaving(true);
    try {
      for (const [valueId, data] of Object.entries(localRatings)) {
        if (!data.rating) continue;

        const existing = ratings.find(
          (r) => r.user_id === selectedUserId && r.value_id === valueId
        );

        if (existing) {
          const { error } = await supabase
            .from("value_ratings")
            .update({
              rating: data.rating as "+" | "±" | "-",
              notes: data.notes || null,
            })
            .eq("id", existing.id);

          if (error) throw error;
        } else {
          const { error } = await supabase.from("value_ratings").insert({
            user_id: selectedUserId,
            value_id: valueId,
            rating: data.rating as "+" | "±" | "-",
            notes: data.notes || null,
          });

          if (error) throw error;
        }
      }

      toast.success("Ratings saved successfully");
      setLocalRatings({});
      onUpdate();
    } catch (error) {
      toast.error("Failed to save ratings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    const csvRows = [
      ["User", "Value", "Rating", "Notes"],
      ...users.flatMap((user) =>
        values.map((value) => {
          const rating = ratings.find((r) => r.user_id === user.id && r.value_id === value.id);
          return [
            user.full_name,
            value.name,
            rating?.rating || "",
            rating?.notes || "",
          ];
        })
      ),
    ];

    const csvContent = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `people-analyzer-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  const getRatingBadgeVariant = (rating: string) => {
    if (rating === "+") return "success";
    if (rating === "±") return "warning";
    if (rating === "-") return "danger";
    return "muted";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Delete from user_roles first (foreign key constraint)
      const { error: rolesError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (rolesError) throw rolesError;

      // Delete from users table
      const { error: userError } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (userError) throw userError;

      toast.success("User deleted successfully");
      
      // If deleted user was selected, select first available user
      if (selectedUserId === userId && users.length > 1) {
        const nextUser = users.find(u => u.id !== userId);
        if (nextUser) setSelectedUserId(nextUser.id);
      }
      
      onUpdate();
      setUserToDelete(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  if (users.length === 0 || values.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Add users and core values to use the People Analyzer
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCircle2 className="w-5 h-5 text-brand" />
            <CardTitle>People Analyzer</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          {users.map((user) => (
            <div
              key={user.id}
              className={`relative flex flex-col items-center gap-2 cursor-pointer p-3 rounded-lg transition-colors ${
                selectedUserId === user.id
                  ? "bg-brand/10 border-2 border-brand"
                  : "hover:bg-muted/50 border-2 border-transparent"
              }`}
            >
              {isManager && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute -top-1 -right-1 h-6 w-6 p-0 rounded-full bg-background hover:bg-danger hover:text-danger-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserToDelete(user);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
              <div onClick={() => setSelectedUserId(user.id)} className="flex flex-col items-center gap-2">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-center whitespace-nowrap">
                  {user.full_name}
                </span>
              </div>
            </div>
          ))}
        </div>

        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {selectedUser.full_name}
              </h3>
            </div>

            {values.map((value) => {
              const ratingData = getUserRating(value.id);
              return (
                <div key={value.id} className="space-y-3 pb-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{value.name}</Label>
                    {ratingData.rating && (
                      <Badge variant={getRatingBadgeVariant(ratingData.rating) as any}>
                        {ratingData.rating}
                      </Badge>
                    )}
                  </div>

                  {isManager && (
                    <>
                      <RadioGroup
                        value={ratingData.rating}
                        onValueChange={(val) => handleRatingChange(value.id, val)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="+" id={`${value.id}-plus`} />
                          <Label htmlFor={`${value.id}-plus`} className="cursor-pointer">
                            + (Strong)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="±" id={`${value.id}-neutral`} />
                          <Label htmlFor={`${value.id}-neutral`} className="cursor-pointer">
                            ± (Developing)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="-" id={`${value.id}-minus`} />
                          <Label htmlFor={`${value.id}-minus`} className="cursor-pointer">
                            - (Weak)
                          </Label>
                        </div>
                      </RadioGroup>

                      <Textarea
                        placeholder="Add notes..."
                        value={ratingData.notes}
                        onChange={(e) => handleNotesChange(value.id, e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    </>
                  )}

                  {!isManager && ratingData.notes && (
                    <p className="text-sm text-muted-foreground">{ratingData.notes}</p>
                  )}
                </div>
              );
            })}

            {isManager && Object.keys(localRatings).length > 0 && (
              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? "Saving..." : "Save Ratings"}
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.full_name}? This action cannot be undone and will remove all associated data including ratings and seat assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && handleDeleteUser(userToDelete.id)}
              className="bg-danger hover:bg-danger/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
