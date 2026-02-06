/**
 * Consolidated Intervention Data Loader
 * Prevents N+1 queries by batching all related data in a single load
 */

import { supabase } from "@/integrations/supabase/client";
import type { InterventionRow, InterventionMetricLinkRow, InterventionOutcomeRow } from "./types";

export interface MetricInfo {
  id: string;
  name: string;
  unit: string | null;
  direction: string | null;
}

export interface MetricResult {
  metric_id: string;
  period_start: string;
  value: number;
  period_type: string;
}

export interface LinkedIssue {
  id: string;
  title: string;
  status: string;
  created_at: string;
  created_from: string | null;
}

export interface MeetingReference {
  id: string;
  title: string | null;
  item_type: string;
  meeting_id: string;
  meeting?: {
    id: string;
    title: string | null;
    scheduled_at: string | null;
  };
}

export interface UserInfo {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface InterventionFullData {
  intervention: InterventionRow | null;
  linkedMetrics: (InterventionMetricLinkRow & { metric: MetricInfo | null })[];
  outcomes: (InterventionOutcomeRow & { 
    metric: MetricInfo | null;
    baseline_value: number | null;
    current_value: number | null;
  })[];
  metricResults: MetricResult[];
  linkedIssues: LinkedIssue[];
  meetingReferences: MeetingReference[];
  owner: UserInfo | null;
  creator: UserInfo | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Load all intervention-related data in batched queries
 */
export async function loadInterventionFull(interventionId: string): Promise<InterventionFullData> {
  const result: InterventionFullData = {
    intervention: null,
    linkedMetrics: [],
    outcomes: [],
    metricResults: [],
    linkedIssues: [],
    meetingReferences: [],
    owner: null,
    creator: null,
    loading: false,
    error: null,
  };

  try {
    // Batch 1: Core intervention data
    const { data: intervention, error: interventionError } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", interventionId)
      .single();

    if (interventionError) throw interventionError;
    if (!intervention) {
      result.error = new Error("Intervention not found");
      return result;
    }

    result.intervention = intervention;

    // Batch 2: All related data in parallel
    const [
      linksResult,
      outcomesResult,
      issuesResult,
      meetingItemsResult,
    ] = await Promise.all([
      // Metric links
      supabase
        .from("intervention_metric_links")
        .select("*")
        .eq("intervention_id", interventionId),
      
      // Outcomes
      supabase
        .from("intervention_outcomes")
        .select("*")
        .eq("intervention_id", interventionId)
        .order("evaluated_at", { ascending: false }),
      
      // Linked issues
      supabase
        .from("issues")
        .select("id, title, status, created_at, created_from")
        .eq("intervention_id", interventionId)
        .order("created_at", { ascending: false }),
      
      // Meeting references
      supabase
        .from("meeting_items")
        .select(`
          id, title, item_type, meeting_id,
          meetings!meeting_items_meeting_id_fkey(id, title, scheduled_at)
        `)
        .or(`linked_intervention_id.eq.${interventionId}`),
    ]);

    if (linksResult.error) throw linksResult.error;
    if (outcomesResult.error) throw outcomesResult.error;
    if (issuesResult.error) throw issuesResult.error;
    // meeting_items error is non-fatal

    const links = linksResult.data || [];
    const outcomes = outcomesResult.data || [];
    result.linkedIssues = issuesResult.data || [];
    result.meetingReferences = (meetingItemsResult.data || []).map(item => ({
      id: item.id,
      title: item.title,
      item_type: item.item_type,
      meeting_id: item.meeting_id,
      meeting: Array.isArray(item.meetings) ? item.meetings[0] : item.meetings,
    }));

    // Batch 3: Get all unique metric IDs and fetch metric details + results
    const metricIds = [
      ...new Set([
        ...links.map((l) => l.metric_id),
        ...outcomes.map((o) => o.metric_id),
      ]),
    ];

    if (metricIds.length > 0) {
      const [metricsResult, resultsResult] = await Promise.all([
        supabase
          .from("metrics")
          .select("id, name, unit, direction")
          .in("id", metricIds),
        
        supabase
          .from("metric_results")
          .select("metric_id, period_start, value, period_type")
          .in("metric_id", metricIds)
          .eq("period_type", "monthly")
          .order("period_start", { ascending: true }),
      ]);

      const metricsMap = new Map(
        (metricsResult.data || []).map((m) => [m.id, m])
      );

      result.metricResults = resultsResult.data || [];

      // Build baseline map from links
      const baselineMap = new Map<string, number | null>();
      links.forEach((l) => {
        baselineMap.set(l.metric_id, l.baseline_value);
      });

      // Enrich links with metric info
      result.linkedMetrics = links.map((link) => ({
        ...link,
        metric: metricsMap.get(link.metric_id) || null,
      }));

      // Enrich outcomes with metric info and computed values
      result.outcomes = outcomes.map((outcome) => {
        const baselineValue = baselineMap.get(outcome.metric_id) ?? null;
        const currentValue =
          baselineValue !== null && outcome.actual_delta_value !== null
            ? baselineValue + outcome.actual_delta_value
            : null;

        return {
          ...outcome,
          metric: metricsMap.get(outcome.metric_id) || null,
          baseline_value: baselineValue,
          current_value: currentValue,
        };
      });
    }

    // Batch 4: User info (owner and creator)
    const userIds = [
      intervention.owner_user_id,
      intervention.created_by,
    ].filter(Boolean) as string[];

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const usersMap = new Map((users || []).map((u) => [u.id, u]));
      result.owner = intervention.owner_user_id
        ? usersMap.get(intervention.owner_user_id) || null
        : null;
      result.creator = usersMap.get(intervention.created_by) || null;
    }

    return result;
  } catch (error) {
    result.error = error as Error;
    return result;
  }
}

/**
 * Load interventions list with summary counts (for list view)
 * Note: This includes all interventions for display purposes but synthetic
 * data is clearly labeled in UI and excluded from learning pipelines
 */
export async function loadInterventionsList(organizationId: string) {
  const { data: interventions, error } = await supabase
    .from("interventions")
    .select(`
      *,
      intervention_metric_links(count),
      intervention_outcomes(count)
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Get owners in a single batch
  const ownerIds = [
    ...new Set(
      (interventions || [])
        .map((i) => i.owner_user_id)
        .filter(Boolean) as string[]
    ),
  ];

  let ownersMap = new Map<string, UserInfo>();
  if (ownerIds.length > 0) {
    const { data: owners } = await supabase
      .from("users")
      .select("id, full_name, avatar_url")
      .in("id", ownerIds);
    ownersMap = new Map((owners || []).map((o) => [o.id, o]));
  }

  return (interventions || []).map((intervention) => ({
    ...intervention,
    owner: intervention.owner_user_id
      ? ownersMap.get(intervention.owner_user_id) || null
      : null,
    linked_metrics_count: (intervention as any).intervention_metric_links?.[0]?.count ?? 0,
    outcomes_count: (intervention as any).intervention_outcomes?.[0]?.count ?? 0,
  }));
}
