import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Check if organization is in locked_to_template mode
 */
export async function isLockedMode(organizationId: string): Promise<boolean> {
  if (!organizationId) return false;
  
  const { data, error } = await supabase
    .from('teams')
    .select('scorecard_mode')
    .eq('id', organizationId)
    .single();
  
  if (error) {
    console.error('Error checking scorecard mode:', error);
    return false;
  }
  
  return data?.scorecard_mode === 'locked_to_template';
}

/**
 * Guard function to prevent metric creation in locked mode
 * Returns true if metric creation is allowed, false otherwise (with toast)
 */
export async function canCreateMetric(organizationId: string): Promise<boolean> {
  const locked = await isLockedMode(organizationId);
  
  if (locked) {
    toast.error(
      "Locked Scorecard: metrics must be created in the Scorecard Template.",
      { duration: 5000 }
    );
    return false;
  }
  
  return true;
}

/**
 * Sync check version - uses pre-fetched org settings
 */
export function checkLockedModeSync(
  scorecardMode: string | null | undefined
): boolean {
  return scorecardMode === 'locked_to_template';
}

/**
 * Guard for locked mode - shows toast and returns false if locked
 */
export function guardLockedMode(
  scorecardMode: string | null | undefined,
  action: string = "create metrics"
): boolean {
  if (checkLockedModeSync(scorecardMode)) {
    toast.error(
      `Locked Scorecard: Cannot ${action}. Metrics must be managed in the Scorecard Template.`,
      { duration: 5000 }
    );
    return false;
  }
  return true;
}
