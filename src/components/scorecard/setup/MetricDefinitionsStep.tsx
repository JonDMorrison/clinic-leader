import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Users, DollarSign, Activity, UserPlus } from "lucide-react";
import { MetricDefinition } from "@/pages/ScorecardSetup";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

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

  const togglePreset = (metricName: string, preset: PresetMetric) => {
    const newSelected = new Set(selectedPresets);
    
    if (newSelected.has(metricName)) {
      newSelected.delete(metricName);
      // Remove from metrics
      onMetricsChange(metrics.filter(m => m.name !== metricName));
    } else {
      newSelected.add(metricName);
      // Add to metrics with defaults
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
    onMetricsChange(metrics.filter((_, i) => i !== index));
  };

  const canProceed = metrics.length > 0 && metrics.every(m => m.name && m.category);

  return (
    <div className="space-y-6">
      <Card className="glass border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Let's pick what matters most to your clinic</CardTitle>
          <p className="text-muted-foreground">
            Select the metrics you want to track. We've prefilled targets based on industry standards
            {hasJaneIntegration && " and your Jane App data"}.
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
                            Target: {preset.target} {preset.unit} • {preset.direction === "up" ? "↑" : "↓"} Better
                            {hasJaneIntegration && " • Auto-synced from Jane"}
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
