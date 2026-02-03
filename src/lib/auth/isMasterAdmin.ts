/**
 * Master Admin Authentication Helpers
 * 
 * Master admins have platform-level access to cross-org benchmarks.
 * This role CANNOT be self-assigned - it requires direct DB access.
 * 
 * SECURITY: is_master_admin() is a SECURITY DEFINER function that:
 * 1. Checks platform_roles table (not accessible directly via RLS)
 * 2. Cannot be spoofed via client-side manipulation
 * 3. Logs access attempts to benchmark_audit_log
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Check if current user is a master admin via RPC
 * This is the ONLY safe way to check master admin status
 * 
 * @returns Promise<boolean>
 */
export async function checkIsMasterAdmin(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("is_master_admin");
    
    if (error) {
      console.error("[Auth] Failed to check master admin status:", error.message);
      return false;
    }
    
    return data === true;
  } catch (err) {
    console.error("[Auth] Exception checking master admin:", err);
    return false;
  }
}

/**
 * Validate that master admin access is granted
 * Throws an error if not authorized - use for guarding operations
 * 
 * @throws Error if not a master admin
 */
export async function requireMasterAdmin(): Promise<void> {
  const isMaster = await checkIsMasterAdmin();
  
  if (!isMaster) {
    throw new Error("Access denied: Master admin privileges required");
  }
}

/**
 * Type for master admin gate result
 */
export interface MasterAdminGateResult {
  isMasterAdmin: boolean;
  loading: boolean;
  error: Error | null;
}

/**
 * SECURITY NOTES:
 * 
 * 1. NEVER check master admin status using:
 *    - localStorage/sessionStorage (can be manipulated)
 *    - Client-side state alone (can be spoofed)
 *    - Direct platform_roles table queries (blocked by RLS)
 * 
 * 2. ALWAYS use:
 *    - supabase.rpc("is_master_admin") for server-validated checks
 *    - useMasterAdmin() or useMasterAdminGate() hooks in React
 * 
 * 3. The platform_roles table has RLS policies that:
 *    - Block all SELECT for non-master-admins
 *    - Prevent users from adding themselves as master admin
 *    - Only master admins can manage other master admin roles
 */
