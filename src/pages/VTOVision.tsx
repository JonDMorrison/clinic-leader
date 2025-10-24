import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { VTO_TEMPLATES, VTOTemplateKey } from "@/lib/vto/models";
import { calculateVisionScore } from "@/lib/vto/rollup";

const VTOVision = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const templateKey = searchParams.get('template') as VTOTemplateKey;

  const [coreValues, setCoreValues] = useState<string[]>([]);
  const [newValue, setNewValue] = useState("");
  const [coreFocus, setCoreFocus] = useState({ purpose: "", niche: "" });
  const [tenYearTarget, setTenYearTarget] = useState("");
  const [marketingStrategy, setMarketingStrategy] = useState({
    ideal_client: "",
    differentiators: ["", "", ""],
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

      const { data: vto } = await supabase
        .from("vto")
        .select("*")
        .eq("team_id", userProfile.team_id)
        .eq("is_active", true)
        .single();

      if (vto) {
        const { data: latestVersion } = await supabase
          .from("vto_versions")
          .select("*")
          .eq("vto_id", vto.id)
          .order("version", { ascending: false })
          .limit(1)
          .single();

        return { vto, version: latestVersion, userId: userProfile.id };
      }

      return { vto: null, version: null, userId: userProfile.id };
    },
  });

  // Load template or existing data
  useEffect(() => {
    if (templateKey && VTO_TEMPLATES[templateKey]) {
      const template = VTO_TEMPLATES[templateKey].data as any;
      setCoreValues(template.core_values ? [...template.core_values] : []);
      setCoreFocus(template.core_focus ? { ...template.core_focus } : { purpose: "", niche: "" });
      setTenYearTarget(template.ten_year_target || "");
      setMarketingStrategy(template.marketing_strategy ? {
        ideal_client: template.marketing_strategy.ideal_client || "",
        differentiators: template.marketing_strategy.differentiators ? [...template.marketing_strategy.differentiators] : ["", "", ""],
        proven_process: template.marketing_strategy.proven_process || "",
        guarantee: template.marketing_strategy.guarantee || "",
      } : {
        ideal_client: "",
        differentiators: ["", "", ""],
        proven_process: "",
        guarantee: "",
      });
      setThreeYearPicture(template.three_year_picture ? {
        revenue: template.three_year_picture.revenue || 0,
        profit: template.three_year_picture.profit || 0,
        measurables: template.three_year_picture.measurables ? template.three_year_picture.measurables.map((m: any) => ({ ...m })) : [{ name: "", target: "" }],
        headcount: template.three_year_picture.headcount || 0,
        notes: template.three_year_picture.notes || "",
      } : {
        revenue: 0,
        profit: 0,
        measurables: [{ name: "", target: "" }],
        headcount: 0,
        notes: "",
      });
    } else if (vtoData?.version) {
      const v = vtoData.version;
      setCoreValues((v.core_values as string[]) || []);
      setCoreFocus((v.core_focus as any) || { purpose: "", niche: "" });
      setTenYearTarget(v.ten_year_target || "");
      setMarketingStrategy((v.marketing_strategy as any) || {
        ideal_client: "",
        differentiators: ["", "", ""],
        proven_process: "",
        guarantee: "",
      });
      setThreeYearPicture((v.three_year_picture as any) || {
        revenue: 0,
        profit: 0,
        measurables: [{ name: "", target: "" }],
        headcount: 0,
        notes: "",
      });
    }
  }, [vtoData, templateKey]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!vtoData?.userId) throw new Error("User not found");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data: userProfile } = await supabase
        .from("users")
        .select("team_id")
        .eq("email", userData.user.email)
        .single();

      // Get or create VTO
      let vtoId = vtoData?.vto?.id;
      if (!vtoId) {
        const { data: existingVto } = await supabase
          .from("vto")
          .select("id")
          .eq("team_id", userProfile.team_id)
          .eq("is_active", true)
          .maybeSingle();

        if (existingVto) {
          vtoId = existingVto.id;
        } else {
          const { data: newVto, error: vtoError } = await supabase
            .from("vto")
            .insert({ team_id: userProfile.team_id, is_active: true })
            .select("id")
            .single();

          if (vtoError) throw vtoError;
          vtoId = newVto.id;
        }
      }

      const versionData = {
        vto_id: vtoId,
        version: (vtoData?.version?.version || 0) + 1,
        status: 'draft',
        core_values: coreValues,
        core_focus: coreFocus,
        ten_year_target: tenYearTarget,
        marketing_strategy: marketingStrategy,
        three_year_picture: threeYearPicture,
        created_by: vtoData.userId,
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
      toast({ title: "Success", description: "Vision saved!" });
      queryClient.invalidateQueries({ queryKey: ["vto-vision"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

  // Calculate vision score for progress bar
  const visionScore = calculateVisionScore({
    core_values: coreValues,
    core_focus: coreFocus,
    ten_year_target: tenYearTarget,
    marketing_strategy: marketingStrategy,
    three_year_picture: threeYearPicture,
  } as any);

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/vto')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to V/TO
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Vision</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm">
            {visionScore}% Complete
          </Badge>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Core Values */}
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
                <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeCoreValue(i)}>
                  {value} ×
                </Badge>
              ))}
            </div>
            {coreValues.length < 7 && (
              <div className="flex gap-2">
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCoreValue()}
                  placeholder="Add a core value..."
                />
                <Button onClick={addCoreValue}>Add</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Core Focus */}
        <Card>
          <CardHeader>
            <CardTitle>Core Focus</CardTitle>
            <p className="text-sm text-muted-foreground">Your purpose and niche</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Purpose (Why do you exist?)</label>
              <Textarea
                value={coreFocus.purpose}
                onChange={(e) => setCoreFocus({ ...coreFocus, purpose: e.target.value })}
                placeholder="Our purpose is to..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Niche (What do you do best?)</label>
              <Textarea
                value={coreFocus.niche}
                onChange={(e) => setCoreFocus({ ...coreFocus, niche: e.target.value })}
                placeholder="We specialize in..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* 10-Year Target */}
        <Card>
          <CardHeader>
            <CardTitle>10-Year Target™</CardTitle>
            <p className="text-sm text-muted-foreground">
              One measurable, inspiring long-term goal
            </p>
          </CardHeader>
          <CardContent>
            <Input
              value={tenYearTarget}
              onChange={(e) => setTenYearTarget(e.target.value)}
              placeholder="In 10 years, we will..."
            />
          </CardContent>
        </Card>

        {/* Marketing Strategy */}
        <Card>
          <CardHeader>
            <CardTitle>Marketing Strategy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ideal Client/Customer</label>
              <Textarea
                value={marketingStrategy.ideal_client}
                onChange={(e) => setMarketingStrategy({ ...marketingStrategy, ideal_client: e.target.value })}
                placeholder="Our ideal client is..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">3 Uniques (What makes you different?)</label>
              {marketingStrategy.differentiators.map((diff, i) => (
                <Input
                  key={i}
                  value={diff}
                  onChange={(e) => {
                    const updated = [...marketingStrategy.differentiators];
                    updated[i] = e.target.value;
                    setMarketingStrategy({ ...marketingStrategy, differentiators: updated });
                  }}
                  placeholder={`Differentiator ${i + 1}`}
                  className="mb-2"
                />
              ))}
            </div>
            <div>
              <label className="text-sm font-medium">Proven Process</label>
              <Textarea
                value={marketingStrategy.proven_process}
                onChange={(e) => setMarketingStrategy({ ...marketingStrategy, proven_process: e.target.value })}
                placeholder="Our process..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Guarantee</label>
              <Input
                value={marketingStrategy.guarantee}
                onChange={(e) => setMarketingStrategy({ ...marketingStrategy, guarantee: e.target.value })}
                placeholder="We guarantee..."
              />
            </div>
          </CardContent>
        </Card>

        {/* 3-Year Picture */}
        <Card>
          <CardHeader>
            <CardTitle>3-Year Picture™</CardTitle>
            <p className="text-sm text-muted-foreground">
              What will your organization look like in 3 years?
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Revenue</label>
                <Input
                  type="number"
                  value={threeYearPicture.revenue}
                  onChange={(e) => setThreeYearPicture({ ...threeYearPicture, revenue: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Profit</label>
                <Input
                  type="number"
                  value={threeYearPicture.profit}
                  onChange={(e) => setThreeYearPicture({ ...threeYearPicture, profit: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Key Measurables</label>
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
                + Add Measurable
              </Button>
            </div>
            <div>
              <label className="text-sm font-medium">Headcount</label>
              <Input
                type="number"
                value={threeYearPicture.headcount}
                onChange={(e) => setThreeYearPicture({ ...threeYearPicture, headcount: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Additional Notes</label>
              <Textarea
                value={threeYearPicture.notes}
                onChange={(e) => setThreeYearPicture({ ...threeYearPicture, notes: e.target.value })}
                placeholder="Describe what success looks like..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VTOVision;
