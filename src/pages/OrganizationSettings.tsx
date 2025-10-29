import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Loader2, Building2, Users, Palette, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { copyDocsFromDemo } from "@/lib/docs/copyDocs";
import { useToast } from "@/hooks/use-toast";

export default function OrganizationSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const copyDocsMutation = useMutation({
    mutationFn: async (teamId: string) => {
      return await copyDocsFromDemo(teamId);
    },
    onSuccess: (data) => {
      toast({
        title: "Documents Copied",
        description: `Successfully copied ${data.copied} documents from demo account.`,
      });
      queryClient.invalidateQueries({ queryKey: ["docs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to copy documents",
        variant: "destructive",
      });
    },
  });

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["current-team"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userData } = await supabase
        .from("users")
        .select("team_id")
        .eq("email", user.email)
        .single();

      if (!userData?.team_id) throw new Error("No team assigned");

      const { data: teamData } = await supabase
        .from("teams")
        .select("*")
        .eq("id", userData.team_id)
        .single();

      return teamData;
    },
  });

  const { data: departments, isLoading: depsLoading } = useQuery({
    queryKey: ["departments", team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      const { data } = await supabase
        .from("departments")
        .select("*")
        .eq("organization_id", team.id)
        .order("name");
      return data || [];
    },
    enabled: !!team?.id,
  });

  const { data: branding, isLoading: brandingLoading } = useQuery({
    queryKey: ["branding", team?.id],
    queryFn: async () => {
      if (!team?.id) return null;
      const { data } = await supabase
        .from("branding")
        .select("*")
        .eq("organization_id", team.id)
        .single();
      return data;
    },
    enabled: !!team?.id,
  });

  const { data: license, isLoading: licenseLoading } = useQuery({
    queryKey: ["license", team?.id],
    queryFn: async () => {
      if (!team?.id) return null;
      const { data } = await supabase
        .from("licenses")
        .select("*")
        .eq("organization_id", team.id)
        .single();
      return data;
    },
    enabled: !!team?.id,
  });

  const isLoading = teamLoading || depsLoading || brandingLoading || licenseLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 gradient-brand bg-clip-text text-transparent">
          Organization Settings
        </h1>
        <p className="text-muted-foreground">
          View and manage your organization structure
        </p>
      </div>

      <div className="grid gap-6">
        {/* Organization Info */}
        <Card className="glass p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-brand" />
              <div>
                <h2 className="text-2xl font-bold">{team?.name}</h2>
                <p className="text-sm text-muted-foreground">Organization</p>
              </div>
            </div>
            {license && (
              <Badge variant="brand" className="text-sm">
                {license.plan} Plan
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Subdomain</p>
              <p className="font-mono font-semibold">{branding?.subdomain || "Not set"}</p>
            </div>
            <div className="bg-surface/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Custom Domain</p>
              <p className="font-mono font-semibold">{branding?.custom_domain || "Not set"}</p>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Button onClick={() => navigate("/branding")} variant="outline">
              <Palette className="h-4 w-4 mr-2" />
              Manage Branding
            </Button>
            <Button onClick={() => navigate("/licensing")} variant="outline">
              View License Details
            </Button>
            {team?.id && (
              <Button 
                onClick={() => copyDocsMutation.mutate(team.id)} 
                variant="outline"
                disabled={copyDocsMutation.isPending}
              >
                <Copy className="h-4 w-4 mr-2" />
                {copyDocsMutation.isPending ? "Copying..." : "Copy Demo Docs"}
              </Button>
            )}
          </div>
        </Card>

        {/* Departments */}
        <Card className="glass p-6">
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-6 w-6 text-brand" />
            <h2 className="text-xl font-bold">Departments</h2>
          </div>

          <div className="grid gap-3">
            {departments?.map((dept) => (
              <div
                key={dept.id}
                className="flex items-center justify-between bg-surface/50 p-4 rounded-lg hover:bg-surface/70 transition-colors"
              >
                <span className="font-medium">{dept.name}</span>
                <Badge variant="muted" className="text-xs">
                  Active
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Onboarding Checklist */}
        <Card className="glass p-6 border-success/50 bg-success/5">
          <h2 className="text-xl font-bold mb-4">Onboarding Checklist</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-success flex items-center justify-center text-white text-xs">✓</div>
              <span className="text-sm">Organization created</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-success flex items-center justify-center text-white text-xs">✓</div>
              <span className="text-sm">Subdomain configured: northwest</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-success flex items-center justify-center text-white text-xs">✓</div>
              <span className="text-sm">Departments created (6)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-success flex items-center justify-center text-white text-xs">✓</div>
              <span className="text-sm">Branding applied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-success flex items-center justify-center text-white text-xs">✓</div>
              <span className="text-sm">License activated (Pro)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-warning flex items-center justify-center text-white text-xs">!</div>
              <span className="text-sm text-muted-foreground">Pending: User import</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs">○</div>
              <span className="text-sm text-muted-foreground">Pending: KPI setup</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs">○</div>
              <span className="text-sm text-muted-foreground">Pending: SOP documentation</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
