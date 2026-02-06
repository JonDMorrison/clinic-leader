import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Cloud, 
  FileSpreadsheet, 
  Database, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  Shield, 
  AlertCircle,
  Loader2,
  ExternalLink,
  Info,
  History,
  Zap,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useOrgDataSourceStatus, SOURCE_LABELS, type DataSourceType } from "@/hooks/useOrgDataSourceStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

type WizardStep = 
  | "education"
  | "choose_source"
  | "impact"
  | "setup"
  | "validation"
  | "activate";

type TargetSource = "jane" | "spreadsheet" | "manual" | "request_emr";

interface ChangeDataSourceWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS: WizardStep[] = [
  "education",
  "choose_source",
  "impact",
  "setup",
  "validation",
  "activate",
];

const STEP_LABELS: Record<WizardStep, string> = {
  education: "Why Change?",
  choose_source: "Choose Source",
  impact: "What Changes",
  setup: "Setup",
  validation: "Validate",
  activate: "Activate",
};

/**
 * ChangeDataSourceWizard - Guided flow for safely switching data sources
 */
export function ChangeDataSourceWizard({ open, onOpenChange }: ChangeDataSourceWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("education");
  const [targetSource, setTargetSource] = useState<TargetSource | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    metricsCount: number;
    coverageWindow: string;
    syncHealth: "good" | "warning" | "error";
  } | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  
  const { data: currentUser } = useCurrentUser();
  const dataSourceStatus = useOrgDataSourceStatus();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentStep("education");
      setTargetSource(null);
      setValidationResult(null);
      setIsValidating(false);
      setIsActivating(false);
    }
  }, [open]);

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const handleValidation = async () => {
    if (!targetSource || !currentUser?.team_id) return;
    
    setIsValidating(true);
    
    try {
      // Get metrics count using direct fetch to avoid TS deep inference issue
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      // Count metrics
      const countUrl = new URL(`${supabaseUrl}/rest/v1/metric_results`);
      countUrl.searchParams.set("organization_id", `eq.${currentUser.team_id}`);
      countUrl.searchParams.set("select", "id");
      
      const countRes = await fetch(countUrl.toString(), {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "count=exact",
        },
      });
      const metricsCount = parseInt(countRes.headers.get("content-range")?.split("/")[1] || "0", 10);
      
      // Get earliest period
      const earliestUrl = new URL(`${supabaseUrl}/rest/v1/metric_results`);
      earliestUrl.searchParams.set("organization_id", `eq.${currentUser.team_id}`);
      earliestUrl.searchParams.set("select", "period_start");
      earliestUrl.searchParams.set("order", "period_start.asc");
      earliestUrl.searchParams.set("limit", "1");
      
      const earliestRes = await fetch(earliestUrl.toString(), {
        headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
      });
      const earliestData = await earliestRes.json();
      const earliest = earliestData?.[0]?.period_start;
      
      // Get latest period
      const latestUrl = new URL(`${supabaseUrl}/rest/v1/metric_results`);
      latestUrl.searchParams.set("organization_id", `eq.${currentUser.team_id}`);
      latestUrl.searchParams.set("select", "period_start");
      latestUrl.searchParams.set("order", "period_start.desc");
      latestUrl.searchParams.set("limit", "1");
      
      const latestRes = await fetch(latestUrl.toString(), {
        headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
      });
      const latestData = await latestRes.json();
      const latest = latestData?.[0]?.period_start;
      
      const coverageWindow = earliest && latest
        ? `${new Date(earliest).toLocaleDateString("en-US", { month: "short", year: "numeric" })} - ${new Date(latest).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
        : "No existing data";
      
      // For Jane, check if integration exists
      let syncHealth: "good" | "warning" | "error" = "good";
      if (targetSource === "jane") {
        const { data: janeInt } = await supabase
          .from("jane_integrations")
          .select("status")
          .eq("organization_id", currentUser.team_id)
          .maybeSingle();
        
        if (!janeInt) {
          syncHealth = "warning";
        } else if (janeInt.status === "error") {
          syncHealth = "error";
        }
      }
      
      setValidationResult({
        success: true,
        metricsCount,
        coverageWindow,
        syncHealth,
      });
      
      // Auto-advance after validation
      setTimeout(goNext, 500);
    } catch (error) {
      console.error("Validation error:", error);
      setValidationResult({
        success: false,
        metricsCount: 0,
        coverageWindow: "Unknown",
        syncHealth: "error",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleActivate = async () => {
    if (!targetSource || !currentUser?.team_id) return;
    
    setIsActivating(true);
    
    try {
      const oldMode = dataSourceStatus.mode;
      const newMode = targetSource === "jane" ? "jane" : "default";
      
      // Update teams.data_mode
      const { error: updateError } = await supabase
        .from("teams")
        .update({ data_mode: newMode })
        .eq("id", currentUser.team_id);
      
      if (updateError) throw updateError;
      
      // Log the configuration change
      const { error: logError } = await supabase
        .from("configuration_events")
        .insert({
          organization_id: currentUser.team_id,
          user_id: currentUser.id,
          event_type: "data_source_change",
          event_data: {
            old_mode: oldMode,
            new_mode: newMode,
            old_primary_source: dataSourceStatus.primarySource,
            new_target_source: targetSource,
            validation_success: validationResult?.success ?? false,
            metrics_preserved: validationResult?.metricsCount ?? 0,
            coverage_window: validationResult?.coverageWindow,
          },
        });
      
      if (logError) {
        console.error("Failed to log configuration change:", logError);
        // Don't fail the operation, just log
      }
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["org-data-mode"] });
      queryClient.invalidateQueries({ queryKey: ["metric-source-stats"] });
      queryClient.invalidateQueries({ queryKey: ["jane-integration-status"] });
      
      toast.success("Data source updated successfully", {
        description: `Your clinic is now using ${targetSource === "jane" ? "Jane" : targetSource === "spreadsheet" ? "Spreadsheet" : "Manual"} mode.`,
      });
      
      onOpenChange(false);
      
      // Navigate to appropriate page
      if (targetSource === "jane") {
        navigate("/integrations/jane");
      } else if (targetSource === "spreadsheet") {
        navigate("/imports/monthly-report");
      }
    } catch (error) {
      console.error("Activation error:", error);
      toast.error("Failed to update data source", {
        description: "Please try again or contact support.",
      });
    } finally {
      setIsActivating(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "education":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Database className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Why Change Your Data Source?</h3>
              <p className="text-muted-foreground text-sm">
                Clinics evolve, and so do their data needs. Here's why you might switch:
              </p>
            </div>
            
            <div className="grid gap-4">
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <Cloud className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Connecting to Jane</p>
                  <p className="text-xs text-muted-foreground">
                    Automate your metrics with real-time EMR sync
                  </p>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <FileSpreadsheet className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Switching from Jane to Spreadsheet</p>
                  <p className="text-xs text-muted-foreground">
                    Take more control with manual monthly imports
                  </p>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Preparing for a new EMR</p>
                  <p className="text-xs text-muted-foreground">
                    Request support for other systems like Cliniko or Owl
                  </p>
                </div>
              </div>
            </div>
            
            <Alert className="border-success/30 bg-success/5">
              <Shield className="w-4 h-4 text-success" />
              <AlertDescription className="text-sm">
                <strong>Your data is safe.</strong> Switching sources never deletes historical metrics.
                All your existing data remains intact and accessible.
              </AlertDescription>
            </Alert>
          </div>
        );
        
      case "choose_source":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Choose Your Data Source</h3>
              <p className="text-muted-foreground text-sm">
                Select how you want to populate your clinic metrics
              </p>
            </div>
            
            <RadioGroup
              value={targetSource || ""}
              onValueChange={(v) => setTargetSource(v as TargetSource)}
              className="grid gap-3"
            >
              <Label
                htmlFor="jane"
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  targetSource === "jane"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="jane" id="jane" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-primary" />
                    <span className="font-medium">Jane App</span>
                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatic sync from your Jane EMR. Metrics update daily.
                  </p>
                </div>
              </Label>
              
              <Label
                htmlFor="spreadsheet"
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  targetSource === "spreadsheet"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="spreadsheet" id="spreadsheet" className="mt-1" />
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
              
              <Label
                htmlFor="manual"
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  targetSource === "manual"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="manual" id="manual" className="mt-1" />
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
              
              <Label
                htmlFor="request_emr"
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  targetSource === "request_emr"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="request_emr" id="request_emr" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    <span className="font-medium">Request Other EMR</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Let us know what system you use. We're expanding integrations.
                  </p>
                </div>
              </Label>
            </RadioGroup>
            
            {dataSourceStatus.primarySource !== "unknown" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <History className="w-4 h-4" />
                <span>Currently using: <strong>{SOURCE_LABELS[dataSourceStatus.primarySource]}</strong></span>
              </div>
            )}
          </div>
        );
        
      case "impact":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">What Will Change</h3>
              <p className="text-muted-foreground text-sm">
                Here's what happens when you switch to {targetSource === "jane" ? "Jane" : targetSource === "spreadsheet" ? "Spreadsheet" : targetSource === "manual" ? "Manual" : "a new EMR"}
              </p>
            </div>
            
            {targetSource === "jane" && (
              <div className="space-y-4">
                <Alert className="border-primary/30 bg-primary/5">
                  <Cloud className="w-4 h-4 text-primary" />
                  <AlertDescription>
                    <strong>Jane Integration Setup</strong>
                    <p className="text-sm mt-1">
                      You'll connect your Jane account via OAuth. Once connected, 
                      metrics will sync automatically every day.
                    </p>
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>Historical data remains intact</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>New metrics will come from Jane automatically</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>Manual imports still available as backup</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">First sync may take up to 24 hours</span>
                  </div>
                </div>
              </div>
            )}
            
            {targetSource === "spreadsheet" && (
              <div className="space-y-4">
                <Alert className="border-primary/30 bg-primary/5">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  <AlertDescription>
                    <strong>Spreadsheet Mode</strong>
                    <p className="text-sm mt-1">
                      You'll upload monthly workbooks to update metrics. 
                      This gives you full control over your data.
                    </p>
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>Historical data remains intact</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>Jane integration paused (can re-enable later)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>Use Lori workbook or custom Excel templates</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Remember to upload monthly for fresh data</span>
                  </div>
                </div>
              </div>
            )}
            
            {targetSource === "manual" && (
              <div className="space-y-4">
                <Alert className="border-primary/30 bg-primary/5">
                  <Database className="w-4 h-4 text-primary" />
                  <AlertDescription>
                    <strong>Manual Entry Mode</strong>
                    <p className="text-sm mt-1">
                      Enter metrics directly in the scorecard each week. 
                      Simple and flexible for any workflow.
                    </p>
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>Historical data remains intact</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>No integrations or imports required</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span>Update metrics in weekly scorecard view</span>
                  </div>
                </div>
              </div>
            )}
            
            {targetSource === "request_emr" && (
              <div className="space-y-4">
                <Alert className="border-warning/30 bg-warning/5">
                  <Mail className="w-4 h-4 text-warning" />
                  <AlertDescription>
                    <strong>Request New EMR Integration</strong>
                    <p className="text-sm mt-1">
                      We're expanding our integrations. Let us know what EMR you use 
                      and we'll prioritize adding support.
                    </p>
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      After submitting, you'll use Spreadsheet mode until the integration is ready
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        
      case "setup":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Setup Your Integration</h3>
              <p className="text-muted-foreground text-sm">
                {targetSource === "jane" 
                  ? "Connect your Jane account to start syncing"
                  : targetSource === "spreadsheet"
                    ? "Prepare your workbook for import"
                    : targetSource === "manual"
                      ? "You're almost ready"
                      : "Tell us about your EMR"
                }
              </p>
            </div>
            
            {targetSource === "jane" && (
              <div className="space-y-4">
                <div className="p-6 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 text-center">
                  <Cloud className="w-12 h-12 mx-auto text-primary mb-3" />
                  <p className="font-medium mb-2">Connect to Jane</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    You'll be redirected to Jane to authorize the connection
                  </p>
                  <Button onClick={() => navigate("/integrations/jane")}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Jane Integration
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground text-center">
                  After connecting, return here to complete validation
                </div>
              </div>
            )}
            
            {targetSource === "spreadsheet" && (
              <div className="space-y-4">
                <div className="p-6 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
                  <FileSpreadsheet className="w-12 h-12 mx-auto text-primary mb-3" />
                  <p className="font-medium text-center mb-4">Spreadsheet Import Ready</p>
                  
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0">1</span>
                      <span>Download your monthly report from your EMR or accounting system</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0">2</span>
                      <span>Format it as an Excel or CSV file</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0">3</span>
                      <span>Upload via the Import page each month</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {targetSource === "manual" && (
              <div className="space-y-4">
                <div className="p-6 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 text-center">
                  <Database className="w-12 h-12 mx-auto text-primary mb-3" />
                  <p className="font-medium mb-2">Manual Entry Mode</p>
                  <p className="text-sm text-muted-foreground">
                    No setup required. You'll enter metrics directly in the scorecard.
                  </p>
                </div>
              </div>
            )}
            
            {targetSource === "request_emr" && (
              <div className="space-y-4">
                <div className="p-6 rounded-lg border-2 border-dashed border-warning/30 bg-warning/5 text-center">
                  <Mail className="w-12 h-12 mx-auto text-warning mb-3" />
                  <p className="font-medium mb-2">Request Submitted</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    We'll reach out when your EMR integration is available.
                    For now, you can use Spreadsheet mode.
                  </p>
                  <Button variant="outline" onClick={() => setTargetSource("spreadsheet")}>
                    Switch to Spreadsheet Mode
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
        
      case "validation":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Validating Configuration</h3>
              <p className="text-muted-foreground text-sm">
                Checking your data and integration status
              </p>
            </div>
            
            {isValidating && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Running validation checks...</p>
              </div>
            )}
            
            {validationResult && (
              <div className="space-y-4">
                <div className={cn(
                  "p-4 rounded-lg border",
                  validationResult.success 
                    ? "border-success/30 bg-success/5" 
                    : "border-destructive/30 bg-destructive/5"
                )}>
                  <div className="flex items-center gap-2 mb-3">
                    {validationResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                    <span className="font-medium">
                      {validationResult.success ? "Validation Passed" : "Validation Issues"}
                    </span>
                  </div>
                  
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Existing Metrics:</span>
                      <span className="font-medium">{validationResult.metricsCount} preserved</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coverage Window:</span>
                      <span className="font-medium">{validationResult.coverageWindow}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sync Health:</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          validationResult.syncHealth === "good" && "text-success border-success/30",
                          validationResult.syncHealth === "warning" && "text-warning border-warning/30",
                          validationResult.syncHealth === "error" && "text-destructive border-destructive/30"
                        )}
                      >
                        {validationResult.syncHealth === "good" ? "Ready" : 
                         validationResult.syncHealth === "warning" ? "Pending Setup" : "Error"}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {validationResult.syncHealth === "warning" && targetSource === "jane" && (
                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription className="text-sm">
                      Jane integration needs to be connected. You can complete this after activation.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            
            {!isValidating && !validationResult && (
              <div className="text-center py-8">
                <Button onClick={handleValidation}>
                  Run Validation
                </Button>
              </div>
            )}
          </div>
        );
        
      case "activate":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-lg font-semibold">Ready to Activate</h3>
              <p className="text-muted-foreground text-sm">
                Switch your data source to {targetSource === "jane" ? "Jane" : targetSource === "spreadsheet" ? "Spreadsheet" : "Manual"} mode
              </p>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New Mode:</span>
                  <span className="font-medium">
                    {targetSource === "jane" ? "Jane Mode" : "Standard Mode"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New Primary Source:</span>
                  <span className="font-medium">
                    {targetSource === "jane" ? "Jane" : targetSource === "spreadsheet" ? "Spreadsheet" : "Manual"}
                  </span>
                </div>
                {validationResult && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data Preserved:</span>
                    <span className="font-medium text-success">
                      {validationResult.metricsCount} metrics
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <Alert className="border-success/30 bg-success/5">
              <Shield className="w-4 h-4 text-success" />
              <AlertDescription className="text-sm">
                This change is fully reversible. You can switch back at any time.
              </AlertDescription>
            </Alert>
          </div>
        );
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case "education":
        return true;
      case "choose_source":
        return targetSource !== null && targetSource !== "request_emr";
      case "impact":
        return true;
      case "setup":
        return targetSource !== "request_emr";
      case "validation":
        return validationResult?.success;
      case "activate":
        return !isActivating;
      default:
        return true;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Change Data Source</DialogTitle>
          <DialogDescription>
            {STEP_LABELS[currentStep]} • Step {currentStepIndex + 1} of {STEPS.length}
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress bar */}
        <Progress value={progress} className="h-1" />
        
        {/* Step content */}
        <div className="py-4 min-h-[300px]">
          {renderStepContent()}
        </div>
        
        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={goBack}
            disabled={currentStepIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            
            {currentStep === "activate" ? (
              <Button 
                onClick={handleActivate}
                disabled={!canProceed() || isActivating}
              >
                {isActivating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Activate
              </Button>
            ) : currentStep === "validation" && !validationResult ? (
              <Button 
                onClick={handleValidation}
                disabled={isValidating}
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Validate
              </Button>
            ) : (
              <Button 
                onClick={goNext}
                disabled={!canProceed()}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
