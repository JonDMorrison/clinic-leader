import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Circle,
  Copy,
  Loader2,
  AlertCircle,
  Database,
  Server,
  Shield,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  FlaskConical,
} from "lucide-react";
import { 
  isSandboxEnvironment, 
  canActivateProductionConnectors, 
  getEnvironmentRestrictionMessage,
  getEnvironmentConfig 
} from "@/lib/environment";

type WizardStep = 1 | 2 | 3 | 4;

interface Connector {
  id: string;
  organization_id: string;
  clinic_identifier: string | null;
  status: string;
  cadence: string;
  s3_bucket: string | null;
  s3_region: string | null;
  s3_role_arn: string | null;
  s3_external_id: string | null;
  locked_account_guid: string | null;
  last_received_at: string | null;
  last_processed_at: string | null;
  last_error: string | null;
  expected_schema_version: string;
  delivery_mode: string | null;
}

interface IngestLog {
  id: string;
  status: string;
  created_at: string;
  resource_name: string | null;
  rows: number;
  file_date: string | null;
}

interface JaneSetupWizardProps {
  connector: Connector | null;
  orgId: string;
  recentIngests: IngestLog[];
}

// Partner-managed S3 configuration - pre-filled values
const PARTNER_S3_CONFIG = {
  bucket: "clinicleader-jane-ingest",
  region: "us-west-2",
  roleArn: "arn:aws:iam::YOUR_ACCOUNT:role/JaneDataPipeRole", // Will be replaced with actual ARN
};

/**
 * Evidence-driven wizard step derivation:
 * - Step 1 incomplete if clinic_identifier missing
 * - Step 2 complete if status in (requested, awaiting_jane_setup, awaiting_first_file, receiving_data)
 * - Step 3 complete if partner_managed OR s3 fields present
 * - Step 4 complete only if locked_account_guid exists AND last_processed_at exists AND success ingest exists
 */
function deriveWizardStepFromEvidence(
  connector: Connector | null,
  hasSuccessIngest: boolean
): { currentStep: WizardStep; stepStatus: Record<WizardStep, 'complete' | 'current' | 'pending'> } {
  if (!connector) {
    return {
      currentStep: 1,
      stepStatus: { 1: 'current', 2: 'pending', 3: 'pending', 4: 'pending' }
    };
  }

  // Step 1: clinic_identifier required
  const step1Complete = !!connector.clinic_identifier;
  
  // Step 2: connector exists with valid status
  const validStep2Statuses = ['requested', 'awaiting_jane_setup', 'awaiting_first_file', 'receiving_data', 'error'];
  const step2Complete = step1Complete && validStep2Statuses.includes(connector.status);
  
  // Step 3: Partner-managed mode OR S3 config present
  const isPartnerManaged = connector.delivery_mode === 'partner_managed';
  const hasS3Config = !!(connector.s3_bucket && connector.s3_region);
  const step3Statuses = ['awaiting_first_file', 'receiving_data', 'error'];
  const step3Complete = step2Complete && step3Statuses.includes(connector.status) && (isPartnerManaged || hasS3Config);
  
  // Step 4: Full verification - locked_account_guid + last_processed_at + success ingest
  const step4Complete = step3Complete && 
    !!connector.locked_account_guid && 
    !!connector.last_processed_at && 
    hasSuccessIngest;

  // Determine current step
  let currentStep: WizardStep = 1;
  if (step4Complete) {
    currentStep = 4;
  } else if (step3Complete) {
    currentStep = 4; // Show step 4 when waiting for verification
  } else if (step2Complete) {
    currentStep = 3;
  } else if (step1Complete) {
    currentStep = 2;
  }

  return {
    currentStep,
    stepStatus: {
      1: step1Complete ? 'complete' : 'current',
      2: step2Complete ? 'complete' : step1Complete ? 'current' : 'pending',
      3: step3Complete ? 'complete' : step2Complete ? 'current' : 'pending',
      4: step4Complete ? 'complete' : step3Complete ? 'current' : 'pending',
    }
  };
}

