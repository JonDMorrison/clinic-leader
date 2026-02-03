/**
 * AI Summary Layer for Jane Outcome Insights
 * Summarizes structured comparison data - never determines logic
 */

import { supabase } from "@/integrations/supabase/client";
import type { OutcomeComparison } from "./compareJaneOutcomes";
import type { QualityComparison } from "./emrDataQualityScore";

export interface JaneInsightSummary {
  performanceSummary: string;
  qualitySummary: string;
  interventionSummary: string;
  overallConclusion: string;
  generatedAt: string;
  dataSource: 'ai' | 'template';
}

interface InsightInput {
  comparisons: OutcomeComparison[];
  qualityComparison: QualityComparison | null;
  overallJaneAdvantage: number;
  resolutionSpeedAdvantage: number | null;
  interventionSuccessAdvantage: number | null;
  sampleSizes: {
    jane: number;
    nonJane: number;
  };
}

/**
 * Generates AI-powered insight summary from structured data
 * AI only summarizes - never calculates
 */
export async function generateJaneInsightSummary(
  input: InsightInput
): Promise<JaneInsightSummary> {
  const prompt = buildPrompt(input);
  
  try {
    const { data, error } = await supabase.functions.invoke('ai-emr-benchmark-insights', {
      body: { input, prompt },
    });
    
    if (error || !data?.summary) {
      console.warn("AI insight generation failed, using template:", error);
      return buildTemplateSummary(input);
    }
    
    return {
      ...data.summary,
      dataSource: 'ai',
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error generating AI insights:", error);
    return buildTemplateSummary(input);
  }
}

/**
 * Builds prompt from structured data - passes only computed values
 */
function buildPrompt(input: InsightInput): string {
  const { comparisons, qualityComparison, overallJaneAdvantage, resolutionSpeedAdvantage, interventionSuccessAdvantage, sampleSizes } = input;
  
  // Count metrics with Jane advantage
  const metricsWithJaneAdvantage = comparisons.filter(c => (c.performanceDelta || 0) > 0).length;
  const totalMetrics = comparisons.filter(c => c.performanceDelta !== null).length;
  
  // Get volatility comparison
  const lessVolatileCount = comparisons.filter(c => c.volatilityComparison?.janeLessVolatile).length;
  
  return `You are a healthcare analytics expert. Summarize the following EMR comparison data.

CRITICAL RULES:
1. Use ONLY the exact numbers provided - never invent statistics
2. Use comparative language: "showed", "demonstrated", "observed"
3. Always mention sample sizes for context
4. Acknowledge limitations where sample sizes are small
5. Keep each summary under 40 words

DATA PROVIDED (use exactly):
- Sample Size: ${sampleSizes.jane} Jane-integrated clinics, ${sampleSizes.nonJane} non-Jane clinics
- Overall Performance: Jane clinics showed ${overallJaneAdvantage.toFixed(1)}% ${overallJaneAdvantage >= 0 ? 'higher' : 'lower'} performance
- Metrics Analyzed: ${totalMetrics} metrics, Jane performed better in ${metricsWithJaneAdvantage}
- Data Volatility: Jane-integrated clinics showed less volatility in ${lessVolatileCount}/${totalMetrics} metrics
${qualityComparison ? `- Data Quality: Jane ${qualityComparison.janeAdvantage.overall.toFixed(1)} points ${qualityComparison.janeAdvantage.overall >= 0 ? 'higher' : 'lower'} overall score` : ''}
${resolutionSpeedAdvantage !== null ? `- Resolution Speed: Jane-integrated clinics resolved issues ${Math.abs(resolutionSpeedAdvantage).toFixed(1)}% ${resolutionSpeedAdvantage >= 0 ? 'faster' : 'slower'}` : ''}
${interventionSuccessAdvantage !== null ? `- Intervention Success: ${interventionSuccessAdvantage.toFixed(1)}% ${interventionSuccessAdvantage >= 0 ? 'higher' : 'lower'} success rate for Jane clinics` : ''}

Generate four brief summaries:
1. performanceSummary: Overall metric performance comparison
2. qualitySummary: Data quality and reporting consistency comparison  
3. interventionSummary: Intervention outcomes comparison
4. overallConclusion: Key takeaway with appropriate caveats

Return as JSON object.`;
}

/**
 * Fallback template-based summary when AI unavailable
 */
function buildTemplateSummary(input: InsightInput): JaneInsightSummary {
  const { comparisons, qualityComparison, overallJaneAdvantage, resolutionSpeedAdvantage, interventionSuccessAdvantage, sampleSizes } = input;
  
  const metricsWithJaneAdvantage = comparisons.filter(c => (c.performanceDelta || 0) > 0).length;
  const totalMetrics = comparisons.filter(c => c.performanceDelta !== null).length;
  const lessVolatileCount = comparisons.filter(c => c.volatilityComparison?.janeLessVolatile).length;
  
  const performanceDirection = overallJaneAdvantage >= 0 ? 'higher' : 'lower';
  const absAdvantage = Math.abs(overallJaneAdvantage).toFixed(1);
  
  const performanceSummary = totalMetrics > 0
    ? `Across ${totalMetrics} analyzed metrics, Jane-integrated clinics demonstrated ${absAdvantage}% ${performanceDirection} median performance, with advantages observed in ${metricsWithJaneAdvantage} metrics.`
    : `Insufficient data for performance comparison.`;
  
  const qualitySummary = qualityComparison
    ? `Data quality analysis across ${sampleSizes.jane} Jane clinics showed ${Math.abs(qualityComparison.janeAdvantage.overall).toFixed(1)} points ${qualityComparison.janeAdvantage.overall >= 0 ? 'higher' : 'lower'} overall quality scores, with notably ${qualityComparison.janeAdvantage.latency >= 0 ? 'faster' : 'slower'} reporting latency.`
    : `Quality comparison requires minimum 5 organizations per group.`;
  
  const interventionSummary = resolutionSpeedAdvantage !== null || interventionSuccessAdvantage !== null
    ? `Jane-integrated clinics ${resolutionSpeedAdvantage !== null && resolutionSpeedAdvantage > 0 ? `resolved off-track metrics ${Math.abs(resolutionSpeedAdvantage).toFixed(0)}% faster` : 'showed comparable resolution times'}${interventionSuccessAdvantage !== null ? ` and achieved ${Math.abs(interventionSuccessAdvantage).toFixed(1)}% ${interventionSuccessAdvantage >= 0 ? 'higher' : 'lower'} intervention success rates` : ''}.`
    : `Intervention outcome comparison pending sufficient data.`;
  
  const overallConclusion = `Based on ${sampleSizes.jane + sampleSizes.nonJane} clinics analyzed, Jane-integrated organizations showed ${lessVolatileCount > totalMetrics / 2 ? 'more stable' : 'comparable'} reporting patterns. Note: Correlation does not imply causation; other factors may influence outcomes.`;
  
  return {
    performanceSummary,
    qualitySummary,
    interventionSummary,
    overallConclusion,
    generatedAt: new Date().toISOString(),
    dataSource: 'template',
  };
}

/**
 * Validates that a summary contains only referenced data
 * Used as a safety check before storing AI output
 */
export function validateSummaryFidelity(
  summary: JaneInsightSummary,
  input: InsightInput
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // Check for common hallucination patterns
  const suspiciousPatterns = [
    /\d{3,}%/, // Unrealistic percentages
    /guaranteed/i,
    /always/i,
    /never/i,
    /definitely/i,
    /proven to/i,
  ];
  
  const fullText = `${summary.performanceSummary} ${summary.qualitySummary} ${summary.interventionSummary} ${summary.overallConclusion}`;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullText)) {
      warnings.push(`Potentially problematic language detected: ${pattern.source}`);
    }
  }
  
  // Verify mentioned numbers align with input
  const mentioned = fullText.match(/\d+\.?\d*/g) || [];
  const knownValues = [
    input.sampleSizes.jane,
    input.sampleSizes.nonJane,
    Math.abs(input.overallJaneAdvantage),
    input.resolutionSpeedAdvantage !== null ? Math.abs(input.resolutionSpeedAdvantage) : null,
    input.interventionSuccessAdvantage !== null ? Math.abs(input.interventionSuccessAdvantage) : null,
    input.qualityComparison?.janeAdvantage.overall,
  ].filter(v => v !== null) as number[];
  
  // Flag if numbers appear that don't match known values (with tolerance)
  for (const num of mentioned) {
    const parsed = parseFloat(num);
    if (parsed > 1 && !knownValues.some(v => Math.abs(v - parsed) < 1)) {
      warnings.push(`Unverified number in summary: ${num}`);
    }
  }
  
  return {
    valid: warnings.length === 0,
    warnings,
  };
}
