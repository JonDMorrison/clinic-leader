import { useNavigate } from "react-router-dom";
import { Plus, FileText, Target, AlertCircle, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const actionVariants = {
  brand: "from-brand/20 to-brand/5 border-brand/30 hover:shadow-[0_8px_32px_rgba(139,92,246,0.2)]",
  success: "from-success/20 to-success/5 border-success/30 hover:shadow-[0_8px_32px_rgba(34,197,94,0.2)]",
  warning: "from-warning/20 to-warning/5 border-warning/30 hover:shadow-[0_8px_32px_rgba(251,146,60,0.2)]",
  accent: "from-accent/20 to-accent/5 border-accent/30 hover:shadow-[0_8px_32px_rgba(14,165,233,0.2)]",
};

export const QuickActions = () => {
  const navigate = useNavigate();

  const { data: userRole } = useQuery({
    queryKey: ["userRole"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("email", user.email)
        .single();

      return data?.role || "staff";
    },
  });

  type ActionItem = {
    label: string;
    icon: any;
    onClick: () => void;
    description: string;
    variant: "brand" | "success" | "warning" | "accent";
    featured?: boolean;
  };

  const staffActions: ActionItem[] = [
    {
      label: "New Issue",
      icon: AlertCircle,
      onClick: () => navigate("/issues"),
      description: "Report a problem",
      variant: "warning",
    },
    {
      label: "View Docs",
      icon: FileText,
      onClick: () => navigate("/docs"),
      description: "SOPs & training",
      variant: "accent",
    }
  ];

  const managerActions: ActionItem[] = [
    {
      label: "Update Scorecard",
      icon: Plus,
      onClick: () => navigate("/scorecard"),
      description: "Enter weekly data",
      variant: "brand",
      featured: true,
    },
    ...staffActions,
    {
      label: "Check Rocks",
      icon: Target,
      onClick: () => navigate("/rocks"),
      description: "Review priorities",
      variant: "success",
    },
    {
      label: "Meeting",
      icon: Calendar,
      onClick: () => navigate("/meeting"),
      description: "Weekly leadership",
      variant: "accent",
    }
  ];

  const actions = userRole === "staff" ? staffActions : managerActions;

  return (
    <div className="glass rounded-3xl p-6 border border-white/20 shadow-[0_8px_32px_rgba(31,38,135,0.15)]">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3 auto-rows-fr">
        {actions.map((action, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={action.onClick}
            className={cn(
              "relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-300",
              "bg-gradient-to-br border-2",
              "group cursor-pointer",
              "touch-manipulation min-h-[100px]", // Mobile optimization
              actionVariants[action.variant],
              action.featured && "col-span-2"
            )}
          >
            {/* Animated background glow */}
            <motion.div
              className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                "bg-gradient-to-br",
                action.variant === "brand" && "from-brand/10 to-transparent",
                action.variant === "success" && "from-success/10 to-transparent",
                action.variant === "warning" && "from-warning/10 to-transparent",
                action.variant === "accent" && "from-accent/10 to-transparent"
              )}
            />
            
            <div className="relative z-10 flex flex-col gap-2">
              <motion.div
                whileHover={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.5 }}
                className={cn(
                  "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-1",
                  action.variant === "brand" && "bg-brand/20 text-brand",
                  action.variant === "success" && "bg-success/20 text-success",
                  action.variant === "warning" && "bg-warning/20 text-warning",
                  action.variant === "accent" && "bg-accent/20 text-accent"
                )}
              >
                <action.icon className="w-5 h-5 md:w-6 md:h-6" />
              </motion.div>
              <div>
                <div className="font-semibold text-foreground mb-0.5 text-sm md:text-base">
                  {action.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {action.description}
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
