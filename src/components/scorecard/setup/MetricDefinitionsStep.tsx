import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Users, DollarSign, Activity, UserPlus, Zap } from "lucide-react";
import { MetricDefinition } from "@/pages/ScorecardSetup";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface MetricDefinitionsStepProps {
  metrics: MetricDefinition[];
  onMetricsChange: (metrics: MetricDefinition[]) => void;
  onNext: () => void;
  onBack: () => void;
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
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [bulkOwner, setBulkOwner] = useState("");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkSyncSource, setBulkSyncSource] = useState<"manual" | "jane" | "">("");
  const { toast } = useToast();

  // Check if Jane integration exists
  const { data: janeIntegration } = useQuery({
    queryKey: ["jane-integration"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return null;

      const { data: user } = await supabase
        .from("users")
        .select("team_id")
        .eq("email", session.session.user.email)
        .single();

      if (!user?.team_id) return null;

      const { data, error } = await supabase
        .from("jane_integrations")
        .select("*")
        .eq("organization_id", user.team_id)
        .eq("status", "connected")
        .single();

      return error ? null : data;
    },
  });

  const hasJaneIntegration = !!janeIntegration;

  // Fetch historical data from past 4 weeks to calculate smart targets
  const { data: historicalMetrics } = useQuery({
    queryKey: ["historical-metrics", janeIntegration?.organization_id],
    queryFn: async () => {
      if (!janeIntegration?.organization_id) return null;

      // Calculate date 4 weeks ago
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      const fourWeeksAgoStr = fourWeeksAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("metric_results")
        .select("*, metrics!inner(name, organization_id)")
        .eq("metrics.organization_id", janeIntegration.organization_id)
        .gte("week_start", fourWeeksAgoStr)
        .not("value", "is", null);

      if (error) {
        console.error("Error fetching historical metrics:", error);
        return null;
      }

      // Group by metric name and calculate averages
      const averages: Record<string, number> = {};
      const grouped: Record<string, number[]> = {};

      data?.forEach((result: any) => {
        const metricName = result.metrics?.name;
        if (metricName && result.value !== null) {
          if (!grouped[metricName]) {
            grouped[metricName] = [];
          }
          grouped[metricName].push(result.value);
        }
      });

      // Calculate averages
      Object.entries(grouped).forEach(([name, values]) => {
        if (values.length > 0) {
          const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
          averages[name] = Math.round(avg * 100) / 100; // Round to 2 decimal places
        }
      });

      return averages;
    },
    enabled: !!janeIntegration?.organization_id,
  });

  // Get smart target for a metric based on historical data or preset default
  const getSmartTarget = (metricName: string, presetTarget: number | null): number | null => {
    if (hasJaneIntegration && historicalMetrics && historicalMetrics[metricName]) {
      return historicalMetrics[metricName];
    }
    return presetTarget;
  };

  const togglePreset = (metricName: string, preset: PresetMetric) => {
    const newSelected = new Set(selectedPresets);
    
    if (newSelected.has(metricName)) {
      newSelected.delete(metricName);
      // Remove from metrics
      onMetricsChange(metrics.filter(m => m.name !== metricName));
    } else {
      newSelected.add(metricName);
      
      // Get smart target (historical average or preset default)
      const smartTarget = getSmartTarget(preset.name, preset.target);
      
      // Add to metrics with defaults
      onMetricsChange([
        ...metrics,
        {
          name: preset.name,
          target: smartTarget,
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
    onMetricsChange(metrics.filter((_, i) => i !== index));
  };

  const applyBulkOwner = () => {
    if (!bulkOwner.trim()) return;

    const targetCategory = bulkCategory || "Operations";
    const updated = metrics.map(m => 
      m.category === targetCategory ? { ...m, owner: bulkOwner.trim() } : m
    );
    
    onMetricsChange(updated);
    toast({
      title: "Bulk update applied",
      description: `Set owner "${bulkOwner}" for all ${targetCategory} metrics`,
    });
    setBulkOwner("");
  };

  const applyBulkSyncSource = () => {
    if (!bulkSyncSource) return;

    const targetCategory = bulkCategory || "";
    const updated = metrics.map(m => 
      !targetCategory || m.category === targetCategory 
        ? { ...m, syncSource: bulkSyncSource } 
        : m
    );
    
    onMetricsChange(updated);
    toast({
      title: "Sync source updated",
      description: targetCategory 
        ? `Set sync source to "${bulkSyncSource}" for ${targetCategory} metrics`
        : `Set sync source to "${bulkSyncSource}" for all metrics`,
    });
    setBulkSyncSource("");
  };

  const canProceed = metrics.length > 0 && metrics.every(m => m.name && m.category);

  return (
    <div className="space-y-6">
      <Card className="glass border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Let's pick what matters most to your clinic</CardTitle>
          <p className="text-muted-foreground">
            Select the metrics you want to track. 
            {hasJaneIntegration && historicalMetrics && Object.keys(historicalMetrics).length > 0 && (
              <span className="block mt-1 text-blue-600 font-medium">
                ✨ Smart targets calculated from your Jane App data (last 4 weeks)
              </span>
            )}
            {hasJaneIntegration && (!historicalMetrics || Object.keys(historicalMetrics).length === 0) && (
              <span className="block mt-1">
                We've prefilled targets with industry standards. Jane App will auto-sync your data.
              </span>
            )}
            {!hasJaneIntegration && (
              <span className="block mt-1">
                We've prefilled targets based on industry standards.
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Preset Metrics by Category */}
          <div className="space-y-6">
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
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {preset.name}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Target: {getSmartTarget(preset.name, preset.target) || preset.target} {preset.unit}
                            {" • "}
                            {preset.direction === "up" ? "↑" : "↓"} Better
                            {hasJaneIntegration && historicalMetrics?.[preset.name] && (
                              <span className="ml-1 text-blue-600 font-medium">
                                (based on your last 4 weeks)
                              </span>
                            )}
                            {hasJaneIntegration && !historicalMetrics?.[preset.name] && (
                              <span className="ml-1">
                                • Auto-synced from Jane
                              </span>
                            )}
                            {!hasJaneIntegration && " • Manual entry"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Selected Metrics - Editable */}
          {metrics.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Your Selected Metrics ({metrics.length})</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomForm(!showCustomForm)}
                >
                  {showCustomForm ? "Hide" : "Show"} Details
                </Button>
              </div>

              {/* Bulk Assignment Controls */}
              <Card className="border-2 border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Quick Assign</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bulk update owner or sync source for selected metrics
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Bulk Owner Assignment */}
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
                          <SelectItem value="">All Categories</SelectItem>
                          <SelectItem value="Operations">Operations</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                          <SelectItem value="Clinical Outcomes">Clinical Outcomes</SelectItem>
                          <SelectItem value="Referrals">Referrals</SelectItem>
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
                          <Input value={metric.category} disabled />
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
            </div>
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
        </CardContent>
      </Card>

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
