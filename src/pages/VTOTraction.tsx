import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, Send, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { QuarterlyRock, VTOIssue } from "@/lib/vto/models";
import { getCurrentQuarter } from "@/lib/rocks/templates";
import { VTOMiniMap, VTOMiniMapSection } from "@/components/vto/VTOMiniMap";
import { AutosaveIndicator } from "@/components/vto/AutosaveIndicator";
import { useVTOAutosave, AutosaveStatus } from "@/hooks/useVTOAutosave";
import { QuarterlyPlanningWizard } from "@/components/rocks/QuarterlyPlanningWizard";

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
  const [currentSection, setCurrentSection] = useState<string>("one-year");
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("saved");
  const [planningWizardOpen, setPlanningWizardOpen] = useState(false);

  // Refs for smooth scrolling
  const oneYearRef = useRef<HTMLDivElement>(null);
  const rocksRef = useRef<HTMLDivElement>(null);
  const issuesCompanyRef = useRef<HTMLDivElement>(null);
  const issuesDeptRef = useRef<HTMLDivElement>(null);
  const issuesPersonalRef = useRef<HTMLDivElement>(null);

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

  // Autosave
  const versionData = {
    one_year_plan: oneYearPlan,
    quarter_key: quarterKey,
    quarterly_rocks: quarterlyRocks,
    issues_company: issuesCompany,
    issues_department: issuesDepartment,
    issues_personal: issuesPersonal,
  };

  useVTOAutosave({
    vtoId: vtoData?.vto?.id || "",
    versionData,
    onStatusChange: setAutosaveStatus,
    enabled: !!vtoData?.vto?.id,
  });

  // Calculate progress
  const calculateProgress = () => {
    let completed = 0;
    let total = 5;

    if (oneYearPlan.revenue > 0 || oneYearPlan.profit > 0) completed++;
    if (quarterlyRocks.length > 0) completed++;
    if (issuesCompany.length > 0) completed++;
    if (issuesDepartment.length > 0) completed++;
    if (issuesPersonal.length > 0) completed++;

    return Math.round((completed / total) * 100);
  };

  // Mini-map sections
  const miniMapSections: VTOMiniMapSection[] = [
    {
      id: "one-year",
      label: "1-Year Plan",
      complete: oneYearPlan.revenue > 0 || oneYearPlan.profit > 0,
      onClick: () => oneYearRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    },
    {
      id: "rocks",
      label: "Quarterly Rocks",
      complete: quarterlyRocks.length > 0,
      onClick: () => rocksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    },
    {
      id: "issues-company",
      label: "Issues - Company",
      complete: issuesCompany.length > 0,
      onClick: () => issuesCompanyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    },
    {
      id: "issues-dept",
      label: "Issues - Department",
      complete: issuesDepartment.length > 0,
      onClick: () => issuesDeptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    },
    {
      id: "issues-personal",
      label: "Issues - Personal",
      complete: issuesPersonal.length > 0,
      onClick: () => issuesPersonalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    },
  ];

  // 1-Year Plan handlers
  const addGoal = () => {
    setOneYearPlan((prev) => ({
      ...prev,
      goals: [...prev.goals, { title: "", owner_id: "", target_date: "", status: "on_track" }],
    }));
  };

  const updateGoal = (index: number, field: string, value: any) => {
    setOneYearPlan((prev) => ({
      ...prev,
      goals: prev.goals.map((g, i) => (i === index ? { ...g, [field]: value } : g)),
    }));
  };

  const removeGoal = (index: number) => {
    setOneYearPlan((prev) => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== index),
    }));
  };

  // Rock handlers
  const addRock = () => {
    setQuarterlyRocks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: "", owner_id: "", status: "on_track", progress: 0 },
    ]);
  };

  const updateRock = (id: string, field: string, value: any) => {
    setQuarterlyRocks((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const removeRock = (id: string) => {
    setQuarterlyRocks((prev) => prev.filter((r) => r.id !== id));
  };

  // Issue handlers
  const addIssue = (list: "company" | "department" | "personal") => {
    const newIssue: VTOIssue = {
      id: crypto.randomUUID(),
      title: "",
      owner_id: "",
      priority: 1,
      status: "identified",
    };

    if (list === "company") setIssuesCompany((prev) => [...prev, newIssue]);
    if (list === "department") setIssuesDepartment((prev) => [...prev, newIssue]);
    if (list === "personal") setIssuesPersonal((prev) => [...prev, newIssue]);
  };

  const updateIssue = (list: "company" | "department" | "personal", id: string, field: string, value: any) => {
    const updateFn = (prev: VTOIssue[]) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i));

    if (list === "company") setIssuesCompany(updateFn);
    if (list === "department") setIssuesDepartment(updateFn);
    if (list === "personal") setIssuesPersonal(updateFn);
  };

  const removeIssue = (list: "company" | "department" | "personal", id: string) => {
    if (list === "company") setIssuesCompany((prev) => prev.filter((i) => i.id !== id));
    if (list === "department") setIssuesDepartment((prev) => prev.filter((i) => i.id !== id));
    if (list === "personal") setIssuesPersonal((prev) => prev.filter((i) => i.id !== id));
  };

  const sendToL10 = async (issue: VTOIssue) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data: userProfile } = await supabase
        .from("users")
        .select("team_id")
        .eq("email", userData.user.email)
        .single();

      await supabase.from("issues").insert({
        title: issue.title,
        organization_id: userProfile.team_id,
        owner_id: issue.owner_id || null,
        priority: issue.priority,
        status: "open",
      });

      toast({ title: "Issue sent to IDS", description: "Issue added to your issues list." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading traction data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/vto")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Traction</h1>
                <p className="text-muted-foreground">Manage your 1-year plan, rocks, and issues</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setPlanningWizardOpen(true)}
                disabled={!vtoData?.version || (oneYearPlan.goals || []).length === 0}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Plan Quarter
              </Button>
              <AutosaveIndicator status={autosaveStatus} />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Traction Progress</span>
              <span className="font-medium">{calculateProgress()}%</span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
          </div>

          {/* 1-Year Plan */}
          <div ref={oneYearRef}>
            <Card>
              <CardHeader>
                <CardTitle>1-Year Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Revenue Target ($)</label>
                    <Input
                      type="number"
                      value={oneYearPlan.revenue || ""}
                      onChange={(e) =>
                        setOneYearPlan((prev) => ({ ...prev, revenue: Number(e.target.value) }))
                      }
                      placeholder="1000000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Profit Target ($)</label>
                    <Input
                      type="number"
                      value={oneYearPlan.profit || ""}
                      onChange={(e) =>
                        setOneYearPlan((prev) => ({ ...prev, profit: Number(e.target.value) }))
                      }
                      placeholder="200000"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Goals</label>
                    <Button size="sm" variant="outline" onClick={addGoal}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Goal
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {(oneYearPlan.goals || []).map((goal, idx) => (
                      <div key={idx} className="flex gap-2 items-start p-3 border rounded-lg">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Goal title"
                            value={goal.title}
                            onChange={(e) => updateGoal(idx, "title", e.target.value)}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              value={goal.owner_id}
                              onValueChange={(val) => updateGoal(idx, "owner_id", val)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Owner" />
                              </SelectTrigger>
                          <SelectContent>
                            {(vtoData?.users || []).map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                            </Select>
                            <Input
                              type="date"
                              value={goal.target_date}
                              onChange={(e) => updateGoal(idx, "target_date", e.target.value)}
                            />
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeGoal(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quarterly Rocks */}
          <div ref={rocksRef}>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Quarterly Rocks ({quarterKey})</CardTitle>
                  <Button size="sm" variant="outline" onClick={addRock}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Rock
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {quarterlyRocks.map((rock) => (
                  <div key={rock.id} className="flex gap-2 items-start p-3 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Rock title"
                        value={rock.title}
                        onChange={(e) => updateRock(rock.id, "title", e.target.value)}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Select
                          value={rock.owner_id}
                          onValueChange={(val) => updateRock(rock.id, "owner_id", val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Owner" />
                          </SelectTrigger>
                          <SelectContent>
                            {(vtoData?.users || []).map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={rock.status}
                          onValueChange={(val) => updateRock(rock.id, "status", val)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="on_track">On Track</SelectItem>
                            <SelectItem value="at_risk">At Risk</SelectItem>
                            <SelectItem value="off_track">Off Track</SelectItem>
                            <SelectItem value="complete">Complete</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Progress %"
                          value={rock.progress || ""}
                          onChange={(e) =>
                            updateRock(rock.id, "progress", Number(e.target.value))
                          }
                        />
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeRock(rock.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {quarterlyRocks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No rocks yet. Add your first rock to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Issues - Company */}
          <div ref={issuesCompanyRef}>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Issues - Company</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => addIssue("company")}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Issue
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {issuesCompany.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    users={vtoData?.users || []}
                    onUpdate={(field, value) => updateIssue("company", issue.id, field, value)}
                    onRemove={() => removeIssue("company", issue.id)}
                    onSendToL10={() => sendToL10(issue)}
                  />
                ))}
                {issuesCompany.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No company issues identified yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Issues - Department */}
          <div ref={issuesDeptRef}>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Issues - Department</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => addIssue("department")}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Issue
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {issuesDepartment.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    users={vtoData?.users || []}
                    onUpdate={(field, value) => updateIssue("department", issue.id, field, value)}
                    onRemove={() => removeIssue("department", issue.id)}
                    onSendToL10={() => sendToL10(issue)}
                  />
                ))}
                {issuesDepartment.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No department issues identified yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Issues - Personal */}
          <div ref={issuesPersonalRef}>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Issues - Personal</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => addIssue("personal")}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Issue
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {issuesPersonal.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    users={vtoData?.users || []}
                    onUpdate={(field, value) => updateIssue("personal", issue.id, field, value)}
                    onRemove={() => removeIssue("personal", issue.id)}
                    onSendToL10={() => sendToL10(issue)}
                  />
                ))}
                {issuesPersonal.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No personal issues identified yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mini-Map Sidebar */}
      <VTOMiniMap
        sections={miniMapSections}
        currentSection={currentSection}
        title="Traction Sections"
      />
    </div>
  );
};

// Issue Row Component
interface IssueRowProps {
  issue: VTOIssue;
  users: { id: string; full_name: string }[];
  onUpdate: (field: string, value: any) => void;
  onRemove: () => void;
  onSendToL10: () => void;
}

const IssueRow = ({ issue, users, onUpdate, onRemove, onSendToL10 }: IssueRowProps) => {
  return (
    <div className="flex gap-2 items-start p-3 border rounded-lg">
      <div className="flex-1 space-y-2">
        <Input
          placeholder="Issue description"
          value={issue.title}
          onChange={(e) => onUpdate("title", e.target.value)}
        />
        <div className="grid grid-cols-3 gap-2">
          <Select value={issue.owner_id} onValueChange={(val) => onUpdate("owner_id", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(issue.priority)}
            onValueChange={(val) => onUpdate("priority", Number(val))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">P1 - Critical</SelectItem>
              <SelectItem value="2">P2 - High</SelectItem>
              <SelectItem value="3">P3 - Medium</SelectItem>
              <SelectItem value="4">P4 - Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={issue.status} onValueChange={(val) => onUpdate("status", val)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="identified">Identified</SelectItem>
              <SelectItem value="discussed">Discussed</SelectItem>
              <SelectItem value="solved">Solved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {issue.status === "identified" && (
          <Button size="sm" variant="outline" onClick={onSendToL10} className="w-full">
            <Send className="h-3 w-3 mr-1" />
            Send to L10 IDS
          </Button>
        )}
      </div>
      <Button size="icon" variant="ghost" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default VTOTraction;
