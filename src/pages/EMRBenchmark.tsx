/**
 * EMR Benchmark Analytics Page
 * Protected route for viewing EMR outcome comparisons
 */

import { EMRBenchmarkOverview } from "@/components/analytics/EMRBenchmarkOverview";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export default function EMRBenchmark() {
  const { data: currentUser, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Require authentication
  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  // Require admin or director role for benchmark access
  const allowedRoles = ["owner", "director", "admin"];
  if (!allowedRoles.includes(currentUser.role)) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground mt-2">
          EMR benchmark analytics require admin or director permissions.
        </p>
      </div>
    );
  }

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
