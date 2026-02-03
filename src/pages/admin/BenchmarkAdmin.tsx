import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMasterAdmin } from "@/hooks/useMasterAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Users, Database, FileText } from "lucide-react";
import { CohortList } from "@/components/admin/benchmarks/CohortList";
import { CohortMembershipManager } from "@/components/admin/benchmarks/CohortMembershipManager";
import { SnapshotComputer } from "@/components/admin/benchmarks/SnapshotComputer";
import { BenchmarkAuditLog } from "@/components/admin/benchmarks/BenchmarkAuditLog";

export default function BenchmarkAdmin() {
  const navigate = useNavigate();
  const { data: isMasterAdmin, isLoading } = useMasterAdmin();

  useEffect(() => {
    if (!isLoading && !isMasterAdmin) {
      navigate("/dashboard");
    }
  }, [isMasterAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!isMasterAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Benchmark Admin</h1>
          <p className="text-muted-foreground">
            Manage cross-organization benchmarking cohorts and snapshots
          </p>
        </div>
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
