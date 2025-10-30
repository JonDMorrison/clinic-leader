import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { KpiSparkline } from "@/components/ui/KpiSparkline";
import { TrendingUp, Users, Target, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WeeklyHighlights } from "@/components/dashboard/WeeklyHighlights";
import { QuickActions } from "@/components/layout/QuickActions";
import { CopilotWidget } from "@/components/dashboard/CopilotWidget";
import { PerformanceScore } from "@/components/dashboard/PerformanceScore";
import { VtoCard } from "@/components/dashboard/VtoCard";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRef, useMemo } from "react";
import { HelpHint } from "@/components/help/HelpHint";

const Home = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.98]);
  
  const { data: kpis, isLoading: kpisLoading } = useQuery({
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

  const { data: rocks, isLoading: rocksLoading } = useQuery({
    queryKey: ["rocks-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rocks")
        .select("status");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: issues, isLoading: issuesLoading } = useQuery({
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

  // Calculate Team Performance Score - % of KPIs hitting targets over last 8 weeks
  const performanceScores = useMemo(() => {
    if (!kpis || kpis.length === 0) return [];
    
    // Get last 8 weeks of data
    const weekMap = new Map<string, { total: number; onTarget: number }>();
    
    kpis.forEach(kpi => {
      // Skip KPIs without targets
      if (kpi.target === null) return;
      
      const readings = kpi.kpi_readings?.slice(0, 8) || [];
      
      readings.forEach(reading => {
        const week = reading.week_start;
        const value = parseFloat(String(reading.value));
        
        if (!weekMap.has(week)) {
          weekMap.set(week, { total: 0, onTarget: 0 });
        }
        
        const weekData = weekMap.get(week)!;
        weekData.total += 1;
        
        // Check if KPI hit target based on direction
        const hitTarget = kpi.direction === '>=' 
          ? value >= kpi.target 
          : kpi.direction === '<='
          ? value <= kpi.target
          : value === kpi.target;
        
        if (hitTarget) {
          weekData.onTarget += 1;
        }
      });
    });
    
    // Convert to array of percentages, sorted by week
    return Array.from(weekMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, data]) => ({
        week,
        percentage: data.total > 0 ? Math.round((data.onTarget / data.total) * 100) : 0,
        onTarget: data.onTarget,
        total: data.total
      }))
      .slice(-8); // Last 8 weeks
  }, [kpis]);

  const currentScore = performanceScores[performanceScores.length - 1];
  const previousScore = performanceScores[performanceScores.length - 2];
  const trend = currentScore && previousScore 
    ? currentScore.percentage - previousScore.percentage 
    : 0;

  const isLoading = kpisLoading || rocksLoading || issuesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full mx-auto"
          />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

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
        <Card className="glass hover-scale">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-brand" />
              Team Performance Score
              <HelpHint term="Performance Score" context="dashboard_performance" size="sm" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceScore
              currentScore={currentScore}
              scoreHistory={performanceScores.map(s => s.percentage)}
              trend={trend}
            />
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
        
        <VtoCard />
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
