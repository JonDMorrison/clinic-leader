import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RulesEnginePanel } from "@/components/settings/RulesEnginePanel";
import { useNavigate } from "react-router-dom";
import { Palette, Shield, Bell, Users, Building2, TrendingUp, FileText, GraduationCap, Plug } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const navigate = useNavigate();

  // Fetch current user's role
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      return data;
    },
  });

  const isAdmin = currentUser?.role === "owner" || currentUser?.role === "director";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Application configuration</p>
      </div>

      <div className="grid gap-6">
        <RulesEnginePanel />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              View organization structure, departments, and onboarding status
            </p>
            <Button variant="outline" onClick={() => navigate("/settings/organization")}>
              View Organization
            </Button>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Onboarding Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Track team onboarding completion rates and progress
              </p>
              <Button variant="outline" onClick={() => navigate("/admin/onboarding-analytics")}>
                View Analytics
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Branding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Customize your organization's visual identity, colors, and domain
            </p>
            <Button variant="outline" onClick={() => navigate("/branding")}>
              Manage Branding
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Licensing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              View your plan, usage limits, and upgrade options
            </p>
            <Button variant="outline" onClick={() => navigate("/licensing")}>
              View License
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Import Users
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Bulk upload staff from CSV file
            </p>
            <Button variant="outline" onClick={() => navigate("/imports/users")}>
              Import Users
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="w-5 h-5" />
              Jane App Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sync practice data from Jane App (appointments, patients, payments, A/R)
            </p>
            <Button variant="outline" onClick={() => navigate("/settings/integrations/jane")}>
              Manage Jane Integration
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Import KPIs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload scorecard metrics and targets
            </p>
            <Button variant="outline" onClick={() => navigate("/imports/kpis")}>
              Import KPIs
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              KPI Data Mapping
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect tracked KPIs to data sources (Jane, CSV, Billing)
            </p>
            <Button variant="outline" onClick={() => navigate("/imports/mapping")}>
              Manage Mappings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Import SOPs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload documentation and procedures
            </p>
            <Button variant="outline" onClick={() => navigate("/imports/sops")}>
              Import SOPs
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configure email and in-app notifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manage team members, roles, and permissions
            </p>
            <Button variant="outline" onClick={() => navigate("/settings/team")}>
              Manage Team
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
