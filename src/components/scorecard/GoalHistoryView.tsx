import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface GoalHistoryViewProps {
  metricId: string;
  organizationId: string;
}

export const GoalHistoryView = ({ metricId, organizationId }: GoalHistoryViewProps) => {
  const { data: goals, isLoading } = useQuery({
    queryKey: ["metric-goal-history", metricId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metric_goals")
        .select(`
          *,
          metric_goal_achievements(*)
        `)
        .eq("metric_id", metricId)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: milestones } = useQuery({
    queryKey: ["metric-milestones", metricId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metric_milestones")
        .select("*")
        .eq("metric_id", metricId)
        .eq("organization_id", organizationId)
        .not("achieved_at", "is", null)
        .order("achieved_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading history...</div>;
  }

  const hasData = (goals && goals.length > 0) || (milestones && milestones.length > 0);

  if (!hasData) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No goals or milestones yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Set a goal to start tracking long-term progress
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active & Recent Goals */}
      {goals && goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Goal History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {goals.map((goal) => {
              const achievements = goal.metric_goal_achievements as any[] || [];
              const latestAchievement = achievements[achievements.length - 1];
              const progress = latestAchievement?.progress_percentage || 0;
              const isComplete = progress >= 100;
              const endDate = new Date(goal.end_date);
              const isPast = endDate < new Date();

              return (
                <div
                  key={goal.id}
                  className="p-3 rounded-lg border bg-card space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {goal.goal_type === "quarterly" ? "Q" : "Annual"} Goal
                        </span>
                        {isComplete && (
                          <Badge variant="success" className="text-xs">
                            <Trophy className="h-3 w-3 mr-1" />
                            Achieved
                          </Badge>
                        )}
                        {!isComplete && isPast && (
                          <Badge variant="muted" className="text-xs">
                            Ended
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Target: {goal.target_value} • {format(new Date(goal.start_date), "MMM d")} - {format(new Date(goal.end_date), "MMM d, yyyy")}
                      </p>
                      {goal.description && (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          "{goal.description}"
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{progress.toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">progress</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Milestones */}
      {milestones && milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-accent/30"
              >
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Trophy className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {milestone.milestone_type === "goal_achieved" && "Goal Achieved"}
                    {milestone.milestone_type === "record_high" && "New Record High"}
                    {milestone.milestone_type === "target_streak" && "Target Streak"}
                    {!["goal_achieved", "record_high", "target_streak"].includes(milestone.milestone_type) && "Milestone"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {milestone.milestone_value} • {format(new Date(milestone.achieved_at!), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
