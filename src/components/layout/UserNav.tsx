import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Building2, Settings, Plug, Presentation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useDemoWalkthrough } from "@/components/demo";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  team?: {
    name: string;
  };
}

export const UserNav = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { start: startDemo, isActive: isDemoActive } = useDemoWalkthrough();

  // Use React Query with the same key as ProfileSettings for instant cache updates
  const { data: profile } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: async (): Promise<UserProfile | null> => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;

      const { data: userData } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url, team_id")
        .eq("id", authUser.id)
        .single();

      if (userData) {
        let teamName: string | undefined = undefined;
        if (userData.team_id) {
          const { data: team } = await supabase
            .from("teams")
            .select("name")
            .eq("id", userData.team_id)
            .single();
          teamName = team?.name;
        }

        return {
          id: userData.id,
          full_name: userData.full_name ?? authUser.user_metadata?.full_name ?? authUser.email ?? "User",
          email: userData.email ?? authUser.email ?? "",
          avatar_url: userData.avatar_url,
          team: teamName ? { name: teamName } : undefined,
        };
      }

      return {
        id: authUser.id,
        full_name: authUser.user_metadata?.full_name ?? authUser.email ?? "User",
        email: authUser.email ?? "",
        avatar_url: null,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore signOut errors - session may already be invalid
      console.warn("SignOut error (continuing anyway):", error);
    }
    // Always clear queries and navigate to auth, even if signOut failed
    // (user is effectively logged out if session was already invalid)
    queryClient.clear();
    navigate("/auth");
  };

  // Derive display name from available data
  const displayName = profile?.full_name || "User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative h-10 w-10 rounded-full ring-2 ring-brand/20 hover:ring-brand/40 transition-all bg-background/80 backdrop-blur-sm shadow-lg border border-border/40 hover:shadow-xl">
          <UserAvatar 
            user={profile} 
            size="md" 
            className="h-10 w-10"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-semibold leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{profile?.email || ""}</p>
            {profile?.team && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <Building2 className="h-3 w-3" />
                <span>{profile.team.name}</span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!isDemoActive && (
          <DropdownMenuItem onClick={startDemo}>
            <Presentation className="mr-2 h-4 w-4" />
            <span>Start Demo</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigate("/settings/organization")}>
          <Building2 className="mr-2 h-4 w-4" />
          <span>Company Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/settings/integrations")}>
          <Plug className="mr-2 h-4 w-4" />
          <span>Integrations</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>User Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
