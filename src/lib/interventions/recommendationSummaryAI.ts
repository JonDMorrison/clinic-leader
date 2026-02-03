/**
 * AI Summary Layer for Intervention Recommendations
 * 
 * IMPORTANT: AI is used ONLY for summarization.
 * AI does NOT determine confidence scores or logic.
 * All inputs are structured, deterministic data.
 */

import { supabase } from "@/integrations/supabase/client";
import type { RecommendationReason } from "./generateRecommendations";
import type { InterventionType } from "./types";

interface RecommendationSummaryInput {
  intervention_type: InterventionType;
  metric_name: string;
  current_deviation_percent: number;
  historical_success_rate: number;
  matched_cases_count: number;
  avg_improvement_percent: number;
  typical_time_to_result_days: number;
  confidence_score: number;
}

/**
 * Generate human-readable summary using AI
 * 
 * AI is constrained to ONLY summarize the provided data.
 * No additional reasoning or recommendations.
 */
export async function generateRecommendationSummary(
  input: RecommendationSummaryInput
): Promise<string> {
  const prompt = buildSummaryPrompt(input);

  try {
    const { data, error } = await supabase.functions.invoke(
      "ai-recommendation-summary",
      {
        body: { prompt, input },
      }
    );

    if (error) throw error;
    return data?.summary || buildFallbackSummary(input);
  } catch (error) {
    console.error("AI summary generation failed:", error);
    return buildFallbackSummary(input);
  }
}

/**
 * Build prompt for AI summarization
 * Strictly constrains AI to structured data
 */
function buildSummaryPrompt(input: RecommendationSummaryInput): string {
  return `You are a healthcare business analyst summarizing intervention recommendations.
Your task is to summarize ONLY the data provided below into a single, clear paragraph.

RULES:
- Use ONLY the exact numbers provided
- Do NOT invent statistics or examples
- Use advisory language ("typically", "historically", "may")
- Keep the summary under 50 words
- Be factual and professional

DATA:
- Intervention Type: ${input.intervention_type.replace("_", " ")}
- Metric: ${input.metric_name}
- Current deviation from target: ${Math.abs(input.current_deviation_percent).toFixed(1)}%
- Historical success rate: ${Math.round(input.historical_success_rate * 100)}%
- Number of similar past cases: ${input.matched_cases_count}
- Average improvement seen: ${input.avg_improvement_percent.toFixed(1)}%
- Typical time to see results: ${input.typical_time_to_result_days} days
- Confidence score: ${Math.round(input.confidence_score * 100)}%

Summarize this data into a recommendation explanation:`;
}

/**
 * Fallback summary when AI is unavailable
 * Uses template-based generation
 */
function buildFallbackSummary(input: RecommendationSummaryInput): string {
  const interventionLabel = input.intervention_type.replace("_", " ");
  const successPercent = Math.round(input.historical_success_rate * 100);
  const improvementStr = input.avg_improvement_percent.toFixed(1);
  
  return `Historically, ${interventionLabel} interventions have improved this metric ${successPercent}% of the time, based on ${input.matched_cases_count} similar cases. Average improvement was ${improvementStr}%, typically seen within ${input.typical_time_to_result_days} days.`;
}

/**
 * Get confidence level label for display
 */
export function getConfidenceLabel(score: number): {
  label: string;
  variant: "default" | "destructive" | "warning" | "success";
} {
  if (score >= 0.7) {
    return { label: "High", variant: "success" };
  } else if (score >= 0.5) {
    return { label: "Moderate", variant: "default" };
  } else if (score >= 0.35) {
    return { label: "Low", variant: "warning" };
  } else {
    return { label: "Insufficient", variant: "destructive" };
  }
}

/**
 * Build evidence summary from recommendation reason
 */
export function buildEvidenceSummary(
  reason: RecommendationReason,
  interventionType: InterventionType
): string {
  const typeLabel = interventionType.replace("_", " ");
  const parts: string[] = [];

  parts.push(
    `Based on ${reason.matched_cases_count} historical ${typeLabel} interventions.`
  );

  if (reason.historical_success_rate > 0) {
    parts.push(
      `Success rate: ${reason.historical_success_rate}%.`
    );
  }

  if (reason.avg_improvement_percent !== 0) {
    parts.push(
      `Average improvement: ${reason.avg_improvement_percent > 0 ? "+" : ""}${reason.avg_improvement_percent.toFixed(1)}%.`
    );
  }

  if (reason.typical_time_to_result_days > 0) {
    parts.push(
      `Typical time to results: ${reason.typical_time_to_result_days} days.`
    );
  }

  return parts.join(" ");
}

/**
 * Format confidence score for display
 */
export function formatConfidenceExplanation(
  components: RecommendationReason["confidence_components"]
): string[] {
  const explanations: string[] = [];

  if (components.historicalSuccessRate >= 0.7) {
    explanations.push("Strong historical success rate");
  } else if (components.historicalSuccessRate >= 0.5) {
    explanations.push("Moderate historical success rate");
  }

  if (components.sampleSizeScore >= 0.8) {
    explanations.push("Large sample of historical cases");
  } else if (components.sampleSizeScore >= 0.5) {
    explanations.push("Adequate sample size");
  }

  if (components.similarityScore >= 0.7) {
    explanations.push("Very similar to current situation");
  } else if (components.similarityScore >= 0.5) {
    explanations.push("Somewhat similar to current situation");
  }

  if (components.recencyScore >= 0.7) {
    explanations.push("Based on recent interventions");
  }

  return explanations;
}
