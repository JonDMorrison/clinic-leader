/**
 * Intervention Meeting Signals Helper
 * Computes interventions that need attention for meeting agendas
 */

import { supabase } from "@/integrations/supabase/client";
import { getInterventionProgress, type InterventionProgress } from "./interventionStatus";
import { subDays } from "date-fns";

export interface InterventionSignal {
  id: string;
  title: string;
  intervention_type: string;
  status: string;
  progress: InterventionProgress;
  primaryMetricName?: string;
  deltaPercent?: number;
}

export interface InterventionMeetingSignals {
  overdue_interventions: InterventionSignal[];
  at_risk_interventions: InterventionSignal[];
  newly_successful_interventions: InterventionSignal[];
}

/**
 * Get intervention signals for meeting agenda population
 * 
 * Rules:
 * - overdue: horizon passed, no outcomes
 * - at_risk: <14 days remaining, no positive delta
 * - newly_successful: outcome evaluated with positive delta in last 30 days
 */
export async function getInterventionMeetingSignals(
  organizationId: string
): Promise<InterventionMeetingSignals> {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);

  // Fetch all active interventions for the org
  // Exclude synthetic data from production meeting signals
  const { data: interventions, error: interventionsError } = await supabase
    .from("interventions")
    .select("id, title, intervention_type, status, created_at, expected_time_horizon_days")
    .eq("organization_id", organizationId)
    .eq("is_synthetic", false)
    .in("status", ["active", "planned"]); // Only non-terminal interventions

  if (interventionsError) throw interventionsError;
  if (!interventions || interventions.length === 0) {
    return {
      overdue_interventions: [],
      at_risk_interventions: [],
      newly_successful_interventions: [],
    };
  }

  const interventionIds = interventions.map((i) => i.id);

  // Fetch all outcomes for these interventions
  const { data: outcomes, error: outcomesError } = await supabase
    .from("intervention_outcomes")
    .select("intervention_id, metric_id, actual_delta_value, actual_delta_percent, evaluated_at")
    .in("intervention_id", interventionIds);

  if (outcomesError) throw outcomesError;

  // Group outcomes by intervention
  const outcomesMap = new Map<
    string,
    { actual_delta_value: number | null; actual_delta_percent: number | null; evaluated_at: string }[]
  >();
  (outcomes || []).forEach((o) => {
    const existing = outcomesMap.get(o.intervention_id) || [];
    existing.push({
      actual_delta_value: o.actual_delta_value,
      actual_delta_percent: o.actual_delta_percent,
      evaluated_at: o.evaluated_at,
    });
    outcomesMap.set(o.intervention_id, existing);
  });

  // Fetch linked metrics for primary metric name
  const { data: links, error: linksError } = await supabase
    .from("intervention_metric_links")
    .select("intervention_id, metric_id")
    .in("intervention_id", interventionIds);

  if (linksError) throw linksError;

  // Get metric names
  const metricIds = [...new Set((links || []).map((l) => l.metric_id))];
  let metricsMap = new Map<string, string>();

  if (metricIds.length > 0) {
    const { data: metrics } = await supabase
      .from("metrics")
      .select("id, name")
      .in("id", metricIds);

    metricsMap = new Map((metrics || []).map((m) => [m.id, m.name]));
  }

  // Map intervention to primary metric name
  const interventionMetricMap = new Map<string, string>();
  (links || []).forEach((l) => {
    if (!interventionMetricMap.has(l.intervention_id)) {
      const metricName = metricsMap.get(l.metric_id);
      if (metricName) {
        interventionMetricMap.set(l.intervention_id, metricName);
      }
    }
  });

  // Classify interventions
  const overdueInterventions: InterventionSignal[] = [];
  const atRiskInterventions: InterventionSignal[] = [];
  const newlySuccessfulInterventions: InterventionSignal[] = [];

  for (const intervention of interventions) {
    const interventionOutcomes = outcomesMap.get(intervention.id) || [];
    const progress = getInterventionProgress({
      intervention: {
        created_at: intervention.created_at,
        expected_time_horizon_days: intervention.expected_time_horizon_days,
        status: intervention.status,
      },
      outcomes: interventionOutcomes,
      now,
    });

    const signal: InterventionSignal = {
      id: intervention.id,
      title: intervention.title,
      intervention_type: intervention.intervention_type,
      status: intervention.status,
      progress,
      primaryMetricName: interventionMetricMap.get(intervention.id),
    };

    // Check for overdue
    if (progress.status === "overdue") {
      overdueInterventions.push(signal);
      continue;
    }

    // Check for at-risk
    if (progress.status === "at_risk") {
      atRiskInterventions.push(signal);
      continue;
    }

    // Check for newly successful (positive delta evaluated in last 30 days)
    const recentPositiveOutcome = interventionOutcomes.find((o) => {
      const evaluatedAt = new Date(o.evaluated_at);
      const isRecent = evaluatedAt >= thirtyDaysAgo;
      const isPositive = o.actual_delta_percent !== null && o.actual_delta_percent > 0;
      return isRecent && isPositive;
    });

    if (recentPositiveOutcome) {
      signal.deltaPercent = recentPositiveOutcome.actual_delta_percent ?? undefined;
      newlySuccessfulInterventions.push(signal);
    }
  }

  // Sort by urgency
  overdueInterventions.sort((a, b) => a.progress.days_remaining - b.progress.days_remaining);
  atRiskInterventions.sort((a, b) => a.progress.days_remaining - b.progress.days_remaining);
  newlySuccessfulInterventions.sort((a, b) => (b.deltaPercent || 0) - (a.deltaPercent || 0));

  return {
    overdue_interventions: overdueInterventions.slice(0, 5),
    at_risk_interventions: atRiskInterventions.slice(0, 5),
    newly_successful_interventions: newlySuccessfulInterventions.slice(0, 3),
  };
}
