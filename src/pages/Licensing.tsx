import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, Users, Zap, Calendar } from "lucide-react";
import type { License } from "@/types/branding";

const Licensing = () => {
  const { data: license, isLoading } = useQuery({
    queryKey: ["license"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("licenses")
        .select("*")
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data as License | null;
    },
  });

  const { data: usageData } = useQuery({
    queryKey: ["license-usage"],
    queryFn: async () => {
      // Get current user count
      const { count: userCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      // Get AI calls this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: aiUsage } = await supabase
        .from("ai_usage")
        .select("api_calls")
        .gte("date", startOfMonth.toISOString().split("T")[0]);

      const totalAiCalls = aiUsage?.reduce((sum, record) => sum + record.api_calls, 0) || 0;

      return {
        userCount: userCount || 0,
        aiCalls: totalAiCalls,
      };
    },
  });

  if (isLoading) {
    return <div className="p-8">Loading license information...</div>;
  }

  if (!license) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Licensing</h1>
          <p className="text-muted-foreground">No license found</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Contact your administrator to set up a license for your organization.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userUsagePercent = license.users_limit
    ? ((usageData?.userCount || 0) / license.users_limit) * 100
    : 0;
  const aiUsagePercent = license.ai_calls_limit
    ? ((usageData?.aiCalls || 0) / license.ai_calls_limit) * 100
    : 0;

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "Enterprise":
        return "bg-brand text-brand-foreground";
      case "Pro":
        return "bg-success text-success-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Licensing</h1>
        <p className="text-muted-foreground">
          Manage your organization's plan and usage limits
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Plan Type</span>
            <Badge className={getPlanColor(license.plan)}>{license.plan}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={license.active ? "default" : "destructive"}>
              {license.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          {license.renewal_date && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Renewal Date
              </span>
              <span className="font-medium">
                {new Date(license.renewal_date).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Limit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {usageData?.userCount || 0} of {license.users_limit} users
            </span>
            <span className="font-medium">{Math.round(userUsagePercent)}%</span>
          </div>
          <Progress value={userUsagePercent} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            AI Calls Limit (Monthly)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {usageData?.aiCalls || 0} of {license.ai_calls_limit} calls
            </span>
            <span className="font-medium">{Math.round(aiUsagePercent)}%</span>
          </div>
          <Progress value={aiUsagePercent} />
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="font-medium">Plan</span>
              <span className="font-medium">Basic</span>
              <span className="font-medium">Pro</span>
              <span className="font-medium">Enterprise</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Users</span>
              <span className="text-sm">10</span>
              <span className="text-sm">25</span>
              <span className="text-sm">Unlimited</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">AI Calls/Month</span>
              <span className="text-sm">1,000</span>
              <span className="text-sm">5,000</span>
              <span className="text-sm">Unlimited</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">White-Label</span>
              <span className="text-sm">❌</span>
              <span className="text-sm">✅</span>
              <span className="text-sm">✅</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Licensing;
