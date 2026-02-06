import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, AlertCircle, ArrowRight, Plus, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

/**
 * DashboardPrimaryStack - Guarantees the left column always has meaningful content.
 * Priority order:
 * 1. If no scorecard configured → Show "Set up your Scorecard" CTA
 * 2. Else → Show top 5 issues preview (or null if none)
 */
export const DashboardPrimaryStack = () => {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();

  // Check if scorecard has any metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["dashboard-metrics-check", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data, error } = await supabase
        .from("metrics")
        .select("id")
        .eq("organization_id", currentUser.team_id)
        .limit(1);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.team_id,
  });

  // Fetch top issues
  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: ["dashboard-top-issues", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data, error } = await supabase
        .from("issues")
        .select("id, title, priority, status, created_at")
        .eq("organization_id", currentUser.team_id)
        .eq("status", "open")
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.team_id,
  });

  const isLoading = metricsLoading || issuesLoading;
  const hasScorecard = (metrics?.length || 0) > 0;
  const hasIssues = (issues?.length || 0) > 0;

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="py-8">
          <div className="h-4 bg-muted rounded w-1/2 mb-2" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </CardContent>
      </Card>
    );
  }

  // Priority 1: No scorecard configured
  if (!hasScorecard) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-dashed border-brand/30 bg-gradient-to-br from-brand/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-brand" />
              Set Up Your Scorecard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Track weekly KPIs to keep your team aligned and on target. Your scorecard is the pulse of your clinic's performance.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                Define key metrics that matter
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                Set weekly targets for accountability
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                Track trends over time
              </li>
            </ul>
            <Button 
              className="gradient-brand"
              onClick={() => navigate('/scorecard/setup')}
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Priority 2: No issues - return null (don't show empty state CTA)
  if (!hasIssues) {
    return null;
  }

  // Priority 3: Show top issues
  const priorityLabels: Record<number, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    1: { label: "High", variant: "destructive" },
    2: { label: "Medium", variant: "default" },
    3: { label: "Low", variant: "secondary" },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="w-5 h-5 text-warning" />
              Top Issues
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/issues')}
              className="text-xs"
            >
              View All
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {issues?.map((issue, index) => (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
              onClick={() => navigate('/issues')}
            >
              <span className="text-sm truncate flex-1 group-hover:text-brand transition-colors">
                {issue.title}
              </span>
              <Badge 
                variant={priorityLabels[issue.priority]?.variant || "secondary"}
                className="text-[10px] shrink-0"
              >
                {priorityLabels[issue.priority]?.label || "Normal"}
              </Badge>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
};
