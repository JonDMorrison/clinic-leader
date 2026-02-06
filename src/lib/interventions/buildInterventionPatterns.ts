/**
 * Intervention Pattern Learning Engine
 * 
 * Analyzes historical intervention outcomes to build reusable templates.
 * Groups interventions by: metric, type, duration, owner role, success outcome.
 */

import { supabase } from "@/integrations/supabase/client";
import type { InterventionType } from "./types";

interface InterventionHistoryRecord {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  intervention_type: InterventionType;
  status: string;
  expected_time_horizon_days: number;
  created_at: string;
  tags: string[];
  metric_id: string;
  baseline_value: number | null;
  actual_delta_value: number | null;
  actual_delta_percent: number | null;
  confidence_score: number;
  evaluation_period_start: string;
  evaluation_period_end: string;
}

interface PatternGroup {
  metric_id: string;
  intervention_type: InterventionType;
  duration_bucket: string; // '30', '60', '90', '120+'
  interventions: InterventionHistoryRecord[];
}

interface ComputedPattern {
  intervention_type: InterventionType;
  metric_id: string;
  metric_name: string;
  sample_size: number;
  success_count: number;
  success_rate: number;
  median_improvement_percent: number;
  avg_improvement_percent: number;
  avg_time_to_result_days: number;
  typical_duration_days: number;
  common_actions: string[];
  intervention_ids: string[];
}

/**
 * Get duration bucket for grouping
 */
function getDurationBucket(days: number): string {
  if (days <= 30) return "30";
  if (days <= 60) return "60";
  if (days <= 90) return "90";
  return "120+";
}

/**
 * Calculate median of an array
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Fetch all completed interventions with outcomes for an organization
 * CRITICAL: Excludes synthetic data from pattern learning
 */
export async function fetchInterventionHistory(
  organizationId: string
): Promise<InterventionHistoryRecord[]> {
  const { data: interventions, error: intError } = await supabase
    .from("interventions")
    .select(`
      id, organization_id, title, description, intervention_type,
      status, expected_time_horizon_days, created_at, tags
    `)
    .eq("organization_id", organizationId)
    .eq("is_synthetic", false) // Exclude synthetic data from pattern learning
    .in("status", ["completed", "abandoned"]);

  if (intError) throw intError;
  if (!interventions || interventions.length === 0) return [];

  // Get outcomes for these interventions
  const interventionIds = interventions.map((i) => i.id);
  const { data: outcomes, error: outError } = await supabase
    .from("intervention_outcomes")
    .select(`
      intervention_id, metric_id, actual_delta_value, actual_delta_percent,
      confidence_score, evaluation_period_start, evaluation_period_end
    `)
    .in("intervention_id", interventionIds);

  if (outError) throw outError;

  // Get metric links for baseline values
  const { data: links, error: linkError } = await supabase
    .from("intervention_metric_links")
    .select("intervention_id, metric_id, baseline_value")
    .in("intervention_id", interventionIds);

  if (linkError) throw linkError;

  // Build baseline map
  const baselineMap = new Map<string, number | null>();
  (links || []).forEach((l) => {
    baselineMap.set(`${l.intervention_id}-${l.metric_id}`, l.baseline_value);
  });

  // Combine data
  const records: InterventionHistoryRecord[] = [];
  (outcomes || []).forEach((outcome) => {
    const intervention = interventions.find((i) => i.id === outcome.intervention_id);
    if (!intervention) return;

    records.push({
      id: intervention.id,
      organization_id: intervention.organization_id,
      title: intervention.title,
      description: intervention.description,
      intervention_type: intervention.intervention_type,
      status: intervention.status,
      expected_time_horizon_days: intervention.expected_time_horizon_days,
      created_at: intervention.created_at,
      tags: intervention.tags || [],
      metric_id: outcome.metric_id,
      baseline_value: baselineMap.get(`${intervention.id}-${outcome.metric_id}`) ?? null,
      actual_delta_value: outcome.actual_delta_value,
      actual_delta_percent: outcome.actual_delta_percent,
      confidence_score: outcome.confidence_score,
      evaluation_period_start: outcome.evaluation_period_start,
      evaluation_period_end: outcome.evaluation_period_end,
    });
  });

  return records;
}

/**
 * Group interventions by metric, type, and duration
 */
export function groupInterventions(records: InterventionHistoryRecord[]): PatternGroup[] {
  const groups = new Map<string, PatternGroup>();

  records.forEach((record) => {
    const durationBucket = getDurationBucket(record.expected_time_horizon_days);
    const key = `${record.metric_id}-${record.intervention_type}-${durationBucket}`;

    if (!groups.has(key)) {
      groups.set(key, {
        metric_id: record.metric_id,
        intervention_type: record.intervention_type,
        duration_bucket: durationBucket,
        interventions: [],
      });
    }
    groups.get(key)!.interventions.push(record);
  });

  return Array.from(groups.values());
}

