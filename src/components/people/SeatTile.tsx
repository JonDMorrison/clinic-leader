import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Briefcase, User, ChevronUp, Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SeatUser {
  id: string;
  user_id: string;
  is_primary: boolean;
  users: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  } | null;
}

interface SeatTileProps {
  seat: {
    id: string;
    title: string;
    responsibilities: string[];
    user_id: string | null;
    clearance_level?: number | null;
    users?: {
      full_name: string;
      avatar_url?: string | null;
    } | null;
    seat_users?: SeatUser[];
    reports_to_seat?: {
      id: string;
      title: string;
    } | null;
  };
  users: Array<{ id: string; full_name: string }>;
  onUpdate: () => void;
  isManager: boolean;
  onClick?: () => void;
}

const CLEARANCE_LABELS: Record<number, string> = {
  1: "Level 1",
  2: "Level 2",
  3: "Level 3",
  4: "Level 4",
  5: "Level 5",
};

export const SeatTile = ({ seat, users, onUpdate, isManager, onClick }: SeatTileProps) => {
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

  // Get all users assigned to this seat (from seat_users or legacy user_id)
  const assignedUsers = seat.seat_users?.filter(su => su.users)?.map(su => ({
    id: su.users!.id,
    name: su.users!.full_name,
    avatar_url: su.users!.avatar_url,
    isPrimary: su.is_primary,
  })) || [];

  // Fallback to legacy single user if seat_users is empty
  if (assignedUsers.length === 0 && seat.users) {
    assignedUsers.push({
      id: seat.user_id!,
      name: seat.users.full_name,
      avatar_url: seat.users.avatar_url,
      isPrimary: true,
    });
  }

  const clearanceLevel = seat.clearance_level || 3;

  return (
    <div 
      className="cursor-pointer" 
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      <Card className="hover:bg-accent/50 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <Briefcase className="w-5 h-5 text-brand mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base">{seat.title}</CardTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-xs gap-1">
                    <Shield className="w-3 h-3" />
                    {CLEARANCE_LABELS[clearanceLevel]}
                  </Badge>
                  {seat.reports_to_seat && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <ChevronUp className="w-3 h-3" />
                      {seat.reports_to_seat.title}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* User avatars */}
            <div className="flex -space-x-2">
              {assignedUsers.length > 0 ? (
                assignedUsers.slice(0, 3).map((user) => (
                  <UserAvatar 
                    key={user.id} 
                    user={{ id: user.id, full_name: user.name, avatar_url: user.avatar_url }} 
                    size="md" 
                    className="border-2 border-background shrink-0"
                  />
                ))
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              {assignedUsers.length > 3 && (
                <div className="h-10 w-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground shrink-0">
                  +{assignedUsers.length - 3}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {seat.responsibilities.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase">
                Responsibilities
              </h4>
              <ul className="space-y-1">
                {seat.responsibilities.slice(0, 3).map((resp, idx) => (
                  <li key={idx} className="text-sm text-foreground flex gap-2">
                    <span className="text-brand">•</span>
                    <span className="truncate">{resp}</span>
                  </li>
                ))}
                {seat.responsibilities.length > 3 && (
                  <li className="text-xs text-muted-foreground">
                    + {seat.responsibilities.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Show assigned users */}
          {assignedUsers.length > 0 && (
            <div className="pt-2 border-t border-border">
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                {assignedUsers.length > 1 ? "Assigned Users" : "Assigned User"}
              </h4>
              <div className="flex flex-wrap gap-1">
                {assignedUsers.map((user) => (
                  <Badge key={user.id} variant="secondary" className="text-xs">
                    {user.name}
                    {user.isPrimary && assignedUsers.length > 1 && (
                      <span className="ml-1 text-muted-foreground">(primary)</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {isManager && assignedUsers.length === 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <h4 className="text-xs font-medium text-muted-foreground uppercase">
                Assign User
              </h4>
              <Select
                value={seat.user_id || "unassigned"}
                onValueChange={handleUserAssignment}
              >
                <SelectTrigger onClick={(e) => e.stopPropagation()}>
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
        </CardContent>
      </Card>
    </div>
  );
};