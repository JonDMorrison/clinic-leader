import { NavLink, useLocation } from "react-router-dom";
import { Home, BarChart3, Target, AlertCircle, Calendar, FileText, Users, Phone, Compass, LucideIcon, ChevronDown, Settings, Database, FileSpreadsheet, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ClinicLeaderLogo } from "@/components/ui/ClinicLeaderLogo";
import { LOGO_SIZES } from "@/components/brand/logoConstants";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { getNavPermissionLevel, canSeeNavItem } from "@/lib/permissions";
import { DataSourcePill } from "@/components/data/DataSourcePill";

type NavChild = {
  title: string;
  path: string;
  icon: LucideIcon;
};

type NavItem = {
  title: string;
  path: string;
  icon: LucideIcon;
  roles: string[];
  eosOnly?: boolean;
  children?: NavChild[];
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
      { title: "Home", path: "/dashboard", icon: Home, roles: ["staff", "manager", "director", "owner"] },
      { title: "Vision", path: "/vto", icon: Compass, roles: ["manager", "director", "owner"], eosOnly: true },
      { title: "Data", path: "/data", icon: Database, roles: ["manager", "director", "owner"] },
      { title: "Scorecard", path: "/scorecard", icon: BarChart3, roles: ["manager", "director", "owner"], eosOnly: true },
      { title: "Issues", path: "/issues", icon: AlertCircle, roles: ["staff", "manager", "director", "owner"] },
      { title: "Interventions", path: "/interventions", icon: Zap, roles: ["manager", "director", "owner"], eosOnly: true },
      { title: "Rocks", path: "/rocks", icon: Target, roles: ["manager", "director", "owner"], eosOnly: true },
      { title: "People", path: "/people", icon: Users, roles: ["manager", "director", "owner"], eosOnly: true },
    ],
    alwaysOpen: true,
  },
  {
    label: "Operations",
    items: [
      { title: "Meetings", path: "/meetings", icon: Calendar, roles: ["manager", "director", "owner"], eosOnly: true },
      { title: "Recalls", path: "/recalls", icon: Phone, roles: ["staff", "manager", "director", "owner"] },
      { title: "Docs", path: "/docs", icon: FileText, roles: ["staff", "manager", "director", "owner"] },
      { title: "Execution", path: "/analytics/execution", icon: Zap, roles: ["manager", "director", "owner"], eosOnly: true },
    ],
    alwaysOpen: true,
  },
  {
    label: null,
    items: [
      { title: "Settings", path: "/settings", icon: Settings, roles: ["staff", "manager", "director", "owner"] },
    ],
    alwaysOpen: true,
  },
];

export const Sidebar = ({ onItemClick }: { onItemClick?: () => void }) => {
  const location = useLocation();
  const isOnboarding = location.pathname === "/onboarding";

  // Handle click on nav items
  const handleItemClick = () => {
    if (onItemClick) {
      onItemClick();
    }
  };

  const { data: currentUser } = useCurrentUser();

  const teamId = currentUser?.team_id;

  const { data: team } = useQuery({
    queryKey: ["team-eos", teamId],
    queryFn: async () => {
      if (!teamId) return null;

      const { data } = await supabase
        .from("teams")
        .select("eos_enabled")
        .eq("id", teamId)
        .maybeSingle();

      return data;
    },
    enabled: !!teamId,
  });

  // Use authoritative user_roles via useIsAdmin hook
  const { data: roleData } = useIsAdmin();
  const eosEnabled = team?.eos_enabled || false;

  // Filter groups and items based on role permissions and EOS status
  const filteredGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (isOnboarding) {
        if (item.eosOnly) return false;
        return true;
      }

      const permissionLevel = getNavPermissionLevel(item.roles);
      if (!canSeeNavItem(permissionLevel, roleData)) return false;

      if (item.eosOnly && !eosEnabled) return false;

      return true;
    }),
  })).filter(group => group.items.length > 0);

  const isGroupActive = (items: NavItem[]) => {
    return items.some(item => {
      if (item.path === "/") {
        return location.pathname === "/";
      }
      return location.pathname.startsWith(item.path);
    });
  };

  return (
    <aside className="w-64 h-full flex flex-col glass border-r border-white/20 shadow-[0_8px_32px_rgba(31,38,135,0.15)] overflow-hidden">
      <div className="p-6 border-b border-white/10 shrink-0">
        <div className="group cursor-pointer transition-all duration-300 hover:opacity-90">
          <ClinicLeaderLogo
            size={LOGO_SIZES.sidebar}
            className="transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          {filteredGroups.map((group, groupIndex) => (
            <Collapsible
              key={group.label || `group-${groupIndex}`}
              defaultOpen={group.alwaysOpen || isGroupActive(group.items)}
              className="animate-fade-in"
              style={{ animationDelay: `${groupIndex * 50}ms` } as React.CSSProperties}
            >
              {group.label && (
                <CollapsibleTrigger className="flex items-center justify-between w-full group mb-2">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {group.label}
                  </h3>
                  <ChevronDown className="w-4 h-4 text-muted-foreground/70 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
              )}
              <CollapsibleContent>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = item.path === "/"
                      ? location.pathname === "/"
                      : location.pathname.startsWith(item.path);
                    const isChildActive = item.children?.some(child => location.pathname.startsWith(child.path));

                    if (item.children) {
                      return (
                        <li key={item.path}>
                          <Collapsible defaultOpen={isActive || isChildActive}>
                            <CollapsibleTrigger className={cn(
                              "flex items-center justify-between w-full px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                              isActive || isChildActive
                                ? "bg-gradient-to-r from-brand to-accent text-white font-medium shadow-lg shadow-brand/30"
                                : "text-muted-foreground hover:bg-white/50 hover:text-foreground hover:shadow-md backdrop-blur-sm"
                            )}>
                              <div className="flex items-center gap-3">
                                <item.icon className={cn(
                                  "w-5 h-5 transition-transform duration-300 group-hover:scale-110 relative z-10",
                                  (isActive || isChildActive) && "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                                )} />
                                <span className="relative z-10">{item.title}</span>
                              </div>
                              <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <ul className="ml-4 mt-1 space-y-1 border-l border-white/20 pl-3">
                                {item.children.map((child) => {
                                  const isChildItemActive = location.pathname.startsWith(child.path);
                                  return (
                                    <li key={child.path}>
                                      <NavLink
                                        to={child.path}
                                        onClick={handleItemClick}
                                        className={cn(
                                          "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 text-sm",
                                          isChildItemActive
                                            ? "bg-white/20 text-foreground font-medium"
                                            : "text-muted-foreground hover:bg-white/30 hover:text-foreground"
                                        )}
                                      >
                                        <child.icon className="w-4 h-4" />
                                        <span>{child.title}</span>
                                      </NavLink>
                                    </li>
                                  );
                                })}
                              </ul>
                            </CollapsibleContent>
                          </Collapsible>
                        </li>
                      );
                    }

                    return (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          end={item.path === "/"}
                          onClick={handleItemClick}
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
