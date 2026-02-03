/**
 * EMR Data Quality Scoring Engine
 * Compares data quality between Jane and non-Jane integrations
 */

import { supabase } from "@/integrations/supabase/client";

export interface DataQualityScore {
  organizationId: string;
  periodKey: string;
  completenessScore: number;
  latencyScore: number;
  consistencyScore: number;
  overallScore: number;
  missingFieldsCount: number;
  avgReportingDelayHours: number | null;
  auditPassRate: number | null;
}

export interface QualityComparison {
  janeAvg: DataQualityScore | null;
  nonJaneAvg: DataQualityScore | null;
  janeAdvantage: {
    completeness: number;
    latency: number;
    consistency: number;
    overall: number;
  };
  sampleSize: {
    jane: number;
    nonJane: number;
  };
}

/**
 * Calculates completeness score based on expected vs actual fields
 */
export function calculateCompletenessScore(
  expectedFields: number,
  presentFields: number,
  criticalFieldsMissing: number
): number {
  if (expectedFields === 0) return 100;
  
  // Base score from field presence
  const baseScore = (presentFields / expectedFields) * 100;
  
  // Heavy penalty for missing critical fields
  const criticalPenalty = criticalFieldsMissing * 15;
  
  return Math.max(0, Math.min(100, baseScore - criticalPenalty));
}

/**
 * Calculates latency score based on reporting delay
 */
export function calculateLatencyScore(
  avgDelayHours: number,
  expectedDelayHours: number = 24
): number {
  if (avgDelayHours <= 0) return 100;
  
  // Perfect score if within expected delay
  if (avgDelayHours <= expectedDelayHours) {
    return 100;
  }
  
  // Linear decay beyond expected delay, min 0
  const overdue = avgDelayHours - expectedDelayHours;
  const penaltyPerHour = 2;
  
  return Math.max(0, 100 - (overdue * penaltyPerHour));
}

/**
 * Calculates consistency score based on reporting regularity
 */
export function calculateConsistencyScore(
  reportedPeriods: number,
  expectedPeriods: number,
  gapCount: number
): number {
  if (expectedPeriods === 0) return 100;
  
  // Base score from period coverage
  const coverageScore = (reportedPeriods / expectedPeriods) * 100;
  
  // Penalty for gaps in reporting
  const gapPenalty = gapCount * 10;
  
  return Math.max(0, Math.min(100, coverageScore - gapPenalty));
}

/**
 * Computes overall quality score from components
 */
export function computeOverallQualityScore(
  completeness: number,
  latency: number,
  consistency: number,
  weights = { completeness: 0.4, latency: 0.3, consistency: 0.3 }
): number {
  return Math.round(
    completeness * weights.completeness +
    latency * weights.latency +
    consistency * weights.consistency
  );
}

/**
 * Fetches quality scores for an organization
 */
export async function fetchOrganizationQualityScores(
  organizationId: string,
  periodKey?: string
): Promise<DataQualityScore[]> {
  let query = supabase
    .from("emr_data_quality_scores")
    .select("*")
    .eq("organization_id", organizationId)
    .order("period_key", { ascending: false });
  
  if (periodKey) {
    query = query.eq("period_key", periodKey);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error("Error fetching quality scores:", error);
    return [];
  }
  
  return data.map(row => ({
    organizationId: row.organization_id,
    periodKey: row.period_key,
    completenessScore: row.completeness_score,
    latencyScore: row.latency_score,
    consistencyScore: row.consistency_score,
    overallScore: row.overall_score,
    missingFieldsCount: row.missing_fields_count,
    avgReportingDelayHours: row.avg_reporting_delay_hours,
    auditPassRate: row.audit_pass_rate,
  }));
}

/**
 * Compares data quality between Jane and Non-Jane groups
 * Requires minimum 5 organizations per group for privacy
 */
export async function compareEMRDataQuality(
  periodKey: string
): Promise<QualityComparison | null> {
  // Fetch teams with their EMR source type
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, emr_source_type");
  
  if (teamsError || !teams) {
    console.error("Error fetching teams:", teamsError);
    return null;
  }
  
  // Categorize teams
  const janeTeamIds = teams
    .filter(t => t.emr_source_type === 'jane' || t.emr_source_type === 'jane_pipe')
    .map(t => t.id);
  const nonJaneTeamIds = teams
    .filter(t => t.emr_source_type !== 'jane' && t.emr_source_type !== 'jane_pipe')
    .map(t => t.id);
  
  // Privacy: require minimum 5 orgs per group
  if (janeTeamIds.length < 5 || nonJaneTeamIds.length < 5) {
    console.log("Insufficient sample size for EMR comparison");
    return null;
  }
  
  // Fetch quality scores for all teams
  const { data: qualityScores, error: scoresError } = await supabase
    .from("emr_data_quality_scores")
    .select("*")
    .eq("period_key", periodKey);
  
  if (scoresError || !qualityScores) {
    console.error("Error fetching quality scores:", scoresError);
    return null;
  }
  
  // Aggregate by group
  const janeScores = qualityScores.filter(s => janeTeamIds.includes(s.organization_id));
  const nonJaneScores = qualityScores.filter(s => nonJaneTeamIds.includes(s.organization_id));
  
  // Calculate averages
  const calcAvg = (scores: typeof qualityScores) => {
    if (scores.length === 0) return null;
    return {
      organizationId: 'aggregate',
      periodKey,
      completenessScore: scores.reduce((a, s) => a + s.completeness_score, 0) / scores.length,
      latencyScore: scores.reduce((a, s) => a + s.latency_score, 0) / scores.length,
      consistencyScore: scores.reduce((a, s) => a + s.consistency_score, 0) / scores.length,
      overallScore: scores.reduce((a, s) => a + s.overall_score, 0) / scores.length,
      missingFieldsCount: Math.round(scores.reduce((a, s) => a + s.missing_fields_count, 0) / scores.length),
      avgReportingDelayHours: scores.reduce((a, s) => a + (s.avg_reporting_delay_hours || 0), 0) / scores.length,
      auditPassRate: scores.reduce((a, s) => a + (s.audit_pass_rate || 0), 0) / scores.length,
    };
  };
  
  const janeAvg = calcAvg(janeScores);
  const nonJaneAvg = calcAvg(nonJaneScores);
  
  return {
    janeAvg,
    nonJaneAvg,
    janeAdvantage: {
      completeness: janeAvg && nonJaneAvg ? janeAvg.completenessScore - nonJaneAvg.completenessScore : 0,
      latency: janeAvg && nonJaneAvg ? janeAvg.latencyScore - nonJaneAvg.latencyScore : 0,
      consistency: janeAvg && nonJaneAvg ? janeAvg.consistencyScore - nonJaneAvg.consistencyScore : 0,
      overall: janeAvg && nonJaneAvg ? janeAvg.overallScore - nonJaneAvg.overallScore : 0,
    },
    sampleSize: {
      jane: janeScores.length,
      nonJane: nonJaneScores.length,
    },
  };
}
