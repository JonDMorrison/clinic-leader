import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Check if organization is in aligned mode
 */
export async function isAlignedMode(organizationId: string): Promise<boolean> {
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
  
  return data?.scorecard_mode === 'aligned';
}

/**
 * Guard function to prevent metric creation in aligned mode
 * Returns true if metric creation is allowed, false otherwise (with toast)
 */
export async function canCreateMetric(organizationId: string): Promise<boolean> {
  const aligned = await isAlignedMode(organizationId);
  
  if (aligned) {
    toast.error(
      "Aligned Scorecard: metrics must be created in the Scorecard Template.",
      { duration: 5000 }
    );
    return false;
  }
  
  return true;
}

/**
 * Sync check version - uses pre-fetched org settings
 */
export function checkAlignedModeSync(
  scorecardMode: string | null | undefined
): boolean {
  return scorecardMode === 'aligned';
}

/**
 * Guard for aligned mode - shows toast and returns false if aligned
 */
export function guardAlignedMode(
  scorecardMode: string | null | undefined,
  action: string = "create metrics"
): boolean {
  if (checkAlignedModeSync(scorecardMode)) {
    toast.error(
      `Aligned Scorecard: Cannot ${action}. Metrics must be managed in the Scorecard Template.`,
      { duration: 5000 }
    );
    return false;
  }
  return true;
}
