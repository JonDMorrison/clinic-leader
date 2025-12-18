import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Building2, Settings, Plug } from "lucide-react";
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);

  useEffect(() => {
    // Listen to auth state changes first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthUser(session?.user ?? null);
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!authUser) return;

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

        setProfile({
          id: userData.id,
          full_name: userData.full_name ?? authUser.user_metadata?.full_name ?? authUser.email ?? "User",
          email: userData.email ?? authUser.email ?? "",
          avatar_url: userData.avatar_url,
          team: teamName ? { name: teamName } : undefined,
        });
      } else {
        setProfile({
          id: authUser.id,
          full_name: authUser.user_metadata?.full_name ?? authUser.email ?? "User",
          email: authUser.email ?? "",
          avatar_url: null,
        });
      }
    };

    fetchUserProfile();
  }, [authUser]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to log out");
    } else {
      navigate("/auth");
    }
  };

  // Derive display name from available data
  const displayName = profile?.full_name || authUser?.user_metadata?.full_name || authUser?.email || "User";

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
            <p className="text-xs leading-none text-muted-foreground">{profile?.email || authUser?.email || ""}</p>
            {profile?.team && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <Building2 className="h-3 w-3" />
                <span>{profile.team.name}</span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
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
