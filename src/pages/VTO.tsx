import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, History, Download, ArrowLeft, Target, FileText, AlertCircle, BarChart3 } from "lucide-react";
import { VtoLoadPresetsButton } from "@/components/vto/VtoLoadPresetsButton";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useVTORealtimeSync } from "@/hooks/useVTORealtimeSync";
import { HelpHint } from "@/components/help/HelpHint";
import { formatDistanceToNow } from "date-fns";

const VTO = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch active VTO for current user's team
  const { data: vtoData, isLoading } = useQuery({
    queryKey: ["vto"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data: userProfile } = await supabase
        .from("users")
        .select("team_id")
        .eq("email", userData.user.email)
        .single();

      if (!userProfile?.team_id) throw new Error("User not assigned to team");

      // Get VTO (prefer active, fallback to any for team)
      let vto: any = null;
      const { data: activeVto, error: activeErr } = await supabase
        .from("vto")
        .select("*")
        .eq("organization_id", userProfile.team_id)
        .eq("is_active", true)
        .maybeSingle();

      if (activeErr && activeErr.code !== 'PGRST116') throw activeErr;
      vto = activeVto;

      if (!vto) {
        const { data: anyVto, error: anyErr } = await supabase
          .from("vto")
          .select("*")
          .eq("organization_id", userProfile.team_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (anyErr && anyErr.code !== 'PGRST116') throw anyErr;
        vto = anyVto;
      }

      // Get latest version if VTO exists
      if (vto) {
        const { data: versions, error: versionsError } = await supabase
          .from("vto_versions")
          .select("*")
          .eq("vto_id", vto.id)
          .order("version", { ascending: false });

        if (versionsError) throw versionsError;

        // Get latest progress
        const latestVersion = versions?.[0];
        if (latestVersion) {
          const { data: progress } = await supabase
            .from("vto_progress")
            .select("*")
            .eq("vto_version_id", latestVersion.id)
            .order("computed_at", { ascending: false })
            .limit(1)
            .single();

          return { vto, versions, latestVersion, progress, teamId: userProfile.team_id };
        }
      }

      return { vto: null, versions: [], latestVersion: null, progress: null, teamId: userProfile.team_id };
    },
  });

  // Enable real-time VTO sync
  useVTORealtimeSync(vtoData?.teamId);

  const handleCreateVTO = async (templateKey?: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data: userProfile } = await supabase
        .from("users")
        .select("id, team_id")
        .eq("email", userData.user.email)
        .single();

      if (!userProfile?.team_id) throw new Error("User not assigned to team");

      // Create VTO record
      const { data: vto, error: vtoError } = await supabase
        .from("vto")
        .insert({
          organization_id: userProfile.team_id,
          created_by: userProfile.id,
        })
        .select()
        .single();

      if (vtoError) throw vtoError;

      toast({
        title: "Success",
        description: "VTO created! Redirecting to Vision page...",
      });

      navigate(`/vto/vision?template=${templateKey || 'classic-eos'}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Vision/Traction Organizer</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Empty state - show template selection
  if (!vtoData?.vto) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Vision/Traction Organizer</h1>
          <p className="text-muted-foreground">
            Build your organization's strategic vision and track progress toward your goals
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your V/TO</CardTitle>
            <p className="text-sm text-muted-foreground">
              Build your clinic's strategic vision with our pre-configured template designed for healthcare practices
            </p>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleCreateVTO('clinic_standard')}
              size="lg"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create V/TO
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { latestVersion, progress, versions } = vtoData;
  const recentVersions = versions?.slice(0, 3) || [];

  // Parse core focus from latestVersion
  const coreFocus = latestVersion?.core_focus as { purpose?: string; niche?: string } | null;
  const threeYearPicture = latestVersion?.three_year_picture as { revenue?: string; profit?: string } | null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
            Vision/Traction Organizer
            <HelpHint term="V/TO" context="vto_header" />
          </h1>
          <div className="flex items-center gap-4">
            <Badge variant={latestVersion?.status === 'published' ? 'default' : 'secondary'}>
              Version {latestVersion?.version} • {latestVersion?.status}
            </Badge>
            {progress && (
              <div className="text-sm text-muted-foreground">
                Vision Score: <span className="font-semibold text-foreground">{progress.vision_score}%</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!latestVersion && <VtoLoadPresetsButton vtoId={vtoData.vto.id} />}
          <Button variant="outline" onClick={() => navigate('/vto/history')}>
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button onClick={() => navigate('/vto/vision')}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Vision
          </Button>
        </div>
      </div>

      {/* Vision Summary - Expanded */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Vision Summary
            <Button variant="ghost" size="sm" onClick={() => navigate('/vto/vision')}>
              Edit →
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Core Values */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Core Values</div>
            <div className="flex flex-wrap gap-2">
              {(latestVersion?.core_values as string[] || []).length > 0 ? (
                (latestVersion?.core_values as string[]).map((value, i) => (
                  <Badge key={i} variant="secondary">{value}</Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground italic">Not defined</span>
              )}
            </div>
          </div>

          {/* Core Focus */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Purpose / Cause / Passion</div>
              <p className="text-sm">{coreFocus?.purpose || <span className="text-muted-foreground italic">Not set</span>}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Niche</div>
              <p className="text-sm">{coreFocus?.niche || <span className="text-muted-foreground italic">Not set</span>}</p>
            </div>
          </div>

          {/* Targets */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">10-Year Target</div>
              <p className="text-sm font-semibold">{latestVersion?.ten_year_target || <span className="text-muted-foreground italic font-normal">Not set</span>}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">3-Year Picture</div>
              {threeYearPicture?.revenue || threeYearPicture?.profit ? (
                <p className="text-sm">
                  {threeYearPicture.revenue && <span className="font-semibold">{threeYearPicture.revenue}</span>}
                  {threeYearPicture.revenue && threeYearPicture.profit && " at "}
                  {threeYearPicture.profit && <span className="font-semibold">{threeYearPicture.profit}</span>}
                </p>
              ) : (
                <span className="text-sm text-muted-foreground italic">Not set</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Execution Links */}
      <Card>
        <CardHeader>
          <CardTitle>Execution</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your strategy comes to life through these tools
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" onClick={() => navigate('/rocks')} className="h-auto py-4 flex-col gap-2">
              <Target className="w-5 h-5" />
              <span>Quarterly Rocks</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/scorecard')} className="h-auto py-4 flex-col gap-2">
              <BarChart3 className="w-5 h-5" />
              <span>Scorecard</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/issues')} className="h-auto py-4 flex-col gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>Issues List</span>
            </Button>
            <Button variant="outline" onClick={() => navigate('/meeting')} className="h-auto py-4 flex-col gap-2">
              <FileText className="w-5 h-5" />
              <span>L10 Meeting</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent History */}
      {recentVersions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent History
              <Button variant="ghost" size="sm" onClick={() => navigate('/vto/history')}>
                View All →
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentVersions.map((version: any) => (
                <div key={version.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      v{version.version}
                    </div>
                    <div>
                      <div className="text-sm font-medium">Version {version.version}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <Badge variant={version.status === 'published' ? 'default' : 'secondary'}>
                    {version.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VTO;
