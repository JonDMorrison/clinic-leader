/**
 * Editor for metric_normalization_rules
 * Manages normalization types, multipliers, rounding modes
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Star } from "lucide-react";

interface NormalizationRulesEditorProps {
  metricId: string | null;
  rules: any[];
  canEdit: boolean;
  onUpdate: () => void;
}

const NORMALIZATION_TYPES = [
  { value: "none", label: "None (Raw Value)" },
  { value: "per_provider", label: "Per Provider" },
  { value: "per_1000_visits", label: "Per 1,000 Visits" },
  { value: "per_new_patient", label: "Per New Patient" },
  { value: "per_patient_panel", label: "Per Patient Panel" },
];

const ROUNDING_MODES = [
  { value: "none", label: "No Rounding" },
  { value: "round", label: "Round" },
  { value: "floor", label: "Floor" },
  { value: "ceil", label: "Ceiling" },
];

export function NormalizationRulesEditor({
  metricId,
  rules,
  canEdit,
  onUpdate,
}: NormalizationRulesEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newRule, setNewRule] = useState({
    normalization_type: "none",
    multiplier: 1,
    rounding_mode: "none",
    decimals: 2,
    is_default: false,
  });

  const addRuleMutation = useMutation({
    mutationFn: async () => {
      if (!metricId) throw new Error("No metric ID");

      // If setting as default, unset other defaults first
      if (newRule.is_default) {
        await supabase
          .from("metric_normalization_rules")
          .update({ is_default: false })
          .eq("metric_id", metricId);
      }

      const { error } = await supabase
        .from("metric_normalization_rules")
        .insert({
          metric_id: metricId,
          normalization_type: newRule.normalization_type,
          multiplier: newRule.multiplier,
          rounding_mode: newRule.rounding_mode,
          decimals: newRule.decimals,
          is_default: newRule.is_default,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rule added", description: "Normalization rule created." });
      queryClient.invalidateQueries({ queryKey: ["metric-normalization-rules", metricId] });
      setNewRule({
        normalization_type: "none",
        multiplier: 1,
        rounding_mode: "none",
        decimals: 2,
        is_default: false,
      });
      onUpdate();
    },
    onError: (error) => {
      toast({ title: "Error", description: String(error), variant: "destructive" });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from("metric_normalization_rules")
        .delete()
        .eq("id", ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rule deleted" });
      queryClient.invalidateQueries({ queryKey: ["metric-normalization-rules", metricId] });
      onUpdate();
    },
    onError: (error) => {
      toast({ title: "Error", description: String(error), variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      if (!metricId) throw new Error("No metric ID");

      // Unset all defaults
      await supabase
        .from("metric_normalization_rules")
        .update({ is_default: false })
        .eq("metric_id", metricId);

      // Set this one as default
      const { error } = await supabase
        .from("metric_normalization_rules")
        .update({ is_default: true })
        .eq("id", ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Default updated" });
      queryClient.invalidateQueries({ queryKey: ["metric-normalization-rules", metricId] });
      onUpdate();
    },
    onError: (error) => {
      toast({ title: "Error", description: String(error), variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Normalization Rules</CardTitle>
        <CardDescription>
          Define how raw values should be normalized for comparison (e.g., per provider)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Rules */}
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No normalization rules configured. Raw values will be used.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.map(rule => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  {rule.is_default && (
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  )}
                  <div>
                    <div className="font-medium">
                      {NORMALIZATION_TYPES.find(t => t.value === rule.normalization_type)?.label || rule.normalization_type}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ×{rule.multiplier} • {rule.decimals} decimals • {rule.rounding_mode}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && !rule.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefaultMutation.mutate(rule.id)}
                      disabled={setDefaultMutation.isPending}
                    >
                      Set Default
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRuleMutation.mutate(rule.id)}
                      disabled={deleteRuleMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Rule */}
        {canEdit && (
          <div className="border-t pt-4 mt-4 space-y-4">
            <h4 className="font-medium">Add Rule</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Normalization Type</Label>
                <Select
                  value={newRule.normalization_type}
                  onValueChange={(v) => setNewRule({ ...newRule, normalization_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NORMALIZATION_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Multiplier</Label>
                <Input
                  type="number"
                  value={newRule.multiplier}
                  onChange={(e) => setNewRule({ ...newRule, multiplier: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Rounding Mode</Label>
                <Select
                  value={newRule.rounding_mode}
                  onValueChange={(v) => setNewRule({ ...newRule, rounding_mode: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUNDING_MODES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Decimal Places</Label>
                <Input
                  type="number"
                  min={0}
                  max={6}
                  value={newRule.decimals}
                  onChange={(e) => setNewRule({ ...newRule, decimals: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_default"
                checked={newRule.is_default}
                onCheckedChange={(checked) => setNewRule({ ...newRule, is_default: checked })}
              />
              <Label htmlFor="is_default">Set as default normalization</Label>
            </div>

            <Button
              onClick={() => addRuleMutation.mutate()}
              disabled={addRuleMutation.isPending}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Normalization Rule
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
