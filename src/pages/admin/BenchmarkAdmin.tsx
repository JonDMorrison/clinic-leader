/**
 * Benchmark Admin Page
 * 
 * SECURITY: Master admin only - manages cross-org benchmark cohorts and snapshots.
 * All data access goes through secure RPCs with audit logging.
 */

import { useNavigate, Link } from "react-router-dom";
import { useMasterAdminGate } from "@/hooks/useMasterAdminGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Users, Database, FileText, BarChart3 } from "lucide-react";
import { CohortList } from "@/components/admin/benchmarks/CohortList";
import { CohortMembershipManager } from "@/components/admin/benchmarks/CohortMembershipManager";
import { SnapshotComputer } from "@/components/admin/benchmarks/SnapshotComputer";
import { BenchmarkAuditLog } from "@/components/admin/benchmarks/BenchmarkAuditLog";
import { AccessRestrictedView } from "@/components/admin/AccessRestrictedView";

export default function BenchmarkAdmin() {
  const navigate = useNavigate();
  const { isMasterAdmin, isLoading, error } = useMasterAdminGate();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Not a master admin - show access restricted (no redirect to avoid flash)
  if (!isMasterAdmin) {
    return (
      <AccessRestrictedView
        title="Master Admin Required"
        description="This area manages cross-organization benchmark data and requires platform administrator privileges."
        backTo="/dashboard"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Benchmark Admin</h1>
            <p className="text-muted-foreground">
              Manage cross-organization benchmarking cohorts and snapshots
            </p>
          </div>
        </div>
        <Link to="/admin/benchmarks/jane-vs-nonjane">
          <Button variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Jane vs Non-Jane
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="cohorts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cohorts" className="gap-2">
            <Users className="h-4 w-4" />
            Cohorts
          </TabsTrigger>
          <TabsTrigger value="membership" className="gap-2">
            <Users className="h-4 w-4" />
            Membership
          </TabsTrigger>
          <TabsTrigger value="snapshots" className="gap-2">
            <Database className="h-4 w-4" />
            Snapshots
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <FileText className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cohorts">
          <CohortList />
        </TabsContent>

        <TabsContent value="membership">
          <CohortMembershipManager />
        </TabsContent>

        <TabsContent value="snapshots">
          <SnapshotComputer />
        </TabsContent>

        <TabsContent value="audit">
          <BenchmarkAuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
