import { NavLink } from "react-router-dom";
import { Home, BarChart3, Target, AlertCircle, Calendar, FileText, Users, Settings, Upload, Sparkles, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Home", path: "/", icon: Home },
  { title: "Scorecard", path: "/scorecard", icon: BarChart3 },
  { title: "Rocks", path: "/rocks", icon: Target },
  { title: "Issues", path: "/issues", icon: AlertCircle },
  { title: "L10", path: "/l10", icon: Calendar },
  { title: "Docs", path: "/docs", icon: FileText },
  { title: "People", path: "/people", icon: Users },
  { title: "Imports", path: "/imports", icon: Upload },
  { title: "Copilot", path: "/copilot", icon: Sparkles },
  { title: "AI Log", path: "/ai-log", icon: Activity },
  { title: "Settings", path: "/settings", icon: Settings },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-card border-r border-border h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-semibold text-brand">EOS Clinic</h1>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                    isActive
                      ? "bg-brand text-brand-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};
