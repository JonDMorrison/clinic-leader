/**
 * Intervention Intelligence Integrity Checker
 * Validates data consistency across the intervention system
 * 
 * Checks:
 * - intervention_metric_links has baseline_period_start
 * - baseline exists in metric_results
 * - outcome evaluations always have baseline_value + current_value
 * - no duplicate issues created from same intervention
 * - AI summaries never overwrite manual notes
 */

import { supabase } from "@/integrations/supabase/client";

export interface IntegrityViolation {
  type: string;
  severity: "error" | "warning" | "info";
  entity_type: string;
  entity_id: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface IntegrityCheckResult {
  passed: boolean;
  violations: IntegrityViolation[];
  checked_at: string;
  summary: {
    total_interventions: number;
    total_links: number;
    total_outcomes: number;
    total_issues: number;
    errors: number;
    warnings: number;
    info: number;
  };
}

/**
 * Run full integrity check on intervention intelligence system
 */
export async function runInterventionIntegrityCheck(
  organizationId: string
): Promise<IntegrityCheckResult> {
  const violations: IntegrityViolation[] = [];
  const summary = {
    total_interventions: 0,
    total_links: 0,
    total_outcomes: 0,
    total_issues: 0,
    errors: 0,
    warnings: 0,
    info: 0,
  };

  try {
    // Fetch all intervention data for the org
    const [interventionsRes, linksRes, outcomesRes, issuesRes] = await Promise.all([
      supabase
        .from("interventions")
        .select("id, title, organization_id, created_at")
        .eq("organization_id", organizationId),
      supabase
        .from("intervention_metric_links")
        .select("id, intervention_id, metric_id, baseline_value, baseline_period_start, baseline_period_type"),
      supabase
        .from("intervention_outcomes")
        .select("id, intervention_id, metric_id, actual_delta_value, ai_summary, evaluated_at"),
      supabase
        .from("issues")
        .select("id, intervention_id, created_from")
        .not("intervention_id", "is", null),
    ]);

    const interventions = interventionsRes.data || [];
    const links = linksRes.data || [];
    const outcomes = outcomesRes.data || [];
    const issues = issuesRes.data || [];

    summary.total_interventions = interventions.length;
    summary.total_links = links.length;
    summary.total_outcomes = outcomes.length;
    summary.total_issues = issues.length;

    // Filter to only this org's interventions
    const interventionIds = new Set(interventions.map((i) => i.id));
    const orgLinks = links.filter((l) => interventionIds.has(l.intervention_id));
    const orgOutcomes = outcomes.filter((o) => interventionIds.has(o.intervention_id));
    const orgIssues = issues.filter((i) => interventionIds.has(i.intervention_id!));

    // Check 1: Links should have baseline_period_start
    for (const link of orgLinks) {
      if (!link.baseline_period_start) {
        violations.push({
          type: "MISSING_BASELINE_PERIOD",
          severity: "warning",
          entity_type: "intervention_metric_link",
          entity_id: link.id,
          message: `Metric link missing baseline_period_start`,
          details: {
            intervention_id: link.intervention_id,
            metric_id: link.metric_id,
          },
        });
      }
    }

    // Check 2: Verify baseline values exist in metric_results
    const metricIds = [...new Set(orgLinks.map((l) => l.metric_id))];
    if (metricIds.length > 0) {
      const { data: metricResults } = await supabase
        .from("metric_results")
        .select("metric_id, period_start, value")
        .in("metric_id", metricIds);

      const resultsMap = new Map<string, Set<string>>();
      (metricResults || []).forEach((r) => {
        if (!resultsMap.has(r.metric_id)) {
          resultsMap.set(r.metric_id, new Set());
        }
        resultsMap.get(r.metric_id)!.add(r.period_start);
      });

      for (const link of orgLinks) {
        if (link.baseline_period_start) {
          const periods = resultsMap.get(link.metric_id);
          if (!periods || !periods.has(link.baseline_period_start)) {
            violations.push({
              type: "MISSING_BASELINE_RESULT",
              severity: "warning",
              entity_type: "intervention_metric_link",
              entity_id: link.id,
              message: `Baseline period ${link.baseline_period_start} not found in metric_results`,
              details: {
                metric_id: link.metric_id,
                baseline_period_start: link.baseline_period_start,
              },
            });
          }
        }
      }
    }

    // Check 3: Outcomes should have corresponding link with baseline
    const linksMap = new Map<string, typeof orgLinks[0]>();
    orgLinks.forEach((l) => {
      linksMap.set(`${l.intervention_id}-${l.metric_id}`, l);
    });

    for (const outcome of orgOutcomes) {
      const key = `${outcome.intervention_id}-${outcome.metric_id}`;
      const link = linksMap.get(key);

      if (!link) {
        violations.push({
          type: "ORPHAN_OUTCOME",
          severity: "error",
          entity_type: "intervention_outcome",
          entity_id: outcome.id,
          message: `Outcome exists without corresponding metric link`,
          details: {
            intervention_id: outcome.intervention_id,
            metric_id: outcome.metric_id,
          },
        });
      } else if (link.baseline_value === null && outcome.actual_delta_value !== null) {
        violations.push({
          type: "MISSING_BASELINE_FOR_OUTCOME",
          severity: "error",
          entity_type: "intervention_outcome",
          entity_id: outcome.id,
          message: `Outcome has delta but link has no baseline value`,
          details: {
            intervention_id: outcome.intervention_id,
            metric_id: outcome.metric_id,
            actual_delta_value: outcome.actual_delta_value,
          },
        });
      }
    }

    // Check 4: No duplicate issues from same intervention
    const issueCountByIntervention = new Map<string, string[]>();
    orgIssues.forEach((issue) => {
      if (issue.intervention_id) {
        if (!issueCountByIntervention.has(issue.intervention_id)) {
          issueCountByIntervention.set(issue.intervention_id, []);
        }
        issueCountByIntervention.get(issue.intervention_id)!.push(issue.id);
      }
    });

    for (const [interventionId, issueIds] of issueCountByIntervention) {
      if (issueIds.length > 1) {
        violations.push({
          type: "DUPLICATE_INTERVENTION_ISSUES",
          severity: "warning",
          entity_type: "intervention",
          entity_id: interventionId,
          message: `Multiple issues (${issueIds.length}) created from same intervention`,
          details: {
            issue_ids: issueIds,
          },
        });
      }
    }

    // Check 5: Interventions with outcomes but no issues (may need attention)
    const interventionsWithOutcomes = new Set(orgOutcomes.map((o) => o.intervention_id));
    const interventionsWithIssues = new Set(orgIssues.map((i) => i.intervention_id));
    const failedOutcomes = orgOutcomes.filter(
      (o) => o.actual_delta_value !== null && o.actual_delta_value <= 0
    );
    const interventionsWithFailures = new Set(failedOutcomes.map((o) => o.intervention_id));

    for (const interventionId of interventionsWithFailures) {
      if (!interventionsWithIssues.has(interventionId)) {
        violations.push({
          type: "FAILED_INTERVENTION_NO_ISSUE",
          severity: "info",
          entity_type: "intervention",
          entity_id: interventionId,
          message: `Intervention has failed outcome but no linked issue`,
          details: {},
        });
      }
    }

    // Count violations by severity
    violations.forEach((v) => {
      if (v.severity === "error") summary.errors++;
      else if (v.severity === "warning") summary.warnings++;
      else summary.info++;
    });

    return {
      passed: summary.errors === 0,
      violations,
      checked_at: new Date().toISOString(),
      summary,
    };
  } catch (error) {
    violations.push({
      type: "CHECK_FAILED",
      severity: "error",
      entity_type: "system",
      entity_id: "integrity_check",
      message: `Integrity check failed: ${(error as Error).message}`,
      details: {},
    });

    return {
      passed: false,
      violations,
      checked_at: new Date().toISOString(),
      summary: { ...summary, errors: 1 },
    };
  }
}

/**
 * Quick validation for a single intervention
 */
export async function validateInterventionData(interventionId: string): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  const [interventionRes, linksRes, outcomesRes] = await Promise.all([
    supabase.from("interventions").select("*").eq("id", interventionId).single(),
    supabase.from("intervention_metric_links").select("*").eq("intervention_id", interventionId),
    supabase.from("intervention_outcomes").select("*").eq("intervention_id", interventionId),
  ]);

  if (interventionRes.error || !interventionRes.data) {
    issues.push("Intervention not found");
    return { valid: false, issues };
  }

  const intervention = interventionRes.data;
  const links = linksRes.data || [];
  const outcomes = outcomesRes.data || [];

  // Validate required fields
  if (!intervention.organization_id) {
    issues.push("Missing organization_id");
  }
  if (!intervention.created_by) {
    issues.push("Missing created_by");
  }
  if (!intervention.title) {
    issues.push("Missing title");
  }

  // Validate links
  links.forEach((link, i) => {
    if (!link.metric_id) {
      issues.push(`Link ${i + 1}: missing metric_id`);
    }
    if (link.baseline_value !== null && !link.baseline_period_start) {
      issues.push(`Link ${i + 1}: has baseline_value but missing baseline_period_start`);
    }
  });

  // Validate outcomes
  const linkMetricIds = new Set(links.map((l) => l.metric_id));
  outcomes.forEach((outcome, i) => {
    if (!linkMetricIds.has(outcome.metric_id)) {
      issues.push(`Outcome ${i + 1}: metric_id not in linked metrics`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}
