import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Compass, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const VtoL10Panel = () => {
  const { toast } = useToast();

  const { data: vtoSummary } = useQuery({
    queryKey: ["vto-l10-summary"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data: userProfile } = await supabase
        .from("users")
        .select("team_id")
        .eq("email", userData.user.email)
        .single();

      if (!userProfile?.team_id) return null;

      // Get active VTO
      const { data: vto } = await supabase
        .from("vto")
        .select("*")
        .eq("team_id", userProfile.team_id)
        .eq("is_active", true)
        .single();

      if (!vto) return null;

      // Get latest published version
      const { data: version } = await supabase
        .from("vto_versions")
        .select("*")
        .eq("vto_id", vto.id)
        .eq("status", "published")
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (!version) return null;

      // Get latest progress
      const { data: progress } = await supabase
        .from("vto_progress")
        .select("*")
        .eq("vto_version_id", version.id)
        .order("computed_at", { ascending: false })
        .limit(1)
        .single();

      // Find off-track goals
      const offTrackGoals = progress?.details
        ? Object.entries(progress.details)
            .filter(([_, data]: [string, any]) => data.progress < 50)
            .sort((a: any, b: any) => a[1].progress - b[1].progress)
            .slice(0, 5)
            .map(([goalKey, data]: [string, any]) => ({ goalKey, progress: data.progress }))
        : [];

      return {
        version,
        progress,
        offTrackGoals,
        oneYearGoals: (version.one_year_plan as any)?.goals || [],
      };
    },
  });

  const sendGoalToIDS = async (goalTitle: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data: userProfile } = await supabase
        .from("users")
        .select("team_id")
        .eq("email", userData.user.email)
        .single();

      const { error } = await supabase
        .from("issues")
        .insert({
          title: goalTitle,
          team_id: userProfile.team_id,
          status: "open",
          context: "Off-track from V/TO",
        });

      if (error) throw error;

      toast({ title: "Success", description: "Goal added to IDS!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (!vtoSummary?.version) {
    return null;
  }

  const { version, progress, offTrackGoals, oneYearGoals } = vtoSummary;

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-brand" />
            <CardTitle>V/TO Quick View</CardTitle>
          </div>
          <Badge variant="secondary">V{version.version}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Traction Progress</span>
              <span className="font-semibold">{progress.traction_score}%</span>
            </div>
            <Progress value={progress.traction_score} className="h-2" />
          </div>
        )}

        {offTrackGoals && offTrackGoals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span>Off-Track Goals</span>
            </div>
            {offTrackGoals.map((goal, i) => (
              <div key={i} className="flex items-center justify-between glass p-2 rounded-lg text-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="truncate">{goal.goalKey}</span>
                  <Badge variant="destructive" className="text-xs">{goal.progress}%</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => sendGoalToIDS(goal.goalKey)}
                  title="Add to IDS"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {oneYearGoals && oneYearGoals.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">1-Year Plan Goals</div>
            {oneYearGoals.slice(0, 3).map((goal: any, i: number) => (
              <div key={i} className="flex items-center justify-between glass p-2 rounded-lg text-sm">
                <span className="truncate">{goal.title}</span>
                <Badge variant={
                  goal.status === 'on_track' ? 'default' : 
                  goal.status === 'at_risk' ? 'secondary' : 
                  'destructive'
                }>
                  {goal.status === 'on_track' ? '✓' : goal.status === 'at_risk' ? '⚠' : '✗'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
