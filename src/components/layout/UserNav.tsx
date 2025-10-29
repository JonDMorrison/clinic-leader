import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon, Building2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  full_name: string;
  email: string;
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
        .select("full_name,email,team_id")
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
          full_name: userData.full_name ?? authUser.user_metadata?.full_name ?? authUser.email ?? "User",
          email: userData.email ?? authUser.email ?? "",
          team: teamName ? { name: teamName } : undefined,
        });
      } else {
        setProfile({
          full_name: authUser.user_metadata?.full_name ?? authUser.email ?? "User",
          email: authUser.email ?? "",
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

  // Derive initials from available data (profile or auth session)
  const baseLabel = (profile?.full_name || profile?.email || authUser?.email || "User") as string;
  const initials = baseLabel
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative h-10 w-10 rounded-full ring-2 ring-brand/20 hover:ring-brand/40 transition-all bg-background/80 backdrop-blur-sm shadow-lg border border-border/40 hover:shadow-xl">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gradient-to-br from-brand to-accent text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-semibold leading-none">{profile?.full_name || authUser?.user_metadata?.full_name || baseLabel}</p>
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
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>User Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
