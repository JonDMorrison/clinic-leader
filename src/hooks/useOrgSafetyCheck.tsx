import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldX } from "lucide-react";

/**
 * Hook for validating organization context before data operations.
 * Returns org ID if valid, or null with error component if missing.
 */
export function useOrgSafetyCheck() {
  const { data: currentUser, isLoading } = useCurrentUser();
  
  const orgId = currentUser?.team_id || null;
  
  const OrgMissingError = () => (
    <Alert variant="destructive" className="max-w-md mx-auto mt-12">
      <ShieldX className="h-5 w-5" />
      <AlertTitle>No organization selected</AlertTitle>
      <AlertDescription>
        Please re-login to continue. Your session may have expired or you're not assigned to an organization.
      </AlertDescription>
    </Alert>
  );

  return {
    orgId,
    isLoading,
    isValid: !!orgId && !isLoading,
    OrgMissingError,
  };
}

/**
 * Utility to validate org context before mutation - throws if missing
 */
export function assertOrgId(orgId: string | null | undefined, context: string = 'operation'): asserts orgId is string {
  if (!orgId || orgId.trim() === '') {
    throw new Error(`Organization ID required for ${context}. Please re-login.`);
  }
}
