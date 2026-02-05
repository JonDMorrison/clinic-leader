/**
 * Playbook Intelligence Generator
 * 
 * Converts successful intervention clusters into reusable operational playbooks.
 * 
 * Generation Triggers:
 * - Success rate > threshold (default 65%)
 * - Sample size > threshold (default 5)
 * 
 * Playbook Content:
 * - Summary of change
 * - Expected metric movement
 * - Implementation steps (extracted from to-dos)
 * - Average time to impact
 * - Risk flags
 */

import { supabase } from "@/integrations/supabase/client";
import type { 
  PatternCluster, 
  OrgSizeBand, 
  TimeHorizonBand, 
  BaselineRangeBand 
} from "./interventionPatternService";

// ============= Types =============

export interface PlaybookCandidate {
  sourcePatternClusterId: string | null;
  sourceInterventionIds: string[];
  title: string;
  summary: string;
  expectedMetricMovement: {
    metricId: string;
    metricName: string;
    expectedDeltaPercent: number;
    direction: "up" | "down";
    confidence: number;
  };
  implementationSteps: PlaybookStep[];
  riskFlags: RiskFlag[];
  successRate: number;
  sampleSize: number;
  avgTimeToImpactDays: number | null;
}

export interface PlaybookStep {
  order: number;
  title: string;
  description: string;
  estimatedDays: number | null;
}

export interface RiskFlag {
  severity: "low" | "medium" | "high";
  description: string;
}

export interface Playbook {
  id: string;
  organizationId: string | null;
  title: string;
  summary: string;
  status: PlaybookStatus;
  sourcePatternClusterId: string | null;
  sourceInterventionIds: string[];
  expectedMetricMovement: PlaybookCandidate["expectedMetricMovement"];
  implementationSteps: PlaybookStep[];
  riskFlags: RiskFlag[];
  successRate: number;
  sampleSize: number;
  avgTimeToImpactDays: number | null;
  generatedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  isAnonymized: boolean;
}

export type PlaybookStatus = "draft" | "pending_approval" | "approved" | "archived";

export interface GenerationThresholds {
  minSuccessRate: number;
  minSampleSize: number;
}

const DEFAULT_THRESHOLDS: GenerationThresholds = {
  minSuccessRate: 0.65, // 65%
  minSampleSize: 5,
};

// ============= Detection & Generation =============

/**
 * Check if a pattern cluster qualifies for playbook generation
 */
export function isPlaybookCandidate(
  pattern: PatternCluster,
  thresholds: GenerationThresholds = DEFAULT_THRESHOLDS
): boolean {
  return (
    pattern.successRate >= thresholds.minSuccessRate * 100 &&
    pattern.sampleSize >= thresholds.minSampleSize
  );
}

/**
 * Fetch intervention details for playbook generation
 */
async function fetchInterventionDetails(interventionIds: string[]) {
  const { data, error } = await supabase
    .from("interventions")
    .select(`
      id,
      title,
      description,
      intervention_type,
      status,
      expected_time_horizon_days,
      tags,
      todos:intervention_todos(
        id,
        title,
        completed,
        order
      ),
      metric_links:intervention_metric_links(
        metric_id,
        baseline_value,
        metrics(id, name, unit)
      ),
      outcomes:intervention_outcomes(
        actual_delta_percent,
        confidence_score
      )
    `)
    .in("id", interventionIds)
    .eq("status", "completed");

  if (error) {
    console.error("Error fetching intervention details:", error);
    return [];
  }

  return data || [];
}

/**
 * Extract implementation steps from intervention to-dos
 */
function extractImplementationSteps(
  interventions: any[]
): PlaybookStep[] {
  const allTodos: { title: string; count: number }[] = [];
  
  // Aggregate to-dos across interventions
  interventions.forEach((intervention) => {
    const todos = intervention.todos || [];
    todos.forEach((todo: any) => {
      const existing = allTodos.find(
        (t) => t.title.toLowerCase() === todo.title.toLowerCase()
      );
      if (existing) {
        existing.count++;
      } else {
        allTodos.push({ title: todo.title, count: 1 });
      }
    });
  });

  // Sort by frequency and take top 10
  const topTodos = allTodos
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Convert to steps
  return topTodos.map((todo, index) => ({
    order: index + 1,
    title: todo.title,
    description: `Common step across ${todo.count} interventions`,
    estimatedDays: null,
  }));
}

/**
 * Analyze risk flags from intervention patterns
 */
