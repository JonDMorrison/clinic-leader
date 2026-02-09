/**
 * AI Response Contract Enforcement
 * 
 * Validates AI responses before rendering to prevent:
 * - Raw JSON leaking into UI
 * - Citation markers ([S1], [1]) appearing in text
 * - Malformed or empty responses
 */

import { z } from "zod";

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
 * Clean raw AI text by stripping citation markers and artifacts.
 */
export function sanitizeAIText(raw: string): string {
  let cleaned = raw;

  // Remove citation markers like [S1], [1], [Source 2], etc.
  cleaned = cleaned.replace(/\[S?\d+\]/g, "");
  cleaned = cleaned.replace(/\[Source\s*\d+\]/g, "");

  // Remove orphaned double spaces from citation removal
  cleaned = cleaned.replace(/\s{2,}/g, " ");

  // Trim leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Attempt to parse a raw AI response string into a validated shape.
 * If the string is valid JSON matching the schema, use it directly.
 * Otherwise, treat the entire string as the answer.
 */
export function parseAIResponse(raw: string): ValidatedAIResponse {
  // Try JSON parse first
  try {
    const parsed = JSON.parse(raw);
    const result = aiResponseSchema.safeParse(parsed);
    if (result.success) {
      return {
        ...result.data,
        answer: sanitizeAIText(result.data.answer),
      };
    }
  } catch {
    // Not JSON — treat as plain text
  }

  // Fallback: entire string is the answer
  const cleaned = sanitizeAIText(raw);

  if (!cleaned) {
    return {
      answer: "I wasn't able to generate a response. Please try again.",
    };
  }

  return { answer: cleaned };
}

/**
 * Validate and sanitize an AI response, returning a safe-to-render result.
 * Logs errors for observability without breaking the UI.
 */
export function validateAIResponse(raw: unknown): ValidatedAIResponse {
  if (typeof raw === "string") {
    return parseAIResponse(raw);
  }

  if (typeof raw === "object" && raw !== null) {
    const result = aiResponseSchema.safeParse(raw);
    if (result.success) {
      return {
        ...result.data,
        answer: sanitizeAIText(result.data.answer),
      };
    }
    console.warn("[AI Response] Schema validation failed:", result.error.issues);
  }

  console.warn("[AI Response] Unexpected response type:", typeof raw);
  return {
    answer: "I wasn't able to generate a response. Please try again.",
  };
}
