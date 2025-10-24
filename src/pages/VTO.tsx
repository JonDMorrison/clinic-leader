import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, History, Link as LinkIcon, Download } from "lucide-react";
import { VtoLoadPresetsButton } from "@/components/vto/VtoLoadPresetsButton";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const VTO = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

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

      // Get VTO
      const { data: vto, error: vtoError } = await supabase
        .from("vto")
        .select("*")
        .eq("team_id", userProfile.team_id)
        .eq("is_active", true)
        .single();

      if (vtoError && vtoError.code !== 'PGRST116') throw vtoError;

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

          return { vto, versions, latestVersion, progress };
        }
      }

      return { vto: null, versions: [], latestVersion: null, progress: null };
    },
  });

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
          team_id: userProfile.team_id,
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
            <CardTitle>Get Started with Your V/TO</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose a template to begin building your Vision/Traction Organizer
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Card className={selectedTemplate === 'classic-eos' ? 'border-primary' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg">🚀 Classic EOS</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Standard EOS Vision/Traction Organizer format
                  </p>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleCreateVTO('classic-eos')}
                    className="w-full"
                  >
                    Start with Classic EOS
                  </Button>
                </CardContent>
              </Card>

              <Card className={selectedTemplate === 'clinic-growth' ? 'border-primary' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg">🏥 Clinic Growth</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Pre-configured for healthcare practice growth
                  </p>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleCreateVTO('clinic-growth')}
                    className="w-full"
                  >
                    Start with Clinic Growth
                  </Button>
                </CardContent>
              </Card>

              <Card className={selectedTemplate === 'lean-vto' ? 'border-primary' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg">⚡ Lean VTO</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Simplified starter to expand later
                  </p>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleCreateVTO('lean-vto')}
                    className="w-full"
                  >
                    Start with Lean VTO
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { latestVersion, progress } = vtoData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Vision/Traction Organizer</h1>
          <div className="flex items-center gap-4">
            <Badge variant={latestVersion?.status === 'published' ? 'default' : 'secondary'}>
              Version {latestVersion?.version} • {latestVersion?.status}
            </Badge>
            {progress && (
              <>
                <div className="text-sm text-muted-foreground">
                  Vision: <span className="font-semibold text-foreground">{progress.vision_score}%</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Traction: <span className="font-semibold text-foreground">{progress.traction_score}%</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <VtoLoadPresetsButton vtoId={vtoData.vto.id} />
          <Button variant="outline" onClick={() => navigate('/vto/export')}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => navigate('/vto/vision')}>
            <FileText className="w-4 h-4 mr-2" />
            Edit Vision
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="glass">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Vision Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Core Values</div>
                  <div className="flex flex-wrap gap-2">
                    {(latestVersion?.core_values as string[] || []).map((value, i) => (
                      <Badge key={i} variant="secondary">{value}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">10-Year Target</div>
                  <p className="text-sm">{latestVersion?.ten_year_target || "Not set"}</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/vto/vision')} className="w-full">
                  View Full Vision →
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Traction Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Current Quarter</div>
                  <p className="text-sm font-semibold">{latestVersion?.quarter_key || "Not set"}</p>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Active Rocks</div>
                  <p className="text-sm">{Array.isArray(latestVersion?.quarterly_rocks) ? latestVersion.quarterly_rocks.length : 0} rocks tracked</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/vto/traction')} className="w-full">
                  View Full Traction →
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="links">
          <Card>
            <CardHeader>
              <CardTitle>Goal Links</CardTitle>
              <p className="text-sm text-muted-foreground">
                Connect your VTO goals to live KPIs, Rocks, Issues, and Docs
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Links management coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {vtoData?.versions?.map((version: any) => (
                  <div key={version.id} className="flex items-center justify-between p-3 glass rounded-lg">
                    <div>
                      <div className="font-medium">Version {version.version}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(version.created_at).toLocaleDateString()}
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VTO;
