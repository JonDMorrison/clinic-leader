import { useState } from "react";
import { FileDropZone } from "@/components/imports/FileDropZone";
import { HealthPanel } from "@/components/imports/HealthPanel";
import { supabase } from "@/integrations/supabase/client";
import { importAppointments } from "@/lib/importers/appointmentsImporter";
import { importPatients } from "@/lib/importers/patientsImporter";
import { importARAging } from "@/lib/importers/arAgingImporter";
import { importPayments } from "@/lib/importers/paymentsImporter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Play } from "lucide-react";

const Imports = () => {
  const [isRunningETL, setIsRunningETL] = useState(false);

  const generateChecksum = async (content: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileSelect = async (file: File, type: string) => {
    const content = await file.text();
    const checksum = await generateChecksum(content);

    // Check if file was already imported
    const { data: existing } = await supabase
      .from('file_ingest_log')
      .select('id')
      .eq('checksum', checksum)
      .eq('status', 'success')
      .maybeSingle();

    if (existing) {
      throw new Error('This file has already been imported successfully');
    }

    switch (type) {
      case 'appointments':
        await importAppointments(content, file.name, checksum);
        break;
      case 'patients':
        await importPatients(content, file.name, checksum);
        break;
      case 'ar_aging':
        await importARAging(content, file.name, checksum);
        break;
      case 'payments':
        await importPayments(content, file.name, checksum);
        break;
      default:
        throw new Error('Unknown import type');
    }
  };

  const handleRunETL = async () => {
    setIsRunningETL(true);
    try {
      const { data, error } = await supabase.functions.invoke('etl-nightly-upsert');

      if (error) throw error;

      toast.success('ETL process completed successfully');
    } catch (error: any) {
      toast.error(error.message || 'ETL process failed');
    } finally {
      setIsRunningETL(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Data Imports</h1>
          <p className="text-muted-foreground">Import Jane export files</p>
        </div>
        <Button onClick={handleRunETL} disabled={isRunningETL}>
          <Play className="w-4 h-4 mr-2" />
          {isRunningETL ? 'Running ETL...' : 'Run ETL Now'}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Upload Files</h2>
          <div className="grid gap-4">
            <FileDropZone
              label="Appointments"
              fileType="appointments"
              acceptedTypes={['.csv', '.xlsx']}
              onFileSelect={handleFileSelect}
            />
            <FileDropZone
              label="Patients"
              fileType="patients"
              acceptedTypes={['.csv', '.xlsx']}
              onFileSelect={handleFileSelect}
            />
            <FileDropZone
              label="A/R Aging"
              fileType="ar_aging"
              acceptedTypes={['.csv', '.xlsx']}
              onFileSelect={handleFileSelect}
            />
            <FileDropZone
              label="Payments"
              fileType="payments"
              acceptedTypes={['.csv', '.xlsx']}
              onFileSelect={handleFileSelect}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Import Health</h2>
          <HealthPanel onRetry={handleRunETL} />
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-2">How it works</h3>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Upload CSV/XLSX files from Jane exports</li>
          <li>Files are validated and stored in staging tables</li>
          <li>Click "Run ETL Now" to process staged data</li>
          <li>Data is aggregated into weekly KPIs and A/R aging buckets</li>
          <li>Monitor import health for success/failure status</li>
        </ol>
      </div>
    </div>
  );
};

export default Imports;