function analyzeRiskFlags(
  interventions: any[],
  successRate: number
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Check for inconsistent outcomes
  const outcomes = interventions
    .flatMap((i) => i.outcomes || [])
    .filter((o: any) => o.actual_delta_percent !== null);

  if (outcomes.length >= 3) {
    const deltas = outcomes.map((o: any) => o.actual_delta_percent);
    const avg = deltas.reduce((a: number, b: number) => a + b, 0) / deltas.length;
    const variance = deltas.reduce((sum: number, d: number) => sum + Math.pow(d - avg, 2), 0) / deltas.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev > 15) {
      flags.push({
        severity: "medium",
        description: `High variability in outcomes (±${stdDev.toFixed(1)}%). Results may vary significantly.`,
      });
    }
  }

  // Check for moderate success rate
  if (successRate < 0.75) {
    flags.push({
      severity: "low",
      description: `Success rate of ${(successRate * 100).toFixed(0)}% indicates some interventions may not achieve expected results.`,
    });
  }

  // Check for long time horizons
  const avgDuration = interventions
    .filter((i) => i.expected_time_horizon_days)
    .reduce((sum, i) => sum + i.expected_time_horizon_days, 0) /
    (interventions.filter((i) => i.expected_time_horizon_days).length || 1);

  if (avgDuration > 90) {
    flags.push({
      severity: "medium",
      description: `Long implementation timeline (avg ${Math.round(avgDuration)} days). Consider breaking into phases.`,
    });
  }

  return flags;
}

/**
 * Generate a playbook candidate from a pattern cluster
 */
export async function generatePlaybookCandidate(
  pattern: PatternCluster,
  organizationId: string
): Promise<PlaybookCandidate | null> {
  // Fetch successful interventions that contributed to this pattern
  const { data: interventionLinks } = await supabase
    .from("intervention_metric_links")
    .select(`
      intervention_id,
      metric_id,
      baseline_value,
      interventions!inner(
        id,
        intervention_type,
        status,
        organization_id
      )
    `)
    .eq("interventions.organization_id", organizationId)
    .eq("interventions.intervention_type", pattern.interventionType as any)
    .eq("interventions.status", "completed");

  if (!interventionLinks || interventionLinks.length === 0) {
    return null;
  }

  const interventionIds = [...new Set(interventionLinks.map((l) => l.intervention_id))];
  const interventions = await fetchInterventionDetails(interventionIds.slice(0, 20));

  if (interventions.length === 0) {
    return null;
  }

  // Extract metric info
  const metricLink = interventionLinks[0];
  let metricName = "Target Metric";
  if (pattern.metricId) {
    const { data: metric } = await supabase
      .from("metrics")
      .select("name")
      .eq("id", pattern.metricId)
      .single();
    if (metric) metricName = metric.name;
  }

  // Calculate average improvement
  const outcomes = interventions
    .flatMap((i) => i.outcomes || [])
    .filter((o: any) => o.actual_delta_percent !== null);
  
  const avgImprovement = outcomes.length > 0
    ? outcomes.reduce((sum: number, o: any) => sum + o.actual_delta_percent, 0) / outcomes.length
    : pattern.avgEffectMagnitude || 0;

  // Calculate average time to impact
  const avgTimeToImpact = interventions
    .filter((i) => i.expected_time_horizon_days)
    .reduce((sum, i) => sum + i.expected_time_horizon_days, 0) /
    (interventions.filter((i) => i.expected_time_horizon_days).length || 1);

  // Build implementation steps from to-dos
  const steps = extractImplementationSteps(interventions);

  // Analyze risk flags
  const riskFlags = analyzeRiskFlags(interventions, pattern.successRate / 100);

  // Generate title and summary
  const typeLabel = pattern.interventionType.replace(/_/g, " ");
  const title = `${metricName}: ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} Playbook`;
  
  const summary = `Proven ${typeLabel} approach for improving ${metricName}. Based on ${pattern.sampleSize} successful interventions with ${(pattern.successRate).toFixed(0)}% success rate. Average improvement: ${avgImprovement.toFixed(1)}%.`;

  return {
    sourcePatternClusterId: pattern.id,
    sourceInterventionIds: interventionIds,
    title,
    summary,
    expectedMetricMovement: {
      metricId: pattern.metricId || "",
      metricName,
      expectedDeltaPercent: avgImprovement,
      direction: avgImprovement >= 0 ? "up" : "down",
      confidence: pattern.patternConfidence,
    },
    implementationSteps: steps,
    riskFlags,
    successRate: pattern.successRate / 100,
    sampleSize: pattern.sampleSize,
    avgTimeToImpactDays: Math.round(avgTimeToImpact) || null,
  };
}

// ============= Storage =============

/**
 * Save a playbook candidate to the database
 */
