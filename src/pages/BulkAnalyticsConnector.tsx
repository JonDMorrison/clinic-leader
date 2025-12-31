import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import {
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Pause,
  Play,
  Trash2,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Database,
  Calendar,
  Upload,
} from "lucide-react";

type SourceSystem = "jane" | "advancedmd" | "other";
type ConnectorStatus = "active" | "paused" | "error";
type Cadence = "daily" | "monthly";
type DeliveryMethod = "s3" | "secure_upload" | "manual_drop";

interface BulkConnector {
  id: string;
  organization_id: string;
  source_system: SourceSystem;
  connector_type: string;
  status: ConnectorStatus;
  cadence: Cadence;
  delivery_method: DeliveryMethod;
  expected_schema_version: string;
  last_received_at: string | null;
  last_processed_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

const sourceSystemLabels: Record<SourceSystem, string> = {
  jane: "Jane",
  advancedmd: "AdvancedMD",
  other: "Other",
};

const cadenceLabels: Record<Cadence, string> = {
  daily: "Daily",
  monthly: "Monthly",
};

const deliveryMethodLabels: Record<DeliveryMethod, string> = {
  s3: "S3 Bucket",
  secure_upload: "Secure Upload",
  manual_drop: "Manual File Drop",
};

const getStatusBadge = (status: ConnectorStatus) => {
  switch (status) {
    case "active":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Healthy
        </Badge>
      );
    case "paused":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Pause className="w-3 h-3 mr-1" />
          Paused
        </Badge>
      );
    case "error":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Error
        </Badge>
      );
  }
};

export default function BulkAnalyticsConnector() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const orgId = currentUser?.team_id;

  const [showAddForm, setShowAddForm] = useState(false);
  const [newSource, setNewSource] = useState<SourceSystem>("jane");
  const [newCadence, setNewCadence] = useState<Cadence>("daily");
  const [newDeliveryMethod, setNewDeliveryMethod] = useState<DeliveryMethod>("manual_drop");

  // Fetch existing connectors
  const { data: connectors, isLoading } = useQuery({
    queryKey: ["bulk-analytics-connectors", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("bulk_analytics_connectors")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BulkConnector[];
    },
    enabled: !!orgId,
  });

  // Add connector mutation
  const addConnector = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      const { data, error } = await supabase
        .from("bulk_analytics_connectors")
        .insert({
          organization_id: orgId,
          source_system: newSource,
          cadence: newCadence,
          delivery_method: newDeliveryMethod,
          expected_schema_version: `${newSource}_v1`,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Bulk analytics connector added");
      queryClient.invalidateQueries({ queryKey: ["bulk-analytics-connectors"] });
      setShowAddForm(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add connector: ${error.message}`);
    },
  });

  // Delete connector mutation
  const deleteConnector = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bulk_analytics_connectors")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Connector removed");
      queryClient.invalidateQueries({ queryKey: ["bulk-analytics-connectors"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove connector: ${error.message}`);
    },
  });

  // Toggle status mutation
  const toggleStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: ConnectorStatus }) => {
      const { error } = await supabase
        .from("bulk_analytics_connectors")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bulk-analytics-connectors"] });
    },
  });

  // Manual trigger mutation
  const triggerIngestion = useMutation({
    mutationFn: async (connector: BulkConnector) => {
      const response = await supabase.functions.invoke("bulk-ingest-analytics", {
        body: {
          connector_id: connector.id,
          file_name: `manual_trigger_${Date.now()}.csv`,
          schema_version: connector.expected_schema_version,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Ingestion triggered successfully");
      } else {
        toast.warning(`Ingestion completed with issues: ${data.error}`);
      }
      queryClient.invalidateQueries({ queryKey: ["bulk-analytics-connectors"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to trigger ingestion: ${error.message}`);
    },
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings/integrations")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
            Bulk Analytics Connector
          </h1>
          <p className="text-muted-foreground mt-1">
            Schema-driven, scheduled ingestion from practice management exports
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Read-only scheduled ingestion</p>
              <p className="text-sm text-muted-foreground">
                Bulk analytics connectors process scheduled file exports from your practice management system.
                No API credentials required — data is validated against expected schemas and loaded securely.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connectors List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Connectors</CardTitle>
              <CardDescription>Manage your bulk analytics data sources</CardDescription>
            </div>
            {!showAddForm && (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Connector
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Add Form */}
          {showAddForm && (
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Source System</Label>
                    <Select value={newSource} onValueChange={(v) => setNewSource(v as SourceSystem)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jane">Jane</SelectItem>
                        <SelectItem value="advancedmd">AdvancedMD</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ingestion Cadence</Label>
                    <Select value={newCadence} onValueChange={(v) => setNewCadence(v as Cadence)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery Method</Label>
                    <Select value={newDeliveryMethod} onValueChange={(v) => setNewDeliveryMethod(v as DeliveryMethod)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual_drop">Manual File Drop</SelectItem>
                        <SelectItem value="secure_upload">Secure Upload</SelectItem>
                        <SelectItem value="s3">S3 Bucket</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => addConnector.mutate()} disabled={addConnector.isPending}>
                    {addConnector.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Add Connector
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connectors */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !connectors || connectors.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium text-muted-foreground">No bulk analytics connectors</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add a connector to start processing scheduled file exports
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {connectors.map((connector) => (
                <Card key={connector.id} className="bg-background">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">
                              {sourceSystemLabels[connector.source_system]} (Bulk Analytics)
                            </h4>
                            {getStatusBadge(connector.status)}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {cadenceLabels[connector.cadence]} ingestion
                            </span>
                            <span className="flex items-center gap-1">
                              <Upload className="w-3 h-3" />
                              {deliveryMethodLabels[connector.delivery_method]}
                            </span>
                            <span>Schema: {connector.expected_schema_version}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => triggerIngestion.mutate(connector)}
                          disabled={triggerIngestion.isPending}
                        >
                          {triggerIngestion.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          <span className="ml-1 hidden sm:inline">Test Ingestion</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            toggleStatus.mutate({
                              id: connector.id,
                              newStatus: connector.status === "paused" ? "active" : "paused",
                            })
                          }
                        >
                          {connector.status === "paused" ? (
                            <Play className="w-4 h-4" />
                          ) : (
                            <Pause className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteConnector.mutate(connector.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Last file received:</span>
                        <span className="font-medium">
                          {connector.last_received_at
                            ? formatDistanceToNow(new Date(connector.last_received_at), { addSuffix: true })
                            : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Last processed:</span>
                        <span className="font-medium">
                          {connector.last_processed_at
                            ? formatDistanceToNow(new Date(connector.last_processed_at), { addSuffix: true })
                            : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Error display */}
                    {connector.last_error && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">
                          <AlertTriangle className="w-4 h-4 inline mr-1" />
                          {connector.last_error}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
