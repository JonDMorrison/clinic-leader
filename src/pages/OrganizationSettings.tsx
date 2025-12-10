import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Users, Palette, Copy, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { copyDocsFromDemo } from "@/lib/docs/copyDocs";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function OrganizationSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTeam, setEditedTeam] = useState<any>(null);

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

      if (teamData && !editedTeam) {
        setEditedTeam(teamData);
      }

      return teamData;
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!team?.id) throw new Error("No team ID");
      
      const { error } = await supabase
        .from("teams")
        .update(updates)
        .eq("id", team.id);

      if (error) throw error;
      return updates;
    },
    onSuccess: () => {
      toast({
        title: "Company Profile Updated",
        description: "Your changes have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["current-team"] });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update company profile",
        variant: "destructive",
      });
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

  const handleSave = () => {
    if (!editedTeam) return;
    updateTeamMutation.mutate(editedTeam);
  };

  const handleCancel = () => {
    setEditedTeam(team);
    setIsEditing(false);
  };

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
          Company Profile
        </h1>
        <p className="text-muted-foreground">
          View and manage your organization information
        </p>
      </div>

      <div className="grid gap-6">
        {/* Company Information - Editable */}
        <Card className="glass p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-brand" />
              <div>
                <h2 className="text-2xl font-bold">Company Information</h2>
                <p className="text-sm text-muted-foreground">Basic details about your organization</p>
              </div>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                Edit Profile
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={editedTeam?.name || ""}
                    onChange={(e) => setEditedTeam({ ...editedTeam, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="industry">Industry *</Label>
                  <Select
                    value={editedTeam?.industry || ""}
                    onValueChange={(value) => setEditedTeam({ ...editedTeam, industry: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Chiropractic">Chiropractic</SelectItem>
                      <SelectItem value="Physiotherapy">Physiotherapy</SelectItem>
                      <SelectItem value="Multidisciplinary">Multidisciplinary</SelectItem>
                      <SelectItem value="Counselling">Counselling</SelectItem>
                      <SelectItem value="Medical">Medical</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="team_size">Team Size *</Label>
                  <Input
                    id="team_size"
                    type="number"
                    value={editedTeam?.team_size || ""}
                    onChange={(e) => setEditedTeam({ ...editedTeam, team_size: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="location_city">City</Label>
                  <Input
                    id="location_city"
                    value={editedTeam?.location_city || ""}
                    onChange={(e) => setEditedTeam({ ...editedTeam, location_city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="location_region">State/Province</Label>
                  <Input
                    id="location_region"
                    value={editedTeam?.location_region || ""}
                    onChange={(e) => setEditedTeam({ ...editedTeam, location_region: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={editedTeam?.country || ""}
                    onValueChange={(value) => setEditedTeam({ ...editedTeam, country: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USA">United States</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="Australia">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={editedTeam?.timezone || ""}
                    onChange={(e) => setEditedTeam({ ...editedTeam, timezone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={editedTeam?.currency || ""}
                    onChange={(e) => setEditedTeam({ ...editedTeam, currency: e.target.value })}
                    placeholder="USD"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ehr_system">EHR System</Label>
                  <Select
                    value={editedTeam?.ehr_system || ""}
                    onValueChange={(value) => setEditedTeam({ ...editedTeam, ehr_system: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Jane">Jane</SelectItem>
                      <SelectItem value="ChiroTouch">ChiroTouch</SelectItem>
                      <SelectItem value="Notero">Notero</SelectItem>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="review_cadence">Review Cadence</Label>
                  <Select
                    value={editedTeam?.review_cadence || ""}
                    onValueChange={(value) => setEditedTeam({ ...editedTeam, review_cadence: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={updateTeamMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateTeamMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Company Name</p>
                <p className="font-semibold">{team?.name || "Not set"}</p>
              </div>
              <div className="bg-surface/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Industry</p>
                <p className="font-semibold">{team?.industry || "Not set"}</p>
              </div>
              <div className="bg-surface/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Team Size</p>
                <p className="font-semibold">{team?.team_size || "Not set"}</p>
              </div>
              <div className="bg-surface/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Location</p>
                <p className="font-semibold">
                  {team?.location_city && team?.location_region 
                    ? `${team.location_city}, ${team.location_region}` 
                    : "Not set"}
                </p>
              </div>
              <div className="bg-surface/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Country</p>
                <p className="font-semibold">{team?.country || "Not set"}</p>
              </div>
              <div className="bg-surface/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Timezone</p>
                <p className="font-semibold">{team?.timezone || "Not set"}</p>
              </div>
              <div className="bg-surface/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Currency</p>
                <p className="font-semibold">{team?.currency || "Not set"}</p>
              </div>
              <div className="bg-surface/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">EHR System</p>
                <p className="font-semibold">{team?.ehr_system || "Not set"}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Branding & License */}
        <Card className="glass p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Branding & License</h2>
              <p className="text-sm text-muted-foreground">Customize your workspace appearance</p>
            </div>
            {license && (
              <Badge variant="brand" className="text-sm">
                {license.plan} Plan
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-surface/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Subdomain</p>
              <p className="font-mono font-semibold">{branding?.subdomain || "Not set"}</p>
            </div>
            <div className="bg-surface/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Custom Domain</p>
              <p className="font-mono font-semibold">{branding?.custom_domain || "Not set"}</p>
            </div>
          </div>


          <div className="flex gap-3">
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
