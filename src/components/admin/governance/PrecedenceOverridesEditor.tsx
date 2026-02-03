/**
 * Editor for metric_precedence_overrides
 * Allows org-specific source preferences per period type
 */

import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, User, Calendar } from "lucide-react";
import { format } from "date-fns";

interface PrecedenceOverridesEditorProps {
  metricId: string | null;
  organizationId: string | null;
  overrides: any[];
  sourcePolicies: any[];
  canEdit: boolean;
  onUpdate: () => void;
}

const PERIOD_TYPES = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

export function PrecedenceOverridesEditor({
  metricId,
  organizationId,
  overrides,
  sourcePolicies,
  canEdit,
  onUpdate,
}: PrecedenceOverridesEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newOverride, setNewOverride] = useState({
    period_type: "",
    source: "",
    reason: "",
  });

  // Fetch user names for created_by display
  const creatorIds = overrides.map(o => o.created_by).filter(Boolean);
  const { data: creators } = useQuery({
    queryKey: ["override-creators", creatorIds],
    queryFn: async () => {
      if (creatorIds.length === 0) return {};

      const { data } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", creatorIds);

      return (data || []).reduce((acc, u) => {
        acc[u.id] = u.full_name;
        return acc;
      }, {} as Record<string, string>);
    },
    enabled: creatorIds.length > 0,
  });

  // Get available sources from policies
  const availableSources = sourcePolicies
    .filter(p => p.is_allowed)
    .map(p => ({ value: p.source, label: p.source }));

  // Get period types not already overridden
  const usedPeriodTypes = new Set(overrides.map(o => o.period_type));
  const availablePeriodTypes = PERIOD_TYPES.filter(pt => !usedPeriodTypes.has(pt.value));

  const addOverrideMutation = useMutation({
    mutationFn: async () => {
      if (!metricId || !organizationId) throw new Error("Missing data");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("metric_precedence_overrides")
        .insert({
          organization_id: organizationId,
          metric_id: metricId,
          period_type: newOverride.period_type,
          source: newOverride.source,
          reason: newOverride.reason,
          created_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Override created", description: "Source precedence override saved." });
      queryClient.invalidateQueries({ queryKey: ["metric-precedence-overrides", metricId] });
      setNewOverride({ period_type: "", source: "", reason: "" });
      onUpdate();
    },
    onError: (error) => {
      toast({ title: "Error", description: String(error), variant: "destructive" });
    },
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("metric_precedence_overrides")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Override deleted" });
      queryClient.invalidateQueries({ queryKey: ["metric-precedence-overrides", metricId] });
      onUpdate();
    },
    onError: (error) => {
      toast({ title: "Error", description: String(error), variant: "destructive" });
    },
  });

  const canAddOverride = newOverride.period_type && newOverride.source && newOverride.reason.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Precedence Overrides</CardTitle>
        <CardDescription>
          Override the default source selection for this metric in your organization.
          This forces a specific source to be used regardless of priority.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Overrides */}
        {overrides.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No precedence overrides. Standard source priority will be used.
          </p>
        ) : (
          <div className="space-y-2">
            {overrides.map(override => (
              <div
                key={override.id}
                className="p-4 rounded-lg border bg-muted/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {PERIOD_TYPES.find(pt => pt.value === override.period_type)?.label || override.period_type}
                    </Badge>
                    <span className="text-lg">→</span>
                    <Badge variant="secondary" className="font-mono">
                      {override.source}
                    </Badge>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteOverrideMutation.mutate(override.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Reason:</span> {override.reason}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{creators?.[override.created_by] || "Unknown"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(override.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Override */}
        {canEdit && availablePeriodTypes.length > 0 && availableSources.length > 0 && (
          <div className="border-t pt-4 mt-4 space-y-4">
            <h4 className="font-medium">Add Override</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Type</Label>
                <Select
                  value={newOverride.period_type}
                  onValueChange={(v) => setNewOverride({ ...newOverride, period_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select period..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePeriodTypes.map(pt => (
                      <SelectItem key={pt.value} value={pt.value}>
                        {pt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preferred Source</Label>
                <Select
                  value={newOverride.source}
                  onValueChange={(v) => setNewOverride({ ...newOverride, source: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSources.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <Textarea
                value={newOverride.reason}
                onChange={(e) => setNewOverride({ ...newOverride, reason: e.target.value })}
                placeholder="Explain why this source should be preferred..."
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                This reason will be recorded in the audit log when canonical values are computed.
              </p>
            </div>

            <Button
              onClick={() => addOverrideMutation.mutate()}
              disabled={!canAddOverride || addOverrideMutation.isPending}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Override
            </Button>
          </div>
        )}

        {availablePeriodTypes.length === 0 && overrides.length > 0 && (
          <p className="text-sm text-muted-foreground italic border-t pt-4">
            All period types have overrides configured.
          </p>
        )}

        {availableSources.length === 0 && (
          <p className="text-sm text-warning italic border-t pt-4">
            No allowed sources configured. Add source policies first.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
