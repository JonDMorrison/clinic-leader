/**
 * Recommendation Run Logger
 * 
 * Freezes evidence and inputs at generation time for traceability.
 * Every recommendation must be traceable to a stored evidence snapshot.
 */

import { supabase } from "@/integrations/supabase/client";

export interface RecommendationRunInputs {
  currentValue: number | null;
  target: number | null;
  deviationPercent: number | null;
  normalizationMethod: string | null;
  thresholdUsed: number;
  metricDirection: string | null;
}

export interface HistoricalCase {
  interventionId: string;
  interventionType: string;
  interventionTypeId?: string | null; // Governance type UUID
  interventionTypeName?: string | null; // Resolved governance type name
  baselineValue: number | null;
  outcomeValue: number | null;
  improvementPercent: number | null;
  wasSuccessful: boolean;
  createdAt: string;
  durationDays: number | null;
}

export interface PatternStats {
  interventionType: string;
  sampleSize: number;
  successRate: number;
  avgImprovementPercent: number;
  medianImprovementPercent: number;
  avgTimeToResultDays: number;
}

export interface FilteredReason {
  interventionType: string;
  reason: string;
  filteredAt: "allowlist" | "cooldown" | "confidence" | "sample_size";
}

export interface RecommendationRunEvidence {
  historicalCases: HistoricalCase[];
  patternStats: PatternStats[];
  filteredReasons: FilteredReason[];
  totalCasesAnalyzed: number;
  oldestCaseDate: string | null;
  newestCaseDate: string | null;
}

export interface RecommendationRunRecord {
  id: string;
  organizationId: string;
  metricId: string;
  runPeriodStart: string;
  inputs: RecommendationRunInputs;
  evidence: RecommendationRunEvidence;
  recommendationsGenerated: number;
  modelVersion: string;
  createdAt: string;
  createdBy: string | null;
}

/**
 * Create a recommendation run record with frozen evidence
 */
export async function createRecommendationRun(
  organizationId: string,
  metricId: string,
  periodStart: string,
  inputs: RecommendationRunInputs,
  evidence: RecommendationRunEvidence,
  recommendationsGenerated: number,
  modelVersion = "v1.0"
): Promise<string | null> {
  const { data: user } = await supabase.auth.getUser();

  const insertData = {
    organization_id: organizationId,
    metric_id: metricId,
    run_period_start: periodStart,
    inputs: inputs as unknown as Record<string, unknown>,
    evidence: evidence as unknown as Record<string, unknown>,
    recommendations_generated: recommendationsGenerated,
    model_version: modelVersion,
    created_by: user?.user?.id ?? null,
  };

  const { data, error } = await supabase
    .from("recommendation_runs")
    .insert(insertData as any)
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create recommendation run:", error);
    return null;
  }

  return data.id;
}

/**
 * Fetch a recommendation run by ID
 */
export async function getRecommendationRun(runId: string): Promise<RecommendationRunRecord | null> {
  const { data, error } = await supabase
    .from("recommendation_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (error || !data) {
    console.error("Failed to fetch recommendation run:", error);
    return null;
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    metricId: data.metric_id,
    runPeriodStart: data.run_period_start,
    inputs: data.inputs as unknown as RecommendationRunInputs,
    evidence: data.evidence as unknown as RecommendationRunEvidence,
    recommendationsGenerated: data.recommendations_generated,
    modelVersion: data.model_version,
    createdAt: data.created_at,
    createdBy: data.created_by,
  };
}

/**
 * Fetch recommendation run for a specific recommendation
 */
export async function getRecommendationRunForRecommendation(
  recommendationId: string
): Promise<RecommendationRunRecord | null> {
  const { data: rec, error: recError } = await supabase
    .from("intervention_recommendations")
    .select("recommendation_run_id")
    .eq("id", recommendationId)
    .single();

  if (recError || !rec?.recommendation_run_id) {
    return null;
  }

  return getRecommendationRun(rec.recommendation_run_id);
}

/**
 * Format evidence for display
 */
export function formatEvidenceSummary(evidence: RecommendationRunEvidence): string[] {
  const summaries: string[] = [];

  summaries.push(`${evidence.totalCasesAnalyzed} historical interventions analyzed`);

  if (evidence.oldestCaseDate && evidence.newestCaseDate) {
    summaries.push(`Data span: ${evidence.oldestCaseDate} to ${evidence.newestCaseDate}`);
  }

  for (const pattern of evidence.patternStats) {
    summaries.push(
      `${pattern.interventionType}: ${pattern.sampleSize} cases, ` +
      `${Math.round(pattern.successRate * 100)}% success rate`
    );
  }

  if (evidence.filteredReasons.length > 0) {
    summaries.push(`${evidence.filteredReasons.length} intervention types filtered out`);
  }

  return summaries;
}

/**
 * Format filtered reasons for display
 */
export function formatFilteredReasons(reasons: FilteredReason[]): string[] {
  return reasons.map((r) => {
    const location = {
      allowlist: "not in approved types",
      cooldown: "in cooldown period",
      confidence: "below confidence threshold",
      sample_size: "insufficient sample size",
    }[r.filteredAt];

    return `${r.interventionType}: ${location} - ${r.reason}`;
  });
}
