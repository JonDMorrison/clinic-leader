import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, AlertTriangle, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const VtoCard = () => {
  const navigate = useNavigate();

  const { data: vtoSummary, isLoading } = useQuery({
    queryKey: ["vto-dashboard-summary"],
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

      // Get latest version (published or draft)
      const { data: version } = await supabase
        .from("vto_versions")
        .select("*")
        .eq("vto_id", vto.id)
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
            .slice(0, 3)
        : [];

      return {
        vto,
        version,
        progress,
        offTrackGoals,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vision/Traction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!vtoSummary?.version) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vision/Traction Organizer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Build your strategic vision and track progress toward your goals
          </p>
          <Button onClick={() => navigate('/vto')} className="w-full">
            <FileText className="w-4 h-4 mr-2" />
            Create V/TO
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { version, progress, offTrackGoals } = vtoSummary;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Vision/Traction</CardTitle>
          <Badge variant={version.status === 'published' ? 'default' : 'secondary'}>
            V{version.version}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Vision</span>
                <span className="font-semibold">{progress.vision_score}%</span>
              </div>
              <Progress value={progress.vision_score} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Traction</span>
                <span className="font-semibold">{progress.traction_score}%</span>
              </div>
              <Progress value={progress.traction_score} className="h-2" />
            </div>
          </>
        )}

        {offTrackGoals && offTrackGoals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span>Top Risks</span>
            </div>
            {offTrackGoals.map(([goalKey, data]: [string, any], i) => (
              <div key={i} className="text-xs text-muted-foreground flex justify-between">
                <span className="truncate">{goalKey}</span>
                <span className="text-warning">{data.progress}%</span>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2">
          <Button variant="outline" onClick={() => navigate('/vto')} className="w-full">
            <TrendingUp className="w-4 h-4 mr-2" />
            View Full V/TO
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
