/**
 * Intervention Type Classifier
 * AI-assisted classification of interventions into standardized governance types
 * 
 * SAFETY:
 * - Only sends title + description (no patient data)
 * - Logs all classification events
 * - Returns null if confidence < 60
 */

import { supabase } from "@/integrations/supabase/client";

export interface InterventionTypeRecord {
  id: string;
  name: string;
  category: string;
  description: string;
  status: string;
}

export interface TypeSuggestion {
  suggested_type_id: string | null;
  suggested_type_name: string | null;
  confidence: number;
  rationale: string;
  matched_signals: string[];
}

/**
 * Fetch all active intervention types from the governance registry
 * Used to populate UI dropdowns and build AI classification prompts
 */
export async function getActiveInterventionTypes(): Promise<InterventionTypeRecord[]> {
  const { data, error } = await supabase
    .from("intervention_type_registry")
    .select("id, name, category, description, status")
    .eq("status", "active")
    .order("category")
    .order("name");

  if (error) {
    console.error("Failed to fetch intervention types:", error);
    return [];
  }

  return data || [];
}

/**
 * Get intervention types grouped by category for UI display
 */
export async function getInterventionTypesByCategory(): Promise<Record<string, InterventionTypeRecord[]>> {
  const types = await getActiveInterventionTypes();
  
  return types.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, InterventionTypeRecord[]>);
}

/**
 * Suggest the best intervention type based on title and description
 * Uses AI classification with structured output
 * 
 * @param params.title - Intervention title (required)
 * @param params.description - Intervention description (optional)
 * @param params.interventionId - If provided, logs classification event
 * @returns TypeSuggestion with suggested type or null if low confidence
 */
export async function suggestInterventionType(params: {
  title: string;
  description?: string;
  interventionId?: string;
}): Promise<TypeSuggestion> {
  const { title, description, interventionId } = params;

  if (!title || title.trim().length === 0) {
    return {
      suggested_type_id: null,
      suggested_type_name: null,
      confidence: 0,
      rationale: "Title is required for classification",
      matched_signals: [],
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("ai-classify-intervention-type", {
      body: {
        title: title.trim(),
        description: description?.trim() || null,
        intervention_id: interventionId || null,
      },
    });

    if (error) {
      console.error("Classification function error:", error);
      
      // Handle specific error codes
      if (error.message?.includes("429")) {
        return {
          suggested_type_id: null,
          suggested_type_name: null,
          confidence: 0,
          rationale: "Rate limit exceeded. Please try again in a moment.",
          matched_signals: [],
        };
      }
      if (error.message?.includes("402")) {
        return {
          suggested_type_id: null,
          suggested_type_name: null,
          confidence: 0,
          rationale: "AI credits exhausted. Please contact your administrator.",
          matched_signals: [],
        };
      }

      return {
        suggested_type_id: null,
        suggested_type_name: null,
        confidence: 0,
        rationale: "Classification temporarily unavailable",
        matched_signals: [],
      };
    }

    // Validate response structure
    if (!data || typeof data.confidence !== "number") {
      console.error("Invalid classification response:", data);
      return {
        suggested_type_id: null,
        suggested_type_name: null,
        confidence: 0,
        rationale: "Invalid classification response",
        matched_signals: [],
      };
    }

    // If confidence is below threshold, null out the suggestion
    if (data.confidence < 60) {
      return {
        suggested_type_id: null,
        suggested_type_name: null,
        confidence: data.confidence,
        rationale: data.rationale || "Confidence too low for reliable suggestion",
        matched_signals: data.matched_signals || [],
      };
    }

    return {
      suggested_type_id: data.suggested_type_id,
      suggested_type_name: data.suggested_type_name,
      confidence: data.confidence,
      rationale: data.rationale,
      matched_signals: data.matched_signals || [],
    };

  } catch (err) {
    console.error("Error suggesting intervention type:", err);
    return {
      suggested_type_id: null,
      suggested_type_name: null,
      confidence: 0,
      rationale: "An error occurred during classification",
      matched_signals: [],
    };
  }
}

/**
 * Apply a type suggestion to an intervention
 * Updates the intervention with the suggested type and logs the event
 */
export async function applyTypeSuggestion(params: {
  interventionId: string;
  typeId: string;
  source: "ai" | "user" | "ai_backfill";
  confidence?: number;
}): Promise<{ success: boolean; error?: string }> {
  const { interventionId, typeId, source, confidence } = params;

  const { error } = await supabase
    .from("interventions")
    .update({
      intervention_type_id: typeId,
      intervention_type_source: source,
      intervention_type_confidence: confidence || null,
    })
    .eq("id", interventionId);

  if (error) {
    console.error("Failed to apply type suggestion:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Clear the intervention type from an intervention
 */
export async function clearInterventionType(interventionId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("interventions")
    .update({
      intervention_type_id: null,
      intervention_type_source: null,
      intervention_type_confidence: null,
    })
    .eq("id", interventionId);

  if (error) {
    console.error("Failed to clear intervention type:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
