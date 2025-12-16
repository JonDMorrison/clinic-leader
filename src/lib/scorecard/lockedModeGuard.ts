import { supabase } from "@/integrations/supabase/client";

/**
 * Check if organization is in aligned mode (async)
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
 * Sync check version - uses pre-fetched org settings
 */
export function checkAlignedModeSync(
  scorecardMode: string | null | undefined
): boolean {
  return scorecardMode === 'aligned';
}
