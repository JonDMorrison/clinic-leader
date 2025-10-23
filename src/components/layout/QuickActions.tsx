import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Target, AlertCircle, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  const staffActions = [
    {
      label: "New Issue",
      icon: AlertCircle,
      onClick: () => navigate("/issues"),
      description: "Report a problem"
    },
    {
      label: "View Docs",
      icon: FileText,
      onClick: () => navigate("/docs"),
      description: "SOPs & training"
    }
  ];

  const managerActions = [
    ...staffActions,
    {
      label: "Update Scorecard",
      icon: Plus,
      onClick: () => navigate("/scorecard"),
      description: "Enter weekly data"
    },
    {
      label: "Check Rocks",
      icon: Target,
      onClick: () => navigate("/rocks"),
      description: "Review priorities"
    },
    {
      label: "L10 Meeting",
      icon: Calendar,
      onClick: () => navigate("/l10"),
      description: "Weekly leadership"
    }
  ];

  const actions = userRole === "staff" ? staffActions : managerActions;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            className="h-auto flex-col items-start p-4 hover:bg-accent/10 transition-all"
            onClick={action.onClick}
          >
            <div className="flex items-center gap-2 mb-1">
              <action.icon className="w-4 h-4 text-brand" />
              <span className="font-medium">{action.label}</span>
            </div>
            <span className="text-xs text-muted-foreground">{action.description}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
};
