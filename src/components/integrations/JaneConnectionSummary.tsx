import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Shield,
  ExternalLink,
  FileText,
  Activity,
  TrendingUp,
  Upload,
  Pencil,
  Check,
  X,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  created_at?: string;
}

interface IngestLog {
  id: string;
  status: string;
  created_at: string;
  resource_name: string | null;
  rows: number;
  file_date: string | null;
}

interface JaneConnectionSummaryProps {
  connector: Connector;
  recentIngests: IngestLog[];
}

export default function JaneConnectionSummary({ connector, recentIngests }: JaneConnectionSummaryProps) {
  const navigate = useNavigate();
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [clinicUrl, setClinicUrl] = useState(connector.clinic_identifier || "");
  const [isSaving, setIsSaving] = useState(false);

  // Check for recent jane_pipe metric_results (within 48h) - evidence for active updates
  const { data: recentMetricUpdates } = useQuery({
    queryKey: ["jane-metric-updates-summary", connector.organization_id],
    queryFn: async () => {
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
    enabled: !!connector.organization_id,
  });

  const handleSaveClinicUrl = async () => {
    if (!clinicUrl.trim()) {
      toast.error("Please enter a valid clinic URL");
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("bulk_analytics_connectors")
        .update({ clinic_identifier: clinicUrl.trim() })
        .eq("id", connector.id);
      
      if (error) throw error;
      
      toast.success("Clinic URL updated");
      setIsEditingUrl(false);
    } catch (err) {
      console.error("Failed to update clinic URL:", err);
      toast.error("Failed to update clinic URL");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setClinicUrl(connector.clinic_identifier || "");
    setIsEditingUrl(false);
  };

  // Evidence-based checks
  const hasSuccessIngest = recentIngests.some(log => log.status === "success");
  const hasScorecardsUpdating = (recentMetricUpdates?.length ?? 0) > 0;
  const hasError = connector.status === "error";

  // Calculate ingestion health with evidence
  const getIngestionHealth = () => {
    if (!recentIngests || recentIngests.length === 0) {
      return {
        lastRunTime: null,
        lastSuccessTime: null,
        consecutiveFailures: 0,
        statusMessage: "Awaiting first delivery",
        status: "waiting" as const,
      };
    }

    const lastRun = recentIngests[0];
    const lastSuccess = recentIngests.find(log => log.status === "success");
    const consecutiveFailures = recentIngests.findIndex(log => log.status === "success");

    let statusMessage = "";
    let status: "healthy" | "warning" | "error" | "waiting" = "healthy";

    if (!hasSuccessIngest) {
      statusMessage = "Awaiting first successful delivery";
      status = "waiting";
    } else if (lastRun.status === "success") {
      statusMessage = "Last run completed successfully. Data is flowing daily.";
      status = "healthy";
    } else if (consecutiveFailures >= 3) {
      statusMessage = "Multiple consecutive failures detected. Our team has been notified.";
      status = "error";
    } else if (consecutiveFailures > 0) {
      statusMessage = "Last run failed. We are retrying automatically.";
      status = "warning";
    } else {
      statusMessage = "Ingestion is running normally.";
      status = "healthy";
    }

    return {
      lastRunTime: lastRun.created_at,
      lastSuccessTime: lastSuccess?.created_at || null,
      consecutiveFailures: consecutiveFailures === -1 ? recentIngests.length : consecutiveFailures,
      statusMessage,
      status,
    };
  };

  const ingestionHealth = getIngestionHealth();

  // Find first delivery date from oldest successful ingest
  const getFirstDeliveryDate = () => {
    const successfulIngests = recentIngests.filter(log => log.status === "success");
    if (successfulIngests.length > 0) {
      const oldest = successfulIngests[successfulIngests.length - 1];
      return oldest.file_date || oldest.created_at;
    }
    return null; // Don't show if no success ingest
  };

  // Show error banner if connector has error
  const ErrorBanner = () => {
    if (!hasError || !connector.last_error) return null;
    
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Connection Error</p>
              <p className="text-sm text-muted-foreground mt-1">
                {connector.last_error}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                We're investigating and will retry automatically.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Show awaiting state if no success ingest exists
  const AwaitingDeliveryBanner = () => {
    if (hasSuccessIngest) return null;
    
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Awaiting First Delivery</p>
              <p className="text-sm text-amber-700 mt-1">
                Your connection is configured. We're waiting for Jane to send the first data file.
              </p>
              <p className="text-xs text-amber-600 mt-2">
                This usually happens within 24 hours of completing Jane setup.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      <ErrorBanner />
      
      {/* Awaiting Banner */}
      <AwaitingDeliveryBanner />

      {/* Connection Summary Card */}
      <Card className={hasSuccessIngest ? "border-green-200 bg-green-50/30" : "border-muted"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${hasSuccessIngest ? "text-green-600" : "text-muted-foreground"}`} />
            {hasSuccessIngest ? "Jane Data Connection Active" : "Jane Data Connection Pending"}
          </CardTitle>
          <CardDescription>
            {hasSuccessIngest 
              ? "Your scorecards update automatically from Jane data."
              : "Connection configured, awaiting first successful data delivery."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Evidence-based Status Indicators */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
              {hasSuccessIngest ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <Clock className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm">First file received</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
              {connector.locked_account_guid ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <Clock className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm">Data verified</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-card">
              {hasScorecardsUpdating ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <Clock className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm">Scorecards updating</span>
            </div>
          </div>

          {/* Connection Details Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg border bg-background">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground">Jane Clinic URL</p>
                {!isEditingUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setIsEditingUrl(true)}
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                )}
              </div>
              {isEditingUrl ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={clinicUrl}
                    onChange={(e) => setClinicUrl(e.target.value)}
                    placeholder="https://yourclinic.janeapp.com"
                    className="h-8 font-mono text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleSaveClinicUrl}
                    disabled={isSaving}
                  >
                    <Check className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <p className="font-mono font-medium">{connector.clinic_identifier || "—"}</p>
              )}
            </div>
            <div className="p-4 rounded-lg border bg-background">
              <p className="text-sm text-muted-foreground mb-1">Verification ID</p>
              <p className="font-mono font-medium text-sm truncate" title="Unique identifier that confirms this data belongs to your clinic">
                {connector.locked_account_guid || "Pending verification"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Confirms data ownership</p>
            </div>
            <div className="p-4 rounded-lg border bg-background">
              <p className="text-sm text-muted-foreground mb-1">First Delivery</p>
              <p className="font-medium">
                {getFirstDeliveryDate()
                  ? format(new Date(getFirstDeliveryDate()!), "MMM d, yyyy")
                  : "Awaiting first file"}
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-background">
              <p className="text-sm text-muted-foreground mb-1">Last Processed</p>
              <p className="font-medium">
                {connector.last_processed_at
                  ? format(new Date(connector.last_processed_at), "MMM d, yyyy 'at' h:mm a")
                  : "Not yet processed"}
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/scorecard")}>
              <TrendingUp className="w-4 h-4 mr-2" />
              View Scorecard
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/settings/integrations/data-safety")}>
              <ExternalLink className="w-3 h-3 mr-2" />
              How data access works
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Deliveries - Show last 7 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Recent Data Deliveries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentIngests && recentIngests.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentIngests.slice(0, 7).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {log.file_date
                          ? format(new Date(log.file_date), "MMM d")
                          : format(new Date(log.created_at), "MMM d")}
                      </TableCell>
                      <TableCell className="capitalize">{log.resource_name || "—"}</TableCell>
                      <TableCell className="text-right">{log.rows?.toLocaleString() || "—"}</TableCell>
                      <TableCell>
                        {log.status === "success" ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Success
                          </Badge>
                        ) : log.status === "failed" || log.status === "error" ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Failed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center border rounded-lg border-dashed">
              <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No deliveries yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Data will appear here once Jane starts sending files.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ingestion Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Ingestion Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg border bg-muted/30">
              <p className="text-sm text-muted-foreground mb-1">Last Ingest Run</p>
              <p className="font-medium">
                {ingestionHealth.lastRunTime
                  ? formatDistanceToNow(new Date(ingestionHealth.lastRunTime), { addSuffix: true })
                  : "No runs yet"}
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <p className="text-sm text-muted-foreground mb-1">Last Successful Ingest</p>
              <p className="font-medium">
                {ingestionHealth.lastSuccessTime
                  ? formatDistanceToNow(new Date(ingestionHealth.lastSuccessTime), { addSuffix: true })
                  : "No successful runs yet"}
              </p>
            </div>
          </div>
          <div className={`mt-4 p-3 rounded-lg ${
            ingestionHealth.status === "error"
              ? "bg-red-50 border border-red-200"
              : ingestionHealth.status === "warning"
              ? "bg-amber-50 border border-amber-200"
              : ingestionHealth.status === "waiting"
              ? "bg-muted border border-muted"
              : "bg-green-50 border border-green-200"
          }`}>
            <p className={`text-sm ${
              ingestionHealth.status === "error"
                ? "text-red-700"
                : ingestionHealth.status === "warning"
                ? "text-amber-700"
                : ingestionHealth.status === "waiting"
                ? "text-muted-foreground"
                : "text-green-700"
            }`}>
              {ingestionHealth.statusMessage}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* What You Get */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
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

      {/* Manual Upload Fallback */}
      <Card className="border-dashed">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-2 flex-1">
              <p className="font-medium">Upload Jane reports manually</p>
              <p className="text-sm text-muted-foreground">
                Supplement automated delivery with manual report uploads when needed.
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

      {/* Data Security */}
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
                <li>• Delivered on a predictable schedule (daily)</li>
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
