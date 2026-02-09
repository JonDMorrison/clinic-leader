import { TrendingUp, Users, Target, AlertCircle, DollarSign, Calendar, Percent } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { QuickActions } from "@/components/layout/QuickActions";
import { CopilotWidget } from "@/components/dashboard/CopilotWidget";
import { CoreValuesStrip } from "@/components/core-values";

import { motion } from "framer-motion";
import { useRef, useEffect, useState, useMemo } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { GettingStartedWidget } from "@/components/dashboard/GettingStartedWidget";
import { CoreValueOfWeekCard } from "@/components/core-values";

import { ConnectDataCard } from "@/components/dashboard/ConnectDataCard";
import { IssueSuggestionsWidget } from "@/components/dashboard/IssueSuggestionsWidget";
import { ProgressPreviewCard } from "@/components/progress/ProgressPreviewCard";
import { DemoBanner } from "@/components/dashboard/DemoBanner";
import { CustomizableStatCard, StatOption } from "@/components/dashboard/CustomizableStatCard";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { VtoCard } from "@/components/dashboard/VtoCard";
import { MonthlyPulseWidget } from "@/components/dashboard/MonthlyPulseWidget";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { DashboardPrimaryStack } from "@/components/dashboard/DashboardPrimaryStack";

const INSPIRATIONAL_MESSAGES = [
  "Lead your clinic. Not just manage it.",
  "Clarity creates momentum.",
  "Great teams are built on shared purpose.",
  "Every decision shapes your culture.",
  "Progress over perfection.",
  "Your people are watching. Lead well.",
  "Small wins compound into big results.",
  "Discipline creates freedom.",
  "Culture is what happens when you're not looking.",
  "The best leaders make others better.",
  "Consistency beats intensity over time.",
  "Trust is built in drops, lost in buckets.",
  "Your calendar reveals your priorities.",
  "What gets measured gets managed.",
  "Leaders go first. That's why they're called leaders.",
  "The speed of the leader is the speed of the team.",
  "Hire slow. Fire fast. Coach always.",
  "Vision without execution is hallucination.",
  "Good enough is the enemy of great.",
  "The bottleneck is usually at the top.",
  "Decisions delayed are opportunities missed.",
  "Your team can only rise to your expectations.",
  "Feedback is a gift. Give it generously.",
  "The right people in the right seats.",
  "Simplicity scales. Complexity breaks.",
  "Problems don't age well. Address them.",
  "Your reputation walks into rooms before you do.",
  "Energy is contagious. Manage yours wisely.",
  "Leaders eat last but set the table first.",
  "Clarity is kindness. Ambiguity is cruelty.",
  "The best meetings end with decisions.",
  "Delegate outcomes, not just tasks.",
  "Your team reflects your standards.",
  "What you tolerate becomes your floor.",
  "Focus is saying no to good ideas.",
  "The goal is progress, not perfection.",
  "Accountability starts with you.",
  "Celebrate wins. Learn from losses.",
  "Systems beat willpower every time.",
  "Your example is your most powerful tool.",
  "Silence is agreement. Speak up.",
  "The hardest conversations matter most.",
  "Lead with questions before answers.",
  "Growth lives outside your comfort zone.",
  "Your team's success is your success.",
  "Respect is earned through consistency.",
  "Problems are opportunities in disguise.",
  "The best investment is in your people.",
  "Urgency without panic. Calm without complacency.",
  "Own your mistakes. Share your credit.",
  "Less is more. Focus creates impact.",
  "Your mood sets the weather for your team.",
  "Done is better than perfect.",
  "Listen more than you speak.",
  "The best ideas come from the front lines.",
  "Transparency builds trust.",
  "Lead from where you are.",
  "Your actions speak louder than your words.",
  "Every interaction is a chance to lead.",
  "Invest in relationships before you need them.",
  "The culture you create becomes your legacy.",
  "Empower others to make decisions.",
  "Praise in public. Coach in private.",
  "Your team's growth is your responsibility.",
  "Stay curious. Stay humble.",
  "Leaders create more leaders, not followers.",
  "The little things are the big things.",
  "Execution eats strategy for breakfast.",
  "Your energy introduces you before you speak.",
  "Make it easy for people to do the right thing.",
  "The right answer is usually the hard one.",
  "Build the team you wish you had.",
  "Patience with people. Impatience with problems.",
  "Your standards become their standards.",
  "Lead today like tomorrow depends on it.",
];