export async function savePlaybookCandidate(
  organizationId: string,
  candidate: PlaybookCandidate,
  isAnonymized = false
): Promise<string | null> {
  const { data, error } = await supabase
    .from("intervention_playbooks")
    .insert({
      organization_id: organizationId,
      title: candidate.title,
      summary: candidate.summary,
      status: "pending_approval" as const,
      source_pattern_cluster_id: candidate.sourcePatternClusterId,
      source_intervention_ids: candidate.sourceInterventionIds,
      expected_metric_movement: candidate.expectedMetricMovement as any,
      implementation_steps: candidate.implementationSteps as any,
      risk_flags: candidate.riskFlags as any,
      success_rate: candidate.successRate * 100,
      sample_size: candidate.sampleSize,
      avg_time_to_impact_days: candidate.avgTimeToImpactDays,
      is_anonymized: isAnonymized,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error saving playbook:", error);
    return null;
  }

  return data?.id || null;
}

/**
 * Fetch playbooks for an organization
 */
export async function fetchPlaybooks(
  organizationId: string,
  status?: PlaybookStatus
): Promise<Playbook[]> {
  let query = supabase
    .from("intervention_playbooks")
    .select("*")
    .or(`organization_id.eq.${organizationId},and(status.eq.approved,is_anonymized.eq.true)`)
    .order("success_rate", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching playbooks:", error);
    return [];
  }

  return (data || []).map(mapPlaybookFromDb);
}

/**
 * Fetch pending playbooks for approval
 */
export async function fetchPendingPlaybooks(
  organizationId: string
): Promise<Playbook[]> {
  return fetchPlaybooks(organizationId, "pending_approval");
}

/**
 * Approve a playbook
 */
export async function approvePlaybook(
  playbookId: string,
  approvedBy: string
): Promise<boolean> {
  const { error } = await supabase
    .from("intervention_playbooks")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: approvedBy,
    })
    .eq("id", playbookId);

  return !error;
}

/**
 * Reject a playbook
 */
export async function rejectPlaybook(
  playbookId: string,
  reason: string
): Promise<boolean> {
  const { error } = await supabase
    .from("intervention_playbooks")
    .update({
      status: "archived",
      rejection_reason: reason,
    })
    .eq("id", playbookId);

  return !error;
}

/**
 * Archive a playbook
 */
export async function archivePlaybook(playbookId: string): Promise<boolean> {
  const { error } = await supabase
    .from("intervention_playbooks")
    .update({ status: "archived" })
    .eq("id", playbookId);

  return !error;
}

// ============= Helpers =============

function mapPlaybookFromDb(row: any): Playbook {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    summary: row.summary,
    status: row.status as PlaybookStatus,
    sourcePatternClusterId: row.source_pattern_cluster_id,
    sourceInterventionIds: row.source_intervention_ids || [],
    expectedMetricMovement: row.expected_metric_movement,
    implementationSteps: row.implementation_steps || [],
    riskFlags: row.risk_flags || [],
    successRate: row.success_rate / 100,
    sampleSize: row.sample_size,
    avgTimeToImpactDays: row.avg_time_to_impact_days,
    generatedAt: row.generated_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    isAnonymized: row.is_anonymized,
  };
}

// ============= Auto-Generation Scanner =============

/**
 * Scan for pattern clusters that qualify for playbook generation
 */
export async function scanForPlaybookCandidates(
  organizationId: string,
  thresholds: GenerationThresholds = DEFAULT_THRESHOLDS
): Promise<PatternCluster[]> {
  const { data, error } = await supabase
    .from("intervention_pattern_clusters")
    .select("*")
    .gte("success_rate", thresholds.minSuccessRate * 100)
    .gte("sample_size", thresholds.minSampleSize)
    .order("pattern_confidence", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error scanning for candidates:", error);
    return [];
  }

  // Filter out patterns that already have playbooks
  const { data: existingPlaybooks } = await supabase
    .from("intervention_playbooks")
    .select("source_pattern_cluster_id")
    .eq("organization_id", organizationId)
    .neq("status", "archived");

  const existingPatternIds = new Set(
    (existingPlaybooks || [])
      .map((p) => p.source_pattern_cluster_id)
      .filter(Boolean)
  );

  return (data || [])
    .filter((row) => !existingPatternIds.has(row.id))
    .map((row): PatternCluster => ({
      id: row.id,
      metricId: row.metric_id,
      interventionType: row.intervention_type,
      orgSizeBand: row.org_size_band as OrgSizeBand,
      specialtyType: row.specialty_type,
      timeHorizonBand: row.time_horizon_band as TimeHorizonBand,
      baselineRangeBand: row.baseline_range_band as BaselineRangeBand,
      successRate: row.success_rate,
      sampleSize: row.sample_size,
      avgEffectMagnitude: row.avg_effect_magnitude,
      medianEffectMagnitude: row.median_effect_magnitude,
      patternConfidence: row.pattern_confidence,
      lastComputedAt: row.last_computed_at,
    }));
}

export const PLAYBOOK_THRESHOLDS = DEFAULT_THRESHOLDS;
