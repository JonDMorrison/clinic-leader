import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Cloud,
  FileSpreadsheet,
  Database,
  Settings2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Shield,
  AlertCircle,
  Loader2,
  ExternalLink,
  Info,
  Mail,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { canAccessAdmin } from "@/lib/permissions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  getOrgDataModeLabel,
  getOrgDataModeDescription,
  getModeBullets,
  getJaneStatusLine,
  type DataModeLabel,
} from "@/lib/dataMode/dataModeUtils";
import { getLastDataActivity, type LastDataActivity } from "@/lib/dataMode/dataModeActivity";
import { getWizardNextStepCard } from "@/lib/dataMode/dataModeNextStep";

type WizardStep = "choose" | "confirm" | "success";
type TargetSource = "jane" | "spreadsheet" | "manual" | "other_emr";

export default function SettingsData() {
  const navigate = useNavigate();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: roleData } = useIsAdmin();
  const isPrivileged = canAccessAdmin(roleData) || roleData?.role === "manager";
  const queryClient = useQueryClient();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("choose");
  const [targetSource, setTargetSource] = useState<TargetSource | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<{ old: string; new: string } | null>(null);

  // Fetch team info
  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["settings-data-team", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;
      const { data, error } = await supabase
        .from("teams")
        .select("data_mode, ehr_system")
        .eq("id", currentUser.team_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  // Fetch Jane integration status
  const { data: janeIntegration } = useQuery({
    queryKey: ["settings-data-jane", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;
      const { data } = await supabase
        .from("jane_integrations")
        .select("status")
        .eq("organization_id", currentUser.team_id)
        .maybeSingle();
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  // Fetch bulk connector (jane)
  const { data: bulkConnector } = useQuery({
    queryKey: ["settings-data-bulk", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;
      const { data } = await supabase
        .from("bulk_analytics_connectors")
        .select("status, last_received_at")
        .eq("organization_id", currentUser.team_id)
        .eq("source_system", "jane")
        .maybeSingle();
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  // Check for legacy imports
  const { data: hasLegacyImports } = useQuery({
    queryKey: ["settings-data-legacy", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return false;
      const { count } = await supabase
        .from("legacy_monthly_reports" as any)
        .select("id", { count: "exact", head: true })
        .eq("organization_id", currentUser.team_id);
      return (count ?? 0) > 0;
    },
    enabled: !!currentUser?.team_id,
  });

  // Compute current mode label
  const janeStatus = janeIntegration?.status || bulkConnector?.status || null;
  const modeLabel: DataModeLabel = team
    ? getOrgDataModeLabel({
        dataMode: team.data_mode,
        janeStatus,
        hasLegacyImports: hasLegacyImports || false,
        ehrSystem: team.ehr_system,
      })
    : "Manual";

  const modeDescription = getOrgDataModeDescription(modeLabel);
  const bullets = getModeBullets(modeLabel);

  // Status line for Jane
  const janeStatusLine = getJaneStatusLine(janeStatus);

  // Last import date for spreadsheet
  const lastImportText = hasLegacyImports ? "Imports detected" : "No imports detected";

  const isLoading = userLoading || teamLoading;

  // --- Wizard logic ---
  const openWizard = () => {
    setWizardStep("choose");
    setTargetSource(null);
    setConfirmed(false);
    setResult(null);
    setWizardOpen(true);
  };

  const handleApply = async () => {
    if (!targetSource || !currentUser?.team_id) return;
    setIsSaving(true);

    try {
      const newDataMode = targetSource === "jane" ? "jane" : "default";
      const newEhrSystem = targetSource === "other_emr" ? (team?.ehr_system || "Other") : null;

      const { data: rpcResult, error } = await supabase.rpc("set_team_data_mode", {
        p_team_id: currentUser.team_id,
        p_data_mode: newDataMode,
        p_ehr_system: newEhrSystem,
      });

      if (error) throw error;

      const rpcData = rpcResult as any;

      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["settings-data-team"] });
      queryClient.invalidateQueries({ queryKey: ["org-data-mode"] });
      queryClient.invalidateQueries({ queryKey: ["team-data-mode"] });
      queryClient.invalidateQueries({ queryKey: ["metric-source-stats"] });
      queryClient.invalidateQueries({ queryKey: ["jane-integration-status"] });

      setResult({
        old: rpcData?.old_data_mode || "unknown",
        new: rpcData?.new_data_mode || newDataMode,
      });
      setWizardStep("success");

      toast.success("Data source mode updated", {
        description: `Switched to ${targetSource === "jane" ? "Jane" : targetSource === "spreadsheet" ? "Spreadsheet" : targetSource === "manual" ? "Manual" : "Other EMR"} mode.`,
      });
    } catch (error: any) {
      console.error("Mode switch error:", error);
      toast.error("Failed to update data mode", {
        description: error.message || "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch last activity timestamps for proof lines
  const { data: lastActivity } = useQuery<LastDataActivity>({
    queryKey: ["settings-data-last-activity", currentUser?.team_id],
    queryFn: () => getLastDataActivity(currentUser!.team_id!),
    enabled: !!currentUser?.team_id,
    staleTime: 2 * 60 * 1000,
  });

  // Check if org has any metrics at all (lightweight count)
  const { data: hasAnyMetrics } = useQuery({
    queryKey: ["settings-data-has-metrics", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return false;
      const { count } = await supabase
        .from("metric_results")
        .select("id", { count: "exact", head: true });
      return (count ?? 0) > 0;
    },
    enabled: !!currentUser?.team_id,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Settings
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Data Configuration</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage how your clinic's metrics are collected and updated.
        </p>
      </div>

      {/* A) Current Data Mode Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {modeLabel === "Jane" && <Cloud className="w-5 h-5 text-primary" />}
              {modeLabel === "Spreadsheet" && <FileSpreadsheet className="w-5 h-5 text-primary" />}
              {modeLabel === "Manual" && <Database className="w-5 h-5 text-primary" />}
              {modeLabel === "Other EMR" && <Mail className="w-5 h-5 text-primary" />}
              Current Data Mode
            </span>
            <Badge variant="secondary" className="text-sm">
              {modeLabel}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status line */}
          <div className="text-sm">
            {modeLabel === "Jane" && (
              <div className="flex items-center gap-2">
                {janeStatusLine === "Connected" ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : janeStatusLine === "Connection error" ? (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <Info className="w-4 h-4 text-muted-foreground" />
                )}
                <span>{janeStatusLine}</span>
              </div>
            )}
            {modeLabel === "Spreadsheet" && (
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span>{lastImportText}</span>
              </div>
            )}
            {modeLabel === "Manual" && (
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span>No automated imports detected</span>
              </div>
            )}
            {modeLabel === "Other EMR" && (
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span>EHR: {team?.ehr_system || "Not set"}</span>
              </div>
            )}
          </div>

          {/* Change button - admin/manager only */}
          {isPrivileged && (
            <Button variant="outline" size="sm" onClick={openWizard}>
              <Settings2 className="w-4 h-4 mr-2" />
              Change Data Source
            </Button>
          )}
        </CardContent>
      </Card>

      {/* B) What happens in this mode */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">What happens in {modeLabel} mode</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* C) Support & Safety */}
      <Alert className="border-success/30 bg-success/5">
        <Shield className="w-4 h-4 text-success" />
        <AlertDescription className="text-sm space-y-1">
          <p><strong>Your data is safe.</strong> Changing mode does not delete your historical data.</p>
          <p className="text-muted-foreground">It changes how new data is ingested and which screens guide your setup.</p>
        </AlertDescription>
      </Alert>

      {/* =============== WIZARD DIALOG =============== */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Change Data Source</DialogTitle>
            <DialogDescription>
              {wizardStep === "choose" && "Step 1 of 3 — Choose source"}
              {wizardStep === "confirm" && "Step 2 of 3 — Confirm"}
              {wizardStep === "success" && "Step 3 of 3 — Done"}
            </DialogDescription>
          </DialogHeader>

          <Progress
            value={wizardStep === "choose" ? 33 : wizardStep === "confirm" ? 66 : 100}
            className="h-1"
          />

          <div className="py-4 min-h-[280px]">
            {/* Step 1: Choose */}
            {wizardStep === "choose" && (
              <div className="space-y-4">
                <RadioGroup
                  value={targetSource || ""}
                  onValueChange={(v) => setTargetSource(v as TargetSource)}
                  className="grid gap-3"
                >
                  {/* Jane */}
                  <Label
                    htmlFor="ws-jane"
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      targetSource === "jane" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                  >
                    <RadioGroupItem value="jane" id="ws-jane" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-primary" />
                        <span className="font-medium">Jane App</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Automatic sync from your Jane EMR. Metrics update daily.
                      </p>
                      {janeStatus && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Status: {getJaneStatusLine(janeStatus)}
                        </p>
                      )}
                    </div>
                  </Label>

                  {/* Spreadsheet */}
                  <Label
                    htmlFor="ws-spreadsheet"
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      targetSource === "spreadsheet" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                  >
                    <RadioGroupItem value="spreadsheet" id="ws-spreadsheet" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-primary" />
                        <span className="font-medium">Spreadsheet Import</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Upload monthly workbooks manually. Best for custom reporting.
                      </p>
                    </div>
                  </Label>

                  {/* Manual */}
                  <Label
                    htmlFor="ws-manual"
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      targetSource === "manual" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                  >
                    <RadioGroupItem value="manual" id="ws-manual" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-primary" />
                        <span className="font-medium">Manual Entry</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Enter metrics directly in the scorecard. Simple and flexible.
                      </p>
                    </div>
                  </Label>

                  {/* Other EMR */}
                  <Label
                    htmlFor="ws-other"
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      targetSource === "other_emr" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                  >
                    <RadioGroupItem value="other_emr" id="ws-other" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        <span className="font-medium">Other EMR</span>
                        <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Records your EMR preference. Automated sync coming later.
                      </p>
                    </div>
                  </Label>
                </RadioGroup>
              </div>
            )}

            {/* Step 2: Confirm */}
            {wizardStep === "confirm" && targetSource && (
              <div className="space-y-4">
                {/* Prerequisites / warnings */}
                {targetSource === "jane" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Jane Status:</span>
                      <Badge variant={janeStatus === "active" || janeStatus === "receiving_data" ? "default" : "outline"}>
                        {getJaneStatusLine(janeStatus)}
                      </Badge>
                    </div>
                    {(!janeStatus || !["active", "receiving_data"].includes(janeStatus)) && (
                      <Alert>
                        <Info className="w-4 h-4" />
                        <AlertDescription className="text-sm">
                          Jane integration isn't connected yet.{" "}
                          <Button variant="link" className="h-auto p-0 text-sm" onClick={() => navigate("/integrations/jane")}>
                            Connect Jane →
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Your Scorecard will prefer Jane-fed values where available.
                    </p>
                  </div>
                )}

                {targetSource === "spreadsheet" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Previous imports:</span>
                      <span className="font-medium">{hasLegacyImports ? "Yes" : "None detected"}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You'll upload monthly to keep metrics current.
                    </p>
                  </div>
                )}

                {targetSource === "manual" && (
                  <p className="text-sm text-muted-foreground">
                    You'll need to enter values each period in the scorecard.
                  </p>
                )}

                {targetSource === "other_emr" && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      This records your EMR preference. Automated sync is coming later.
                      Your data mode stays as Standard until an integration exists.
                    </p>
                  </div>
                )}

                {/* Confirmation checkbox */}
                <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 mt-4">
                  <Checkbox
                    id="confirm-switch"
                    checked={confirmed}
                    onCheckedChange={(c) => setConfirmed(c === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="confirm-switch" className="text-sm cursor-pointer">
                    I understand this changes how new metric results will be ingested.
                  </Label>
                </div>

                <Alert className="border-success/30 bg-success/5">
                  <Shield className="w-4 h-4 text-success" />
                  <AlertDescription className="text-sm">
                    Historical data will not be deleted. This change is reversible.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Step 3: Success */}
            {wizardStep === "success" && (() => {
              const card = targetSource
                ? getWizardNextStepCard({
                    targetSource,
                    janeStatus,
                    hasSpreadsheetUploads: !!lastActivity?.spreadsheetLastUploadAt || (hasLegacyImports || false),
                    hasAnyMetrics: hasAnyMetrics || false,
                    lastActivity: lastActivity || {},
                    hasRecentAutomatedDeliveries: lastActivity?.hasRecentAutomatedDeliveries,
                  })
                : null;
              return (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-success" />
                    </div>
                    <h3 className="text-lg font-semibold mt-4">Mode Updated</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Switched from <strong>{result?.old}</strong> to <strong>{result?.new}</strong>
                    </p>
                  </div>

                  {card && (
                    <Card className="border-primary/20 bg-primary/5">
                      <CardContent className="p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">{card.title}</h4>
                        <p className="text-sm text-muted-foreground">{card.body}</p>

                        {/* Proof line */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{card.proofLine}</span>
                        </div>

                        <Button
                          onClick={() => {
                            setWizardOpen(false);
                            navigate(card.primaryCta.href);
                          }}
                        >
                          {card.primaryCta.label}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </CardContent>

                      {/* Secondary footer link */}
                      <div className="px-4 pb-3 pt-0">
                        <Link
                          to={card.secondaryLink.href}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setWizardOpen(false)}
                        >
                          {card.secondaryLink.label} →
                        </Link>
                      </div>
                    </Card>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Navigation buttons */}
          {wizardStep !== "success" && (
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  if (wizardStep === "confirm") {
                    setWizardStep("choose");
                    setConfirmed(false);
                  } else {
                    setWizardOpen(false);
                  }
                }}
              >
                {wizardStep === "confirm" ? (
                  <>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </>
                ) : (
                  "Cancel"
                )}
              </Button>

              {wizardStep === "choose" && (
                <Button
                  disabled={!targetSource}
                  onClick={() => setWizardStep("confirm")}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}

              {wizardStep === "confirm" && (
                <Button
                  disabled={!confirmed || isSaving}
                  onClick={handleApply}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      Apply Change
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
