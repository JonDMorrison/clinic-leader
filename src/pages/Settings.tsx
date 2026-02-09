import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  Palette, Users, Building2, 
  GraduationCap, Plug, UserCircle, Cpu, TestTube, 
  LayoutDashboard, FileSpreadsheet, FileUp, FileBarChart,
  Database, Cloud, CheckCircle2, Clock, AlertCircle, Settings2
} from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { canAccessAdmin } from "@/lib/permissions";
import { useOrgDataSourceStatus, SOURCE_LABELS } from "@/hooks/useOrgDataSourceStatus";
import { ChangeDataSourceWizard } from "@/components/data/ChangeDataSourceWizard";
import { ResetCacheButton } from "@/components/settings/ResetCacheButton";
const Settings = () => {
  const navigate = useNavigate();
  const [wizardOpen, setWizardOpen] = useState(false);

  // Use authoritative user_roles via hook
  const { data: roleData } = useIsAdmin();
  const isAdmin = canAccessAdmin(roleData);
  
  // Data source status for configuration card
  const dataSourceStatus = useOrgDataSourceStatus();
  
  // Get flow status icon and color
  const getFlowConfig = () => {
    switch (dataSourceStatus.flowStatus) {
      case "flowing":
        return { icon: CheckCircle2, label: "Data Flowing", colorClass: "text-success" };
      case "connected_waiting":
        return { icon: Clock, label: "Waiting for Data", colorClass: "text-warning" };
      case "stale":
        return { icon: Clock, label: "Data May Be Stale", colorClass: "text-muted-foreground" };
      case "error":
        return { icon: AlertCircle, label: "Connection Error", colorClass: "text-destructive" };
      default:
        return { icon: Database, label: "Not Configured", colorClass: "text-muted-foreground" };
    }
  };
  
  const flowConfig = getFlowConfig();

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

      {/* Data Configuration Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {dataSourceStatus.mode === "jane" ? (
              <Cloud className="w-5 h-5 text-primary" />
            ) : (
              <Database className="w-5 h-5 text-primary" />
            )}
            Data Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Mode:</span>
              <p className="font-medium">
                {dataSourceStatus.mode === "jane" ? "Jane Mode" : "Standard Mode"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Primary Source:</span>
              <p className="font-medium">
                {SOURCE_LABELS[dataSourceStatus.primarySource] || "Not configured"}
              </p>
            </div>
            {dataSourceStatus.mode === "jane" && (
              <div>
                <span className="text-muted-foreground">Integration Status:</span>
                <p className="font-medium capitalize">
                  {dataSourceStatus.janeConnectionStatus || "Not connected"}
                </p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Flow Status:</span>
              <div className="flex items-center gap-1.5">
                <flowConfig.icon className={`w-4 h-4 ${flowConfig.colorClass}`} />
                <span className={`font-medium ${flowConfig.colorClass}`}>
                  {flowConfig.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)}>
              <Settings2 className="w-4 h-4 mr-2" />
              Change Data Source
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/integrations")}>
              <Plug className="w-4 h-4 mr-2" />
              Manage Integrations
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/data")}>
              <Database className="w-4 h-4 mr-2" />
              View Data
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Change Data Source Wizard */}
      <ChangeDataSourceWizard open={wizardOpen} onOpenChange={setWizardOpen} />

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
        </div>
      </div>

      {/* Team Management */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Team</h2>
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

        {/* Advanced: Cache Reset */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Advanced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResetCacheButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;