/**
 * Editor for metric_definitions table
 * Manages: canonical_name, canonical_description, unit, higher_is_better, default_period_type
 */

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus } from "lucide-react";

interface DefinitionEditorProps {
  metricId: string | null;
  definition: any | null;
  metric: any | null;
  canEdit: boolean;
  onUpdate: () => void;
}

const UNIT_OPTIONS = [
  { value: "count", label: "Count" },
  { value: "currency", label: "Currency ($)" },
  { value: "percent", label: "Percent (%)" },
  { value: "ratio", label: "Ratio" },
];

const PERIOD_OPTIONS = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

export function DefinitionEditor({
  metricId,
  definition,
  metric,
  canEdit,
  onUpdate,
}: DefinitionEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    canonical_name: "",
    canonical_description: "",
    unit: "count" as string,
    higher_is_better: true,
    default_period_type: "week" as string,
  });

  // Initialize form with existing data
  useEffect(() => {
    if (definition) {
      setFormData({
        canonical_name: definition.canonical_name || metric?.name || "",
        canonical_description: definition.canonical_description || "",
        unit: definition.unit || "count",
        higher_is_better: definition.higher_is_better ?? true,
        default_period_type: definition.default_period_type || "week",
      });
    } else if (metric) {
      setFormData({
        canonical_name: metric.name || "",
        canonical_description: "",
        unit: metric.unit === "$" ? "currency" : metric.unit === "%" ? "percent" : "count",
        higher_is_better: metric.direction !== "down",
        default_period_type: metric.cadence === "monthly" ? "month" : "week",
      });
    }
  }, [definition, metric]);

  const upsertMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!metricId) throw new Error("No metric ID");

      if (definition?.id) {
        // Update existing
        const { error } = await supabase
          .from("metric_definitions")
          .update({
            canonical_name: data.canonical_name,
            canonical_description: data.canonical_description,
            unit: data.unit,
            higher_is_better: data.higher_is_better,
            default_period_type: data.default_period_type,
            updated_at: new Date().toISOString(),
          })
          .eq("id", definition.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("metric_definitions")
          .insert({
            metric_id: metricId,
            canonical_name: data.canonical_name,
            canonical_description: data.canonical_description,
            unit: data.unit,
            higher_is_better: data.higher_is_better,
            default_period_type: data.default_period_type,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: definition ? "Definition updated" : "Definition created",
        description: "Metric definition saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["metric-definition", metricId] });
      onUpdate();
    },
    onError: (error) => {
      toast({
        title: "Error saving definition",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.canonical_name.trim()) {
      toast({
        title: "Validation error",
        description: "Canonical name is required.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.canonical_description.trim()) {
      toast({
        title: "Validation error",
        description: "Canonical description is required.",
        variant: "destructive",
      });
      return;
    }
    upsertMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Metric Definition</CardTitle>
        <CardDescription>
          Define the canonical meaning and measurement rules for this metric
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Canonical Name */}
          <div className="space-y-2">
            <Label htmlFor="canonical_name">Canonical Name</Label>
            <Input
              id="canonical_name"
              value={formData.canonical_name}
              onChange={(e) => setFormData({ ...formData, canonical_name: e.target.value })}
              placeholder="e.g., Total New Patients"
              disabled={!canEdit}
            />
          </div>

          {/* Canonical Description */}
          <div className="space-y-2">
            <Label htmlFor="canonical_description">Canonical Description</Label>
            <Textarea
              id="canonical_description"
              value={formData.canonical_description}
              onChange={(e) => setFormData({ ...formData, canonical_description: e.target.value })}
              placeholder="Describe exactly what this metric measures and how it should be calculated..."
              rows={3}
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">
              This description ensures consistent interpretation across all data sources
            </p>
          </div>

          {/* Unit Type */}
          <div className="space-y-2">
            <Label htmlFor="unit">Unit Type</Label>
            <Select
              value={formData.unit}
              onValueChange={(value) => setFormData({ ...formData, unit: value })}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Default Period Type */}
          <div className="space-y-2">
            <Label htmlFor="default_period_type">Default Period Type</Label>
            <Select
              value={formData.default_period_type}
              onValueChange={(value) => setFormData({ ...formData, default_period_type: value })}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Higher is Better */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Higher is Better</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, higher values indicate better performance
              </p>
            </div>
            <Switch
              checked={formData.higher_is_better}
              onCheckedChange={(checked) => setFormData({ ...formData, higher_is_better: checked })}
              disabled={!canEdit}
            />
          </div>

          {/* Submit Button */}
          {canEdit && (
            <Button type="submit" disabled={upsertMutation.isPending} className="w-full">
              {upsertMutation.isPending ? (
                "Saving..."
              ) : definition ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Definition
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Definition
                </>
              )}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
