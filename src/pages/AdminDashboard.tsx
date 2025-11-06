import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Database, 
  Activity, 
  CreditCard, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Palette,
  Plug,
  TestTube,
  UserCog,
  Cpu,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";

const AdminDashboard = () => {
  const navigate = useNavigate();

  // Check admin access
  const { data: currentUser } = useQuery({
    queryKey: ["current-user-admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: roleData } = await supabase.rpc("get_user_role", { _user_id: user.id });
      
      if (!roleData || (roleData !== 'owner' && roleData !== 'director')) {
        throw new Error("Unauthorized");
      }

      const { data: userData } = await supabase
        .from("users")
        .select("id, team_id, full_name")
        .eq("id", user.id)
        .single();

      return { ...userData, role: roleData };
    },
  });

  // System metrics
  const { data: systemMetrics } = useQuery({
    queryKey: ["admin-metrics", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;

      // Get user count
      const { count: userCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("team_id", currentUser.team_id);

      // Get metrics count
      const { count: metricsCount } = await supabase
        .from("metrics")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", currentUser.team_id);

      // Get rocks count
      const { data: rocks } = await supabase
        .from("rocks")
        .select("status, owner_id")
        .in("owner_id", 
          await supabase
            .from("users")
            .select("id")
            .eq("team_id", currentUser.team_id)
            .then(r => r.data?.map(u => u.id) || [])
        );

      const completedRocks = rocks?.filter(r => r.status === "done").length || 0;
      const totalRocks = rocks?.length || 0;

      // Get issues count
      const { data: issues } = await supabase
        .from("issues")
        .select("status")
        .eq("organization_id", currentUser.team_id);

      const openIssues = issues?.filter(i => i.status === "open").length || 0;

      return {
        userCount: userCount || 0,
        metricsCount: metricsCount || 0,
        rocksProgress: `${completedRocks}/${totalRocks}`,
        openIssues: openIssues || 0,
      };
    },
    enabled: !!currentUser?.team_id,
  });

  // License info
  const { data: license } = useQuery({
    queryKey: ["license-info", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;

      const { data } = await supabase
        .from("licenses")
        .select("*")
        .eq("organization_id", currentUser.team_id)
        .maybeSingle();

      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  // Recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ["recent-activity", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];

      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      return data || [];
    },
    enabled: !!currentUser?.team_id,
  });

  const adminLinks = [
    { title: "Settings", path: "/settings", icon: Settings, color: "text-blue-500" },
    { title: "Organization", path: "/organization-settings", icon: UserCog, color: "text-purple-500" },
    { title: "Branding", path: "/branding", icon: Palette, color: "text-pink-500" },
    { title: "Integrations", path: "/integrations", icon: Plug, color: "text-green-500" },
    { title: "Licensing", path: "/licensing", icon: CreditCard, color: "text-amber-500" },
    { title: "AI Settings", path: "/ai-settings", icon: Cpu, color: "text-cyan-500" },
    { title: "System Health", path: "/system/health", icon: TestTube, color: "text-red-500" },
  ];

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-warning mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unauthorized Access</h2>
          <p className="text-muted-foreground">You must be an admin to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-brand bg-clip-text text-transparent mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          System overview and quick access to admin functions
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-3xl font-bold">{systemMetrics?.userCount || 0}</p>
              </div>
              <Users className="w-8 h-8 text-brand" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Metrics</p>
                <p className="text-3xl font-bold">{systemMetrics?.metricsCount || 0}</p>
              </div>
              <Database className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rocks Progress</p>
                <p className="text-3xl font-bold">{systemMetrics?.rocksProgress || "0/0"}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Issues</p>
                <p className="text-3xl font-bold">{systemMetrics?.openIssues || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* License Status */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            License Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {license ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Plan</p>
                <Badge variant="success" className="text-lg">
                  {license.plan}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <Badge variant={license.active ? "success" : "danger"}>
                  {license.active ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Inactive
                    </>
                  )}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Renewal Date</p>
                <p className="font-medium">
                  {license.renewal_date ? format(new Date(license.renewal_date), "MMM d, yyyy") : "N/A"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No license information available</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Admin Functions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {adminLinks.map((link) => (
              <Button
                key={link.path}
                variant="outline"
                className="justify-start h-auto py-4"
                onClick={() => navigate(link.path)}
              >
                <link.icon className={`w-5 h-5 mr-3 ${link.color}`} />
                <span className="flex-1 text-left">{link.title}</span>
                <ArrowRight className="w-4 h-4 ml-2 opacity-50" />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((activity: any) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-brand mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.entity} • {format(new Date(activity.created_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
