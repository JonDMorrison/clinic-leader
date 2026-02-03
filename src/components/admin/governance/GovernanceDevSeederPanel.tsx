/**
 * Dev-only panel for seeding governance test data
 * Only visible in development mode
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { seedGovernanceTestData, cleanupGovernanceTestData } from "@/lib/dev/governance-seeder";
import { FlaskConical, Trash2, CheckCircle, AlertCircle } from "lucide-react";

interface GovernanceDevSeederPanelProps {
  organizationId: string | null;
}

export function GovernanceDevSeederPanel({ organizationId }: GovernanceDevSeederPanelProps) {
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  const handleSeed = async () => {
    if (!organizationId) {
      toast({ title: "No organization", variant: "destructive" });
      return;
    }

    setIsSeeding(true);
    try {
      const result = await seedGovernanceTestData(organizationId);
      setLastResult(result);

      if (result.success) {
        toast({
          title: "Test data seeded",
          description: `Created ${result.resultsCreated} results, ${result.policiesCreated} policies, ${result.overridesCreated} overrides`,
        });
      } else {
        toast({
          title: "Seed failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCleanup = async () => {
    if (!organizationId) return;

    setIsCleaning(true);
    try {
      const result = await cleanupGovernanceTestData(organizationId);

      if (result.success) {
        setLastResult(null);
        toast({ title: "Test data cleaned up" });
      } else {
        toast({
          title: "Cleanup failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <Card className="border-dashed border-yellow-500/50 bg-yellow-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-yellow-500" />
            Dev: Governance Test Seeder
          </CardTitle>
          <Badge variant="outline" className="text-yellow-600 border-yellow-500/50">
            DEV ONLY
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Creates competing sources for testing selection behavior
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSeed}
            disabled={isSeeding || !organizationId}
            className="flex-1"
          >
            {isSeeding ? "Seeding..." : "Seed Test Data"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCleanup}
            disabled={isCleaning || !organizationId}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {lastResult && (
          <div className={`text-xs p-2 rounded ${lastResult.success ? "bg-green-500/10" : "bg-red-500/10"}`}>
            <div className="flex items-center gap-1 mb-1">
              {lastResult.success ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <AlertCircle className="w-3 h-3 text-red-500" />
              )}
              <span className="font-medium">
                {lastResult.success ? "Seeded successfully" : "Seed failed"}
              </span>
            </div>
            {lastResult.success ? (
              <div className="text-muted-foreground">
                Metric: {lastResult.metricName}<br />
                Results: {lastResult.resultsCreated} | 
                Policies: {lastResult.policiesCreated} | 
                Overrides: {lastResult.overridesCreated}
              </div>
            ) : (
              <div className="text-red-500">{lastResult.error}</div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <strong>Creates:</strong>
          <ul className="list-disc ml-4 mt-1 space-y-0.5">
            <li>3 competing sources: jane_pipe (100), legacy_workbook (95), manual (110)</li>
            <li>Source policies with priorities 10, 20, 90</li>
            <li>legacy_workbook requires audit pass</li>
            <li>Override forcing legacy_workbook</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
