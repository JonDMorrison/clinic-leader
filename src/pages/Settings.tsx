import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RulesEnginePanel } from "@/components/settings/RulesEnginePanel";
import { useNavigate } from "react-router-dom";
import { Palette, Shield, Users, Building2, TrendingUp, FileText, GraduationCap, Plug, UserCircle } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { canAccessAdmin } from "@/lib/permissions";

const Settings = () => {
  const navigate = useNavigate();

  // Use authoritative user_roles via hook
  const { data: roleData } = useIsAdmin();
  const isAdmin = canAccessAdmin(roleData);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Application configuration</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5" />
              My Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manage your profile photo and account settings
            </p>
            <Button variant="outline" onClick={() => navigate("/settings/profile")}>
              Edit Profile
            </Button>
          </CardContent>
        </Card>

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
              Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect practice management tools like Jane App, Stripe, and more
            </p>
            <Button variant="outline" onClick={() => navigate("/settings/integrations")}>
              View All Integrations
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