/**
 * Compute pattern statistics from a group of interventions
 */
export function computePatternStats(
  group: PatternGroup,
  metricName: string
): ComputedPattern | null {
  const interventions = group.interventions;
  if (interventions.length < 2) return null; // Need at least 2 for a pattern

  // Determine success based on positive delta
  const successes = interventions.filter(
    (i) => i.actual_delta_value !== null && i.actual_delta_value > 0
  );
  const successRate = successes.length / interventions.length;

  // Calculate improvements (only from successful ones)
  const improvements = successes
    .map((i) => i.actual_delta_percent)
    .filter((v): v is number => v !== null);

  // Calculate time to result (from created_at to evaluation_period_end)
  const timesToResult = interventions.map((i) => {
    const start = new Date(i.created_at);
    const end = new Date(i.evaluation_period_end);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  });

  // Extract common tags/actions
  const tagCounts = new Map<string, number>();
  interventions.forEach((i) => {
    i.tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });
  const commonActions = Array.from(tagCounts.entries())
    .filter(([_, count]) => count >= Math.ceil(interventions.length / 2))
    .map(([tag]) => tag);

  // Determine typical duration from bucket
  const typicalDuration =
    group.duration_bucket === "120+"
      ? 120
      : parseInt(group.duration_bucket, 10);

  return {
    intervention_type: group.intervention_type,
    metric_id: group.metric_id,
    metric_name: metricName,
    sample_size: interventions.length,
    success_count: successes.length,
    success_rate: Math.round(successRate * 1000) / 1000,
    median_improvement_percent: median(improvements),
    avg_improvement_percent:
      improvements.length > 0
        ? improvements.reduce((a, b) => a + b, 0) / improvements.length
        : 0,
    avg_time_to_result_days:
      timesToResult.length > 0
        ? Math.round(timesToResult.reduce((a, b) => a + b, 0) / timesToResult.length)
        : typicalDuration,
    typical_duration_days: typicalDuration,
    common_actions: commonActions,
    intervention_ids: interventions.map((i) => i.id),
  };
}

/**
 * Build and store intervention templates from historical patterns
 */
export async function buildInterventionTemplates(
  organizationId: string
): Promise<{ created: number; updated: number; patterns: ComputedPattern[] }> {
  // Fetch history
  const history = await fetchInterventionHistory(organizationId);
  if (history.length === 0) {
    return { created: 0, updated: 0, patterns: [] };
  }

  // Get metric names
  const metricIds = [...new Set(history.map((h) => h.metric_id))];
  const { data: metrics } = await supabase
    .from("metrics")
    .select("id, name")
    .in("id", metricIds);
  const metricNames = new Map((metrics || []).map((m) => [m.id, m.name]));

  // Group and compute patterns
  const groups = groupInterventions(history);
  const patterns: ComputedPattern[] = [];

  for (const group of groups) {
    const pattern = computePatternStats(
      group,
      metricNames.get(group.metric_id) || "Unknown Metric"
    );
    if (pattern && pattern.sample_size >= 2) {
      patterns.push(pattern);
    }
  }

  // Upsert templates
  let created = 0;
  let updated = 0;

  for (const pattern of patterns) {
    const templateName = `${pattern.intervention_type} for ${pattern.metric_name}`;

    // Check if template exists
    const { data: existing } = await supabase
      .from("intervention_templates")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("intervention_type", pattern.intervention_type)
      .eq("metric_category", pattern.metric_id)
      .single();

    const templateData = {
      organization_id: organizationId,
      template_name: templateName,
      template_description: `Based on ${pattern.sample_size} historical interventions with ${Math.round(pattern.success_rate * 100)}% success rate.`,
      intervention_type: pattern.intervention_type,
      metric_category: pattern.metric_id,
      common_actions: pattern.common_actions,
      typical_duration_days: pattern.typical_duration_days,
      average_historical_success_rate: pattern.success_rate,
      historical_sample_size: pattern.sample_size,
      created_from_intervention_ids: pattern.intervention_ids,
    };

    if (existing) {
      await supabase
        .from("intervention_templates")
        .update(templateData)
        .eq("id", existing.id);
      updated++;
    } else {
      await supabase.from("intervention_templates").insert(templateData);
      created++;
    }
  }

  return { created, updated, patterns };
}

/**
 * Get templates relevant to a specific metric
 */
export async function getTemplatesForMetric(
  organizationId: string,
  metricId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from("intervention_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .or(`metric_category.eq.${metricId},metric_category.is.null`)
    .order("average_historical_success_rate", { ascending: false });

  if (error) throw error;
  return data || [];
}
