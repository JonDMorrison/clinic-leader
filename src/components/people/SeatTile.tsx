import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Briefcase, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SeatTileProps {
  seat: {
    id: string;
    title: string;
    responsibilities: string[];
    user_id: string | null;
    users?: {
      full_name: string;
    } | null;
  };
  users: Array<{ id: string; full_name: string }>;
  onUpdate: () => void;
  isManager: boolean;
}

export const SeatTile = ({ seat, users, onUpdate, isManager }: SeatTileProps) => {
  const handleUserAssignment = async (userId: string) => {
    const { error } = await supabase
      .from("seats")
      .update({ user_id: userId === "unassigned" ? null : userId })
      .eq("id", seat.id);

    if (error) {
      toast.error("Failed to assign user");
      return;
    }

    toast.success("User assigned successfully");
    onUpdate();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Briefcase className="w-5 h-5 text-brand mt-1 shrink-0" />
            <CardTitle className="text-base">{seat.title}</CardTitle>
          </div>
          {seat.users ? (
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {getInitials(seat.users.full_name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                <User className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {seat.responsibilities.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase">
              Responsibilities
            </h4>
            <ul className="space-y-1">
              {seat.responsibilities.map((resp, idx) => (
                <li key={idx} className="text-sm text-foreground flex gap-2">
                  <span className="text-brand">•</span>
                  <span>{resp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isManager && (
          <div className="space-y-2 pt-2 border-t border-border">
            <h4 className="text-xs font-medium text-muted-foreground uppercase">
              Assign User
            </h4>
            <Select
              value={seat.user_id || "unassigned"}
              onValueChange={handleUserAssignment}
            >
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
        )}

        {!isManager && seat.users && (
          <div className="pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Assigned to: <span className="text-foreground font-medium">{seat.users.full_name}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
