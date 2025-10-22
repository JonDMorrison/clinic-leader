import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { RulesEnginePanel } from "@/components/settings/RulesEnginePanel";
import { useNavigate } from "react-router-dom";
import { Palette, Shield, Bell, Users } from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();

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
              Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage team members and permissions
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
