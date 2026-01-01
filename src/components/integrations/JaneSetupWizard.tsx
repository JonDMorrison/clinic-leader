import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";

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

interface JaneSetupWizardProps {
  connector: Connector | null;
  orgId: string;
  recentIngests: Array<{
    id: string;
    status: string;
    created_at: string;
    resource_name: string | null;
    rows: number;
    file_date: string | null;
  }>;
}

export default function JaneSetupWizard({ connector, orgId, recentIngests }: JaneSetupWizardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [clinicUrl, setClinicUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Derive wizard step from connector state
  const deriveWizardStep = (): WizardStep => {
    if (!connector) return 1;
    
    const status = connector.status;
    
    // Step 4 complete: receiving data
    if (connector.last_received_at && connector.last_processed_at) {
      return 4;
    }
    
    // Step 4: awaiting first file or error during verification
    if (status === "awaiting_first_file" || status === "error") {
      return 4;
    }
    
    // Step 3: awaiting jane setup or has connector but no first file
    if (status === "awaiting_jane_setup" || status === "requested") {
      // If they clicked "I've completed this step" previously, they're on step 4
      // Otherwise step 3
      return 3;
    }
    
    return 2;
  };

  const currentStep = deriveWizardStep();
  const isComplete = connector?.last_received_at && connector?.last_processed_at;
  const hasError = connector?.status === "error";

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

  // Step 1 & 2: Request connection
  const requestConnection = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      if (!validateClinicUrl(clinicUrl)) throw new Error("Invalid clinic URL");

      const clinicIdentifier = extractClinicIdentifier(clinicUrl);

      const { data, error } = await supabase
        .from("bulk_analytics_connectors")
        .insert({
          organization_id: orgId,
          source_system: "jane",
          connector_type: "bulk_analytics",
          status: "requested",
          cadence: "daily",
          delivery_method: "manual_drop",
          expected_schema_version: "jane_v1",
          clinic_identifier: clinicIdentifier,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Request received", {
        description: "Next, you'll enable data delivery inside Jane.",
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
  });

  // S3 configuration fields
  const getS3ConfigFields = () => [
    { label: "S3 Bucket", value: connector?.s3_bucket, pending: !connector?.s3_bucket },
    { label: "S3 Region", value: connector?.s3_region, pending: !connector?.s3_region },
    { label: "IAM Role ARN", value: connector?.s3_role_arn, pending: !connector?.s3_role_arn },
    { label: "External ID", value: connector?.s3_external_id, pending: !connector?.s3_external_id },
  ];

  // Progress indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              step < currentStep || isComplete
                ? "bg-primary text-primary-foreground"
                : step === currentStep
                ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {step < currentStep || (step === 4 && isComplete) ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              step
            )}
          </div>
          {step < 4 && (
            <div
              className={`w-8 h-0.5 mx-1 ${
                step < currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
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
                // Just move to step 2, don't submit yet
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
  const Step2 = () => (
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
            <span className="text-sm text-muted-foreground">Cadence</span>
            <span className="font-medium">Daily</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            onClick={() => requestConnection.mutate()}
            disabled={requestConnection.isPending}
          >
            {requestConnection.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Request connection
          </Button>
          <p className="text-xs text-muted-foreground text-center max-w-sm">
            Request received. Next, you'll enable data delivery inside Jane.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  // STEP 3: Enable Data Delivery in Jane
  const Step3 = () => {
    const s3Fields = getS3ConfigFields();
    const allFieldsPending = s3Fields.every(f => f.pending);

    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
            <Server className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Enable data delivery in Jane</CardTitle>
          <CardDescription>
            This step happens inside your Jane account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration Values */}
          <div className="space-y-3">
            <p className="font-medium text-sm text-center">Configuration Values</p>
            {allFieldsPending ? (
              <div className="p-4 rounded-lg border border-dashed bg-muted/30 text-center">
                <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Waiting for setup details. We'll update this automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {s3Fields.map((field) => (
                  <div
                    key={field.label}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      field.pending ? "bg-muted/50 border-dashed" : "bg-card"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{field.label}</p>
                      <p className={`font-mono text-sm truncate ${field.pending ? "text-muted-foreground italic" : ""}`}>
                        {field.value || "Pending configuration"}
                      </p>
                    </div>
                    {!field.pending && field.value && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(field.value!, field.label)}
                        className="ml-2 shrink-0"
                      >
                        {copiedField === field.label ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Setup Instructions */}
          <div className="p-4 rounded-lg bg-muted/30 space-y-3">
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li>Log into Jane as the account owner</li>
              <li>Go to <strong>Settings → Integrations → Data Warehouses</strong></li>
              <li>Add a new data warehouse connection</li>
              <li>Paste the values shown above</li>
              <li>Save and wait for the first delivery</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              The first delivery includes historical data and may take longer to appear.
            </p>
          </div>

          {/* Status Message */}
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
            <div className="flex items-center justify-center gap-2 text-amber-700">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Waiting for first delivery from Jane</span>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => markJaneSetupComplete.mutate()}
              disabled={markJaneSetupComplete.isPending}
            >
              {markJaneSetupComplete.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              I've completed this step
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // STEP 4: Verify and Activate
  const Step4 = () => {
    const hasFirstFile = !!connector?.last_received_at;
    const isVerified = !!connector?.locked_account_guid;
    const isUpdatingScorecard = !!connector?.last_processed_at;

    if (isComplete) {
      // Completion state
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
            Once the first file arrives, we verify it belongs to your clinic and activate the connection.
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
                    <p className="text-xs text-amber-600 mt-2">
                      Our team has been notified and is looking into it.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!hasError && (
            <p className="text-center text-sm text-muted-foreground">
              This usually happens within 24 hours of completing Jane setup.
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  // Determine which step to show
  // If no connector, show step 1
  // If connector exists but step is derived from state, show that step
  const showStep1 = !connector && currentStep === 1;
  const showStep2 = !connector && clinicUrl && currentStep >= 1;
  const showStep3 = connector && currentStep === 3;
  const showStep4 = connector && (currentStep === 4 || isComplete);

  // Use a simpler approach: derive step from connector state
  const renderCurrentStep = () => {
    if (!connector) {
      // No connector yet - show step 1 or 2 based on clinicUrl
      if (clinicUrl) {
        return <Step2 />;
      }
      return <Step1 />;
    }

    if (isComplete) {
      return <Step4 />;
    }

    if (connector.status === "awaiting_first_file" || connector.status === "error") {
      return <Step4 />;
    }

    // requested or awaiting_jane_setup
    return <Step3 />;
  };

  return (
    <div className="space-y-6">
      <StepIndicator />
      {renderCurrentStep()}
    </div>
  );
}