const Home = () => {
  const ref = useRef(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const statsRef = useRef<HTMLElement | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Pick a message based on the day of the year for consistency
  const inspirationalMessage = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return INSPIRATIONAL_MESSAGES[dayOfYear % INSPIRATIONAL_MESSAGES.length];
  }, []);

  // Fetch current user first to get team_id
  // Use isPending (not isLoading) to only show spinner on initial load, not background refetches
  const { data: currentUser, isPending: userPending, isFetched: userFetched } = useCurrentUser();

  const { data: metrics, isPending: metricsPending } = useQuery({
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
    staleTime: 2 * 60 * 1000, // 2 minutes - reduce refetches
  });

  const { data: rocks, isPending: rocksPending } = useQuery({
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
    staleTime: 2 * 60 * 1000,
  });

  const { data: issues, isPending: issuesPending } = useQuery({
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
    staleTime: 2 * 60 * 1000,
  });

  const completedRocks = rocks?.filter(r => r.status === "done").length || 0;
  const totalRocks = rocks?.length || 0;
  const openIssues = issues?.filter(i => i.status === "open").length || 0;
  const rocksAtRisk = rocks?.filter(r => r.status === "off_track").length || 0;

  // Get New Patients metric latest value
  const newPatientsMetric = metrics?.find(m => m.name === "New Patients");
  const newPatientsValue = newPatientsMetric?.metric_results?.[0]?.value || 0;

  // Get other metric values for customizable stats
  const visitsMetric = metrics?.find(m => m.name?.toLowerCase().includes("visit"));
  const visitsValue = visitsMetric?.metric_results?.[0]?.value || 0;
  
  const revenueMetric = metrics?.find(m => m.name?.toLowerCase().includes("revenue") || m.name?.toLowerCase().includes("collected"));
  const revenueValue = revenueMetric?.metric_results?.[0]?.value || 0;

  const showRateMetric = metrics?.find(m => m.name?.toLowerCase().includes("show rate"));
  const showRateValue = showRateMetric?.metric_results?.[0]?.value || 0;

  // Dashboard preferences
  const { preferences, updateStatSlot } = useDashboardPreferences();

  // Build all available stat options
  const allStatOptions: StatOption[] = useMemo(() => [
    {
      id: "new_patients",
      label: "New Patients",
      value: newPatientsValue,
      icon: <Users className="w-5 h-5 md:w-6 md:h-6 text-brand" />,
      variant: "brand",
      tooltip: "Total new patients registered this week",
    },
    {
      id: "completed_rocks",
      label: "Completed Rocks",
      value: `${completedRocks}/${totalRocks}`,
      icon: <Target className="w-5 h-5 md:w-6 md:h-6 text-success" />,
      variant: "success",
      tooltip: "Quarterly goals completed",
      href: "/rocks",
    },
    {
      id: "open_issues",
      label: "Open Issues",
      value: openIssues,
      icon: <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-warning" />,
      variant: "warning",
      tooltip: "Issues requiring attention",
      href: "/issues",
    },
    {
      id: "active_kpis",
      label: "Active KPIs",
      value: metrics?.length || 0,
      icon: <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-accent" />,
      variant: "accent",
      tooltip: "Key metrics being tracked",
      href: "/scorecard",
    },
    {
      id: "visits",
      label: "Visits (This Week)",
      value: visitsValue,
      icon: <Calendar className="w-5 h-5 md:w-6 md:h-6 text-brand" />,
      variant: "brand",
      tooltip: "Total patient visits this week",
    },
    {
      id: "revenue",
      label: "Revenue Collected",
      value: revenueValue > 0 ? `$${revenueValue.toLocaleString()}` : "—",
      icon: <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-success" />,
      variant: "success",
      tooltip: "Total revenue collected this period",
    },
    {
      id: "rocks_at_risk",
      label: "Rocks at Risk",
      value: rocksAtRisk,
      icon: <Target className="w-5 h-5 md:w-6 md:h-6 text-warning" />,
      variant: "warning",
      tooltip: "Quarterly goals that are off track",
      href: "/rocks",
    },
    {
      id: "show_rate",
      label: "Show Rate",
      value: showRateValue > 0 ? `${showRateValue}%` : "—",
      icon: <Percent className="w-5 h-5 md:w-6 md:h-6 text-accent" />,
      variant: "accent",
      tooltip: "Percentage of patients who showed up",
    },
  ], [newPatientsValue, completedRocks, totalRocks, openIssues, metrics?.length, visitsValue, revenueValue, rocksAtRisk, showRateValue]);

  // Get stats for current slots
  const getStatForSlot = (slotIndex: number): StatOption => {
    const statId = preferences.statSlots[slotIndex] || "new_patients";
    return allStatOptions.find(s => s.id === statId) || allStatOptions[0];
  };

  // Only show full-page loading on initial load (isPending), not on background refetches
  const isInitialLoading = userPending || (userFetched && currentUser?.team_id && (metricsPending || rocksPending || issuesPending));

  // DEV-only layout diagnostics: helps identify unexpected reserved space.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!mounted) return;
    if (isInitialLoading) return;

    const log = () => {
      const heroEl = heroRef.current;
      const statsEl = statsRef.current;
      const mainEl = mainRef.current;

      if (!heroEl || !statsEl || !mainEl) return;

      const hero = heroEl.getBoundingClientRect();
      const stats = statsEl.getBoundingClientRect();
      const main = mainEl.getBoundingClientRect();

      console.groupCollapsed("[Home layout diagnostics]");
      console.log(
        "hero",
        { top: Math.round(hero.top), bottom: Math.round(hero.bottom), height: Math.round(hero.height) },
        { className: heroEl.className }
      );
      console.log(
        "stats",
        { top: Math.round(stats.top), bottom: Math.round(stats.bottom), height: Math.round(stats.height) },
        { className: statsEl.className }
      );
      console.log(
        "main",
        { top: Math.round(main.top), bottom: Math.round(main.bottom), height: Math.round(main.height) },
        { className: mainEl.className }
      );
      console.log("gap(hero→stats)", Math.round(stats.top - hero.bottom));
      console.groupEnd();
    };

    const raf = requestAnimationFrame(log);
    window.addEventListener("resize", log);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", log);
    };
  }, [mounted, isInitialLoading]);

  if (isInitialLoading) {
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

  const firstName = currentUser?.full_name?.includes(" ")
    ? currentUser.full_name.split(" ")[0]
    : "there";

  return (
    <div ref={ref} className="animate-fade-in relative px-4 md:px-0">
      {/* Desktop-first layout: left column is a single flow so right-column height never pushes stats down */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left (lg: 2/3): hero-left + stats + operational stack in normal flow */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* HERO (left side) */}
          <section ref={heroRef} data-home="hero" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xl md:text-2xl font-semibold text-foreground mb-1">
                Hey {firstName} 👋
              </p>
              <p className="text-base md:text-lg text-muted-foreground">
                <span className="italic">{inspirationalMessage}</span> Here's your overview for today.
              </p>
            </motion.div>

            <CoreValuesStrip showEditButton={false} />
          </section>

          {/* STATS — must sit directly under hero in normal flow */}
          <section ref={statsRef} data-home="stats">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {[0, 1, 2, 3].map((slotIndex) => (
                <CustomizableStatCard
                  key={slotIndex}
                  currentStat={getStatForSlot(slotIndex)}
                  availableStats={allStatOptions}
                  onSwap={(statId) => updateStatSlot(slotIndex, statId)}
                />
              ))}
            </motion.div>
          </section>

          {/* MAIN (left) */}
          <div ref={mainRef} data-home="main" className="space-y-6">
            {/* Conditional banners - render nothing when conditions not met (no reserved space) */}
            <DemoBanner />
            <ConnectDataCard />
            <GettingStartedWidget />

            {/* Primary Stack - always has content (scorecard setup, issues CTA, or top issues) */}
            <DashboardPrimaryStack />

            {/* Monthly Pulse Widget */}
            <MonthlyPulseWidget />

            {/* Issue Suggestions Widget */}
            <IssueSuggestionsWidget />
          </div>
        </div>

        {/* Right (lg: 1/3): QuickActions in the hero-right position + strategic/culture widgets */}
        <aside className="space-y-6 min-w-0">
          <div className="hidden lg:block">
            <QuickActions />
          </div>
          <VtoCard />
          <RecentActivityCard
            metricsCount={metrics?.length || 0}
            openIssues={openIssues}
            totalRocks={totalRocks}
            completedRocks={completedRocks}
          />
          <CopilotWidget />
          <CoreValueOfWeekCard />
        </aside>

        {/* Footer row (full width) */}
        <div className="lg:col-span-3 space-y-6">
          {/* QuickActions on mobile only */}
          <div className="lg:hidden">
            <QuickActions />
          </div>

          {/* Year in Progress Preview */}
          <ProgressPreviewCard />
        </div>
      </div>
    </div>
  );
};

export default Home;
