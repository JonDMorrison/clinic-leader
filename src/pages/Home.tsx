import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/Stat";
import { KpiSparkline } from "@/components/ui/KpiSparkline";
import { TrendingUp, Users, Target, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { QuickActions } from "@/components/layout/QuickActions";
import { CopilotWidget } from "@/components/dashboard/CopilotWidget";

import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRef, useEffect, useState, useMemo } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { GettingStartedWidget } from "@/components/dashboard/GettingStartedWidget";
import { CoreValuesStrip, CoreValueOfWeekCard } from "@/components/core-values";
import { FocusWidget } from "@/components/dashboard/FocusWidget";
import { ConnectDataCard } from "@/components/dashboard/ConnectDataCard";
import { IssueSuggestionsWidget } from "@/components/dashboard/IssueSuggestionsWidget";
import { ProgressPreviewCard } from "@/components/progress/ProgressPreviewCard";
import { DemoBanner } from "@/components/dashboard/DemoBanner";

const INSPIRATIONAL_MESSAGES = [
  "Lead your clinic. Not just manage it.",
  "Clarity creates momentum.",
  "Great teams are built on shared purpose.",
  "Every decision shapes your culture.",
  "Progress over perfection.",
  "Your people are watching. Lead well.",
  "Small wins compound into big results.",
  "Discipline creates freedom.",
];

const Home = () => {
  const ref = useRef(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Pick a message based on the day of the year for consistency
  const inspirationalMessage = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return INSPIRATIONAL_MESSAGES[dayOfYear % INSPIRATIONAL_MESSAGES.length];
  }, []);

  // Fetch current user first to get team_id
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["dashboard-metrics", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];

      const { data, error } = await supabase
        .from("metrics")
        .select("id, name, metric_results(value, week_start)")
        .eq("organization_id", currentUser.team_id)
        .order("week_start", { foreignTable: "metric_results", ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  const { data: rocks, isLoading: rocksLoading } = useQuery({
    queryKey: ["rocks-count", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];

      // Get all users in the team
      const { data: users } = await supabase
        .from("users")
        .select("id")
        .eq("team_id", currentUser.team_id);

      const userIds = users?.map(u => u.id) || [];
      if (userIds.length === 0) return [];

      const { data, error } = await supabase
        .from("rocks")
        .select("status")
        .in("owner_id", userIds);
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: ["issues-count", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];

      const { data, error } = await supabase
        .from("issues")
        .select("status")
        .eq("organization_id", currentUser.team_id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  type CoreValue = { id: string; name: string; description: string | null };
  
  const { data: coreValues } = useQuery<CoreValue[]>({
    queryKey: ["core-values", currentUser?.team_id],
    queryFn: async (): Promise<CoreValue[]> => {
      if (!currentUser?.team_id) return [];

      const response: any = await (supabase as any)
        .from("core_values")
        .select("id, name, description")
        .eq("organization_id", currentUser.team_id)
        .order("name");
      
      if (response.error) throw response.error;
      return response.data || [];
    },
    enabled: !!currentUser?.team_id,
  });

  const completedRocks = rocks?.filter(r => r.status === "done").length || 0;
  const totalRocks = rocks?.length || 0;
  const openIssues = issues?.filter(i => i.status === "open").length || 0;

  // Get New Patients metric latest value
  const newPatientsMetric = metrics?.find(m => m.name === "New Patients");
  const newPatientsValue = newPatientsMetric?.metric_results?.[0]?.value || 0;

  const isLoading = userLoading || metricsLoading || rocksLoading || issuesLoading;

  // Use viewport scroll to avoid hydration issues with target refs
  const { scrollYProgress } = useScroll();

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.98]);

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
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-xl md:text-2xl font-semibold text-foreground mb-1">
          Hey {currentUser?.full_name?.includes(' ') ? currentUser.full_name.split(' ')[0] : 'there'} 👋
        </p>
        <p className="text-base md:text-lg text-muted-foreground italic">
          {inspirationalMessage}
        </p>
      </motion.div>


      {/* Demo Account Banner */}
      <DemoBanner />

      {/* Core Values Strip */}
      <CoreValuesStrip />

      {/* Connect Data Card - shows when Jane not connected */}
      <ConnectDataCard />

      {/* Getting Started Widget */}
      <GettingStartedWidget />

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
          href="/issues"
        />
        <Stat
          label="Active KPIs"
          value={metrics?.length || 0}
          icon={<TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-accent" />}
          variant="accent"
          tooltip="Key metrics being tracked"
          href="/scorecard"
        />
      </motion.div>

      {/* Issue Suggestions Widget */}
      <IssueSuggestionsWidget />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
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
                  desc: `Tracking ${metrics?.length || 0} KPIs across the team`,
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

        <FocusWidget />

        <CoreValueOfWeekCard />
      </motion.div>

      {/* Year in Progress Preview */}
      <ProgressPreviewCard />
    </div>
  );
};

export default Home;
