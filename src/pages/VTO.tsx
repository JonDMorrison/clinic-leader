import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Pencil, History, Target, FileText, AlertCircle, BarChart3,
  Heart, Crosshair, Mountain, TrendingUp, Calendar
} from "lucide-react";
import { VtoLoadPresetsButton } from "@/components/vto/VtoLoadPresetsButton";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useVTORealtimeSync } from "@/hooks/useVTORealtimeSync";
import { HelpHint } from "@/components/help/HelpHint";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { BentoGrid, BentoCard } from "@/components/ui/BentoGrid";
import { VTOStatsRow } from "@/components/vto/VTOStatsRow";
import { VisionSectionCard } from "@/components/vto/VisionSectionCard";
import { ExecutionLinkCard } from "@/components/vto/ExecutionLinkCard";

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
      const { data: activeVtoList, error: activeErr } = await supabase
        .from("vto")
        .select("*")
        .eq("organization_id", userProfile.team_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (activeErr && activeErr.code !== 'PGRST116') throw activeErr;
      vto = activeVtoList?.[0] || null;

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

          // Count rocks and issues for stats
          const { count: rocksCount } = await supabase
            .from("rocks")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", userProfile.team_id);

          const { count: issuesCount } = await supabase
            .from("issues")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", userProfile.team_id)
            .eq("status", "open");

          return { 
            vto, versions, latestVersion, progress, teamId: userProfile.team_id,
            rocksCount: rocksCount || 0,
            issuesCount: issuesCount || 0
          };
        }
      }

      return { vto: null, versions: [], latestVersion: null, progress: null, teamId: userProfile.team_id, rocksCount: 0, issuesCount: 0 };
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
      <div className="space-y-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-muted/50 rounded-lg w-1/3" />
          <div className="h-6 bg-muted/50 rounded w-1/2" />
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="h-40 bg-muted/50 rounded-2xl" />
            <div className="h-40 bg-muted/50 rounded-2xl" />
            <div className="h-40 bg-muted/50 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // Empty state - show create VTO card
  if (!vtoData?.vto) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="glass border-dashed border-2 border-primary/30">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <Mountain className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Create Your V/TO</h2>
                <p className="text-muted-foreground">
                  Build your clinic's strategic vision with our pre-configured template designed for healthcare practices
                </p>
              </div>
              <Button
                onClick={() => handleCreateVTO('clinic_standard')}
                size="lg"
                className="w-full gradient-brand text-white"
              >
                <Plus className="w-5 h-5 mr-2" />
                Get Started
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const { latestVersion, progress, versions, rocksCount, issuesCount } = vtoData;
  const recentVersions = versions?.slice(0, 3) || [];

  // Parse data from latestVersion
  const coreValues = (latestVersion?.core_values as string[] || []);
  const coreFocus = latestVersion?.core_focus as { purpose?: string; niche?: string } | null;
  const threeYearPicture = latestVersion?.three_year_picture as { revenue?: string; profit?: string } | null;
  const tenYearTarget = latestVersion?.ten_year_target as string | null;

  // Calculate completion counts for stats
  const goalsCount = [
    coreValues.length > 0,
    coreFocus?.purpose,
    coreFocus?.niche,
    tenYearTarget,
    threeYearPicture?.revenue
  ].filter(Boolean).length;

  return (
    <div className="space-y-8 p-6">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-3">
              Vision/Traction Organizer
              <HelpHint term="V/TO" context="vto_header" />
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <Badge 
                variant={latestVersion?.status === 'published' ? 'default' : 'secondary'}
                className="text-sm"
              >
                Version {latestVersion?.version} • {latestVersion?.status}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            {!latestVersion && <VtoLoadPresetsButton vtoId={vtoData.vto.id} />}
            <Button variant="outline" size="sm" onClick={() => navigate('/vto/history')}>
              <History className="w-4 h-4 mr-2" />
              History
            </Button>
            <Button size="sm" onClick={() => navigate('/vto/vision')}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit Vision
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <VTOStatsRow 
          visionScore={progress?.vision_score || null}
          goalsCount={goalsCount}
          linksCount={rocksCount || 0}
        />
      </motion.div>

      {/* Bento Grid - Vision Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Core Values - Featured (spans 2 cols) */}
        <VisionSectionCard
          title="Core Values"
          icon={<Heart className="w-5 h-5" />}
          isComplete={coreValues.length >= 3}
          onClick={() => navigate('/vto/vision#core-values')}
          className="md:col-span-2"
          delay={0.1}
        >
          {coreValues.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {coreValues.slice(0, 5).map((value, i) => (
                <Badge key={i} variant="secondary" className="bg-primary/10 text-primary border-0">
                  {typeof value === 'string' ? value : (value as any)?.title || value}
                </Badge>
              ))}
              {coreValues.length > 5 && (
                <Badge variant="outline" className="text-muted-foreground">
                  +{coreValues.length - 5} more
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Define your organization's core values</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {coreValues.length}/5 values defined
          </p>
        </VisionSectionCard>

        {/* Core Focus */}
        <VisionSectionCard
          title="Core Focus"
          icon={<Crosshair className="w-5 h-5" />}
          isComplete={!!coreFocus?.purpose && !!coreFocus?.niche}
          onClick={() => navigate('/vto/vision#core-focus')}
          delay={0.2}
        >
          <div className="space-y-2">
            <div>
              <span className="text-xs text-muted-foreground">Purpose</span>
              <p className="text-sm font-medium line-clamp-2">
                {coreFocus?.purpose || <span className="italic text-muted-foreground">Not set</span>}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Niche</span>
              <p className="text-sm font-medium line-clamp-2">
                {coreFocus?.niche || <span className="italic text-muted-foreground">Not set</span>}
              </p>
            </div>
          </div>
        </VisionSectionCard>

        {/* 10-Year Target */}
        <VisionSectionCard
          title="10-Year Target"
          icon={<Mountain className="w-5 h-5" />}
          isComplete={!!tenYearTarget}
          onClick={() => navigate('/vto/vision#ten-year-target')}
          delay={0.3}
        >
          {tenYearTarget ? (
            <p className="text-lg font-bold text-foreground">{tenYearTarget}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Set your 10-year vision</p>
          )}
        </VisionSectionCard>

        {/* 3-Year Picture */}
        <VisionSectionCard
          title="3-Year Picture"
          icon={<TrendingUp className="w-5 h-5" />}
          isComplete={!!threeYearPicture?.revenue}
          onClick={() => navigate('/vto/vision#three-year-picture')}
          className="md:col-span-2"
          delay={0.4}
        >
          {threeYearPicture?.revenue || threeYearPicture?.profit ? (
            <div className="flex items-center gap-4">
              {threeYearPicture.revenue && (
                <div>
                  <span className="text-xs text-muted-foreground">Revenue</span>
                  <p className="text-lg font-bold text-foreground">{threeYearPicture.revenue}</p>
                </div>
              )}
              {threeYearPicture.profit && (
                <div>
                  <span className="text-xs text-muted-foreground">Profit</span>
                  <p className="text-lg font-bold text-foreground">{threeYearPicture.profit}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Define your 3-year goals</p>
          )}
        </VisionSectionCard>
      </div>

      {/* Execution Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-4"
      >
        <div>
          <h2 className="text-xl font-semibold text-foreground">Execution</h2>
          <p className="text-sm text-muted-foreground">Your strategy comes to life through these tools</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ExecutionLinkCard
            title="Quarterly Rocks"
            icon={<Target className="w-6 h-6" />}
            count={rocksCount}
            onClick={() => navigate('/rocks')}
            delay={0.6}
          />
          <ExecutionLinkCard
            title="Scorecard"
            icon={<BarChart3 className="w-6 h-6" />}
            subtitle="Track KPIs"
            onClick={() => navigate('/scorecard')}
            delay={0.65}
          />
          <ExecutionLinkCard
            title="Issues List"
            icon={<AlertCircle className="w-6 h-6" />}
            count={issuesCount}
            onClick={() => navigate('/issues')}
            delay={0.7}
          />
          <ExecutionLinkCard
            title="L10 Meeting"
            icon={<Calendar className="w-6 h-6" />}
            subtitle="Weekly sync"
            onClick={() => navigate('/meeting')}
            delay={0.75}
          />
        </div>
      </motion.div>

      {/* Recent History */}
      {recentVersions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Recent History</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/vto/history')}>
              View All →
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentVersions.map((version: any, index: number) => (
              <motion.div
                key={version.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.85 + index * 0.05 }}
                className="flex-shrink-0 w-48 p-4 rounded-xl glass border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => navigate('/vto/history')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    v{version.version}
                  </div>
                  <Badge variant={version.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                    {version.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default VTO;
