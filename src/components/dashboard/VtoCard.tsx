import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadialGauge, getStatusFromValue } from "@/components/ui/RadialGauge";
import { TrendingUp, AlertTriangle, FileText, Compass } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export const VtoCard = () => {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();

  const { data: vtoSummary, isLoading } = useQuery({
    queryKey: ["vto-dashboard-summary", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;

      // Get active VTO with latest version and progress
      const { data: vto } = await supabase
        .from("vto")
        .select(`
          *,
          vto_versions(
            *,
            vto_progress(*)
          )
        `)
        .eq("organization_id", currentUser.team_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!vto || !vto.vto_versions || vto.vto_versions.length === 0) return null;

      const version = vto.vto_versions[0];
      const progress = version.vto_progress?.[0] || null;

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
    enabled: !!currentUser?.team_id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-muted animate-pulse rounded" />
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-20 bg-muted animate-pulse rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-muted animate-pulse rounded" />
            <div className="h-16 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!vtoSummary?.version) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-brand" />
            <CardTitle>Vision/Traction Organizer</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Define your strategic vision and track execution progress toward your long-term goals.
          </p>
          <Button onClick={() => navigate('/vto')} className="w-full">
            <FileText className="w-4 h-4 mr-2" />
            Build Your V/TO
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { version, progress, offTrackGoals } = vtoSummary;

  const overallScore = progress 
    ? Math.round((progress.vision_score + progress.traction_score) / 2)
    : 0;

  // Celebrate 100% completion
  const isComplete = overallScore === 100;

  return (
    <Card className={`hover-scale transition-all duration-300 ${isComplete ? 'ring-2 ring-primary shadow-lg' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className={`w-5 h-5 ${isComplete ? 'text-primary animate-pulse' : 'text-brand'}`} />
            <CardTitle>Strategic Progress</CardTitle>
          </div>
          <Badge variant={version.status === 'published' ? 'brand' : 'muted'}>
            V{version.version}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress && (
          <>
            {/* Overall Score with Radial Gauge */}
            <div className={`flex flex-col items-center py-2 transition-all duration-300 ${isComplete ? 'bg-primary/5 rounded-xl' : ''}`}>
              <RadialGauge 
                value={overallScore} 
                size={120} 
                strokeWidth={12}
                status={getStatusFromValue(overallScore)}
                showLabel={true}
              />
            </div>

            {/* Vision & Traction Scores */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Vision</span>
                  <span className="font-semibold">{progress.vision_score}%</span>
                </div>
                <Progress value={progress.vision_score} className="h-1.5" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Traction</span>
                  <span className="font-semibold">{progress.traction_score}%</span>
                </div>
                <Progress value={progress.traction_score} className="h-1.5" />
              </div>
            </div>
          </>
        )}

        {offTrackGoals && offTrackGoals.length > 0 && (
          <div className="space-y-2 p-3 rounded-lg bg-warning/5 border border-warning/20">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span>Needs Attention</span>
            </div>
            {offTrackGoals.map(([goalKey, data]: [string, any], i) => (
              <div key={i} className="text-xs flex justify-between items-center">
                <span className="truncate text-muted-foreground">{goalKey.replace(/_/g, ' ')}</span>
                <Badge variant="warning">
                  {data.progress}%
                </Badge>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => navigate('/vto')} className="flex-1">
            <TrendingUp className="w-4 h-4 mr-2" />
            Edit V/TO
          </Button>
          <Button variant="ghost" onClick={() => navigate('/clarity')} className="flex-1">
            <FileText className="w-4 h-4 mr-2" />
            Review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
