import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Target, TrendingUp, Building2, Mountain, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface GoalProgress {
  key: string;
  category: 'ten_year' | 'three_year' | 'one_year' | 'rock';
  title: string;
  progress: number;
  linkedCount: number;
}

export const VtoProgressWidget = () => {
  const { data: currentUser } = useCurrentUser();
  const navigate = useNavigate();

  // Fetch VTO progress data
  const { data: progressData, isLoading } = useQuery({
    queryKey: ["vto-progress-widget", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;

      // Get active VTO with latest version
      const { data: vto } = await supabase
        .from("vto")
        .select(`
          id,
          vto_versions!inner(
            id,
            ten_year_target,
            three_year_picture,
            one_year_plan,
            quarterly_rocks
          )
        `)
        .eq("organization_id", currentUser.team_id)
        .eq("is_active", true)
        .order("vto_versions(version)", { ascending: false })
        .limit(1)
        .single();

      if (!vto) return null;

      const version = (vto.vto_versions as any[])[0];

      // Get latest progress computation
      const { data: progress } = await supabase
        .from("vto_progress")
        .select("*")
        .eq("vto_version_id", version.id)
        .order("computed_at", { ascending: false })
        .limit(1)
        .single();

      // Get link counts per goal
      const { data: links } = await supabase
        .from("vto_links")
        .select("goal_key")
        .eq("vto_version_id", version.id);

      const linkCounts = links?.reduce((acc, l) => {
        acc[l.goal_key] = (acc[l.goal_key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Build goal progress list
      const goalProgress: GoalProgress[] = [];
      const details = (progress?.details || {}) as Record<string, any>;
      const threeYear = version.three_year_picture || {};
      const oneYear = version.one_year_plan || {};

      // 10-Year Target
      if (version.ten_year_target) {
        goalProgress.push({
          key: 'ten_year_target',
          category: 'ten_year',
          title: version.ten_year_target,
          progress: details['ten_year_target']?.progress || 0,
          linkedCount: linkCounts['ten_year_target'] || 0,
        });
      }

      // 3-Year Revenue
      if (threeYear.revenue) {
        goalProgress.push({
          key: 'three_year_picture.revenue',
          category: 'three_year',
          title: `$${threeYear.revenue.toLocaleString()} Revenue`,
          progress: details['three_year_picture.revenue']?.progress || 0,
          linkedCount: linkCounts['three_year_picture.revenue'] || 0,
        });
      }

      // 1-Year Goals (first 2)
      if (oneYear.goals?.length) {
        oneYear.goals.slice(0, 2).forEach((goal: any, idx: number) => {
          const title = typeof goal === 'string' ? goal : goal?.title;
          const key = `one_year_plan.goals[${idx}]`;
          if (title) {
            goalProgress.push({
              key,
              category: 'one_year',
              title,
              progress: details[key]?.progress || 0,
              linkedCount: linkCounts[key] || 0,
            });
          }
        });
      }

      return {
        visionScore: progress?.vision_score || 0,
        tractionScore: progress?.traction_score || 0,
        goals: goalProgress,
        totalLinked: links?.length || 0,
      };
    },
    enabled: !!currentUser?.team_id,
  });

  if (isLoading || !progressData) {
    return null;
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ten_year': return <TrendingUp className="h-4 w-4 text-purple-500" />;
      case 'three_year': return <Building2 className="h-4 w-4 text-blue-500" />;
      case 'one_year': return <Target className="h-4 w-4 text-amber-500" />;
      case 'rock': return <Mountain className="h-4 w-4 text-slate-500" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            V/TO Progress
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/vto')}>
            View V/TO
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Scores */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Vision Clarity</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{progressData.visionScore}%</span>
              <Progress value={progressData.visionScore} className="flex-1 h-2" />
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Traction Health</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{progressData.tractionScore}%</span>
              <Progress value={progressData.tractionScore} className="flex-1 h-2" />
            </div>
          </div>
        </div>

        {/* Goal Progress */}
        {progressData.goals.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Goal Progress</p>
            {progressData.goals.map((goal) => (
              <div key={goal.key} className="flex items-center gap-3">
                {getCategoryIcon(goal.category)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{goal.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress 
                      value={goal.progress} 
                      className={`flex-1 h-1.5 ${getProgressColor(goal.progress)}`} 
                    />
                    <span className="text-xs text-muted-foreground w-10">{goal.progress}%</span>
                  </div>
                </div>
                {goal.linkedCount > 0 && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {goal.linkedCount} KPIs
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="pt-2 border-t flex items-center justify-between text-sm text-muted-foreground">
          <span>{progressData.totalLinked} items linked to V/TO goals</span>
          <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => navigate('/scorecard')}>
            Manage Links
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
