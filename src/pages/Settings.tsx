import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RulesEnginePanel } from "@/components/settings/RulesEnginePanel";
import { useNavigate } from "react-router-dom";
import { 
  Palette, Shield, Users, Building2, TrendingUp, FileText, 
  GraduationCap, Plug, UserCircle, Cpu, TestTube, Upload, 
  LayoutDashboard, FileSpreadsheet, FileUp, FileBarChart 
} from "lucide-react";
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
        <p className="text-muted-foreground">Application configuration and administration</p>
      </div>

      {/* Admin Dashboard - quick access for admins */}
      {isAdmin && (
        <Card className="border-brand/20 bg-gradient-to-br from-brand/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-brand" />
              Admin Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Overview of system metrics, license status, and recent activity
            </p>
            <Button onClick={() => navigate("/admin")}>
              Open Dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
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
            <Button variant="outline" onClick={() => navigate("/organization-settings")}>
              View Organization
            </Button>
          </CardContent>
        </Card>

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
              <Plug className="w-5 h-5" />
              Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect practice management tools like Jane App, Stripe, and more
            </p>
            <Button variant="outline" onClick={() => navigate("/integrations")}>
              View Integrations
            </Button>
          </CardContent>
        </Card>

        {isAdmin && (
          <>
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
                  <Cpu className="w-5 h-5" />
                  AI Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure AI assistant behavior and usage limits
                </p>
                <Button variant="outline" onClick={() => navigate("/ai-settings")}>
                  Configure AI
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Monitor system status, integrations health, and diagnostics
                </p>
                <Button variant="outline" onClick={() => navigate("/system/health")}>
                  View Health
                </Button>
              </CardContent>
            </Card>

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
          </>
        )}
      </div>

      {/* Imports Section */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Data Imports</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="w-5 h-5" />
                Monthly Report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Import monthly KPI data from spreadsheets
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/imports/monthly-report")}>
                Import
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileUp className="w-5 h-5" />
                PDF Report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Extract data from PDF reports
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/imports/pdf-report")}>
                Import
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileBarChart className="w-5 h-5" />
                Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                View and manage imported reports
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/reports")}>
                View Reports
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5" />
                Import Users
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Bulk upload staff from CSV file
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/imports/users")}>
                Import
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5" />
                Import KPIs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload scorecard metrics and targets
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/imports/kpis")}>
                Import
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-5 h-5" />
                Import SOPs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload documentation and procedures
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/imports/sops")}>
                Import
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Advanced Settings */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Advanced</h2>
        <div className="grid gap-6">
          <RulesEnginePanel />

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
    </div>
  );
};

export default Settings;