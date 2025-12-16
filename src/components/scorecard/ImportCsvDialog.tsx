import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Download, AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { importMetricResultsFromCSV, type ImportResult } from "@/lib/importers/metricCsvImport";
import { generateCSVTemplate, downloadCSV } from "@/lib/importers/metricCsvExport";
import { useToast } from "@/hooks/use-toast";

interface ImportCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onImportComplete: () => void;
}

export const ImportCsvDialog = ({
  open,
  onOpenChange,
  organizationId,
  onImportComplete,
}: ImportCsvDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [allowOverrides, setAllowOverrides] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    downloadCSV(template, "metric_import_template.csv");
    toast({
      title: "Template downloaded",
      description: "Use this template to import your metric data",
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    try {
      const content = await file.text();
      const result = await importMetricResultsFromCSV(
        content,
        organizationId,
        allowOverrides
      );
      
      setImportResult(result);
      
      if (result.errors.length === 0) {
        toast({
          title: "Import successful",
          description: `Inserted: ${result.inserted}, Updated: ${result.updated}, Not imported: ${result.skipped}`,
        });
        onImportComplete();
      } else {
        toast({
          variant: "destructive",
          title: "Import completed with errors",
          description: `${result.errors.length} errors occurred. Check the summary below.`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setImportResult(null);
    setAllowOverrides(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Metric Data from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with metric history. Download the template to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-accent/30">
            <div>
              <p className="font-medium">Need a template?</p>
              <p className="text-sm text-muted-foreground">
                Download the CSV template with example data
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">Select CSV File</Label>
            <div className="flex items-center gap-2">
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="flex-1 text-sm"
              />
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Override Option */}
          <div className="flex items-center space-x-2 p-4 border rounded-lg">
            <Checkbox
              id="allow-overrides"
              checked={allowOverrides}
              onCheckedChange={(checked) => setAllowOverrides(checked === true)}
            />
            <div className="flex-1">
              <label
                htmlFor="allow-overrides"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Allow Overrides
              </label>
              <p className="text-sm text-muted-foreground mt-1">
                Overwrite existing Jane-sourced data with imported values (requires admin privileges)
              </p>
            </div>
          </div>

          {/* Import Result Summary */}
          {importResult && (
            <div className="space-y-3">
              <div className="font-semibold text-lg">Import Summary</div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/30">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Inserted</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{importResult.inserted}</p>
                </div>
                
                <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Updated</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{importResult.updated}</p>
                </div>
                
                <div className="p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/30">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Not Imported</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{importResult.skipped}</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">
                      {importResult.errors.length} Error(s) Found:
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                      {importResult.errors.map((error, idx) => (
                        <div key={idx}>
                          Line {error.line}: {error.message}
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || importing}
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
