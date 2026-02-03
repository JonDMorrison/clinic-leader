/**
 * Editor for metric_source_policies
 * Manages allowed sources, priority, and audit requirements
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, ShieldCheck, ShieldOff } from "lucide-react";

interface SourcePoliciesEditorProps {
  metricId: string | null;
  policies: any[];
  canEdit: boolean;
  onUpdate: () => void;
}

const AVAILABLE_SOURCES = [
  { value: "jane_pipe", label: "Jane Pipe (Automated)" },
  { value: "jane", label: "Jane (Legacy)" },
  { value: "legacy_workbook", label: "Legacy Workbook" },
  { value: "google_sheet", label: "Google Sheet" },
  { value: "monthly_upload", label: "Monthly Upload" },
  { value: "pdf_import", label: "PDF Import" },
  { value: "csv_import", label: "CSV Import" },
  { value: "manual", label: "Manual Entry" },
];

export function SourcePoliciesEditor({
  metricId,
  policies,
  canEdit,
  onUpdate,
}: SourcePoliciesEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newSource, setNewSource] = useState("");
  const [newPriority, setNewPriority] = useState(50);

  // Get sources not already configured
  const availableSourcesToAdd = AVAILABLE_SOURCES.filter(
    s => !policies.find(p => p.source === s.value)
  );

  const addPolicyMutation = useMutation({
    mutationFn: async () => {
      if (!metricId || !newSource) throw new Error("Missing data");

      const { error } = await supabase
        .from("metric_source_policies")
        .insert({
          metric_id: metricId,
          source: newSource,
          is_allowed: true,
          priority: newPriority,
          requires_audit_pass: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Source policy added" });
      queryClient.invalidateQueries({ queryKey: ["metric-source-policies", metricId] });
      setNewSource("");
      setNewPriority(50);
      onUpdate();
    },
    onError: (error) => {
      toast({ title: "Error", description: String(error), variant: "destructive" });
    },
  });

  const updatePolicyMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from("metric_source_policies")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Policy updated" });
      queryClient.invalidateQueries({ queryKey: ["metric-source-policies", metricId] });
      onUpdate();
    },
    onError: (error) => {
      toast({ title: "Error", description: String(error), variant: "destructive" });
    },
  });

  const deletePolicyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("metric_source_policies")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Policy deleted" });
      queryClient.invalidateQueries({ queryKey: ["metric-source-policies", metricId] });
      onUpdate();
    },
    onError: (error) => {
      toast({ title: "Error", description: String(error), variant: "destructive" });
    },
  });

  const getSourceLabel = (source: string) => {
    return AVAILABLE_SOURCES.find(s => s.value === source)?.label || source;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Source Policies</CardTitle>
        <CardDescription>
          Configure which data sources are allowed and their priority order (lower = higher priority)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Policies */}
        {policies.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No source policies configured. All sources will be allowed by default.
          </p>
        ) : (
          <div className="space-y-2">
            {policies.map(policy => (
              <div
                key={policy.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  policy.is_allowed ? "bg-muted/30" : "bg-destructive/10 border-destructive/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getSourceLabel(policy.source)}</span>
                      <Badge variant="outline" className="text-xs">
                        Priority: {policy.priority}
                      </Badge>
                      {policy.requires_audit_pass && (
                        <Badge variant="secondary" className="text-xs">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Audit Required
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {policy.source}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <>
                      {/* Priority Input */}
                      <Input
                        type="number"
                        value={policy.priority}
                        onChange={(e) => updatePolicyMutation.mutate({
                          id: policy.id,
                          updates: { priority: Number(e.target.value) },
                        })}
                        className="w-20 h-8 text-sm"
                        min={1}
                        max={100}
                      />
                      
                      {/* Audit Toggle */}
                      <Button
                        variant={policy.requires_audit_pass ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => updatePolicyMutation.mutate({
                          id: policy.id,
                          updates: { requires_audit_pass: !policy.requires_audit_pass },
                        })}
                        title={policy.requires_audit_pass ? "Audit required" : "No audit required"}
                      >
                        {policy.requires_audit_pass ? (
                          <ShieldCheck className="w-4 h-4" />
                        ) : (
                          <ShieldOff className="w-4 h-4" />
                        )}
                      </Button>

                      {/* Allowed Toggle */}
                      <Switch
                        checked={policy.is_allowed}
                        onCheckedChange={(checked) => updatePolicyMutation.mutate({
                          id: policy.id,
                          updates: { is_allowed: checked },
                        })}
                      />

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePolicyMutation.mutate(policy.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Policy */}
        {canEdit && availableSourcesToAdd.length > 0 && (
          <div className="border-t pt-4 mt-4 space-y-4">
            <h4 className="font-medium">Add Source Policy</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={newSource} onValueChange={setNewSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSourcesToAdd.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))
                    }
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority (1-100)</Label>
                <Input
                  type="number"
                  value={newPriority}
                  onChange={(e) => setNewPriority(Number(e.target.value))}
                  min={1}
                  max={100}
                />
              </div>
            </div>

            <Button
              onClick={() => addPolicyMutation.mutate()}
              disabled={!newSource || addPolicyMutation.isPending}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Source Policy
            </Button>
          </div>
        )}

        {/* Legend */}
        <div className="border-t pt-4 mt-4 text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3 h-3" />
            <span>Audit Required: Source must pass data audit before being used as canonical</span>
          </div>
          <div>
            <span className="font-medium">Priority:</span> Lower numbers = higher priority (chosen first)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
