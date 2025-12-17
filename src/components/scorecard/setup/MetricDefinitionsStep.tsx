import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Users, DollarSign, Activity, UserPlus, Zap, Sparkles, Loader2, RefreshCw, Target } from "lucide-react";
import { MetricDefinition } from "@/pages/ScorecardSetup";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface MetricDefinitionsStepProps {
  metrics: MetricDefinition[];
  onMetricsChange: (metrics: MetricDefinition[]) => void;
  onNext: () => void;
  onBack: () => void;
}

interface VTOSuggestedMetric {
  name: string;
  category: string;
  unit: string;
  target: number | null;
  direction: "up" | "down";
  linkedGoalKey: string;
  rationale: string;
}

interface VTOGoal {
  key: string;
  title: string;
  category: string;
}

const UNITS = ["count", "%", "dollars", "hours", "days", "points"];

interface PresetMetric {
  name: string;
  target: number | null;
  unit: string;
  direction: "up" | "down";
  category: string;
}

const PRESET_METRICS: Record<string, PresetMetric[]> = {
  Operations: [
    { name: "Total Visits", target: 100, unit: "count", direction: "up", category: "Operations" },
    { name: "New Patients", target: 20, unit: "count", direction: "up", category: "Operations" },
    { name: "% Scheduled", target: 85, unit: "%", direction: "up", category: "Operations" },
  ],
  Finance: [
    { name: "Weekly Revenue", target: 15000, unit: "dollars", direction: "up", category: "Finance" },
    { name: "Aging 30-120 Days", target: 5000, unit: "dollars", direction: "down", category: "Finance" },
    { name: "Cost per Patient", target: 75, unit: "dollars", direction: "down", category: "Finance" },
  ],
  "Clinical Outcomes": [
    { name: "% Completed Care Plans", target: 80, unit: "%", direction: "up", category: "Clinical Outcomes" },
    { name: "Avg Visits per Case", target: 8, unit: "count", direction: "up", category: "Clinical Outcomes" },
  ],
  Referrals: [
    { name: "Total Referrals", target: 30, unit: "count", direction: "up", category: "Referrals" },
    { name: "% Scheduled Referrals", target: 60, unit: "%", direction: "up", category: "Referrals" },
  ],
};

const CATEGORY_ICONS = {
  Operations: Users,
  Finance: DollarSign,
  "Clinical Outcomes": Activity,
  Referrals: UserPlus,
};

