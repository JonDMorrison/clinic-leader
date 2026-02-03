import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type InterventionEventType =
  | "create_intervention"
  | "edit_intervention"
  | "link_metric"
  | "unlink_metric"
  | "evaluate_outcomes"
  | "generate_ai_summary"
  | "create_issue_from_failure";

/**
 * Log an intervention event for audit trail.
 * Events are logged asynchronously and don't block the calling operation.
 */
export async function logInterventionEvent(
  interventionId: string,
  eventType: InterventionEventType,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    // Call the RPC function to log the event
    const { error } = await supabase.rpc("log_intervention_event", {
      _intervention_id: interventionId,
      _event_type: eventType,
      _details: details as Json,
    });

    if (error) {
      console.error("Failed to log intervention event:", error);
    }
  } catch (error) {
    console.error("Error logging intervention event:", error);
    // Don't throw - event logging is not critical path
  }
}

/**
 * Fire-and-forget event logging (doesn't block)
 */
export function logInterventionEventAsync(
  interventionId: string,
  eventType: InterventionEventType,
  details: Record<string, unknown> = {}
): void {
  // Fire and forget - don't await
  logInterventionEvent(interventionId, eventType, details).catch(() => {
    // Silently ignore errors
  });
}
