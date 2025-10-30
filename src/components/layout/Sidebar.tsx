import { NavLink, useLocation } from "react-router-dom";
import { Home, BarChart3, Target, AlertCircle, Calendar, FileText, Users, Upload, FileBarChart, Phone, Plug, Sparkles, Compass, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpMenu } from "@/components/layout/HelpMenu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import clinicLeaderLogo from "@/assets/clinicleader-logo.png";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

type NavItem = {
  title: string;
  path: string;
  icon: LucideIcon;
  roles: string[];
  eosOnly?: boolean;
};

type NavGroup = {
  label: string | null;
  items: NavItem[];
  alwaysOpen?: boolean;
};

const navGroups: NavGroup[] = [
  {
    label: null, // No label for core items
    items: [
      { title: "Home", path: "/", icon: Home, roles: ["staff", "manager", "director", "owner"] },
      { title: "Copilot", path: "/copilot", icon: Sparkles, roles: ["staff", "manager", "director", "owner"] },
    ],
    alwaysOpen: true,
  },
  {
    label: "Strategy",
    items: [
      { title: "V/TO", path: "/vto", icon: Compass, roles: ["manager", "director", "owner"], eosOnly: true },
      { title: "Scorecard", path: "/scorecard", icon: BarChart3, roles: ["manager", "director", "owner"], eosOnly: true },
      { title: "Rocks", path: "/rocks", icon: Target, roles: ["manager", "director", "owner"], eosOnly: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Meetings", path: "/meeting", icon: Calendar, roles: ["manager", "director", "owner"], eosOnly: true },
      { title: "Issues", path: "/issues", icon: AlertCircle, roles: ["staff", "manager", "director", "owner"] },
      { title: "Recalls", path: "/recalls", icon: Phone, roles: ["staff", "manager", "director", "owner"] },
      { title: "Docs", path: "/docs", icon: FileText, roles: ["staff", "manager", "director", "owner"] },
    ],
  },
  {
    label: "Team & Data",
    items: [
      { title: "People", path: "/people", icon: Users, roles: ["manager", "director", "owner"], eosOnly: true },
      { title: "Imports", path: "/imports", icon: Upload, roles: ["manager", "director", "owner"] },
      { title: "Reports", path: "/reports", icon: FileBarChart, roles: ["manager", "director", "owner"] },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Integrations", path: "/settings/integrations", icon: Plug, roles: ["manager", "director", "owner"] },
    ],
  },
];

export const Sidebar = () => {
  const location = useLocation();
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use security-definer RPCs to avoid RLS issues
      const { data: roleResult } = await supabase.rpc("get_user_role", { _user_id: user.id });
      const role = (roleResult as string) || "staff";

      const { data: teamId } = await supabase.rpc("current_user_team");

      return {
        ...user,
        role,
        team_id: teamId as string | null,
      };
    },
  });

  const { data: team } = useQuery({
    queryKey: ["team", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;
      
      const { data } = await supabase
        .from("teams")
        .select("eos_enabled")
        .eq("id", currentUser.team_id)
        .maybeSingle();
      
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  const userRole = currentUser?.role || "staff";
  const eosEnabled = team?.eos_enabled || false;

  // Filter groups and items based on role and EOS status
  const filteredGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      // Filter by role
      if (!item.roles.includes(userRole)) return false;
      
      // Filter EOS-specific items if EOS is not enabled
      if (item.eosOnly && !eosEnabled) return false;
      
      return true;
    }),
  })).filter(group => group.items.length > 0); // Remove empty groups

  // Check if current path is in a group to keep it open
  const isGroupActive = (items: NavItem[]) => {
    return items.some(item => {
      if (item.path === "/") {
        return location.pathname === "/";
      }
      return location.pathname.startsWith(item.path);
    });
  };

  return (
    <aside className="w-64 h-screen sticky top-0 flex flex-col glass border-r border-white/20 shadow-[0_8px_32px_rgba(31,38,135,0.15)]">
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <img 
          src={clinicLeaderLogo} 
          alt="ClinicLeader" 
          className="h-10 w-auto"
        />
        <HelpMenu />
      </div>
      
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          {filteredGroups.map((group, groupIndex) => (
            <Collapsible
              key={group.label || 'core'}
              defaultOpen={group.alwaysOpen || isGroupActive(group.items)}
              className="animate-fade-in"
              style={{ animationDelay: `${groupIndex * 50}ms` } as React.CSSProperties}
            >
              {group.label && (
                <CollapsibleTrigger className="flex items-center justify-between w-full group mb-2">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">
                    {group.label}
                  </h3>
                  <ChevronDown className="w-4 h-4 text-muted-foreground/50 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
              )}
              <CollapsibleContent>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = item.path === "/" 
                      ? location.pathname === "/" 
                      : location.pathname.startsWith(item.path);
                    
                    return (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          end={item.path === "/"}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                            isActive
                              ? "bg-gradient-to-r from-brand to-accent text-white font-medium shadow-lg shadow-brand/30"
                              : "text-muted-foreground hover:bg-white/50 hover:text-foreground hover:shadow-md backdrop-blur-sm"
                          )}
                        >
                          {!isActive && (
                            <span className="absolute inset-0 bg-gradient-to-r from-brand/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          )}
                          <item.icon className={cn(
                            "w-5 h-5 transition-transform duration-300 group-hover:scale-110 relative z-10",
                            isActive && "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                          )} />
                          <span className="relative z-10">{item.title}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </nav>
    </aside>
  );
};
