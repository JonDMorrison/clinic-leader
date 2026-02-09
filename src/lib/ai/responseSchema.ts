/**
 * AI Response Contract Enforcement
 * 
 * Validates AI responses before rendering to prevent:
 * - Raw JSON leaking into UI
 * - Citation markers ([S1], [1]) appearing in text
 * - Malformed or empty responses
 * 
 * Logs sanitization events for observability.
 */

import { z } from "zod";
import { logRegressionEvent } from "@/lib/observability/regressionLogger";

/**
 * Expected shape of a validated AI response.
 */
export const aiResponseSchema = z.object({
  answer: z.string().min(1, "AI response cannot be empty"),
  steps: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
});

export type ValidatedAIResponse = z.infer<typeof aiResponseSchema>;

/**
 * Track what was removed during sanitization for observability.
 */
interface SanitizationResult {
  cleaned: string;
  removedElements: string[];
}

/**
 * Clean raw AI text by stripping citation markers and artifacts.
 * Returns both cleaned text and list of removed elements.
 */
function sanitizeAITextWithTracking(raw: string): SanitizationResult {
  let cleaned = raw;
  const removedElements: string[] = [];

  // Remove citation markers like [S1], [1], [Source 2], etc.
  const citationMatches = cleaned.match(/\[S?\d+\]/g) || [];
  const sourceMatches = cleaned.match(/\[Source\s*\d+\]/g) || [];

  if (citationMatches.length > 0) {
    removedElements.push(`citations:${citationMatches.length}`);
    cleaned = cleaned.replace(/\[S?\d+\]/g, "");
  }

  if (sourceMatches.length > 0) {
    removedElements.push(`source_refs:${sourceMatches.length}`);
    cleaned = cleaned.replace(/\[Source\s*\d+\]/g, "");
  }

  // Remove orphaned double spaces from citation removal
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  cleaned = cleaned.trim();

  return { cleaned, removedElements };
}

/**
 * Public sanitization function (backward compatible).
 */
export function sanitizeAIText(raw: string): string {
  return sanitizeAITextWithTracking(raw).cleaned;
}

/**
 * Attempt to parse a raw AI response string into a validated shape.
 * If the string is valid JSON matching the schema, use it directly.
 * Otherwise, treat the entire string as the answer.
 */
export function parseAIResponse(raw: string): ValidatedAIResponse & { wasSanitized?: boolean } {
  // Try JSON parse first
  try {
    const parsed = JSON.parse(raw);
    const result = aiResponseSchema.safeParse(parsed);
    if (result.success) {
      const { cleaned, removedElements } = sanitizeAITextWithTracking(result.data.answer);
      const wasSanitized = removedElements.length > 0;

      if (wasSanitized) {
        logRegressionEvent({
          eventType: "AI_SANITIZATION",
          severity: "info",
          message: "AI response required sanitization",
          details: {
            removed_elements: removedElements,
            response_length_before: raw.length,
            response_length_after: cleaned.length,
          },
        });
      }

      return { ...result.data, answer: cleaned, wasSanitized };
    }
  } catch {
    // Not JSON — treat as plain text
  }

  // Fallback: entire string is the answer
  const { cleaned, removedElements } = sanitizeAITextWithTracking(raw);
  const wasSanitized = removedElements.length > 0;

  if (wasSanitized) {
    logRegressionEvent({
      eventType: "AI_SANITIZATION",
      severity: "info",
      message: "AI text response required sanitization",
      details: {
        removed_elements: removedElements,
        response_length_before: raw.length,
        response_length_after: cleaned.length,
      },
    });
  }

  if (!cleaned) {
    return {
      answer: "I wasn't able to generate a response. Please try again.",
      wasSanitized: true,
    };
  }

  return { answer: cleaned, wasSanitized };
}

/**
 * Validate and sanitize an AI response, returning a safe-to-render result.
 * Logs errors for observability without breaking the UI.
 */
export function validateAIResponse(raw: unknown): ValidatedAIResponse & { wasSanitized?: boolean } {
  if (typeof raw === "string") {
    return parseAIResponse(raw);
  }

  if (typeof raw === "object" && raw !== null) {
    const result = aiResponseSchema.safeParse(raw);
    if (result.success) {
      const { cleaned, removedElements } = sanitizeAITextWithTracking(result.data.answer);
      const wasSanitized = removedElements.length > 0;

      if (wasSanitized) {
        logRegressionEvent({
          eventType: "AI_SANITIZATION",
          severity: "info",
          message: "AI object response required sanitization",
          details: { removed_elements: removedElements },
        });
      }

      return { ...result.data, answer: cleaned, wasSanitized };
    }

    console.warn("[AI Response] Schema validation failed:", result.error.issues);
    logRegressionEvent({
      eventType: "AI_SCHEMA_FAILURE",
      severity: "warn",
      message: "AI response schema validation failed",
      details: {
        issues: result.error.issues.map(i => i.message),
      },
    });
  }

  console.warn("[AI Response] Unexpected response type:", typeof raw);
  return {
    answer: "I wasn't able to generate a response. Please try again.",
    wasSanitized: true,
  };
}