export const MetricDefinitionsStep = ({
  metrics,
  onMetricsChange,
  onNext,
  onBack,
}: MetricDefinitionsStepProps) => {
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
  const [selectedVTOSuggestions, setSelectedVTOSuggestions] = useState<Set<string>>(new Set());
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [bulkOwner, setBulkOwner] = useState("");
  const [bulkCategory, setBulkCategory] = useState("all");
  const [bulkSyncSource, setBulkSyncSource] = useState<"manual" | "jane" | "">("");
  const [vtoSuggestionsLoading, setVtoSuggestionsLoading] = useState(false);
  const [vtoSuggestionsError, setVtoSuggestionsError] = useState<string | null>(null);
  const [vtoSuggestions, setVtoSuggestions] = useState<VTOSuggestedMetric[]>([]);
  const [vtoGoals, setVtoGoals] = useState<VTOGoal[]>([]);
  const [hasFetchedVTO, setHasFetchedVTO] = useState(false);
  const { toast } = useToast();

  // Get current user's org
  const { data: userData } = useQuery({
    queryKey: ["current-user-org"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return null;

      const { data: user } = await supabase
        .from("users")
        .select("team_id")
        .eq("id", session.session.user.id)
        .single();

      return user;
    },
  });

  // Check if Jane integration exists
  const { data: janeIntegration } = useQuery({
    queryKey: ["jane-integration"],
    queryFn: async () => {
      if (!userData?.team_id) return null;

      const { data, error } = await supabase
        .from("jane_integrations")
        .select("*")
        .eq("organization_id", userData.team_id)
        .eq("status", "connected")
        .single();

      return error ? null : data;
    },
    enabled: !!userData?.team_id,
  });

  const hasJaneIntegration = !!janeIntegration;

  // Check if VTO exists
  const { data: hasVTO } = useQuery({
    queryKey: ["vto-exists", userData?.team_id],
    queryFn: async () => {
      if (!userData?.team_id) return false;

      const { data: vto } = await supabase
        .from("vto")
        .select("id")
        .eq("organization_id", userData.team_id)
        .eq("is_active", true)
        .maybeSingle();

      return !!vto;
    },
    enabled: !!userData?.team_id,
  });

  // Fetch VTO suggestions
  const fetchVTOSuggestions = async () => {
    if (!userData?.team_id) return;
    
    setVtoSuggestionsLoading(true);
    setVtoSuggestionsError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-scorecard-from-vto', {
        body: { organization_id: userData.team_id }
      });

      if (error) throw error;
      
      if (data?.error) {
        setVtoSuggestionsError(data.error.message);
        return;
      }

      setVtoSuggestions(data?.data?.suggestedMetrics || []);
      setVtoGoals(data?.data?.goals || []);
      setHasFetchedVTO(true);
    } catch (err: any) {
      console.error('Error fetching VTO suggestions:', err);
      setVtoSuggestionsError(err.message || 'Failed to generate suggestions');
    } finally {
      setVtoSuggestionsLoading(false);
    }
  };

  // Get goal title by key
  const getGoalTitle = (goalKey: string): string => {
    const goal = vtoGoals.find(g => g.key === goalKey);
    return goal?.title || goalKey;
  };

  // Toggle VTO suggestion
  const toggleVTOSuggestion = (suggestion: VTOSuggestedMetric) => {
    const key = suggestion.name;
    const newSelected = new Set(selectedVTOSuggestions);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
      onMetricsChange(metrics.filter(m => m.name !== key));
    } else {
      newSelected.add(key);
      onMetricsChange([
        ...metrics,
        {
          name: suggestion.name,
          target: suggestion.target,
          unit: suggestion.unit === '$' ? 'dollars' : suggestion.unit === '%' ? '%' : suggestion.unit === '#' ? 'count' : 'count',
          direction: suggestion.direction,
          owner: "",
          category: suggestion.category,
          syncSource: hasJaneIntegration ? "jane" : "manual",
        },
      ]);
    }
    
    setSelectedVTOSuggestions(newSelected);
  };

  const togglePreset = (metricName: string, preset: PresetMetric) => {
    const newSelected = new Set(selectedPresets);
    
    if (newSelected.has(metricName)) {
      newSelected.delete(metricName);
      onMetricsChange(metrics.filter(m => m.name !== metricName));
    } else {
      newSelected.add(metricName);
      onMetricsChange([
        ...metrics,
        {
          name: preset.name,
          target: preset.target,
          unit: preset.unit,
          direction: preset.direction,
          owner: "",
          category: preset.category,
          syncSource: hasJaneIntegration ? "jane" : "manual",
        },
      ]);
    }
    
    setSelectedPresets(newSelected);
  };

  const addCustomMetric = () => {
    onMetricsChange([
      ...metrics,
      {
        name: "",
        target: null,
        unit: "count",
        direction: "up",
        owner: "",
        category: "Operations",
        syncSource: hasJaneIntegration ? "jane" : "manual",
      },
    ]);
    setShowCustomForm(true);
  };

  const updateMetric = (index: number, field: keyof MetricDefinition, value: any) => {
    const updated = [...metrics];
    updated[index] = { ...updated[index], [field]: value };
    onMetricsChange(updated);
  };

  const removeMetric = (index: number) => {
    const metricToRemove = metrics[index];
    setSelectedPresets(prev => {
      const newSet = new Set(prev);
      newSet.delete(metricToRemove.name);
      return newSet;
    });
    setSelectedVTOSuggestions(prev => {
      const newSet = new Set(prev);
      newSet.delete(metricToRemove.name);
      return newSet;
    });
    onMetricsChange(metrics.filter((_, i) => i !== index));
  };

  const applyBulkOwner = () => {
    if (!bulkOwner.trim()) return;

    const updated = metrics.map(m => 
      bulkCategory === "all" || m.category === bulkCategory ? { ...m, owner: bulkOwner.trim() } : m
    );
    
    onMetricsChange(updated);
    toast({
      title: "Bulk update applied",
      description: bulkCategory !== "all" 
        ? `Set owner "${bulkOwner}" for all ${bulkCategory} metrics`
        : `Set owner "${bulkOwner}" for all metrics`,
    });
    setBulkOwner("");
  };

  const applyBulkSyncSource = () => {
    if (!bulkSyncSource) return;

    const updated = metrics.map(m => 
      bulkCategory === "all" || m.category === bulkCategory 
        ? { ...m, syncSource: bulkSyncSource } 
        : m
    );
    
    onMetricsChange(updated);
    toast({
      title: "Sync source updated",
      description: bulkCategory !== "all" 
        ? `Set sync source to "${bulkSyncSource}" for ${bulkCategory} metrics`
        : `Set sync source to "${bulkSyncSource}" for all metrics`,
    });
    setBulkSyncSource("");
  };

  const canProceed = metrics.length > 0 && metrics.every(m => m.name && m.category);

  return (
    <div className="space-y-6">
      {/* VTO Suggestions Section */}
      {hasVTO && (
        <Card className="glass border-2 border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">From Your V/TO</CardTitle>
                  <p className="text-sm text-muted-foreground">AI-suggested KPIs aligned to your goals</p>
                </div>
              </div>
              {!hasFetchedVTO && (
                <Button 
                  onClick={fetchVTOSuggestions}
                  disabled={vtoSuggestionsLoading}
                  className="gradient-brand"
                >
                  {vtoSuggestionsLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Suggestions
                    </>
                  )}
                </Button>
              )}
              {hasFetchedVTO && (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={fetchVTOSuggestions}
                  disabled={vtoSuggestionsLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${vtoSuggestionsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {vtoSuggestionsError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg mb-4">
                {vtoSuggestionsError}
              </div>
            )}
            
            {!hasFetchedVTO && !vtoSuggestionsLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Click "Generate Suggestions" to get AI-powered KPI recommendations based on your V/TO goals</p>
              </div>
            )}

            {vtoSuggestionsLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
                <p>Analyzing your V/TO goals...</p>
              </div>
            )}

            {hasFetchedVTO && vtoSuggestions.length > 0 && (
              <div className="space-y-3">
                {vtoSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.name}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors border border-border"
                  >
                    <Checkbox
                      id={`vto-${suggestion.name}`}
                      checked={selectedVTOSuggestions.has(suggestion.name)}
                      onCheckedChange={() => toggleVTOSuggestion(suggestion)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label
                          htmlFor={`vto-${suggestion.name}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {suggestion.name}
                        </label>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Target: {suggestion.target ?? 'TBD'} {suggestion.unit}
                        {" • "}
                        {suggestion.direction === "up" ? "↑" : "↓"} Better
                      </p>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-primary font-medium">Linked to:</span>
                        <span className="text-muted-foreground truncate max-w-[200px]">
                          {getGoalTitle(suggestion.linkedGoalKey)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        {suggestion.rationale}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hasFetchedVTO && vtoSuggestions.length === 0 && !vtoSuggestionsError && (
              <div className="text-center py-6 text-muted-foreground">
                <p>No AI suggestions available. Try adding more goals to your V/TO or use the templates below.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Industry Templates Section */}
      <Card className="glass border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Clinic Templates</CardTitle>
          <p className="text-muted-foreground">
            Select from industry-standard metrics for healthcare clinics.
            {hasJaneIntegration && (
              <span className="block mt-1 text-blue-600 font-medium">
                ✨ Jane App connected — metrics will auto-sync
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(PRESET_METRICS).map(([category, presets]) => {
            const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
            return (
              <Card key={category} className="border-border">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{category}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {presets.map((preset) => (
                    <div
                      key={preset.name}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        id={preset.name}
                        checked={selectedPresets.has(preset.name)}
                        onCheckedChange={() => togglePreset(preset.name, preset)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-1">
                        <label
                          htmlFor={preset.name}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {preset.name}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Target: {preset.target} {preset.unit}
                          {" • "}
                          {preset.direction === "up" ? "↑" : "↓"} Better
                          {hasJaneIntegration && " • Auto-synced from Jane"}
                          {!hasJaneIntegration && " • Manual entry"}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* Selected Metrics Summary */}
      {metrics.length > 0 && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Your Selected Metrics ({metrics.length})</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomForm(!showCustomForm)}
              >
                {showCustomForm ? "Hide" : "Show"} Details
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick summary badges */}
            <div className="flex flex-wrap gap-2">
              {metrics.map((m, i) => (
                <Badge key={i} variant="secondary" className="flex items-center gap-1">
                  {m.name || "Unnamed"}
                  <button
                    onClick={() => removeMetric(i)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>

            {/* Bulk Assignment Controls */}
            <Card className="border border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Quick Assign</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs">Owner Name</Label>
                    <Input
                      placeholder="e.g., Front Desk Manager"
                      value={bulkOwner}
                      onChange={(e) => setBulkOwner(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">For Category</Label>
                    <Select
                      value={bulkCategory}
                      onValueChange={setBulkCategory}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Clinical Outcomes">Clinical Outcomes</SelectItem>
                        <SelectItem value="Referrals">Referrals</SelectItem>
                        <SelectItem value="Revenue">Revenue</SelectItem>
                        <SelectItem value="Patients">Patients</SelectItem>
                        <SelectItem value="Clinical">Clinical</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyBulkOwner}
                    disabled={!bulkOwner.trim()}
                    className="flex-1"
                  >
                    Apply Owner
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyBulkSyncSource}
                    disabled={!bulkSyncSource}
                    className="flex-1"
                  >
                    Apply Sync Source
                  </Button>
                </div>

                {/* Bulk Sync Source */}
                <div className="flex gap-2 pt-2 border-t">
                  <Label className="text-xs flex items-center gap-2 flex-1">
                    Sync Source:
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      variant={bulkSyncSource === "manual" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBulkSyncSource("manual")}
                      className="h-8"
                    >
                      Manual
                    </Button>
                    <Button
                      variant={bulkSyncSource === "jane" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBulkSyncSource("jane")}
                      disabled={!hasJaneIntegration}
                      className="h-8"
                    >
                      Jane
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Edit Form */}
            {showCustomForm && (
              <div className="space-y-4">
                {metrics.map((metric, index) => (
                  <Card key={index} className="p-4 border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label>Metric Name *</Label>
                        <Input
                          placeholder="e.g., New Patients"
                          value={metric.name}
                          onChange={(e) => updateMetric(index, "name", e.target.value)}
                        />
                      </div>

                      <div>
                        <Label>Target</Label>
                        <Input
                          type="number"
                          placeholder="e.g., 50"
                          value={metric.target || ""}
                          onChange={(e) => updateMetric(index, "target", e.target.value ? Number(e.target.value) : null)}
                        />
                      </div>

                      <div>
                        <Label>Unit *</Label>
                        <Select
                          value={metric.unit}
                          onValueChange={(value) => updateMetric(index, "unit", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Direction *</Label>
                        <Select
                          value={metric.direction}
                          onValueChange={(value: "up" | "down") => updateMetric(index, "direction", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="up">Up = Better</SelectItem>
                            <SelectItem value="down">Down = Better</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Owner</Label>
                        <Input
                          placeholder="e.g., Front Desk Manager"
                          value={metric.owner}
                          onChange={(e) => updateMetric(index, "owner", e.target.value)}
                        />
                      </div>

                      <div>
                        <Label>Category *</Label>
                        <Select
                          value={metric.category}
                          onValueChange={(value) => updateMetric(index, "category", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Operations">Operations</SelectItem>
                            <SelectItem value="Finance">Finance</SelectItem>
                            <SelectItem value="Clinical Outcomes">Clinical Outcomes</SelectItem>
                            <SelectItem value="Referrals">Referrals</SelectItem>
                            <SelectItem value="Revenue">Revenue</SelectItem>
                            <SelectItem value="Patients">Patients</SelectItem>
                            <SelectItem value="Clinical">Clinical</SelectItem>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Sync Source</Label>
                        <Select
                          value={metric.syncSource}
                          onValueChange={(value: "manual" | "jane") => updateMetric(index, "syncSource", value)}
                          disabled={!hasJaneIntegration && metric.syncSource === "jane"}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="jane" disabled={!hasJaneIntegration}>
                              Jane API {!hasJaneIntegration && "(Not Connected)"}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-2 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMetric(index)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Custom Metric */}
      <Button
        variant="outline"
        onClick={addCustomMetric}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Custom Metric
      </Button>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Continue
        </Button>
      </div>
    </div>
  );
};
