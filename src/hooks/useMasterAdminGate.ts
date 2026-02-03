/**
 * Master Admin Gate Hook
 * 
 * Provides a complete gate for master-admin-only routes and components.
 * Returns loading, error, and access status.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export interface MasterAdminGateResult {
  /** Whether the user is a master admin */
  isMasterAdmin: boolean;
  /** Whether the check is still loading */
  isLoading: boolean;
  /** Any error that occurred during the check */
  error: Error | null;
  /** Whether the gate check is complete (not loading and no error) */
  isReady: boolean;
}

/**
 * Hook to check master admin status with proper loading/error states
 * Use this for conditional rendering of master-admin-only content
 */
export function useMasterAdminGate(): MasterAdminGateResult {
  const query = useQuery({
    queryKey: ["is-master-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_master_admin");
      
      if (error) {
        throw new Error(`Failed to verify admin status: ${error.message}`);
      }
      
      return data === true;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1, // Only retry once on failure
  });

  return {
    isMasterAdmin: query.data ?? false,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    isReady: !query.isLoading && !query.error,
  };
}

/**
 * Hook that automatically redirects non-master-admins to a specified path
 * Use this at the top of master-admin-only pages
 * 
 * @param redirectTo - Path to redirect to if not a master admin (default: "/dashboard")
 */
export function useMasterAdminRedirect(redirectTo = "/dashboard"): MasterAdminGateResult {
  const navigate = useNavigate();
  const gate = useMasterAdminGate();

  useEffect(() => {
    // Only redirect after loading is complete and user is not a master admin
    if (!gate.isLoading && !gate.isMasterAdmin) {
      console.warn("[Auth] Non-master-admin attempted to access restricted route");
      navigate(redirectTo, { replace: true });
    }
  }, [gate.isLoading, gate.isMasterAdmin, navigate, redirectTo]);

  return gate;
}

/**
 * Component guard for master-admin-only UI sections
 * Renders nothing (or fallback) if not a master admin
 * 
 * Usage:
 * ```tsx
 * <MasterAdminOnly fallback={<AccessDenied />}>
 *   <SensitiveContent />
 * </MasterAdminOnly>
 * ```
 */
export function useMasterAdminOnly() {
  const gate = useMasterAdminGate();
  
  return {
    ...gate,
    // Only show content when loaded AND is master admin
    shouldShow: gate.isReady && gate.isMasterAdmin,
  };
}
