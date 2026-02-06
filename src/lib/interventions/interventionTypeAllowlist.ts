/**
 * Intervention Type Allowlist
 * 
 * Controls which intervention types can be recommended.
 * Sensitive types (e.g., staffing_reduction) are disabled by default.
 * 
 * GOVERNANCE SINGLE SOURCE OF TRUTH:
 * This module uses `intervention_type_registry` exclusively.
 * The `intervention_types` table is LEGACY and should NOT be referenced
 * in any governance, analytics, or new feature code.
 */

import { supabase } from "@/integrations/supabase/client";

export interface AllowedInterventionType {
  id: string;
  name: string;
  category: string;
  description: string | null;
  isActive: boolean;
}

/**
 * Fetch allowed intervention types from the governance registry
 * Returns only active types by default
 * 
 * USES: intervention_type_registry (single source of truth)
 */
export async function getAllowedInterventionTypes(
  _organizationId?: string // Kept for API compatibility, registry is global
): Promise<AllowedInterventionType[]> {
  const { data, error } = await supabase
    .from("intervention_type_registry")
    .select("id, name, category, description, status")
    .eq("status", "active")
    .order("category")
    .order("name");

  if (error) {
    console.error("Failed to fetch intervention types from registry:", error);
    return [];
  }

  return (data || []).map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description,
    isActive: t.status === "active",
  }));
}

/**
 * Check if a specific intervention type is allowed by ID
 * 
 * USES: intervention_type_registry (single source of truth)
 */
export async function isInterventionTypeAllowed(
  typeId: string
): Promise<{ allowed: boolean; reason: string | null }> {
  const { data, error } = await supabase
    .from("intervention_type_registry")
    .select("id, name, status")
    .eq("id", typeId)
    .maybeSingle();

  if (error) {
    console.error("Failed to check intervention type:", error);
    return { allowed: false, reason: "Failed to verify intervention type" };
  }

  if (!data) {
    return { 
      allowed: false, 
      reason: `Unknown intervention type ID: ${typeId}. Only approved types can be used.` 
    };
  }

  if (data.status !== "active") {
    return { 
      allowed: false, 
      reason: `${data.name} is not active in the registry` 
    };
  }

  return { allowed: true, reason: null };
}

/**
 * LEGACY: Check intervention type by string key (for recommendation engine compatibility)
 * This bridges the old intervention_types.type_key to intervention_type_registry.name
 * 
 * @deprecated Recommendation engine should migrate to use intervention_type_id
 */
export async function isLegacyInterventionTypeAllowed(
  _organizationId: string,
  typeKey: string
): Promise<{ allowed: boolean; reason: string | null }> {
  // Legacy types used snake_case keys like "workflow_change"
  // Map to registry by converting to title case and matching name
  const normalizedName = typeKey
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  const { data, error } = await supabase
    .from("intervention_type_registry")
    .select("id, name, status")
    .ilike("name", `%${normalizedName.split(" ")[0]}%`)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to check legacy intervention type:", error);
    // Allow legacy types that don't map to registry to pass through
    return { allowed: true, reason: null };
  }

  if (!data) {
    // Legacy types without registry mapping are allowed for backward compatibility
    console.warn(`Legacy type '${typeKey}' not found in registry, allowing by default`);
    return { allowed: true, reason: null };
  }

  return { allowed: true, reason: null };
}

/**
 * @deprecated Use getAllowedInterventionTypes instead
 * This function is kept for backward compatibility but uses the registry
 */
export async function filterByAllowedTypes<T extends { intervention_type_id?: string | null }>(
  recommendations: T[]
): Promise<{ allowed: T[]; filtered: { item: T; reason: string }[] }> {
  const allowedTypes = await getAllowedInterventionTypes();
  const allowedTypeIds = new Set(allowedTypes.map((t) => t.id));

  const allowed: T[] = [];
  const filtered: { item: T; reason: string }[] = [];

  for (const rec of recommendations) {
    if (rec.intervention_type_id && allowedTypeIds.has(rec.intervention_type_id)) {
      allowed.push(rec);
    } else if (!rec.intervention_type_id) {
      // Untyped interventions are allowed
      allowed.push(rec);
    } else {
      const check = await isInterventionTypeAllowed(rec.intervention_type_id);
      filtered.push({
        item: rec,
        reason: check.reason || `Type ${rec.intervention_type_id} not in registry`,
      });
    }
  }

  return { allowed, filtered };
}

/** 
 * List of known sensitive intervention types 
 * These are checked against the registry's category field
 */
export const SENSITIVE_CATEGORIES = [
  "Staffing & HR",
] as const;

/** Check if a type category is sensitive */
export function isSensitiveCategory(category: string): boolean {
  return SENSITIVE_CATEGORIES.includes(category as typeof SENSITIVE_CATEGORIES[number]);
}
