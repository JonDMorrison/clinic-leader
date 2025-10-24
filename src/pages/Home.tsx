import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { KpiSparkline } from "@/components/ui/KpiSparkline";
import { TrendingUp, Users, Target, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WeeklyHighlights } from "@/components/dashboard/WeeklyHighlights";
import { QuickActions } from "@/components/layout/QuickActions";
import { CopilotWidget } from "@/components/dashboard/CopilotWidget";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRef } from "react";

const Home = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.98]);
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
    <div ref={ref} className="space-y-6 md:space-y-8 animate-fade-in relative px-4 md:px-0">
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
        style={{ opacity, scale }}
      >
        <h1 className="text-3xl md:text-5xl font-bold mb-2 tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm md:text-lg">
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
          icon={<Users className="w-5 h-5 md:w-6 md:h-6 text-brand" />}
          variant="brand"
          tooltip="Total new patients registered this week"
        />
        <Stat
          label="Completed Rocks"
          value={`${completedRocks}/${totalRocks}`}
          icon={<Target className="w-5 h-5 md:w-6 md:h-6 text-success" />}
          variant="success"
          tooltip="Quarterly goals completed"
        />
        <Stat
          label="Open Issues"
          value={openIssues}
          icon={<AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-warning" />}
          variant="warning"
          tooltip="Issues requiring attention"
        />
        <Stat
          label="Active KPIs"
          value={kpis?.length || 0}
          icon={<TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-accent" />}
          variant="accent"
          tooltip="Key metrics being tracked"
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

        <Card className="relative overflow-hidden">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-6">
              {/* Animated timeline connector */}
              <motion.div 
                className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-brand via-accent to-transparent"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ transformOrigin: "top" }}
              />
              
              {[
                { 
                  type: "success", 
                  label: "System active", 
                  desc: `Tracking ${kpis?.length || 0} KPIs across the team`,
                  time: "Just now",
                  icon: "✓"
                },
                openIssues > 0 && { 
                  type: "warning", 
                  label: `${openIssues} open issues`, 
                  desc: "Requires team attention",
                  time: "2 hours ago",
                  icon: "⚠"
                },
                { 
                  type: "brand", 
                  label: "Rocks in progress", 
                  desc: `${totalRocks - completedRocks} rocks on track for this quarter`,
                  time: "5 hours ago",
                  icon: "🎯"
                },
              ].filter(Boolean).map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.15, duration: 0.5 }}
                  className="relative flex items-start gap-4 group"
                >
                  {/* Timeline node with gradient background */}
                  <motion.div
                    className={cn(
                      "relative z-10 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg",
                      item.type === "success" && "bg-gradient-to-br from-success to-success/70 text-white",
                      item.type === "warning" && "bg-gradient-to-br from-warning to-warning/70 text-white",
                      item.type === "brand" && "bg-gradient-to-br from-brand to-accent text-white"
                    )}
                    animate={{ 
                      scale: [1, 1.1, 1],
                      boxShadow: [
                        "0 0 0 0 rgba(var(--brand-rgb), 0)",
                        "0 0 0 8px rgba(var(--brand-rgb), 0.1)",
                        "0 0 0 0 rgba(var(--brand-rgb), 0)"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.4 }}
                  >
                    {item.icon}
                  </motion.div>
                  
                  {/* Content with hover effect */}
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground group-hover:text-brand transition-colors">
                        {item.label}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
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
