import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Calendar,
  ArrowLeft,
  Database,
  TrendingUp,
  Shield,
  Loader2,
  AlertCircle,
  Upload,
  Circle,
  ExternalLink,
} from "lucide-react";

type ConnectionStatus = 
  | "not_connected" 
  | "requested" 
  | "awaiting_jane_setup" 
  | "awaiting_first_file" 
  | "receiving_data" 
  | "error";

export default function JaneIntegration() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const orgId = currentUser?.team_id;
  
  const [clinicUrl, setClinicUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  // Check for existing bulk analytics connector for Jane
  const { data: connector, isLoading } = useQuery({
    queryKey: ["jane-bulk-connector", orgId],
    queryFn: async () => {
      if (!orgId) return null;

      const { data, error } = await supabase
        .from("bulk_analytics_connectors")
        .select("*")
        .eq("organization_id", orgId)
        .eq("source_system", "jane")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Evidence-based connection status - only green when data has actually arrived
  const getConnectionStatus = (): ConnectionStatus => {
    if (!connector) return "not_connected";
    if (connector.status === "error") return "error";
    
    // Only show "receiving_data" if we have actual evidence
    if (connector.last_received_at && connector.last_processed_at) {
      return "receiving_data";
    }
    
    // Return the actual DB status for intermediate states
    const dbStatus = connector.status as string;
    if (["requested", "awaiting_jane_setup", "awaiting_first_file"].includes(dbStatus)) {
      return dbStatus as ConnectionStatus;
    }
    
    // Fallback for legacy "active" status without data
    if (dbStatus === "active" && !connector.last_received_at) {
      return "awaiting_first_file";
    }
    
    return "requested";
  };

  const connectionStatus = getConnectionStatus();

  // Validate clinic URL format
  const validateClinicUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError("Please enter your Jane clinic URL");
      return false;
    }
    
    // Accept various formats: full URL, domain, or subdomain
    const cleaned = url.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!cleaned.includes("jane") && !cleaned.includes(".")) {
      setUrlError("Please enter a valid Jane clinic URL (e.g., yourclinic.janeapp.com)");
      return false;
    }
    
    setUrlError("");
    return true;
  };

  // Extract clinic identifier from URL
  const extractClinicIdentifier = (url: string): string => {
    const cleaned = url.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    return cleaned;
  };

  // Request connection mutation
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
        description: "We'll coordinate setup and notify you when data begins flowing.",
      });
      queryClient.invalidateQueries({ queryKey: ["jane-bulk-connector"] });
    },
    onError: (error: Error) => {
      if (error.message !== "Invalid clinic URL") {
        toast.error(`Failed to submit request: ${error.message}`);
      }
    },
  });

  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case "receiving_data":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Receiving Data
          </Badge>
        );
      case "requested":
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            <Circle className="w-3 h-3 mr-1" />
            Request Submitted
          </Badge>
        );
      case "awaiting_jane_setup":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Setup In Progress
          </Badge>
        );
      case "awaiting_first_file":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Awaiting First Delivery
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Needs Attention
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            Not Connected
          </Badge>
        );
    }
  };

  // Setup checklist items
  const getChecklistItems = () => {
    const hasConnector = !!connector;
    const hasClinicId = !!connector?.clinic_identifier;
    const isPastRequested = connector?.status && connector.status !== "requested";
    const hasReceived = !!connector?.last_received_at;
    const hasProcessed = !!connector?.last_processed_at;

    return [
      { label: "Connection requested", checked: hasConnector },
      { label: "Clinic identifier confirmed", checked: hasClinicId },
      { label: "Delivery method confirmed", checked: isPastRequested },
      { label: "First file received", checked: hasReceived },
      { label: "Metrics visible in scorecard", checked: hasProcessed },
    ];
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings/integrations")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
            Jane – Bulk Analytics Connection
          </h1>
          <p className="text-muted-foreground mt-1">
            Scheduled, read-only data delivery for leadership reporting
          </p>
        </div>
      </div>

      {/* Main Description Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-lg">
                Leadership analytics from your Jane data
              </p>
              <p className="text-muted-foreground">
                ClinicLeader connects to Jane using scheduled, read-only data delivery designed for leadership reporting. 
                No credentials or login required on your end.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Connection Status</span>
            {getStatusBadge(connectionStatus)}
          </CardTitle>
          <CardDescription>
            Data delivery is coordinated with Jane. Setup is handled by your ClinicLeader team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connectionStatus === "not_connected" ? (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="inline-flex p-4 rounded-full bg-muted">
                  <FileSpreadsheet className="w-10 h-10 text-muted-foreground" />
                </div>
                <div className="space-y-2 mt-4">
                  <p className="font-medium text-lg">Request Jane data connection</p>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Enter your Jane clinic URL to get started. We'll coordinate the setup and notify you when data begins flowing.
                  </p>
                </div>
              </div>

              {/* Clinic URL Input */}
              <div className="space-y-2 max-w-md mx-auto">
                <Label htmlFor="clinic-url">Your Jane clinic URL</Label>
                <Input
                  id="clinic-url"
                  type="text"
                  placeholder="e.g., yourclinic.janeapp.com"
                  value={clinicUrl}
                  onChange={(e) => {
                    setClinicUrl(e.target.value);
                    if (urlError) setUrlError("");
                  }}
                  className={urlError ? "border-red-500" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  Found in your browser address bar when logged into Jane
                </p>
                {urlError && (
                  <p className="text-xs text-red-600">{urlError}</p>
                )}
              </div>

              <div className="flex flex-col items-center gap-3">
                <Button
                  size="lg"
                  onClick={() => requestConnection.mutate()}
                  disabled={requestConnection.isPending || !clinicUrl.trim()}
                  className="min-w-[280px]"
                >
                  {requestConnection.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Request Jane Data Connection
                </Button>
                <p className="text-xs text-muted-foreground text-center max-w-sm">
                  This starts the setup process. Your ClinicLeader team will coordinate with Jane to enable data delivery.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Setup Checklist */}
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="font-medium mb-3">Setup Progress</p>
                <div className="space-y-2">
                  {getChecklistItems().map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {item.checked ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className={item.checked ? "text-foreground" : "text-muted-foreground"}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clinic identifier display */}
              {connector?.clinic_identifier && (
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Database className="w-4 h-4" />
                    Clinic Identifier
                  </div>
                  <p className="text-lg font-mono">
                    {connector.clinic_identifier}
                  </p>
                </div>
              )}

              {/* Status Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    Data Cadence
                  </div>
                  <p className="text-xl font-semibold capitalize">
                    {connector?.cadence || "Daily"}
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Shield className="w-4 h-4" />
                    Schema Version
                  </div>
                  <p className="text-xl font-semibold">
                    {connector?.expected_schema_version || "jane_v1"}
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    Last Data Received
                  </div>
                  <p className="text-xl font-semibold">
                    {connector?.last_received_at
                      ? formatDistanceToNow(new Date(connector.last_received_at), { addSuffix: true })
                      : "Awaiting first delivery"}
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Last Data Processed
                  </div>
                  <p className="text-xl font-semibold">
                    {connector?.last_processed_at
                      ? formatDistanceToNow(new Date(connector.last_processed_at), { addSuffix: true })
                      : "Awaiting first processing"}
                  </p>
                </div>
              </div>

              {/* Error display */}
              {connector?.last_error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">Attention needed</p>
                      <p className="text-sm text-red-700 mt-1">{connector.last_error}</p>
                      <p className="text-xs text-red-600 mt-2">
                        Contact your ClinicLeader team for assistance.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Awaiting data helper - shown when not yet receiving data */}
              {connectionStatus !== "receiving_data" && connectionStatus !== "error" && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Setup in progress</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Your request has been received. Data will appear here once the connection setup is complete and the first delivery arrives.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Upload Fallback */}
      <Card className="border-dashed">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-2 flex-1">
              <p className="font-medium">
                Upload Jane reports manually
              </p>
              <p className="text-sm text-muted-foreground">
                Get value immediately while automated delivery is being set up. Upload your Jane reports directly.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/import/monthly-report")}
                className="mt-2"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Jane Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What You Get Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            What This Provides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Leadership-ready metrics</p>
                <p className="text-sm text-muted-foreground">
                  Aggregated data for scorecards and accountability
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Trend visibility</p>
                <p className="text-sm text-muted-foreground">
                  Week-over-week and month-over-month comparisons
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">No manual data entry</p>
                <p className="text-sm text-muted-foreground">
                  Scheduled delivery replaces spreadsheet uploads
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Read-only access</p>
                <p className="text-sm text-muted-foreground">
                  ClinicLeader only reads analytics data — never writes back
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Security Card */}
      <Card className="bg-muted/30">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-background">
              <Shield className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <p className="font-medium">How data access works</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Only operational summaries are delivered — no patient-level data</li>
                <li>• Read-only connection — ClinicLeader cannot modify your Jane data</li>
                <li>• Data validated against expected schema before processing</li>
                <li>• Delivered on a predictable schedule (daily or monthly)</li>
                <li>• You control data delivery through your Jane settings</li>
              </ul>
              <Button
                variant="link"
                className="h-auto p-0 text-sm text-primary"
                onClick={() => navigate("/settings/integrations/data-safety")}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Learn more about security and data access
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