export default function JaneSetupWizard({ connector, orgId, recentIngests }: JaneSetupWizardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [clinicUrl, setClinicUrl] = useState(connector?.clinic_identifier || "");
  const [urlError, setUrlError] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Check for recent jane_pipe metric_results (within 48h) - evidence for "Scorecards updating"
  const { data: recentMetricUpdates } = useQuery({
    queryKey: ["jane-metric-updates", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const { data, error } = await supabase
        .from("metric_results")
        .select("id, updated_at")
        .eq("source", "jane_pipe")
        .gte("updated_at", twoDaysAgo.toISOString())
        .limit(1);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Evidence checks
  const hasSuccessIngest = recentIngests.some(log => log.status === "success");
  const hasScorecardsUpdating = (recentMetricUpdates?.length ?? 0) > 0;

  // Derive step from evidence
  const { currentStep, stepStatus } = deriveWizardStepFromEvidence(connector, hasSuccessIngest);
  
  // Full completion requires all evidence
  const isComplete = stepStatus[4] === 'complete';
  const hasError = connector?.status === "error";

  // Generate external ID based on org ID
  const externalId = `org_${orgId}`;
  const s3Prefix = `org_${orgId}/`;

  // Validate clinic URL format
  const validateClinicUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError("Please enter your Jane clinic URL");
      return false;
    }
    
    const cleaned = url.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!cleaned.includes("jane") && !cleaned.includes(".")) {
      setUrlError("Please enter a valid Jane clinic URL (e.g., yourclinic.janeapp.com)");
      return false;
    }
    
    setUrlError("");
    return true;
  };

  const extractClinicIdentifier = (url: string): string => {
    return url.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success("Copied to clipboard");
  };

  // Environment checks for connector activation
  const envConfig = getEnvironmentConfig();
  const isSandbox = isSandboxEnvironment();
  const canActivateProduction = canActivateProductionConnectors();

  // Step 1 & 2: Request connection with partner_managed mode
  const requestConnection = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      if (!validateClinicUrl(clinicUrl)) throw new Error("Invalid clinic URL");

      // Prevent production connector activation in sandbox environments
      if (!canActivateProduction) {
        throw new Error(`Production connectors cannot be activated in ${envConfig.label.toLowerCase()} environment. Only sandbox connectors are permitted.`);
      }

      const clinicIdentifier = extractClinicIdentifier(clinicUrl);

      const { data, error } = await supabase
        .from("bulk_analytics_connectors")
        .insert({
          organization_id: orgId,
          source_system: "jane",
          connector_type: "bulk_analytics",
          status: "requested",
          cadence: "daily",
          delivery_method: "s3",
          delivery_mode: "partner_managed",
          expected_schema_version: "jane_v1",
          clinic_identifier: clinicIdentifier,
          s3_bucket: PARTNER_S3_CONFIG.bucket,
          s3_region: PARTNER_S3_CONFIG.region,
          s3_external_id: `org_${orgId}`,
          is_sandbox: isSandbox, // Tag connector with environment
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      const envNote = isSandbox ? " (Sandbox Mode)" : "";
      toast.success(`Request received${envNote}`, {
        description: "Next, you'll share these details with Jane.",
      });
      queryClient.invalidateQueries({ queryKey: ["jane-bulk-connector"] });
    },
    onError: (error: Error) => {
      if (error.message !== "Invalid clinic URL") {
        toast.error(`Failed to submit request: ${error.message}`);
      }
    },
  });

  // Step 3: Mark as awaiting first file
  const markJaneSetupComplete = useMutation({
    mutationFn: async () => {
      if (!connector?.id) throw new Error("No connector");

      const { error } = await supabase
        .from("bulk_analytics_connectors")
        .update({ status: "awaiting_first_file" })
        .eq("id", connector.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Great!", {
        description: "We're now waiting for the first delivery from Jane.",
      });
      queryClient.invalidateQueries({ queryKey: ["jane-bulk-connector"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // Pre-filled S3 configuration fields for partner-managed mode
  const getS3ConfigFields = () => [
    { label: "S3 Bucket", value: PARTNER_S3_CONFIG.bucket, description: "ClinicLeader's data ingest bucket" },
    { label: "S3 Region", value: PARTNER_S3_CONFIG.region, description: "AWS region" },
    { label: "S3 Prefix", value: s3Prefix, description: "Your organization's folder" },
    { label: "External ID", value: externalId, description: "Required for secure access" },
  ];

  // Progress indicator with evidence-based status
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {([1, 2, 3, 4] as WizardStep[]).map((step) => {
        const status = stepStatus[step];
        return (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                status === 'complete'
                  ? "bg-primary text-primary-foreground"
                  : status === 'current'
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {status === 'complete' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                step
              )}
            </div>
            {step < 4 && (
              <div
                className={`w-8 h-0.5 mx-1 ${
                  status === 'complete' ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // Pilot Status Banner
  const PilotBanner = () => (
    <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/20">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm">Jane Partnership Pilot</p>
          <p className="text-xs text-muted-foreground">
            Simplified setup — no AWS expertise needed
          </p>
        </div>
      </div>
    </div>
  );

  // STEP 1: Identify Your Jane Clinic
  const Step1 = () => (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
          <Database className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-xl">Identify your Jane clinic</CardTitle>
        <CardDescription>
          This tells us which clinic's data you want connected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 max-w-md mx-auto">
          <Label htmlFor="clinic-url">Jane clinic URL</Label>
          <Input
            id="clinic-url"
            type="text"
            placeholder="https://yourclinic.janeapp.com"
            value={clinicUrl}
            onChange={(e) => {
              setClinicUrl(e.target.value);
              if (urlError) setUrlError("");
            }}
            className={urlError ? "border-destructive" : ""}
          />
          <p className="text-xs text-muted-foreground">
            This tells us which clinic's data you want connected.
          </p>
          {urlError && <p className="text-xs text-destructive">{urlError}</p>}
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={() => {
              if (validateClinicUrl(clinicUrl)) {
                queryClient.setQueryData(["wizard-clinic-url"], clinicUrl);
              }
            }}
            disabled={!clinicUrl.trim()}
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // STEP 2: Request the Connection
  const Step2 = () => {
    const envRestrictionMessage = getEnvironmentRestrictionMessage();
    
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
            <Server className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Request the Jane data connection</CardTitle>
          <CardDescription>
            This starts the setup process. No data flows yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Environment Warning for Sandbox */}
          {isSandbox && (
            <Alert variant="destructive" className="max-w-md mx-auto">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4" />
                {envConfig.label} Environment
              </AlertTitle>
              <AlertDescription className="text-sm">
                {envRestrictionMessage}
                <br /><br />
                <strong>To connect to production Jane data:</strong> Use the production environment at app.clinicleader.com
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Card */}
          <div className="p-4 rounded-lg border bg-muted/30 max-w-md mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Clinic URL</span>
              <span className="font-mono text-sm">{extractClinicIdentifier(clinicUrl)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Source</span>
              <span className="font-medium">Jane</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Delivery</span>
              <Badge variant="secondary" className="text-xs">Partner Managed</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cadence</span>
              <span className="font-medium">Daily</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Environment</span>
              <Badge 
                variant={isSandbox ? "outline" : "default"} 
                className="text-xs gap-1"
              >
                {isSandbox && <FlaskConical className="h-3 w-3" />}
                {envConfig.label}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <Button
              size="lg"
              onClick={() => requestConnection.mutate()}
              disabled={requestConnection.isPending || !canActivateProduction}
              title={!canActivateProduction ? "Production connectors cannot be activated in sandbox environments" : undefined}
            >
              {requestConnection.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSandbox ? "Sandbox Mode Only" : "Request connection"}
            </Button>
            {!canActivateProduction ? (
              <p className="text-xs text-destructive text-center max-w-sm">
                Production connector activation is disabled in {envConfig.label.toLowerCase()} environments.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                We'll provide you with everything Jane needs to start sending data.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // STEP 3: Enable Data Delivery in Jane (Simplified for Partner-Managed)
  const Step3 = () => {
    const s3Fields = getS3ConfigFields();

    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
            <Server className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Share these details with Jane</CardTitle>
          <CardDescription>
            Send these values to your Jane account manager or support team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pre-filled Configuration Values */}
          <div className="space-y-3">
            <p className="font-medium text-sm text-center">Copy these values for Jane</p>
            <div className="space-y-2">
              {s3Fields.map((field) => (
                <div
                  key={field.label}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{field.label}</p>
                    <p className="font-mono text-sm truncate">{field.value}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(field.value, field.label)}
                    className="ml-2 shrink-0"
                  >
                    {copiedField === field.label ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Copy All Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => {
                const allValues = s3Fields.map(f => `${f.label}: ${f.value}`).join('\n');
                copyToClipboard(allValues, "all");
                toast.success("All values copied!");
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy all values
            </Button>
          </div>

          {/* Instructions */}
          <div className="p-4 rounded-lg bg-muted/30 space-y-3">
            <p className="font-medium text-sm">What to tell Jane:</p>
            <ol className="space-y-2 text-sm list-decimal list-inside text-muted-foreground">
              <li>Contact your Jane account manager or support</li>
              <li>Request access to the Data Warehouse feature</li>
              <li>Share the S3 configuration values above</li>
              <li>Jane will confirm when data delivery is enabled</li>
            </ol>
          </div>

          {/* Status Message */}
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
            <div className="flex items-center justify-center gap-2 text-amber-700">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Waiting for Jane to enable data delivery</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Button
              size="lg"
              onClick={() => markJaneSetupComplete.mutate()}
              disabled={markJaneSetupComplete.isPending}
            >
              {markJaneSetupComplete.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              I've shared this with Jane
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // STEP 4: Verify and Activate - Evidence-driven indicators
  const Step4 = () => {
    const hasFirstFile = hasSuccessIngest;
    const isVerified = !!connector?.locked_account_guid;
    const isUpdatingScorecard = hasScorecardsUpdating;

    if (isComplete) {
      return (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-green-100 w-fit">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-xl text-green-800">Jane data is flowing</CardTitle>
            <CardDescription className="text-green-700">
              Your scorecards will now update automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Button size="lg" onClick={() => navigate("/scorecard")}>
                View scorecard
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl">We're verifying your data</CardTitle>
          <CardDescription>
            Once Jane sends the first file, we verify it belongs to your clinic and activate the connection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live Status Indicators */}
          <div className="space-y-3 max-w-md mx-auto">
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              {hasFirstFile ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
              )}
              <span className={hasFirstFile ? "text-foreground" : "text-muted-foreground"}>
                First file received
              </span>
              <Badge variant="outline" className={`ml-auto ${hasFirstFile ? "bg-green-50 text-green-700 border-green-200" : ""}`}>
                {hasFirstFile ? "Complete" : "Pending"}
              </Badge>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              {isVerified ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : hasFirstFile ? (
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground" />
              )}
              <span className={isVerified ? "text-foreground" : "text-muted-foreground"}>
                Data verified
              </span>
              <Badge variant="outline" className={`ml-auto ${isVerified ? "bg-green-50 text-green-700 border-green-200" : ""}`}>
                {isVerified ? "Complete" : "Pending"}
              </Badge>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              {isUpdatingScorecard ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : isVerified ? (
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground" />
              )}
              <span className={isUpdatingScorecard ? "text-foreground" : "text-muted-foreground"}>
                Scorecards updating
              </span>
              <Badge variant="outline" className={`ml-auto ${isUpdatingScorecard ? "bg-green-50 text-green-700 border-green-200" : ""}`}>
                {isUpdatingScorecard ? "Complete" : "Pending"}
              </Badge>
            </div>
          </div>

          {/* Error State */}
          {hasError && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">We couldn't process the latest file</p>
                  <p className="text-sm text-amber-700 mt-1">
                    We're retrying automatically. No action needed from you.
                  </p>
                  {connector?.last_error && (
                    <p className="text-xs text-amber-600 mt-2 font-mono bg-amber-100 p-2 rounded">
                      {connector.last_error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!hasError && (
            <p className="text-center text-sm text-muted-foreground">
              This usually happens within 24 hours of Jane enabling data delivery.
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  // Determine which step to render based on evidence
  const renderCurrentStep = () => {
    if (!connector) {
      if (clinicUrl) {
        return <Step2 />;
      }
      return <Step1 />;
    }

    if (stepStatus[3] === 'complete' || stepStatus[4] === 'current' || stepStatus[4] === 'complete') {
      return <Step4 />;
    }

    if (stepStatus[2] === 'complete') {
      return <Step3 />;
    }

    return <Step3 />;
  };

  return (
    <div className="space-y-6">
      <PilotBanner />
      <StepIndicator />
      {renderCurrentStep()}
    </div>
  );
}
