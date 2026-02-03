/**
 * Failed Intervention Detection Helper
 * Detects interventions that have clearly failed and creates issues for them
 */

import { supabase } from "@/integrations/supabase/client";
import { getInterventionProgress } from "./interventionStatus";

export interface FailedIntervention {
  id: string;
  title: string;
  organization_id: string;
  intervention_type: string;
  created_at: string;
  expected_time_horizon_days: number;
  owner_user_id: string | null;
  metric_id: string;
  metric_name: string;
  baseline_value: number;
  actual_delta_value: number;
  actual_delta_percent: number;
  evaluation_period_start: string;
  evaluation_period_end: string;
  evaluated_at: string;
}

export interface DetectionResult {
  failed_interventions: FailedIntervention[];
  already_have_issues: string[]; // intervention IDs that already have issues
}

/**
 * Detect interventions that have failed:
 * - Overdue (past time horizon)
 * - Have been evaluated (have outcomes)
 * - Have negative or zero delta
 * 
 * Does NOT include:
 * - Interventions with no data
 * - Interventions that haven't been evaluated
 * - Interventions with positive outcomes
 */
export async function detectFailedInterventions(
  organizationId: string
): Promise<DetectionResult> {
  const now = new Date();

  // Fetch all active/planned interventions for the org
  const { data: interventions, error: interventionsError } = await supabase
    .from("interventions")
    .select("id, title, organization_id, intervention_type, created_at, expected_time_horizon_days, owner_user_id, status")
    .eq("organization_id", organizationId)
    .in("status", ["active", "planned"]);

  if (interventionsError) throw interventionsError;
  if (!interventions || interventions.length === 0) {
    return { failed_interventions: [], already_have_issues: [] };
  }

  const interventionIds = interventions.map((i) => i.id);

  // Fetch all outcomes for these interventions - we need evaluated ones with negative/zero delta
  const { data: outcomes, error: outcomesError } = await supabase
    .from("intervention_outcomes")
    .select(`
      intervention_id,
      metric_id,
      actual_delta_value,
      actual_delta_percent,
      evaluation_period_start,
      evaluation_period_end,
      evaluated_at
    `)
    .in("intervention_id", interventionIds)
    .not("actual_delta_value", "is", null); // Must have been evaluated with actual data

  if (outcomesError) throw outcomesError;

  // Get metric names for the outcomes
  const metricIds = [...new Set((outcomes || []).map((o) => o.metric_id))];
  let metricsMap = new Map<string, string>();

  if (metricIds.length > 0) {
    const { data: metrics } = await supabase
      .from("metrics")
      .select("id, name")
      .in("id", metricIds);
    metricsMap = new Map((metrics || []).map((m) => [m.id, m.name]));
  }

  // Get baseline values from links
  const { data: links } = await supabase
    .from("intervention_metric_links")
    .select("intervention_id, metric_id, baseline_value")
    .in("intervention_id", interventionIds);

  const baselineMap = new Map<string, number>();
  (links || []).forEach((l) => {
    if (l.baseline_value !== null) {
      baselineMap.set(`${l.intervention_id}-${l.metric_id}`, l.baseline_value);
    }
  });

  // Check which interventions already have issues
  const { data: existingIssues } = await supabase
    .from("issues")
    .select("intervention_id")
    .in("intervention_id", interventionIds)
    .not("intervention_id", "is", null);

  const alreadyHaveIssues = new Set((existingIssues || []).map((i) => i.intervention_id));

  // Find failed interventions
  const failedInterventions: FailedIntervention[] = [];

  for (const intervention of interventions) {
    // Check if overdue
    const progress = getInterventionProgress({
      intervention: {
        created_at: intervention.created_at,
        expected_time_horizon_days: intervention.expected_time_horizon_days,
        status: intervention.status,
      },
      outcomes: [],
      now,
    });

    // Must be overdue (past time horizon)
    if (progress.days_remaining > 0) continue;

    // Find outcomes for this intervention with negative or zero delta
    const interventionOutcomes = (outcomes || []).filter(
      (o) => o.intervention_id === intervention.id && 
             o.actual_delta_value !== null &&
             o.actual_delta_value <= 0
    );

    // Skip if no failed outcomes
    if (interventionOutcomes.length === 0) continue;

    // Create a failed intervention entry for each failed outcome metric
    for (const outcome of interventionOutcomes) {
      const baselineValue = baselineMap.get(`${intervention.id}-${outcome.metric_id}`);
      if (baselineValue === undefined) continue; // Skip if no baseline

      failedInterventions.push({
        id: intervention.id,
        title: intervention.title,
        organization_id: intervention.organization_id,
        intervention_type: intervention.intervention_type,
        created_at: intervention.created_at,
        expected_time_horizon_days: intervention.expected_time_horizon_days,
        owner_user_id: intervention.owner_user_id,
        metric_id: outcome.metric_id,
        metric_name: metricsMap.get(outcome.metric_id) || "Unknown metric",
        baseline_value: baselineValue,
        actual_delta_value: outcome.actual_delta_value!,
        actual_delta_percent: outcome.actual_delta_percent ?? 0,
        evaluation_period_start: outcome.evaluation_period_start,
        evaluation_period_end: outcome.evaluation_period_end,
        evaluated_at: outcome.evaluated_at,
      });
    }
  }

  return {
    failed_interventions: failedInterventions,
    already_have_issues: Array.from(alreadyHaveIssues),
  };
}

