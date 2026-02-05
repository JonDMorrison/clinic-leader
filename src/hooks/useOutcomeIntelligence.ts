/**
 * Hook for fetching intervention outcome intelligence data
 * 
 * Aggregates data from multiple tables for the OutcomeIntelligenceCard
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OutcomeIntelligenceData } from "@/components/interventions/OutcomeIntelligenceCard";
import type { OutcomeClassification } from "@/lib/interventions/outcomeClassification";
import { classifyOutcome } from "@/lib/interventions/outcomeClassification";

export type OutcomeSortField = "confidence" | "impact" | "recency";
export type OutcomeFilterType = OutcomeClassification | "all";

interface UseOutcomeIntelligenceOptions {
  organizationId: string | undefined;
  interventionId?: string; // Optional: filter to single intervention
  metricId?: string; // Optional: filter to interventions affecting this metric
  filter?: OutcomeFilterType;
  sortBy?: OutcomeSortField;
  limit?: number;
  enabled?: boolean;
}

export function useOutcomeIntelligence({
  organizationId,
  interventionId,
  metricId,
  filter = "all",
  sortBy = "recency",
  limit = 20,
  enabled = true,
}: UseOutcomeIntelligenceOptions) {
  return useQuery<OutcomeIntelligenceData[]>({
    queryKey: ["outcome-intelligence", organizationId, interventionId, metricId, filter, sortBy, limit],
    queryFn: async () => {
      if (!organizationId) return [];

      // Base intervention query
      let interventionQuery = supabase
        .from("interventions")
        .select(`
          id,
          title,
          status,
          intervention_type,
          execution_health_score
        `)
        .eq("organization_id", organizationId);

      if (interventionId) {
        interventionQuery = interventionQuery.eq("id", interventionId);
      }

      const { data: interventions, error: intError } = await interventionQuery;
      if (intError) throw intError;
      if (!interventions?.length) return [];

      const interventionIds = interventions.map((i) => i.id);

      // Fetch outcomes
      const { data: outcomes, error: outError } = await supabase
        .from("intervention_outcomes")
        .select(`
          intervention_id,
          metric_id,
          actual_delta_percent,
          confidence_score,
          ai_summary,
          evaluated_at
        `)
        .in("intervention_id", interventionIds)
        .order("evaluated_at", { ascending: false });

      if (outError) throw outError;

      // Fetch metric links with baseline quality
      let linksQuery = supabase
        .from("intervention_metric_links")
        .select(`
          intervention_id,
          metric_id,
          expected_direction,
          baseline_quality_flag,
          metrics:metric_id(id, name)
        `)
        .in("intervention_id", interventionIds);

      if (metricId) {
        linksQuery = linksQuery.eq("metric_id", metricId);
      }

      const { data: links, error: linksError } = await linksQuery;
      if (linksError) throw linksError;

      // If filtering by metric and no links found, return empty
      if (metricId && (!links || links.length === 0)) {
        return [];
      }

      // Build lookup maps
      const outcomesMap = new Map<string, {
        actualDeltaPercent: number | null;
        confidenceScore: number | null;
        aiSummary: string | null;
        evaluatedAt: string | null;
      }>();
      (outcomes || []).forEach((o) => {
        // Use first (most recent) outcome per intervention
        if (!outcomesMap.has(o.intervention_id)) {
          outcomesMap.set(o.intervention_id, {
            actualDeltaPercent: o.actual_delta_percent,
            confidenceScore: o.confidence_score,
            aiSummary: o.ai_summary,
            evaluatedAt: o.evaluated_at,
          });
        }
      });

      const linksMap = new Map<string, {
        metricId: string | null;
        metricName: string | null;
        expectedDirection: string | null;
        baselineQualityFlag: string | null;
      }>();
      (links || []).forEach((l) => {
        // Use first link per intervention
        if (!linksMap.has(l.intervention_id)) {
          const metric = l.metrics as any;
          linksMap.set(l.intervention_id, {
            metricId: l.metric_id,
            metricName: metric?.name || null,
            expectedDirection: l.expected_direction,
            baselineQualityFlag: l.baseline_quality_flag,
          });
        }
      });

      // Build result data
      let results: OutcomeIntelligenceData[] = interventions.map((intervention) => {
        const outcome = outcomesMap.get(intervention.id);
        const link = linksMap.get(intervention.id);

        return {
          interventionId: intervention.id,
          interventionTitle: intervention.title,
          interventionStatus: intervention.status,
          interventionType: intervention.intervention_type,
          metricName: link?.metricName || null,
          metricId: link?.metricId || null,
          expectedDirection: link?.expectedDirection || null,
          actualDeltaPercent: outcome?.actualDeltaPercent ?? null,
          confidenceScore: outcome?.confidenceScore ?? null,
          executionHealthScore: intervention.execution_health_score,
          baselineQualityFlag: (link?.baselineQualityFlag as any) || null,
          aiSummary: outcome?.aiSummary || null,
          evaluatedAt: outcome?.evaluatedAt || null,
        };
      });

      // Filter by classification if needed
      if (filter !== "all") {
        results = results.filter((r) => {
          const classification = classifyOutcome({
            actualDeltaPercent: r.actualDeltaPercent,
            confidenceScore: r.confidenceScore,
            interventionStatus: r.interventionStatus,
            expectedDirection: r.expectedDirection,
          });
          return classification.classification === filter;
        });
      }

      // Sort
      results.sort((a, b) => {
        switch (sortBy) {
          case "confidence":
            return (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0);
          case "impact":
            return Math.abs(b.actualDeltaPercent ?? 0) - Math.abs(a.actualDeltaPercent ?? 0);
          case "recency":
          default:
            if (!a.evaluatedAt && !b.evaluatedAt) return 0;
            if (!a.evaluatedAt) return 1;
            if (!b.evaluatedAt) return -1;
            return new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime();
        }
      });

      return results.slice(0, limit);
    },
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
