/**
 * Intervention Type Allowlist
 * 
 * Controls which intervention types can be recommended.
 * Sensitive types (e.g., staffing_reduction) are disabled by default.
 */

import { supabase } from "@/integrations/supabase/client";
import type { InterventionType } from "./types";

export interface AllowedInterventionType {
  id: string;
  typeKey: InterventionType;
  displayName: string;
  description: string | null;
  isEnabled: boolean;
  isSensitive: boolean;
  requiresApproval: boolean;
}

/**
 * Fetch allowed intervention types for an organization
 * Returns only enabled, non-sensitive types by default
 */
export async function getAllowedInterventionTypes(
  organizationId: string,
  includeSensitive = false
): Promise<AllowedInterventionType[]> {
  let query = supabase
    .from("intervention_types")
    .select("*")
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .eq("is_enabled", true);

  if (!includeSensitive) {
    query = query.eq("is_sensitive", false);
  }

  const { data, error } = await query.order("display_name");

  if (error) {
    console.error("Failed to fetch intervention types:", error);
    return [];
  }

  return (data || []).map((t) => ({
    id: t.id,
    typeKey: t.type_key as InterventionType,
    displayName: t.display_name,
    description: t.description,
    isEnabled: t.is_enabled,
    isSensitive: t.is_sensitive,
    requiresApproval: t.requires_approval,
  }));
}

/**
 * Check if a specific intervention type is allowed
 */
export async function isInterventionTypeAllowed(
  organizationId: string,
  typeKey: string
): Promise<{ allowed: boolean; reason: string | null }> {
  const { data, error } = await supabase
    .from("intervention_types")
    .select("is_enabled, is_sensitive, display_name")
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .eq("type_key", typeKey)
    .order("organization_id", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to check intervention type:", error);
    return { allowed: false, reason: "Failed to verify intervention type" };
  }

  if (!data) {
    return { 
      allowed: false, 
      reason: `Unknown intervention type: ${typeKey}. Only approved types can be recommended.` 
    };
  }

  if (!data.is_enabled) {
    return { 
      allowed: false, 
      reason: `${data.display_name} is not enabled for recommendations` 
    };
  }

  if (data.is_sensitive) {
    return { 
      allowed: false, 
      reason: `${data.display_name} is a sensitive intervention type and requires explicit enablement` 
    };
  }

  return { allowed: true, reason: null };
}

/**
 * Filter recommendations to only allowed types
 */
export async function filterByAllowedTypes<T extends { intervention_type: string }>(
  organizationId: string,
  recommendations: T[]
): Promise<{ allowed: T[]; filtered: { item: T; reason: string }[] }> {
  const allowedTypes = await getAllowedInterventionTypes(organizationId);
  const allowedTypeKeys = new Set(allowedTypes.map((t) => t.typeKey));

  const allowed: T[] = [];
  const filtered: { item: T; reason: string }[] = [];

  for (const rec of recommendations) {
    if (allowedTypeKeys.has(rec.intervention_type as InterventionType)) {
      allowed.push(rec);
    } else {
      const check = await isInterventionTypeAllowed(organizationId, rec.intervention_type);
      filtered.push({
        item: rec,
        reason: check.reason || `Type ${rec.intervention_type} not in allowlist`,
      });
    }
  }

  return { allowed, filtered };
}

/** List of known sensitive intervention types */
export const SENSITIVE_INTERVENTION_TYPES = [
  "staffing_reduction",
  "compensation_change",
  "termination",
] as const;

/** Check if a type is in the sensitive list */
export function isSensitiveType(typeKey: string): boolean {
  return SENSITIVE_INTERVENTION_TYPES.includes(typeKey as typeof SENSITIVE_INTERVENTION_TYPES[number]);
}
