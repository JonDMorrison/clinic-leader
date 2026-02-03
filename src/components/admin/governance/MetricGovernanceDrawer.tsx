/**
 * Drawer for editing metric governance settings:
 * - Definition (canonical description, unit, higher_is_better)
 * - Normalization rules
 * - Source policies
 * - Precedence overrides
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Layers, Database, GitBranch } from "lucide-react";
import { DefinitionEditor } from "./DefinitionEditor";
import { NormalizationRulesEditor } from "./NormalizationRulesEditor";
import { SourcePoliciesEditor } from "./SourcePoliciesEditor";
import { PrecedenceOverridesEditor } from "./PrecedenceOverridesEditor";

interface MetricGovernanceDrawerProps {
  metricId: string | null;
  organizationId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  canEdit: boolean;
}

export function MetricGovernanceDrawer({
  metricId,
  organizationId,
  open,
  onClose,
  onUpdate,
  canEdit,
}: MetricGovernanceDrawerProps) {
  const queryClient = useQueryClient();

  // Fetch metric details
  const { data: metric, isLoading: metricLoading } = useQuery({
    queryKey: ["governance-metric-detail", metricId],
    queryFn: async () => {
      if (!metricId) return null;

      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .eq("id", metricId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!metricId && open,
  });

  // Fetch definition
  const { data: definition, isLoading: defLoading } = useQuery({
    queryKey: ["metric-definition", metricId],
    queryFn: async () => {
      if (!metricId) return null;

      const { data, error } = await supabase
        .from("metric_definitions")
        .select("*")
        .eq("metric_id", metricId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!metricId && open,
  });

  // Fetch normalization rules
  const { data: normRules } = useQuery({
    queryKey: ["metric-normalization-rules", metricId],
    queryFn: async () => {
      if (!metricId) return [];

      const { data, error } = await supabase
        .from("metric_normalization_rules")
        .select("*")
        .eq("metric_id", metricId)
        .order("is_default", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!metricId && open,
  });

  // Fetch source policies
  const { data: sourcePolicies } = useQuery({
    queryKey: ["metric-source-policies", metricId],
    queryFn: async () => {
      if (!metricId) return [];

      const { data, error } = await supabase
        .from("metric_source_policies")
        .select("*")
        .eq("metric_id", metricId)
        .order("priority", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!metricId && open,
  });

  // Fetch precedence overrides
  const { data: overrides } = useQuery({
    queryKey: ["metric-precedence-overrides", metricId, organizationId],
    queryFn: async () => {
      if (!metricId || !organizationId) return [];

      const { data, error } = await supabase
        .from("metric_precedence_overrides")
        .select("*")
        .eq("metric_id", metricId)
        .eq("organization_id", organizationId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!metricId && !!organizationId && open,
  });

  const handleUpdateComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["governance-metric-detail", metricId] });
    queryClient.invalidateQueries({ queryKey: ["metric-definition", metricId] });
    queryClient.invalidateQueries({ queryKey: ["metric-normalization-rules", metricId] });
    queryClient.invalidateQueries({ queryKey: ["metric-source-policies", metricId] });
    queryClient.invalidateQueries({ queryKey: ["metric-precedence-overrides", metricId] });
    onUpdate();
  };

  const isLoading = metricLoading || defLoading;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {isLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <>
                <span>{metric?.name}</span>
                {!canEdit && (
                  <Badge variant="secondary" className="text-xs">
                    Read Only
                  </Badge>
                )}
              </>
            )}
          </SheetTitle>
          <SheetDescription>
            {isLoading ? (
              <Skeleton className="h-4 w-64" />
            ) : (
              <>
                <span className="font-mono text-xs">{metric?.import_key || "No import key"}</span>
                <span className="mx-2">•</span>
                <span>{metric?.category || "Uncategorized"}</span>
                <span className="mx-2">•</span>
                <span>{metric?.cadence || "weekly"}</span>
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="definition" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="definition" className="text-xs">
              <BookOpen className="w-3 h-3 mr-1" />
              Definition
            </TabsTrigger>
            <TabsTrigger value="normalization" className="text-xs">
              <Layers className="w-3 h-3 mr-1" />
              Normalize
            </TabsTrigger>
            <TabsTrigger value="sources" className="text-xs">
              <Database className="w-3 h-3 mr-1" />
              Sources
            </TabsTrigger>
            <TabsTrigger value="overrides" className="text-xs">
              <GitBranch className="w-3 h-3 mr-1" />
              Overrides
            </TabsTrigger>
          </TabsList>

          <TabsContent value="definition" className="mt-4">
            <DefinitionEditor
              metricId={metricId}
              definition={definition}
              metric={metric}
              canEdit={canEdit}
              onUpdate={handleUpdateComplete}
            />
          </TabsContent>

          <TabsContent value="normalization" className="mt-4">
            <NormalizationRulesEditor
              metricId={metricId}
              rules={normRules || []}
              canEdit={canEdit}
              onUpdate={handleUpdateComplete}
            />
          </TabsContent>

          <TabsContent value="sources" className="mt-4">
            <SourcePoliciesEditor
              metricId={metricId}
              policies={sourcePolicies || []}
              canEdit={canEdit}
              onUpdate={handleUpdateComplete}
            />
          </TabsContent>

          <TabsContent value="overrides" className="mt-4">
            <PrecedenceOverridesEditor
              metricId={metricId}
              organizationId={organizationId}
              overrides={overrides || []}
              sourcePolicies={sourcePolicies || []}
              canEdit={canEdit}
              onUpdate={handleUpdateComplete}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
