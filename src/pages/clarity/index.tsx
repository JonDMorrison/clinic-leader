import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClarityShell } from "@/components/clarity/ClarityShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  ArrowRight,
  Calendar,
  FileText,
  Info
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MigrationBanner } from "@/components/clarity/MigrationBanner";

export default function ClarityPulseDashboard() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();

  // Fetch VTO data with progress from unified VTO tables
  const { data: vtoData, isLoading } = useQuery({
    queryKey: ['vto-review', user?.team_id],
    queryFn: async () => {
      if (!user?.team_id) return null;

      // Get latest active VTO for this organization
      const { data: vto, error: vtoError } = await supabase
        .from('vto')
        .select(`
          *,
          vto_versions!inner(
            *,
            vto_progress(*)
          )
        `)
        .eq('organization_id', user.team_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (vtoError && vtoError.code !== 'PGRST116') throw vtoError;
      return vto;
    },
    enabled: !!user?.team_id,
  });

  // Redirect to VTO if no data exists
  useEffect(() => {
    if (!isLoading && !vtoData && user?.team_id) {
      navigate('/vto');
    }
  }, [vtoData, isLoading, user?.team_id, navigate]);

  if (isLoading) {
    return (
      <ClarityShell organizationId={user?.team_id || ''}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your clarity builder...</p>
          </div>
        </div>
      </ClarityShell>
    );
  }

  if (!vtoData) {
    return null; // Will redirect
  }

  // Extract progress data from VTO progress table
  const latestVersion = vtoData?.vto_versions?.[0];
  const progressData = latestVersion?.vto_progress?.[0];
  const visionClarity = progressData?.vision_score || 0;
  const tractionHealth = progressData?.traction_score || 0;
  const offTrackItems: any[] = [];

  return (
    <ClarityShell
      organizationId={user?.team_id || ''}
      vtoId={vtoData.id}
      versionCurrent={latestVersion?.version || 1}
      versionStatus={latestVersion?.status === 'published' ? 'published' : 'draft'}
      autosaveStatus="saved"
    >
      <div className="space-y-6">
        {/* Edit in VTO Banner */}
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">Strategy Review Mode</AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <div className="flex items-start justify-between gap-4 mt-2">
              <p className="text-sm flex-1">
                This page shows your current VTO data in read-only mode. To make changes, use the V/TO editor.
              </p>
              <Button onClick={() => navigate('/vto')} className="shrink-0">
                <Target className="mr-2 h-4 w-4" />
                Edit in V/TO
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pulse Dashboard</h1>
          <p className="text-muted-foreground">
            Track your vision clarity and traction health at a glance
          </p>
        </div>

        {/* Gauges */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vision Clarity</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{visionClarity}%</div>
              <Progress value={visionClarity} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {visionClarity >= 80 ? 'Excellent clarity' : 
                 visionClarity >= 50 ? 'Good progress' : 
                 'Needs attention'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Traction Health</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tractionHealth}%</div>
              <Progress value={tractionHealth} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {tractionHealth >= 80 ? 'On track' : 
                 tractionHealth >= 50 ? 'Some risks' : 
                 'Needs action'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Off-Track Items */}
        {offTrackItems.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Top Risks
                </CardTitle>
                <Badge variant="secondary">{offTrackItems.length} items</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {offTrackItems.slice(0, 3).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{item.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/clarity/vision')}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Vision Studio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Clarify your 10-year target, values, and picture
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Open Vision <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/clarity/traction')}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Traction Engine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Set goals, priorities, and track execution
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Open Traction <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/clarity/review')}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Quarterly Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Review progress and plan next quarter
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Start Review <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Export & Share
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" size="sm">
              Export HTML
            </Button>
            <Button variant="outline" size="sm">
              Export PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </ClarityShell>
  );
}
