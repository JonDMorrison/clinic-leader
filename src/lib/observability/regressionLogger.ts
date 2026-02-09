/**
 * Regression Event Logger
 * 
 * Centralized logging for reliability regression events.
 * Routes through the log-regression-event edge function
 * to enforce whitelisting and payload sanitization.
 */

import { supabase } from "@/integrations/supabase/client";

export type RegressionEventType =
  | "AI_SANITIZATION"
  | "AI_SCHEMA_FAILURE"
  | "EDGE_FUNCTION_FAILURE"
  | "HEALTH_CHECK_FAILURE"
  | "INGESTION_MAPPING_FAILURE";

interface LogRegressionEventParams {
  eventType: RegressionEventType;
  severity?: "info" | "warn" | "error";
  message: string;
  details?: Record<string, unknown>;
  organizationId?: string;
}

/**
 * Log a regression event via edge function.
 * Fails silently to avoid disrupting the user experience.
 */
export async function logRegressionEvent({
  eventType,
  severity = "warn",
  message,
  details = {},
  organizationId,
}: LogRegressionEventParams): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.functions.invoke("log-regression-event", {
      method: "POST",
      body: {
        event_type: eventType,
        severity,
        message,
        details,
        organization_id: organizationId || null,
      },
    });
  } catch (e) {
    // Silent failure — observability should never break the app
    console.warn("[RegressionLogger] Failed to log event:", e);
  }
}
