/**
 * InterventionTestHarness - Development-only test panel for intervention system
 * Simulates intervention flows and validates data integrity
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  Play,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  runInterventionIntegrityCheck,
  type IntegrityCheckResult,
} from "@/lib/interventions/interventionIntegrityCheck";
import { getInterventionMeetingSignals } from "@/lib/interventions/meetingSignals";
import { detectFailedInterventions } from "@/lib/interventions/failedInterventionDetection";

export function InterventionTestHarness() {
  const { data: currentUser } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<IntegrityCheckResult | null>(null);
  const [meetingSignals, setMeetingSignals] = useState<any>(null);
  const [failedInterventions, setFailedInterventions] = useState<any>(null);

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  const runIntegrityCheck = async () => {
    if (!currentUser?.team_id) {
      toast.error("No organization context");
      return;
    }

    try {
      const result = await runInterventionIntegrityCheck(currentUser.team_id);
      setIntegrityResult(result);
      toast.success(
        result.passed
          ? "Integrity check passed!"
          : `Integrity check found ${result.summary.errors} errors`
      );
    } catch (error) {
      toast.error("Integrity check failed: " + (error as Error).message);
    }
  };

  const runMeetingSignalsCheck = async () => {
    if (!currentUser?.team_id) {
      toast.error("No organization context");
      return;
    }

    try {
      const signals = await getInterventionMeetingSignals(currentUser.team_id);
      setMeetingSignals(signals);
      toast.success(
        `Found ${signals.overdue_interventions.length} overdue, ${signals.at_risk_interventions.length} at risk, ${signals.newly_successful_interventions.length} successful`
      );
    } catch (error) {
      toast.error("Meeting signals check failed: " + (error as Error).message);
    }
  };

  const runFailedInterventionsCheck = async () => {
    if (!currentUser?.team_id) {
      toast.error("No organization context");
      return;
    }

    try {
      const result = await detectFailedInterventions(currentUser.team_id);
      setFailedInterventions(result);
      toast.success(
        `Found ${result.failed_interventions.length} failed, ${result.already_have_issues.length} already have issues`
      );
    } catch (error) {
      toast.error("Failed interventions check failed: " + (error as Error).message);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/10">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-yellow-100/50 dark:hover:bg-yellow-900/20 transition-colors">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-700 dark:text-yellow-400">
                  Intervention Test Harness (Dev Only)
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Integrity Check */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Data Integrity Check</h4>
                <Button size="sm" variant="outline" onClick={runIntegrityCheck}>
                  <Play className="h-3 w-3 mr-1" />
                  Run Check
                </Button>
              </div>
              {integrityResult && (
                <div className="p-3 rounded-lg border bg-background">
                  <div className="flex items-center gap-2 mb-2">
                    {integrityResult.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium">
                      {integrityResult.passed ? "All checks passed" : "Issues found"}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {integrityResult.summary.total_interventions} interventions
                    </Badge>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="destructive">{integrityResult.summary.errors} errors</Badge>
                    <Badge className="bg-yellow-500">{integrityResult.summary.warnings} warnings</Badge>
                    <Badge variant="secondary">{integrityResult.summary.info} info</Badge>
                  </div>
                  {integrityResult.violations.length > 0 && (
                    <ScrollArea className="mt-2 h-32">
                      <div className="space-y-1">
                        {integrityResult.violations.slice(0, 10).map((v, i) => (
                          <div key={i} className="text-xs p-1 rounded bg-muted">
                            <span className="font-mono">{v.type}</span>: {v.message}
                          </div>
                        ))}
                        {integrityResult.violations.length > 10 && (
                          <p className="text-xs text-muted-foreground">
                            ... and {integrityResult.violations.length - 10} more
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Meeting Signals Check */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Meeting Signals Detection</h4>
                <Button size="sm" variant="outline" onClick={runMeetingSignalsCheck}>
                  <Play className="h-3 w-3 mr-1" />
                  Detect
                </Button>
              </div>
              {meetingSignals && (
                <div className="p-3 rounded-lg border bg-background">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <Badge variant="destructive">{meetingSignals.overdue_interventions.length}</Badge>
                      <p className="text-xs mt-1">Overdue</p>
                    </div>
                    <div>
                      <Badge className="bg-yellow-500">{meetingSignals.at_risk_interventions.length}</Badge>
                      <p className="text-xs mt-1">At Risk</p>
                    </div>
                    <div>
                      <Badge className="bg-green-500">{meetingSignals.newly_successful_interventions.length}</Badge>
                      <p className="text-xs mt-1">Successful</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Failed Interventions Check */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Failed Interventions Detection</h4>
                <Button size="sm" variant="outline" onClick={runFailedInterventionsCheck}>
                  <Play className="h-3 w-3 mr-1" />
                  Detect
                </Button>
              </div>
              {failedInterventions && (
                <div className="p-3 rounded-lg border bg-background">
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Failed:</span>{" "}
                      <span className="font-medium">{failedInterventions.failed_interventions.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">With Issues:</span>{" "}
                      <span className="font-medium">{failedInterventions.already_have_issues.length}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
