import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
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
} from "lucide-react";

type ConnectionStatus = "not_connected" | "pending" | "active" | "error";

export default function JaneIntegration() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const orgId = currentUser?.team_id;

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

  // Derive connection status
  const getConnectionStatus = (): ConnectionStatus => {
    if (!connector) return "not_connected";
    if (connector.status === "error") return "error";
    if (connector.status === "paused") return "pending";
    return "active";
  };

  const connectionStatus = getConnectionStatus();

  // Enable connection mutation
  const enableConnection = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");

      const { data, error } = await supabase
        .from("bulk_analytics_connectors")
        .insert({
          organization_id: orgId,
          source_system: "jane",
          connector_type: "bulk_analytics",
          status: "paused", // Starts as pending until activated by team
          cadence: "daily",
          delivery_method: "manual_drop",
          expected_schema_version: "jane_v1",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Jane data connection requested", {
        description: "Your ClinicLeader team will coordinate activation.",
      });
      queryClient.invalidateQueries({ queryKey: ["jane-bulk-connector"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to enable connection: ${error.message}`);
    },
  });

  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
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
            Scheduled data exports for reporting and leadership analytics
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
                ClinicLeader connects to Jane using scheduled data exports designed for reporting and leadership analytics. 
                This connection is read-only and optimized for predictable, ongoing insights.
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
            Data is delivered automatically once enabled. No login or credentials required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connectionStatus === "not_connected" ? (
            <div className="text-center py-8 space-y-6">
              <div className="inline-flex p-4 rounded-full bg-muted">
                <FileSpreadsheet className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="font-medium text-lg">Ready to connect</p>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Once enabled, Jane data will flow into ClinicLeader on a daily schedule, 
                  giving you clear visibility into trends and accountability metrics.
                </p>
              </div>
              <div className="space-y-3">
                <Button
                  size="lg"
                  onClick={() => enableConnection.mutate()}
                  disabled={enableConnection.isPending}
                  className="min-w-[240px]"
                >
                  {enableConnection.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enable Jane Data Connection
                </Button>
                <p className="text-xs text-muted-foreground">
                  This connection is activated in coordination with Jane and your ClinicLeader team.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
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

              {/* Pending state helper */}
              {connectionStatus === "pending" && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Connection pending</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Your Jane data connection is being set up. Data will begin flowing once activation is complete.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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
              <p className="font-medium">Data handling</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Only operational summaries are stored — no patient-level data</li>
                <li>• Read-only connection — ClinicLeader cannot modify your Jane data</li>
                <li>• Data validated against expected schema before processing</li>
                <li>• Delivered on a predictable schedule (daily or monthly)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
