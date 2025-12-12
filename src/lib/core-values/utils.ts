import type { CoreValue } from "./types";

/**
 * Generate a hash from core values for version tracking.
 * Used to detect when core values change and re-prompt acknowledgment.
 */
export function generateCoreValuesHash(values: CoreValue[]): string {
  const content = values
    .filter((v) => v.is_active)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((v) => `${v.title}|${v.short_behavior || ""}`)
    .join("||");

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
