import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
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
import {
  CheckCircle2,
  Shield,
  ExternalLink,
  FileText,
  Activity,
  TrendingUp,
  Upload,
} from "lucide-react";

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

  // Calculate ingestion health
  const getIngestionHealth = () => {
    if (!recentIngests || recentIngests.length === 0) {
      return {
        lastRunTime: null,
        lastSuccessTime: null,
        consecutiveFailures: 0,
        statusMessage: "No ingestion runs yet",
      };
    }

    const lastRun = recentIngests[0];
    const lastSuccess = recentIngests.find(log => log.status === "success");
    const consecutiveFailures = recentIngests.findIndex(log => log.status === "success");

    let statusMessage = "";
    if (lastRun.status === "success") {
      statusMessage = "Last run completed successfully. Data is flowing daily.";
    } else if (consecutiveFailures >= 3) {
      statusMessage = "Multiple consecutive failures detected. Our team has been notified.";
    } else if (consecutiveFailures > 0) {
      statusMessage = "Last run failed. We are retrying automatically.";
    } else {
      statusMessage = "Ingestion is running normally.";
    }

    return {
      lastRunTime: lastRun.created_at,
      lastSuccessTime: lastSuccess?.created_at || null,
      consecutiveFailures: consecutiveFailures === -1 ? recentIngests.length : consecutiveFailures,
      statusMessage,
    };
  };

  const ingestionHealth = getIngestionHealth();

  // Find first delivery date from oldest successful ingest or connector created_at
  const getFirstDeliveryDate = () => {
    const successfulIngests = recentIngests.filter(log => log.status === "success");
    if (successfulIngests.length > 0) {
      const oldest = successfulIngests[successfulIngests.length - 1];
      return oldest.file_date || oldest.created_at;
    }
    return connector.last_received_at;
  };

  return (
    <div className="space-y-6">
      {/* Connection Summary Card */}
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Jane Data Connection Active
          </CardTitle>
          <CardDescription>
            Your scorecards update automatically from Jane data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Details Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg border bg-background">
              <p className="text-sm text-muted-foreground mb-1">Jane Clinic URL</p>
              <p className="font-mono font-medium">{connector.clinic_identifier || "—"}</p>
            </div>
            <div className="p-4 rounded-lg border bg-background">
              <p className="text-sm text-muted-foreground mb-1">Locked Account GUID</p>
              <p className="font-mono font-medium text-sm truncate">{connector.locked_account_guid || "—"}</p>
            </div>
            <div className="p-4 rounded-lg border bg-background">
              <p className="text-sm text-muted-foreground mb-1">First Delivery</p>
              <p className="font-medium">
                {getFirstDeliveryDate()
                  ? format(new Date(getFirstDeliveryDate()!), "MMM d, yyyy")
                  : "—"}
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-background">
              <p className="text-sm text-muted-foreground mb-1">Last Delivery</p>
              <p className="font-medium">
                {connector.last_received_at
                  ? format(new Date(connector.last_received_at), "MMM d, yyyy")
                  : "—"}
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-background md:col-span-2">
              <p className="text-sm text-muted-foreground mb-1">Last Processed</p>
              <p className="font-medium">
                {connector.last_processed_at
                  ? format(new Date(connector.last_processed_at), "MMM d, yyyy 'at' h:mm a")
                  : "—"}
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

      {/* Recent Deliveries */}
      {recentIngests && recentIngests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" />
              Recent Data Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

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
            ingestionHealth.consecutiveFailures >= 3
              ? "bg-red-50 border border-red-200"
              : ingestionHealth.consecutiveFailures > 0
              ? "bg-amber-50 border border-amber-200"
              : "bg-green-50 border border-green-200"
          }`}>
            <p className={`text-sm ${
              ingestionHealth.consecutiveFailures >= 3
                ? "text-red-700"
                : ingestionHealth.consecutiveFailures > 0
                ? "text-amber-700"
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
