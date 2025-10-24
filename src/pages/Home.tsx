import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { KpiSparkline } from "@/components/ui/KpiSparkline";
import { TrendingUp, Users, Target, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WeeklyHighlights } from "@/components/dashboard/WeeklyHighlights";
import { QuickActions } from "@/components/layout/QuickActions";
import { CopilotWidget } from "@/components/dashboard/CopilotWidget";
import { motion } from "framer-motion";

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
    <div className="space-y-8 animate-fade-in relative">
      {/* Background ambient effects */}
      <motion.div
        className="absolute top-0 left-1/4 w-96 h-96 bg-brand/5 rounded-full blur-3xl -z-10"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-5xl font-bold mb-2 tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">
          Welcome back! Here's your clinic overview.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <Stat
          label="New Patients (This Week)"
          value={newPatientsValue}
          icon={<Users className="w-6 h-6 text-brand" />}
          variant="brand"
        />
        <Stat
          label="Completed Rocks"
          value={`${completedRocks}/${totalRocks}`}
          icon={<Target className="w-6 h-6 text-success" />}
          variant="success"
        />
        <Stat
          label="Open Issues"
          value={openIssues}
          icon={<AlertCircle className="w-6 h-6 text-warning" />}
          variant="warning"
        />
        <Stat
          label="Active KPIs"
          value={kpis?.length || 0}
          icon={<TrendingUp className="w-6 h-6 text-accent" />}
          variant="accent"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
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
              {[
                { color: "success", label: "System active", desc: `Tracking ${kpis?.length || 0} KPIs across the team` },
                openIssues > 0 && { color: "warning", label: `${openIssues} open issues`, desc: "Requires team attention" },
                { color: "brand", label: "Rocks in progress", desc: `${totalRocks - completedRocks} rocks on track for this quarter` },
              ].filter(Boolean).map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <motion.div
                    className={`w-2 h-2 rounded-full bg-${item.color} mt-2`}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        <QuickActions />
        
        <CopilotWidget />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <WeeklyHighlights />
      </motion.div>
    </div>
  );
};

export default Home;