/**
 * Create an issue from a failed intervention
 * Returns the created issue ID or null if issue already exists
 */
export async function createIssueFromFailedIntervention(
  failedIntervention: FailedIntervention
): Promise<string | null> {
  // Check if issue already exists for this intervention
  const { data: existingIssue } = await supabase
    .from("issues")
    .select("id")
    .eq("intervention_id", failedIntervention.id)
    .limit(1)
    .single();

  if (existingIssue) {
    return null; // Issue already exists
  }

  const currentValue = failedIntervention.baseline_value + failedIntervention.actual_delta_value;
  const deltaSign = failedIntervention.actual_delta_value <= 0 ? "" : "+";

  const description = `
**Intervention Failed**

This issue was auto-created because the intervention "${failedIntervention.title}" did not achieve its expected outcome.

**Metric:** ${failedIntervention.metric_name}
**Baseline:** ${failedIntervention.baseline_value.toLocaleString()}
**Current:** ${currentValue.toLocaleString()}
**Delta:** ${deltaSign}${failedIntervention.actual_delta_value.toLocaleString()} (${deltaSign}${failedIntervention.actual_delta_percent.toFixed(1)}%)

**Evaluation Period:** ${failedIntervention.evaluation_period_start} to ${failedIntervention.evaluation_period_end}

Consider discussing next steps in your L10 meeting.
`.trim();

  const { data: newIssue, error } = await supabase
    .from("issues")
    .insert({
      title: `Intervention failed: ${failedIntervention.title}`,
      context: description,
      organization_id: failedIntervention.organization_id,
      owner_id: failedIntervention.owner_user_id,
      priority: 2, // High priority
      status: "open",
      created_from: "intervention_outcome",
      intervention_id: failedIntervention.id,
      metric_id: failedIntervention.metric_id,
      meeting_horizon: "weekly", // Default to weekly L10
    })
    .select("id")
    .single();

  if (error) throw error;
  return newIssue?.id || null;
}

/**
 * Process all failed interventions and create issues for those without existing issues
 * Returns count of issues created
 */
export async function processFailedInterventions(
  organizationId: string
): Promise<{ created: number; skipped: number }> {
  const detection = await detectFailedInterventions(organizationId);
  
  let created = 0;
  let skipped = 0;

  for (const failed of detection.failed_interventions) {
    // Skip if already has an issue
    if (detection.already_have_issues.includes(failed.id)) {
      skipped++;
      continue;
    }

    try {
      const issueId = await createIssueFromFailedIntervention(failed);
      if (issueId) {
        created++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Failed to create issue for intervention ${failed.id}:`, error);
      skipped++;
    }
  }

  return { created, skipped };
}
