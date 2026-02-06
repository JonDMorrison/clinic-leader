/**
 * Backfill Intervention Types
 * 
 * Admin-only service to classify historical interventions that lack governance types.
 * Uses AI classification with higher confidence threshold for backfill.
 * 
 * SECURITY:
 * - Master admin only
 * - Does not overwrite user-selected types
 * - Rate-limited (50 per run)
 * - Logs all updates to intervention_events
 */

import { supabase } from "@/integrations/supabase/client";
import { suggestInterventionType, applyTypeSuggestion } from "./interventionTypeClassifier";

const BATCH_SIZE = 50;
const BACKFILL_CONFIDENCE_THRESHOLD = 70;

export interface BackfillProgress {
  processed: number;
  updated: number;
  skippedLowConfidence: number;
  skippedAlreadyTyped: number;
  errors: number;
  totalUntyped: number;
}

export interface BackfillResult {
  success: boolean;
  progress: BackfillProgress;
  message: string;
  details?: BackfillDetail[];
}

export interface BackfillDetail {
  interventionId: string;
  title: string;
  action: "updated" | "skipped_low_confidence" | "skipped_already_typed" | "error";
  typeId?: string;
  typeName?: string;
  confidence?: number;
  error?: string;
}

/**
 * Get count of untyped interventions (for UI display)
 */
