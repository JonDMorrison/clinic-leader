import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, X, Send } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { QuarterlyRock, VTOIssue } from "@/lib/vto/models";
import { getCurrentQuarter } from "@/lib/rocks/templates";

const VTOTraction = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [oneYearPlan, setOneYearPlan] = useState({
    revenue: 0,
    profit: 0,
    measurables: [{ name: "", target: "" }],
    goals: [{ title: "", owner_id: "", target_date: "", status: "on_track" as const }],
  });
  const [quarterKey, setQuarterKey] = useState(getCurrentQuarter());
  const [quarterlyRocks, setQuarterlyRocks] = useState<QuarterlyRock[]>([]);
  const [issuesCompany, setIssuesCompany] = useState<VTOIssue[]>([]);
  const [issuesDepartment, setIssuesDepartment] = useState<VTOIssue[]>([]);
  const [issuesPersonal, setIssuesPersonal] = useState<VTOIssue[]>([]);

  // Fetch VTO data and users
  const { data: vtoData, isLoading } = useQuery({
    queryKey: ["vto-traction"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data: userProfile } = await supabase
        .from("users")
        .select("id, team_id")
        .eq("email", userData.user.email)
        .single();

      const { data: vto } = await supabase
        .from("vto")
        .select("*")
        .eq("organization_id", userProfile.team_id)
        .eq("is_active", true)
        .single();

      if (!vto) return { vto: null, version: null, userId: userProfile.id, users: [] };

      const { data: latestVersion } = await supabase
        .from("vto_versions")
        .select("*")
        .eq("vto_id", vto.id)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      const { data: users } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("team_id", userProfile.team_id)
        .order("full_name");

      return { vto, version: latestVersion, userId: userProfile.id, users: users || [] };
    },
  });

  // Load existing data
  useEffect(() => {
    if (vtoData?.version) {
      const v = vtoData.version;
      setOneYearPlan((v.one_year_plan as any) || {
        revenue: 0,
        profit: 0,
        measurables: [{ name: "", target: "" }],
        goals: [{ title: "", owner_id: "", target_date: "", status: "on_track" }],
      });
      setQuarterKey(v.quarter_key || getCurrentQuarter());
      setQuarterlyRocks((v.quarterly_rocks as any) || []);
      setIssuesCompany((v.issues_company as any) || []);
      setIssuesDepartment((v.issues_department as any) || []);
      setIssuesPersonal((v.issues_personal as any) || []);
    }
  }, [vtoData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!vtoData?.vto || !vtoData?.userId) throw new Error("VTO not found");

      const versionData = {
        vto_id: vtoData.vto.id,
        version: (vtoData.version?.version || 0) + 1,
        status: 'draft' as const,
        one_year_plan: oneYearPlan as any,
        quarter_key: quarterKey,
        quarterly_rocks: quarterlyRocks as any,
        issues_company: issuesCompany as any,
        issues_department: issuesDepartment as any,
        issues_personal: issuesPersonal as any,
        created_by: vtoData.userId,
        // Keep vision fields from existing version
        core_values: (vtoData.version?.core_values as string[]) || [],
        core_focus: (vtoData.version?.core_focus as any) || {},
        ten_year_target: vtoData.version?.ten_year_target || null,
        marketing_strategy: (vtoData.version?.marketing_strategy as any) || {},
        three_year_picture: (vtoData.version?.three_year_picture as any) || {},
      };

      const { data, error } = await supabase
        .from("vto_versions")
        .insert(versionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Traction saved!" });
      queryClient.invalidateQueries({ queryKey: ["vto-traction"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addGoal = () => {
    setOneYearPlan({
      ...oneYearPlan,
      goals: [...oneYearPlan.goals, { title: "", owner_id: "", target_date: "", status: "on_track" }],
    });
  };

  const updateGoal = (index: number, field: string, value: any) => {
    const updated = [...oneYearPlan.goals];
    updated[index] = { ...updated[index], [field]: value };
    setOneYearPlan({ ...oneYearPlan, goals: updated });
  };

  const removeGoal = (index: number) => {
    setOneYearPlan({
      ...oneYearPlan,
      goals: oneYearPlan.goals.filter((_, i) => i !== index),
    });
  };

  const addRock = () => {
    setQuarterlyRocks([
      ...quarterlyRocks,
      { title: "", owner_id: "", due: "", status: "on_track", weight: 1.0 },
    ]);
  };

  const updateRock = (index: number, field: string, value: any) => {
    const updated = [...quarterlyRocks];
    updated[index] = { ...updated[index], [field]: value };
    setQuarterlyRocks(updated);
  };

  const removeRock = (index: number) => {
    setQuarterlyRocks(quarterlyRocks.filter((_, i) => i !== index));
  };

  const addIssue = (type: 'company' | 'department' | 'personal') => {
    const newIssue = { title: "", status: "open" as const };
    if (type === 'company') setIssuesCompany([...issuesCompany, newIssue]);
    if (type === 'department') setIssuesDepartment([...issuesDepartment, newIssue]);
    if (type === 'personal') setIssuesPersonal([...issuesPersonal, newIssue]);
  };

  const updateIssue = (type: 'company' | 'department' | 'personal', index: number, field: string, value: any) => {
    if (type === 'company') {
      const updated = [...issuesCompany];
      updated[index] = { ...updated[index], [field]: value };
      setIssuesCompany(updated);
    }
    if (type === 'department') {
      const updated = [...issuesDepartment];
      updated[index] = { ...updated[index], [field]: value };
      setIssuesDepartment(updated);
    }
    if (type === 'personal') {
      const updated = [...issuesPersonal];
      updated[index] = { ...updated[index], [field]: value };
      setIssuesPersonal(updated);
    }
  };

  const removeIssue = (type: 'company' | 'department' | 'personal', index: number) => {
    if (type === 'company') setIssuesCompany(issuesCompany.filter((_, i) => i !== index));
    if (type === 'department') setIssuesDepartment(issuesDepartment.filter((_, i) => i !== index));
    if (type === 'personal') setIssuesPersonal(issuesPersonal.filter((_, i) => i !== index));
  };

  const sendToL10 = async (issue: VTOIssue) => {
    try {
      const { data: userProfile } = await supabase
        .from("users")
        .select("team_id")
        .eq("email", (await supabase.auth.getUser()).data.user?.email)
        .single();

      const { error } = await supabase
        .from("issues")
        .insert({
          title: issue.title,
          organization_id: userProfile.team_id,
          status: "open",
          context: "From V/TO",
        });

      if (error) throw error;

      toast({ title: "Success", description: "Issue added to meeting!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  const tractionScore = 0; // Will be calculated from linked items

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/vto')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to V/TO
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Traction</h1>
            <p className="text-sm text-muted-foreground">Execute on your vision with quarterly goals</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Traction Score</div>
            <div className="text-2xl font-bold text-foreground">{tractionScore}%</div>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
        </div>
      </div>

      <Progress value={tractionScore} className="h-2" />

      <div className="space-y-6">
        {/* 1-Year Plan */}
        <Card>
          <CardHeader>
            <CardTitle>1-Year Plan</CardTitle>
            <p className="text-sm text-muted-foreground">
              What must be true 12 months from now?
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Revenue Target</label>
                <Input
                  type="number"
                  value={oneYearPlan.revenue}
                  onChange={(e) => setOneYearPlan({ ...oneYearPlan, revenue: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Profit Target</label>
                <Input
                  type="number"
                  value={oneYearPlan.profit}
                  onChange={(e) => setOneYearPlan({ ...oneYearPlan, profit: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Goals</label>
              {oneYearPlan.goals.map((goal, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-center">
                  <Input
                    value={goal.title}
                    onChange={(e) => updateGoal(i, 'title', e.target.value)}
                    placeholder="Goal title"
                    className="col-span-5"
                  />
                  <Select value={goal.owner_id || ""} onValueChange={(v) => updateGoal(i, 'owner_id', v)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {vtoData?.users?.map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={goal.target_date || ""}
                    onChange={(e) => updateGoal(i, 'target_date', e.target.value)}
                    className="col-span-2"
                  />
                  <Select value={goal.status} onValueChange={(v) => updateGoal(i, 'status', v)}>
                    <SelectTrigger className="col-span-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_track">✓</SelectItem>
                      <SelectItem value="at_risk">⚠</SelectItem>
                      <SelectItem value="off_track">✗</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={() => removeGoal(i)} className="col-span-1">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addGoal}>
                <Plus className="w-4 h-4 mr-2" />
                Add Goal
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quarterly Rocks */}
        <Card>
          <CardHeader>
            <CardTitle>Quarterly Rocks</CardTitle>
            <p className="text-sm text-muted-foreground">
              Top 3-7 priorities for {quarterKey}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Quarter</label>
              <Input value={quarterKey} onChange={(e) => setQuarterKey(e.target.value)} />
            </div>

            {quarterlyRocks.map((rock, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center glass p-3 rounded-lg">
                <Input
                  value={rock.title}
                  onChange={(e) => updateRock(i, 'title', e.target.value)}
                  placeholder="Rock title"
                  className="col-span-5"
                />
                <Select value={rock.owner_id || ""} onValueChange={(v) => updateRock(i, 'owner_id', v)}>
                  <SelectTrigger className="col-span-2">
                    <SelectValue placeholder="Owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {vtoData?.users?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={rock.due || ""}
                  onChange={(e) => updateRock(i, 'due', e.target.value)}
                  className="col-span-2"
                />
                <Select value={rock.status} onValueChange={(v) => updateRock(i, 'status', v)}>
                  <SelectTrigger className="col-span-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_track">On Track</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="off_track">Off Track</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => removeRock(i)} className="col-span-1">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addRock}>
              <Plus className="w-4 h-4 mr-2" />
              Add Rock
            </Button>
          </CardContent>
        </Card>

        {/* Issues Lists */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Issues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {issuesCompany.map((issue, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={issue.title}
                    onChange={(e) => updateIssue('company', i, 'title', e.target.value)}
                    placeholder="Issue"
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={() => sendToL10(issue)}>
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeIssue('company', i)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addIssue('company')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Issue
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department Issues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {issuesDepartment.map((issue, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={issue.title}
                    onChange={(e) => updateIssue('department', i, 'title', e.target.value)}
                    placeholder="Issue"
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={() => sendToL10(issue)}>
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeIssue('department', i)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addIssue('department')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Issue
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal Issues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {issuesPersonal.map((issue, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={issue.title}
                    onChange={(e) => updateIssue('personal', i, 'title', e.target.value)}
                    placeholder="Issue"
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={() => sendToL10(issue)}>
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeIssue('personal', i)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addIssue('personal')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Issue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VTOTraction;
