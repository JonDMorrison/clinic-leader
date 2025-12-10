import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingStatsCard } from "@/components/admin/OnboardingStatsCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, Clock, TrendingUp, RefreshCw } from "lucide-react";
import { userTourService } from "@/lib/userTourService";
import { toast } from "sonner";
import { useState } from "react";

export default function OnboardingAnalytics() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch current user's team
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const { data: userData } = await supabase
        .from("users")
        .select("team_id")
        .eq("id", user.id)
        .single();

      return { team_id: userData?.team_id, role: roleData?.role };
    },
  });

  // Fetch analytics
  const { data: analytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ["onboarding-analytics", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;
      return await userTourService.getAnalytics(currentUser.team_id);
    },
    enabled: !!currentUser?.team_id,
  });

  // Fetch user details
  const { data: userDetails, refetch: refetchUsers } = useQuery({
    queryKey: ["onboarding-users", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      return await userTourService.getUserDetails(currentUser.team_id);
    },
    enabled: !!currentUser?.team_id,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchAnalytics(), refetchUsers()]);
    toast.success("Analytics refreshed");
    setIsRefreshing(false);
  };

  // Check if user is admin
  const isAdmin = currentUser?.role === "owner" || currentUser?.role === "director";

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Card className="glass-dark border-white/20 rounded-3xl p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
          <p className="text-muted-foreground">
            Only administrators can access onboarding analytics.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
            Onboarding Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Track team onboarding completion and progress
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="rounded-xl glass-dark hover:glow-brand"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <OnboardingStatsCard
          title="Total Users"
          value={analytics?.total_users || 0}
          icon={Users}
          color="brand"
        />
        <OnboardingStatsCard
          title="Completed Tours"
          value={analytics?.completed_count || 0}
          description="Successfully finished"
          icon={CheckCircle}
          color="success"
        />
        <OnboardingStatsCard
          title="In Progress"
          value={analytics?.pending_count || 0}
          description="Not yet completed"
          icon={Clock}
          color="warning"
        />
        <OnboardingStatsCard
          title="Completion Rate"
          value={`${analytics?.completion_rate || 0}%`}
          icon={TrendingUp}
          color="accent"
          trend={
            (analytics?.completion_rate || 0) >= 80
              ? "up"
              : (analytics?.completion_rate || 0) >= 50
              ? "neutral"
              : "down"
          }
        />
      </div>

      {/* User Details Table */}
      <Card className="glass-dark border-white/20 rounded-3xl p-6">
        <h2 className="text-xl font-semibold mb-4">User Onboarding Status</h2>
        <div className="rounded-2xl overflow-hidden border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-white/5 border-white/10">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userDetails?.map((user) => (
                <TableRow key={user.user_id} className="hover:bg-white/5 border-white/10">
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="muted" className="rounded-lg">
                      {user.team_name || "No Team"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.completed ? (
                      <Badge className="rounded-lg bg-success/20 text-success border-success/30">
                        Completed
                      </Badge>
                    ) : (
                      <Badge className="rounded-lg bg-warning/20 text-warning border-warning/30">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      Step {user.current_step} / 6
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.updated_at
                      ? new Date(user.updated_at).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                </TableRow>
              ))}
              {(!userDetails || userDetails.length === 0) && (
                <TableRow>
                  <TableCell className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
