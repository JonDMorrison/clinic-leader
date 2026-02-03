/**
 * EMR Benchmark Analytics Page
 * 
 * SECURITY: This page shows cross-org benchmark data.
 * Access is restricted to:
 * 1. Master admins (can see cross-org comparisons)
 * 2. Org admins/directors (can see their own org's position vs anonymized cohort)
 */

import { EMRBenchmarkOverview } from "@/components/analytics/EMRBenchmarkOverview";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMasterAdminGate } from "@/hooks/useMasterAdminGate";
import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AccessRestrictedView } from "@/components/admin/AccessRestrictedView";
import { Skeleton } from "@/components/ui/skeleton";

export default function EMRBenchmark() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { isMasterAdmin, isLoading: adminLoading } = useMasterAdminGate();

  // Show loading while checking auth
  if (userLoading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Require authentication
  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  // Master admins can see everything
  if (isMasterAdmin) {
    return (
      <>
        <Helmet>
          <title>EMR Benchmark Analytics | ClinicLeader</title>
          <meta 
            name="description" 
            content="Anonymized performance benchmarks comparing Jane-integrated vs other EMR sources"
          />
        </Helmet>
        
        <EMRBenchmarkOverview />
      </>
    );
  }

  // Org-level admin/director can see their own org's comparison
  const allowedRoles = ["owner", "director", "admin"];
  if (allowedRoles.includes(currentUser.role)) {
    return (
      <>
        <Helmet>
          <title>EMR Benchmark Analytics | ClinicLeader</title>
          <meta 
            name="description" 
            content="View your organization's performance against anonymized benchmarks"
          />
        </Helmet>
        
        <EMRBenchmarkOverview />
      </>
    );
  }

  // Everyone else: access restricted
  return (
    <AccessRestrictedView
      title="Access Restricted"
      description="EMR benchmark analytics require admin or director permissions to access."
      backTo="/dashboard"
    />
  );
}
