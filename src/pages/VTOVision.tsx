import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, X, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { VTO_TEMPLATES, VTOTemplateKey } from "@/lib/vto/models";
import { calculateVisionScore } from "@/lib/vto/rollup";
import { AutosaveIndicator } from "@/components/vto/AutosaveIndicator";
import { ClickableBadges, CORE_VALUE_SUGGESTIONS, DIFFERENTIATOR_SUGGESTIONS } from "@/components/vto/ClickableBadges";
import { useVTOAutosave, AutosaveStatus } from "@/hooks/useVTOAutosave";

const VTOVision = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const templateKey = searchParams.get('template') as VTOTemplateKey;

  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("saved");

  const [coreValues, setCoreValues] = useState<string[]>([]);
  const [newValue, setNewValue] = useState("");
  const [coreFocus, setCoreFocus] = useState({ purpose: "", niche: "" });
  const [tenYearTarget, setTenYearTarget] = useState("");
  const [marketingStrategy, setMarketingStrategy] = useState({
    ideal_client: "",
    differentiators: [] as string[],
    proven_process: "",
    guarantee: "",
  });
  const [threeYearPicture, setThreeYearPicture] = useState({
    revenue: 0,
    profit: 0,
    measurables: [{ name: "", target: "" }],
    headcount: 0,
    notes: "",
  });

  // AI Draft loading states
  const [aiLoading, setAiLoading] = useState({
    purpose: false,
    niche: false,
    tenYear: false,
    idealClient: false,
    provenProcess: false,
    guarantee: false,
  });


  // Fetch VTO data
  const { data: vtoData, isLoading } = useQuery({
    queryKey: ["vto-vision"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data: userProfile } = await supabase
        .from("users")
        .select("id, team_id")
        .eq("email", userData.user.email)
        .single();

      const { data: vtoList } = await supabase
        .from("vto")
        .select("*")
        .eq("organization_id", userProfile.team_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      const vto = vtoList?.[0] || null;

      if (vto) {
        const { data: latestVersion } = await supabase
          .from("vto_versions")
          .select("*")
          .eq("vto_id", vto.id)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();

        return { vto, version: latestVersion, userId: userProfile.id };
      }

      return { vto: null, version: null, userId: userProfile.id };
    },
  });

  // Helper to normalize core values (handles both string[] and CoreValueItem[])
  const normalizeCoreValues = (raw: unknown): string[] => {
    if (!raw || !Array.isArray(raw)) return [];
    return raw.map((v: any) => (typeof v === 'string' ? v : v?.label || '')).filter(Boolean);
  };

  // Helper to normalize differentiators (handles both string[] and object[])
  const normalizeDifferentiators = (raw: unknown): string[] => {
    if (!raw || !Array.isArray(raw)) return [];
    return raw.map((d: any) => (typeof d === 'string' ? d : d?.text || d?.label || '')).filter(Boolean);
  };

  // Helper to normalize measurables
  const normalizeMeasurables = (raw: unknown): { name: string; target: string }[] => {
    if (!raw || !Array.isArray(raw)) return [{ name: "", target: "" }];
    const result = raw.map((m: any) => ({
      name: m?.name || m?.label || '',
      target: String(m?.target || m?.value || ''),
    }));
    return result.length > 0 ? result : [{ name: "", target: "" }];
  };

  // Helper to normalize core focus (handles string or object)
  const normalizeCoreFocus = (raw: unknown): { purpose: string; niche: string } => {
    if (!raw) return { purpose: "", niche: "" };
    if (typeof raw === 'string') return { purpose: raw, niche: "" };
    const obj = raw as any;
    return { 
      purpose: obj.purpose || obj.why || "", 
      niche: obj.niche || obj.what || "" 
    };
  };

  // Load template or existing data
  useEffect(() => {
    if (templateKey && VTO_TEMPLATES[templateKey]) {
      const template = VTO_TEMPLATES[templateKey].data as any;
      setCoreValues(normalizeCoreValues(template.core_values));
      setCoreFocus(normalizeCoreFocus(template.core_focus));
      setTenYearTarget(template.ten_year_target || "");
      setMarketingStrategy({
        ideal_client: template.marketing_strategy?.ideal_client || template.marketing_strategy?.target_markets?.[0] || "",
        differentiators: normalizeDifferentiators(template.marketing_strategy?.differentiators || template.marketing_strategy?.uniques),
        proven_process: typeof template.marketing_strategy?.proven_process === 'string' 
          ? template.marketing_strategy.proven_process 
          : Array.isArray(template.marketing_strategy?.proven_process)
            ? template.marketing_strategy.proven_process.map((s: any) => s.title || s).join(' → ')
            : "",
        guarantee: template.marketing_strategy?.guarantee || template.promise || "",
      });
      setThreeYearPicture({
        revenue: template.three_year_picture?.revenue || template.three_year_picture?.revenue_target || 0,
        profit: template.three_year_picture?.profit || template.three_year_picture?.profit_target || 0,
        measurables: normalizeMeasurables(template.three_year_picture?.measurables),
        headcount: template.three_year_picture?.headcount || 0,
        notes: template.three_year_picture?.notes || "",
      });
    } else if (vtoData?.version) {
      const v = vtoData.version;
      setCoreValues(normalizeCoreValues(v.core_values));
      setCoreFocus(normalizeCoreFocus(v.core_focus));
      setTenYearTarget(v.ten_year_target || "");
      
      const ms = v.marketing_strategy as any;
      setMarketingStrategy({
        ideal_client: ms?.ideal_client || ms?.ideal_customer_description || ms?.target_markets?.[0] || "",
        differentiators: normalizeDifferentiators(ms?.differentiators || ms?.uniques),
        proven_process: typeof ms?.proven_process === 'string' 
          ? ms.proven_process 
          : Array.isArray(ms?.proven_process)
            ? ms.proven_process.map((s: any) => s.title || s).join(' → ')
            : "",
        guarantee: ms?.guarantee || (v as any).promise || "",
      });
      
      const typ = v.three_year_picture as any;
      setThreeYearPicture({
        revenue: typ?.revenue || typ?.revenue_target || 0,
        profit: typ?.profit || typ?.profit_target || 0,
        measurables: normalizeMeasurables(typ?.measurables),
        headcount: typ?.headcount || 0,
        notes: typ?.notes || "",
      });
    }
  }, [templateKey, vtoData]);

  // Build version data for autosave
  const versionData = {
    core_values: coreValues,
    core_focus: coreFocus,
    ten_year_target: tenYearTarget,
    marketing_strategy: marketingStrategy,
    three_year_picture: threeYearPicture,
  };

  // Enable autosave
  useVTOAutosave({
    vtoId: vtoData?.vto?.id || "",
    versionData,
    onStatusChange: setAutosaveStatus,
    enabled: !!vtoData?.vto?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!vtoData?.vto || !vtoData?.userId) throw new Error("VTO not found");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke("vto-save", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          vto_id: vtoData.vto.id,
          version_data: versionData,
          action: "save_draft",
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vto-vision"] });
      toast({
        title: "Success",
        description: "Vision saved successfully",
      });
      navigate("/vto");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addCoreValue = () => {
    if (newValue.trim() && coreValues.length < 7) {
      setCoreValues([...coreValues, newValue.trim()]);
      setNewValue("");
    }
  };

  const removeCoreValue = (index: number) => {
    setCoreValues(coreValues.filter((_, i) => i !== index));
  };

  const addDifferentiator = () => {
    if (marketingStrategy.differentiators.length < 5) {
      setMarketingStrategy({
        ...marketingStrategy,
        differentiators: [...marketingStrategy.differentiators, ""],
      });
    }
  };

  const updateDifferentiator = (index: number, value: string) => {
    const updated = [...marketingStrategy.differentiators];
    updated[index] = value;
    setMarketingStrategy({ ...marketingStrategy, differentiators: updated });
  };

  const removeDifferentiator = (index: number) => {
    setMarketingStrategy({
      ...marketingStrategy,
      differentiators: marketingStrategy.differentiators.filter((_, i) => i !== index),
    });
  };

  const addMeasurable = () => {
    setThreeYearPicture({
      ...threeYearPicture,
      measurables: [...threeYearPicture.measurables, { name: "", target: "" }],
    });
  };

  const updateMeasurable = (index: number, field: 'name' | 'target', value: string) => {
    const updated = [...threeYearPicture.measurables];
    updated[index][field] = value;
    setThreeYearPicture({ ...threeYearPicture, measurables: updated });
  };

  // AI Draft handlers
  const handleAIDraft = async (field: string, currentValue: string, setter: (value: string) => void, loadingKey: keyof typeof aiLoading) => {
    setAiLoading({ ...aiLoading, [loadingKey]: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const { data: userData } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from("users")
        .select("team_id")
        .eq("email", userData.user!.email)
        .single();

      const { data, error } = await supabase.functions.invoke("clarity-ai", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          intent: "draft",
          context: { 
            organization_id: userProfile.team_id,
            core_focus: coreFocus,
            core_values: coreValues,
            ideal_client: marketingStrategy.ideal_client,
          },
          field,
          current_value: currentValue,
        },
      });

      if (error) throw error;
      if (data?.suggestions?.[0]?.text) {
        setter(data.suggestions[0].text);
        toast({
          title: "AI Draft Generated",
          description: "Review and edit the suggestion as needed.",
        });
      }
    } catch (error) {
      console.error("AI draft error:", error);
      toast({
        title: "AI draft failed",
        description: "Could not generate suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAiLoading({ ...aiLoading, [loadingKey]: false });
    }
  };

  // Calculate vision score for progress
  const visionScore = calculateVisionScore(versionData as any);

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 overflow-y-auto h-full">
          <Button variant="ghost" size="sm" onClick={() => navigate('/vto')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to V/TO
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Vision</h1>
              <p className="text-muted-foreground mt-1">Define your organization's long-term direction</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <AutosaveIndicator status={autosaveStatus} />
              <div className="flex items-center gap-3">
                <Progress value={visionScore} className="w-24" />
                <Badge variant="secondary">{visionScore}%</Badge>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  Save Now
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Core Values */}
            <div id="core-values">
            <Card>
              <CardHeader>
                <CardTitle>Core Values</CardTitle>
                <p className="text-sm text-muted-foreground">
                  3-7 values that define who you are as an organization
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {coreValues.map((value, i) => (
                    <Badge key={i} variant="secondary" className="text-sm px-3 py-1">
                      {value}
                      <X 
                        className="w-3 h-3 ml-2 cursor-pointer hover:text-destructive" 
                        onClick={() => removeCoreValue(i)}
                      />
                    </Badge>
                  ))}
                </div>
                
                {coreValues.length < 7 && (
                  <>
                    <div className="flex gap-2">
                      <Input
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCoreValue()}
                        placeholder="Type your own value..."
                      />
                      <Button onClick={addCoreValue}>Add</Button>
                    </div>
                    
                    <ClickableBadges
                      suggestions={CORE_VALUE_SUGGESTIONS}
                      selected={coreValues}
                      onAdd={(value) => setCoreValues([...coreValues, value])}
                      label="Or choose from common values"
                      maxSelections={7}
                    />
                  </>
                )}
              </CardContent>
            </Card>
            </div>

            {/* Core Focus */}
            <div id="core-focus">
            <Card>
              <CardHeader>
                <CardTitle>Core Focus</CardTitle>
                <p className="text-sm text-muted-foreground">Your purpose and niche</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Purpose (Why do you exist?)</label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAIDraft(
                        "core_purpose",
                        coreFocus.purpose,
                        (value) => setCoreFocus({ ...coreFocus, purpose: value }),
                        "purpose"
                      )}
                      disabled={aiLoading.purpose}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {aiLoading.purpose ? "Drafting..." : "AI Draft"}
                    </Button>
                  </div>
                  <Textarea
                    value={coreFocus.purpose}
                    onChange={(e) => setCoreFocus({ ...coreFocus, purpose: e.target.value })}
                    placeholder="Our purpose is to..."
                    rows={3}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Niche (What do you do best?)</label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleAIDraft(
                        "niche",
                        coreFocus.niche,
                        (value) => setCoreFocus({ ...coreFocus, niche: value }),
                        "niche"
                      )}
                      disabled={aiLoading.niche}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {aiLoading.niche ? "Drafting..." : "AI Draft"}
                    </Button>
                  </div>
                  <Textarea
                    value={coreFocus.niche}
                    onChange={(e) => setCoreFocus({ ...coreFocus, niche: e.target.value })}
                    placeholder="We specialize in..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
            </div>

            {/* 10-Year Target */}
            <div id="ten-year-target">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>10-Year Target</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Where do you see your organization 10 years from now?
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleAIDraft(
                      "ten_year_target",
                      tenYearTarget,
                      setTenYearTarget,
                      "tenYear"
                    )}
                    disabled={aiLoading.tenYear}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {aiLoading.tenYear ? "Drafting..." : "AI Draft"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={tenYearTarget}
                  onChange={(e) => setTenYearTarget(e.target.value)}
                  placeholder="In 10 years, we will be..."
                  rows={4}
                />
              </CardContent>
            </Card>
            </div>

            {/* Ideal Client */}
            <div id="ideal-client">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ideal Client Profile</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Who do you serve best?
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleAIDraft(
                      "ideal_client",
                      marketingStrategy.ideal_client,
                      (value) => setMarketingStrategy({ ...marketingStrategy, ideal_client: value }),
                      "idealClient"
                    )}
                    disabled={aiLoading.idealClient}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {aiLoading.idealClient ? "Drafting..." : "AI Draft"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={marketingStrategy.ideal_client}
                  onChange={(e) => setMarketingStrategy({ ...marketingStrategy, ideal_client: e.target.value })}
                  placeholder="Our ideal client is..."
                  rows={4}
                />
              </CardContent>
            </Card>
            </div>

            {/* Differentiators */}
            <div id="differentiators">
            <Card>
              <CardHeader>
                <CardTitle>Differentiators</CardTitle>
                <p className="text-sm text-muted-foreground">
                  What makes you unique? (3-5 key differentiators)
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {marketingStrategy.differentiators.map((diff, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={diff}
                      onChange={(e) => updateDifferentiator(i, e.target.value)}
                      placeholder={`Differentiator ${i + 1}...`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDifferentiator(i)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                {marketingStrategy.differentiators.length < 5 && (
                  <>
                    <Button variant="outline" onClick={addDifferentiator}>
                      Add Differentiator
                    </Button>
                    
                    <ClickableBadges
                      suggestions={DIFFERENTIATOR_SUGGESTIONS}
                      selected={marketingStrategy.differentiators}
                      onAdd={(value) => setMarketingStrategy({
                        ...marketingStrategy,
                        differentiators: [...marketingStrategy.differentiators, value],
                      })}
                      label="Or choose from common differentiators"
                      maxSelections={5}
                    />
                  </>
                )}
              </CardContent>
            </Card>
            </div>

            {/* Proven Process */}
            <div id="proven-process">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Proven Process</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Your unique method or system
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleAIDraft(
                      "proven_process",
                      marketingStrategy.proven_process,
                      (value) => setMarketingStrategy({ ...marketingStrategy, proven_process: value }),
                      "provenProcess"
                    )}
                    disabled={aiLoading.provenProcess}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {aiLoading.provenProcess ? "Drafting..." : "AI Draft"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={marketingStrategy.proven_process}
                  onChange={(e) => setMarketingStrategy({ ...marketingStrategy, proven_process: e.target.value })}
                  placeholder="Our proven process is..."
                  rows={4}
                />
              </CardContent>
            </Card>
            </div>

            {/* Guarantee */}
            <div id="guarantee">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Guarantee / Promise</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      What do you promise your clients?
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleAIDraft(
                      "promise",
                      marketingStrategy.guarantee,
                      (value) => setMarketingStrategy({ ...marketingStrategy, guarantee: value }),
                      "guarantee"
                    )}
                    disabled={aiLoading.guarantee}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {aiLoading.guarantee ? "Drafting..." : "AI Draft"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={marketingStrategy.guarantee}
                  onChange={(e) => setMarketingStrategy({ ...marketingStrategy, guarantee: e.target.value })}
                  placeholder="We guarantee..."
                  rows={3}
                />
              </CardContent>
            </Card>
            </div>

            {/* 3-Year Picture */}
            <div id="three-year-picture">
            <Card>
              <CardHeader>
                <CardTitle>3-Year Picture</CardTitle>
                <p className="text-sm text-muted-foreground">
                  What will your organization look like in 3 years?
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Revenue</label>
                    <Input
                      type="number"
                      value={threeYearPicture.revenue || ""}
                      onChange={(e) => setThreeYearPicture({ ...threeYearPicture, revenue: Number(e.target.value) })}
                      placeholder="0"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Profit</label>
                    <Input
                      type="number"
                      value={threeYearPicture.profit || ""}
                      onChange={(e) => setThreeYearPicture({ ...threeYearPicture, profit: Number(e.target.value) })}
                      placeholder="0"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Headcount</label>
                  <Input
                    type="number"
                    value={threeYearPicture.headcount || ""}
                    onChange={(e) => setThreeYearPicture({ ...threeYearPicture, headcount: Number(e.target.value) })}
                    placeholder="0"
                    className="mt-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Key Measurables</label>
                  {threeYearPicture.measurables.map((m, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                      <Input
                        value={m.name}
                        onChange={(e) => updateMeasurable(i, 'name', e.target.value)}
                        placeholder="Metric name"
                      />
                      <Input
                        value={m.target}
                        onChange={(e) => updateMeasurable(i, 'target', e.target.value)}
                        placeholder="Target value"
                      />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addMeasurable}>
                    Add Measurable
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium">Additional Notes</label>
                  <Textarea
                    value={threeYearPicture.notes}
                    onChange={(e) => setThreeYearPicture({ ...threeYearPicture, notes: e.target.value })}
                    placeholder="Additional details about your 3-year vision..."
                    rows={3}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>
            </div>

            {/* Bottom Save Button */}
            <div className="flex justify-end pt-6 border-t">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Now"}
              </Button>
            </div>
          </div>
    </div>
  );
};

export default VTOVision;
