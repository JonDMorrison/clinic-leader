import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDropZone } from "@/components/imports/FileDropZone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Play, CheckCircle2, Clock, AlertCircle, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { importAppointments } from "@/lib/importers/appointmentsImporter";
import { importPatients } from "@/lib/importers/patientsImporter";
import { importARAging } from "@/lib/importers/arAgingImporter";
import { importPayments } from "@/lib/importers/paymentsImporter";

const JaneIntegration = () => {
  const [isRunningSync, setIsRunningSync] = useState(false);

  // Fetch last sync status from file_ingest_log
  const { data: syncStatus } = useQuery({
    queryKey: ["jane-sync-status"],
    queryFn: async () => {
      const { data } = await supabase
        .from("file_ingest_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(4);

      const statuses = {
        appointments: data?.find((f) => f.file_name.includes("appointment")),
        patients: data?.find((f) => f.file_name.includes("patient")),
        ar_aging: data?.find((f) => f.file_name.includes("ar") || f.file_name.includes("aging")),
        payments: data?.find((f) => f.file_name.includes("payment")),
      };

      return statuses;
    },
    refetchInterval: 5000,
  });

  const generateChecksum = async (content: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleFileSelect = async (file: File, type: string) => {
    const content = await file.text();
    const checksum = await generateChecksum(content);

    // Check if file was already imported
    const { data: existing } = await supabase
      .from("file_ingest_log")
      .select("id")
      .eq("checksum", checksum)
      .eq("status", "success")
      .maybeSingle();

    if (existing) {
      throw new Error("This file has already been imported successfully");
    }

    switch (type) {
      case "appointments":
        await importAppointments(content, file.name, checksum);
        break;
      case "patients":
        await importPatients(content, file.name, checksum);
        break;
      case "ar_aging":
        await importARAging(content, file.name, checksum);
        break;
      case "payments":
        await importPayments(content, file.name, checksum);
        break;
      default:
        throw new Error("Unknown import type");
    }
  };

  const handleRunSync = async () => {
    setIsRunningSync(true);
    try {
      const { data, error } = await supabase.functions.invoke("etl-nightly-upsert");

      if (error) throw error;

      toast.success("Sync completed successfully");
      console.log("Sync results:", data);
    } catch (error: any) {
      toast.error(error.message || "Sync failed");
    } finally {
      setIsRunningSync(false);
    }
  };

  const getStatusIcon = (status?: { status: string }) => {
    if (!status) return <Clock className="w-4 h-4 text-muted-foreground" />;
    if (status.status === "success") return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (status.status === "error") return <AlertCircle className="w-4 h-4 text-danger" />;
    return <Clock className="w-4 h-4 text-warning" />;
  };

  const getStatusBadge = (status?: { status: string; created_at: string }) => {
    if (!status) return <Badge variant="outline">Awaiting Data</Badge>;
    if (status.status === "success")
      return (
        <Badge variant="outline" className="border-success text-success">
          ✓ Success
        </Badge>
      );
    if (status.status === "error")
      return (
        <Badge variant="outline" className="border-danger text-danger">
          ✗ Failed
        </Badge>
      );
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Jane App Integration</h1>
          <p className="text-muted-foreground">Sync practice data from Jane App</p>
        </div>
        <Button onClick={handleRunSync} disabled={isRunningSync}>
          <Play className="w-4 h-4 mr-2" />
          {isRunningSync ? "Running Sync..." : "Run Sync Now"}
        </Button>
      </div>

      <Card className="border-brand/20 bg-brand/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-brand mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">PHI-Light Mode Active</p>
              <p className="text-sm text-muted-foreground">
                This integration stores only de-identified metrics (dates, provider IDs, amounts, status codes).
                No patient names, DOB, contact info, or clinical notes are imported.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Mode:</span>
                <Badge>Reports (CSV/XLSX)</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Last Import Status</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(syncStatus?.appointments)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">Appointments</p>
                    {getStatusBadge(syncStatus?.appointments)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(syncStatus?.patients)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">Patients</p>
                    {getStatusBadge(syncStatus?.patients)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(syncStatus?.ar_aging)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">A/R Aging</p>
                    {getStatusBadge(syncStatus?.ar_aging)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(syncStatus?.payments)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">Payments</p>
                    {getStatusBadge(syncStatus?.payments)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Jane Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            Export reports from Jane App and upload them here. Files are automatically validated and processed.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <FileDropZone
              label="Appointments Report"
              fileType="appointments"
              acceptedTypes={[".csv", ".xlsx"]}
              onFileSelect={handleFileSelect}
            />
            <FileDropZone
              label="Patients Report"
              fileType="patients"
              acceptedTypes={[".csv", ".xlsx"]}
              onFileSelect={handleFileSelect}
            />
            <FileDropZone
              label="A/R Aging Report"
              fileType="ar_aging"
              acceptedTypes={[".csv", ".xlsx"]}
              onFileSelect={handleFileSelect}
            />
            <FileDropZone
              label="Payments Report"
              fileType="payments"
              acceptedTypes={[".csv", ".xlsx"]}
              onFileSelect={handleFileSelect}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="text-sm text-muted-foreground space-y-3 list-decimal list-inside">
            <li>
              <span className="font-medium text-foreground">Export from Jane:</span> Go to Jane App → Reports → Export
              each report type as CSV or XLSX
            </li>
            <li>
              <span className="font-medium text-foreground">Upload here:</span> Drag & drop or click each zone to
              upload the corresponding report
            </li>
            <li>
              <span className="font-medium text-foreground">Automatic validation:</span> Files are checked for
              duplicates (SHA-256 checksum) and staged
            </li>
            <li>
              <span className="font-medium text-foreground">Run sync:</span> Click "Run Sync Now" or wait for the
              nightly automated sync (1:00 AM)
            </li>
            <li>
              <span className="font-medium text-foreground">KPIs updated:</span> Visits, New Patients, Revenue, A/R
              aging, and other metrics are calculated and displayed on your Scorecard
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card className="border-warning/20 bg-warning/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">API Access Coming Soon</p>
              <p className="text-sm text-muted-foreground">
                Once Jane App provides API credentials, you'll be able to enable automatic syncing without manual report
                uploads. Real-time webhooks for appointments and payments will also be available.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JaneIntegration;
