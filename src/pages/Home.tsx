import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { KpiSparkline } from "@/components/ui/KpiSparkline";
import { TrendingUp, Users, Target, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WeeklyHighlights } from "@/components/dashboard/WeeklyHighlights";
import { QuickActions } from "@/components/layout/QuickActions";

const Home = () => {
  const { data: kpis } = useQuery({
    queryKey: ["kpis-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpis")
        .select("*, kpi_readings(value, week_start)")
        .eq("active", true)
        .order("week_start", { foreignTable: "kpi_readings", ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: rocks } = useQuery({
    queryKey: ["rocks-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rocks")
        .select("status");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: issues } = useQuery({
    queryKey: ["issues-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issues")
        .select("status");
      
      if (error) throw error;
      return data;
    },
  });

  const completedRocks = rocks?.filter(r => r.status === "done").length || 0;
  const totalRocks = rocks?.length || 0;
  const openIssues = issues?.filter(i => i.status === "open").length || 0;

  // Get New Patients KPI latest value
  const newPatientsKpi = kpis?.find(k => k.name === "New Patients");
  const newPatientsValue = newPatientsKpi?.kpi_readings?.[0]?.value || 0;

  // Calculate average scorecard score from last 7 weeks
  const scorecardData = kpis?.map(kpi => {
    const readings = kpi.kpi_readings?.slice(0, 7).reverse() || [];
    return readings.map(r => parseFloat(String(r.value)));
  }).flat() || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">
          Welcome back! Here's your clinic overview.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:scale-105 transition-transform duration-300">
          <Stat
            label="New Patients (This Week)"
            value={newPatientsValue}
            icon={<Users className="w-5 h-5 text-brand" />}
          />
        </Card>
        <Card className="hover:scale-105 transition-transform duration-300">
          <Stat
            label="Completed Rocks"
            value={`${completedRocks}/${totalRocks}`}
            icon={<Target className="w-5 h-5 text-success" />}
          />
        </Card>
        <Card className="hover:scale-105 transition-transform duration-300">
          <Stat
            label="Open Issues"
            value={openIssues}
            icon={<AlertCircle className="w-5 h-5 text-warning" />}
          />
        </Card>
        <Card className="hover:scale-105 transition-transform duration-300">
          <Stat
            label="Active KPIs"
            value={kpis?.length || 0}
            icon={<TrendingUp className="w-5 h-5 text-accent" />}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Scorecard Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <KpiSparkline data={scorecardData.length > 0 ? scorecardData.slice(0, 7) : [20, 30, 25, 40, 35, 50, 45]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-success mt-2" />
                <div>
                  <p className="text-sm font-medium">System active</p>
                  <p className="text-xs text-muted-foreground">Tracking {kpis?.length || 0} KPIs across the team</p>
                </div>
              </div>
              {openIssues > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-warning mt-2" />
                  <div>
                    <p className="text-sm font-medium">{openIssues} open issues</p>
                    <p className="text-xs text-muted-foreground">Requires team attention</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-brand mt-2" />
                <div>
                  <p className="text-sm font-medium">Rocks in progress</p>
                  <p className="text-xs text-muted-foreground">{totalRocks - completedRocks} rocks on track for this quarter</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <QuickActions />
      </div>

      <WeeklyHighlights />
    </div>
  );
};

export default Home;