export async function getUntypedInterventionCount(): Promise<number> {
  const { count, error } = await supabase
    .from("interventions")
    .select("*", { count: "exact", head: true })
    .is("intervention_type_id", null)
    .not("title", "is", null);

  if (error) {
    console.error("Error counting untyped interventions:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Get breakdown of intervention type sources
 */
export async function getInterventionTypeStats(): Promise<{
  untyped: number;
  aiSuggested: number;
  userSelected: number;
  aiBackfilled: number;
}> {
  const [untypedRes, aiRes, userRes, backfillRes] = await Promise.all([
    supabase
      .from("interventions")
      .select("*", { count: "exact", head: true })
      .is("intervention_type_id", null),
    supabase
      .from("interventions")
      .select("*", { count: "exact", head: true })
      .eq("intervention_type_source", "ai"),
    supabase
      .from("interventions")
      .select("*", { count: "exact", head: true })
      .eq("intervention_type_source", "user"),
    supabase
      .from("interventions")
      .select("*", { count: "exact", head: true })
      .eq("intervention_type_source", "ai_backfill"),
  ]);

  return {
    untyped: untypedRes.count || 0,
    aiSuggested: aiRes.count || 0,
    userSelected: userRes.count || 0,
    aiBackfilled: backfillRes.count || 0,
  };
}

/**
 * Backfill intervention types for historical interventions
 * 
 * @param onProgress - Optional callback for real-time progress updates
 * @returns BackfillResult with progress and details
 */
export async function backfillInterventionTypes(
  onProgress?: (progress: BackfillProgress) => void
): Promise<BackfillResult> {
  // Verify master admin access
  const { data: isMasterAdmin, error: adminError } = await supabase.rpc("is_master_admin");
  
  if (adminError || !isMasterAdmin) {
    return {
      success: false,
      progress: createEmptyProgress(),
      message: "Unauthorized: Master admin access required",
    };
  }

  const progress: BackfillProgress = {
    processed: 0,
    updated: 0,
    skippedLowConfidence: 0,
    skippedAlreadyTyped: 0,
    errors: 0,
    totalUntyped: 0,
  };

  const details: BackfillDetail[] = [];

  try {
    // Get count of untyped interventions
    const totalCount = await getUntypedInterventionCount();
    progress.totalUntyped = totalCount;

    if (totalCount === 0) {
      return {
        success: true,
        progress,
        message: "No untyped interventions found",
        details: [],
      };
    }

    // Fetch batch of untyped interventions (rate-limited)
    const { data: interventions, error: fetchError } = await supabase
      .from("interventions")
      .select("id, title, description, intervention_type_id, intervention_type_source")
      .is("intervention_type_id", null)
      .not("title", "is", null)
      .order("created_at", { ascending: false })
      .limit(BATCH_SIZE);

    if (fetchError) {
      throw new Error(`Failed to fetch interventions: ${fetchError.message}`);
    }

    if (!interventions || interventions.length === 0) {
      return {
        success: true,
        progress,
        message: "No untyped interventions found",
        details: [],
      };
    }

    // Process each intervention
    for (const intervention of interventions) {
      progress.processed++;
      onProgress?.(progress);

      // Double-check not already typed (idempotency guard)
      if (intervention.intervention_type_id) {
        progress.skippedAlreadyTyped++;
        details.push({
          interventionId: intervention.id,
          title: intervention.title || "",
          action: "skipped_already_typed",
        });
        continue;
      }

      // Skip if user has already set a type manually (even if it's now null)
      if (intervention.intervention_type_source === "user") {
        progress.skippedAlreadyTyped++;
        details.push({
          interventionId: intervention.id,
          title: intervention.title || "",
          action: "skipped_already_typed",
        });
        continue;
      }

      try {
        // Get AI classification
        const suggestion = await suggestInterventionType({
          title: intervention.title || "",
          description: intervention.description || undefined,
          interventionId: intervention.id,
        });

        // Check confidence threshold (higher for backfill)
        if (!suggestion.suggested_type_id || suggestion.confidence < BACKFILL_CONFIDENCE_THRESHOLD) {
          progress.skippedLowConfidence++;
          details.push({
            interventionId: intervention.id,
            title: intervention.title || "",
            action: "skipped_low_confidence",
            confidence: suggestion.confidence,
          });
          continue;
        }

        // Apply the type
        const applyResult = await applyTypeSuggestion({
          interventionId: intervention.id,
          typeId: suggestion.suggested_type_id,
          source: "ai_backfill",
          confidence: suggestion.confidence,
        });

        if (applyResult.success) {
          progress.updated++;
          details.push({
            interventionId: intervention.id,
            title: intervention.title || "",
            action: "updated",
            typeId: suggestion.suggested_type_id,
            typeName: suggestion.suggested_type_name || undefined,
            confidence: suggestion.confidence,
          });

          // Log to intervention_events
          await logBackfillEvent(intervention.id, {
            typeId: suggestion.suggested_type_id,
            typeName: suggestion.suggested_type_name,
            confidence: suggestion.confidence,
            model: "google/gemini-3-flash-preview",
          });
        } else {
          progress.errors++;
          details.push({
            interventionId: intervention.id,
            title: intervention.title || "",
            action: "error",
            error: applyResult.error,
          });
        }

        // Small delay to avoid rate limiting
        await sleep(200);

      } catch (err) {
        progress.errors++;
        details.push({
          interventionId: intervention.id,
          title: intervention.title || "",
          action: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }

      onProgress?.(progress);
    }

    return {
      success: true,
      progress,
      message: `Processed ${progress.processed} interventions: ${progress.updated} updated, ${progress.skippedLowConfidence} low confidence, ${progress.errors} errors`,
      details,
    };

  } catch (err) {
    console.error("Backfill error:", err);
    return {
      success: false,
      progress,
      message: err instanceof Error ? err.message : "Backfill failed",
      details,
    };
  }
}

/**
 * Log backfill event to intervention_events
 */
async function logBackfillEvent(
  interventionId: string,
  metadata: {
    typeId: string;
    typeName: string | null;
    confidence: number;
    model: string;
  }
): Promise<void> {
  try {
    // Get current user for actor_id
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get intervention's organization_id
    const { data: intervention } = await supabase
      .from("interventions")
      .select("organization_id")
      .eq("id", interventionId)
      .single();

    if (!intervention?.organization_id) {
      console.warn("Cannot log backfill event: missing organization_id");
      return;
    }

    await supabase.from("intervention_events").insert({
      intervention_id: interventionId,
      organization_id: intervention.organization_id,
      event_type: "type_backfilled",
      actor_user_id: user?.id || null,
      details: {
        type_id: metadata.typeId,
        type_name: metadata.typeName,
        confidence: metadata.confidence,
        model: metadata.model,
        source: "ai_backfill",
        backfill_threshold: BACKFILL_CONFIDENCE_THRESHOLD,
      },
    });
  } catch (err) {
    console.error("Failed to log backfill event:", err);
  }
}

function createEmptyProgress(): BackfillProgress {
  return {
    processed: 0,
    updated: 0,
    skippedLowConfidence: 0,
    skippedAlreadyTyped: 0,
    errors: 0,
    totalUntyped: 0,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
