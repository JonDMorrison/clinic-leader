import { NavLink } from "react-router-dom";
import { Home, BarChart3, Target, AlertCircle, Calendar, FileText, Users, Upload, FileBarChart, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpMenu } from "@/components/layout/HelpMenu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { title: "Home", path: "/", icon: Home, roles: ["staff", "manager", "director", "owner"] },
  { title: "Scorecard", path: "/scorecard", icon: BarChart3, roles: ["manager", "director", "owner"] },
  { title: "Rocks", path: "/rocks", icon: Target, roles: ["manager", "director", "owner"] },
  { title: "Issues", path: "/issues", icon: AlertCircle, roles: ["staff", "manager", "director", "owner"] },
  { title: "L10", path: "/l10", icon: Calendar, roles: ["manager", "director", "owner"] },
  { title: "Docs", path: "/docs", icon: FileText, roles: ["staff", "manager", "director", "owner"] },
  { title: "Recalls", path: "/recalls", icon: Phone, roles: ["staff", "manager", "director", "owner"] },
  { title: "People", path: "/people", icon: Users, roles: ["manager", "director", "owner"] },
  { title: "Imports", path: "/imports", icon: Upload, roles: ["manager", "director", "owner"] },
  { title: "Reports", path: "/reports", icon: FileBarChart, roles: ["manager", "director", "owner"] },
];

export const Sidebar = () => {
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("email", user.email)
        .single();
      
      return { ...user, role: data?.role || "staff" };
    },
  });

  const userRole = currentUser?.role || "staff";

  const filteredNavItems = navItems.filter((item) => {
    // Filter by role
    if (!item.roles.includes(userRole)) return false;
    
    return true;
  });

  return (
    <aside className="w-64 h-screen sticky top-0 flex flex-col glass border-r border-white/20 shadow-[0_8px_32px_rgba(31,38,135,0.15)] animate-fade-in">
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
          EOS Clinic
        </h1>
        <HelpMenu />
      </div>
      
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {filteredNavItems.map((item, index) => (
            <li 
              key={item.path}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                    isActive
                      ? "bg-gradient-to-r from-brand to-accent text-white font-medium shadow-lg shadow-brand/30"
                      : "text-muted-foreground hover:bg-white/50 hover:text-foreground hover:shadow-md backdrop-blur-sm"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {!isActive && (
                      <span className="absolute inset-0 bg-gradient-to-r from-brand/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    )}
                    <item.icon className={cn(
                      "w-5 h-5 transition-transform duration-300 group-hover:scale-110 relative z-10",
                      isActive && "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                    )} />
                    <span className="relative z-10">{item.title}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};
