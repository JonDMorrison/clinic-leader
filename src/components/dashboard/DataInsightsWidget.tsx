import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle,
  Target,
  Plus,
  Lightbulb
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface DataInsightsWidgetProps {
  organizationId: string | undefined;
}

interface Insight {
  id: string;
  type: "off_track" | "declining" | "anomaly" | "opportunity";
  metric_id: string;
  metric_name: string;
  message: string;
  severity: "high" | "medium" | "low";
  action?: "create_issue" | "create_rock";
}

export const DataInsightsWidget = ({ organizationId }: DataInsightsWidgetProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch metrics with recent results to generate insights
  const { data: insights, isLoading } = useQuery({
    queryKey: ["data-insights", organizationId],
    queryFn: async (): Promise<Insight[]> => {
      if (!organizationId) return [];
      
      // Fetch metrics with results
      const { data: metrics } = await supabase
        .from("metrics")
        .select(`
          id, 
          name, 
          target, 
          direction,
          sync_source,
          metric_results(value, week_start)
        `)
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .eq("sync_source", "jane_pipe")
        .order("week_start", { foreignTable: "metric_results", ascending: false });
      
      if (!metrics) return [];
      
      const generatedInsights: Insight[] = [];
      
      metrics.forEach(metric => {
        const results = metric.metric_results?.slice(0, 4) || [];
        if (results.length < 2) return;
        
        const latestValue = results[0]?.value;
        const previousValue = results[1]?.value;
        const target = metric.target;
        
        if (latestValue === null || latestValue === undefined) return;
        
        // Check if off track
        if (target !== null) {
          const isOffTrack = metric.direction === "up" 
            ? latestValue < target 
            : metric.direction === "down" 
            ? latestValue > target 
            : latestValue !== target;
          
          if (isOffTrack) {
            const gap = Math.abs(Number(latestValue) - target);
            const gapPercent = Math.round((gap / target) * 100);
            
            generatedInsights.push({
              id: `off-track-${metric.id}`,
              type: "off_track",
              metric_id: metric.id,
              metric_name: metric.name,
              message: `${metric.name} is ${gapPercent}% ${metric.direction === "up" ? "below" : "above"} target`,
              severity: gapPercent > 20 ? "high" : gapPercent > 10 ? "medium" : "low",
              action: "create_issue",
            });
          }
        }
        
        // Check for declining trend
        if (previousValue !== null && previousValue !== undefined) {
          const change = Number(latestValue) - Number(previousValue);
          const changePercent = Math.round((Math.abs(change) / Number(previousValue)) * 100);
          
          const isDecline = metric.direction === "up" ? change < 0 : change > 0;
          
          if (isDecline && changePercent > 10) {
            generatedInsights.push({
              id: `decline-${metric.id}`,
              type: "declining",
              metric_id: metric.id,
              metric_name: metric.name,
              message: `${metric.name} ${metric.direction === "up" ? "dropped" : "increased"} ${changePercent}% this week`,
              severity: changePercent > 25 ? "high" : "medium",
              action: "create_issue",
            });
          }
        }
      });
      
      // Sort by severity and limit
      return generatedInsights
        .sort((a, b) => {
          const severityOrder = { high: 0, medium: 1, low: 2 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        })
        .slice(0, 5);
    },
    enabled: !!organizationId,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading || !insights || insights.length === 0) {
    return null;
  }

  const getInsightIcon = (type: Insight["type"]) => {
    switch (type) {
      case "off_track": return <Target className="w-4 h-4" />;
      case "declining": return <TrendingDown className="w-4 h-4" />;
      case "anomaly": return <AlertTriangle className="w-4 h-4" />;
      case "opportunity": return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: Insight["severity"]) => {
    switch (severity) {
      case "high": return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium": return "bg-warning/10 text-warning border-warning/20";
      case "low": return "bg-muted text-muted-foreground";
    }
  };

  const handleCreateIssue = async (insight: Insight) => {
    if (!organizationId) return;
    
    try {
      const { error } = await supabase
        .from("issues")
        .insert({
          title: insight.message,
          context: `Auto-generated from data insight: ${insight.metric_name}`,
          organization_id: organizationId,
          status: "open",
          priority: insight.severity === "high" ? 1 : insight.severity === "medium" ? 2 : 3,
          metric_id: insight.metric_id,
          created_from: "data_insight",
        });
      
      if (error) throw error;
      
      toast({
        title: "Issue created",
        description: `Created issue for "${insight.metric_name}"`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    } catch (err) {
      toast({
        title: "Error creating issue",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="overflow-hidden border-brand/20">
      <CardHeader className="pb-3 bg-gradient-to-r from-brand/5 to-accent/5">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand" />
          Data Insights
          <Badge variant="secondary" className="ml-auto">
            {insights.length} {insights.length === 1 ? "insight" : "insights"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityColor(insight.severity)}`}
            >
              <div className="mt-0.5">
                {getInsightIcon(insight.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{insight.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on automated Jane data
                </p>
              </div>
              {insight.action === "create_issue" && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => handleCreateIssue(insight)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Issue
                </Button>
              )}
            </motion.div>
          ))}
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => navigate("/scorecard")}
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            View All Metrics
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => navigate("/rocks")}
          >
            <Target className="w-4 h-4 mr-2" />
            Create Rocks
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
