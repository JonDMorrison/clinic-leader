/**
 * Regression Event Logger
 * 
 * Centralized logging for reliability regression events.
 * Writes to system_regression_events table for observability.
 */

import { supabase } from "@/integrations/supabase/client";

export type RegressionEventType =
  | "ai_schema_failure"
  | "function_health_failure"
  | "storage_migration"
  | "metric_visibility_conflict"
  | "response_format_error";

interface LogRegressionEventParams {
  eventType: RegressionEventType;
  severity?: "info" | "warn" | "error";
  message: string;
  details?: Record<string, unknown>;
  organizationId?: string;
}

/**
 * Log a regression event. Fails silently to avoid disrupting the user experience.
 */
export async function logRegressionEvent({
  eventType,
  severity = "warn",
  message,
  details = {},
  organizationId,
}: LogRegressionEventParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase.from("system_regression_events") as any).insert({
      event_type: eventType,
      severity,
      message,
      details,
      organization_id: organizationId || null,
      user_id: user.id,
    });
  } catch (e) {
    // Silent failure — observability should never break the app
    console.warn("[RegressionLogger] Failed to log event:", e);
  }
}
