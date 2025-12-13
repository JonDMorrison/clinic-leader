import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek } from "date-fns";

type Step = "upload" | "parsing" | "mapping" | "importing" | "done" | "error";

interface ExtractedMetric {
  name: string;
  value: number;
  matchedMetricId?: string;
  matchedMetricName?: string;
  confidence?: number;
}

export default function ImportPdfReport() {
  const { data: currentUser } = useCurrentUser();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [extractedMetrics, setExtractedMetrics] = useState<ExtractedMetric[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<{ imported: number; skipped: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  // Fetch available metrics for mapping
  const { data: availableMetrics } = useQuery({
    queryKey: ["metrics-for-mapping", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data } = await supabase
        .from("metrics")
        .select("id, name")
        .eq("organization_id", currentUser.team_id)
        .order("name");
      return data || [];
    },
    enabled: !!currentUser?.team_id,
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.type.includes("pdf") && !selectedFile.name.endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }

    setFile(selectedFile);
    setStep("parsing");
    setError(null);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const { data, error: parseError } = await supabase.functions.invoke("parse-pdf-report", {
        body: {
          file_base64: base64,
          file_name: selectedFile.name,
          organization_id: currentUser?.team_id,
        },
      });

      if (parseError) throw parseError;
      if (data?.error) throw new Error(data.error.message || "Failed to parse PDF");

      setExtractedMetrics(data.metrics || []);
      setStep("mapping");
      
      if (data.metrics?.length === 0) {
        toast.warning("No metric values found in the PDF");
      } else {
        toast.success(`Found ${data.metrics.length} potential metric values`);
      }
    } catch (err) {
      console.error("PDF parsing error:", err);
      setError(err instanceof Error ? err.message : "Failed to parse PDF");
      setStep("error");
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files[0]) processFile(files[0]);
  }, [currentUser?.team_id]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
    e.target.value = "";
  }, [currentUser?.team_id]);

  const handleMappingChange = (index: number, metricId: string) => {
    const metric = availableMetrics?.find(m => m.id === metricId);
    setExtractedMetrics(prev => prev.map((m, i) => 
      i === index ? { ...m, matchedMetricId: metricId, matchedMetricName: metric?.name } : m
    ));
  };

  const handleImport = async () => {
    const mappedMetrics = extractedMetrics.filter(m => m.matchedMetricId);
    if (mappedMetrics.length === 0) {
      toast.error("Please map at least one metric before importing");
      return;
    }

    setStep("importing");

    try {
      let imported = 0;
      let skipped = 0;

      for (const metric of mappedMetrics) {
        const periodKey = weekStart; // YYYY-MM-DD for weekly
        const { error } = await supabase
          .from("metric_results")
          .upsert({
            metric_id: metric.matchedMetricId,
            week_start: weekStart,
            period_start: weekStart,
            period_type: "weekly",
            period_key: periodKey,
            value: metric.value,
            source: "pdf_import",
          }, { onConflict: "metric_id,period_type,period_start" });

        if (error) {
          console.error("Error importing metric:", error);
          skipped++;
        } else {
          imported++;
        }
      }

      setImportResults({ imported, skipped });
      setStep("done");
      toast.success(`Imported ${imported} metric values`);
    } catch (err) {
      console.error("Import error:", err);
      setError(err instanceof Error ? err.message : "Failed to import metrics");
      setStep("error");
    }
  };

  const handleReset = () => {
    setStep("upload");
    setFile(null);
    setExtractedMetrics([]);
    setError(null);
    setImportResults(null);
  };

  return (
    <>
      <Helmet>
        <title>Import PDF Report | ClinicLeader</title>
      </Helmet>

      <div className="container max-w-4xl py-8">
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/scorecard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Scorecard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Import PDF Report
            </CardTitle>
            <CardDescription>
              Upload a PDF report and let AI extract metric values automatically.
              Week of {format(new Date(weekStart), "MMM d, yyyy")}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === "upload" && (
              <div className="space-y-4">
                <div
                  className={`cursor-pointer transition-all rounded-lg border-2 border-dashed p-8 ${
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <label className="flex flex-col items-center gap-3 cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,application/pdf"
                      onChange={handleFileInput}
                    />
                    <Upload className="w-12 h-12 text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-medium">Drop PDF here or click to select</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        PDF files up to 20MB
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {step === "parsing" && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium">Analyzing PDF...</p>
                  <p className="text-sm text-muted-foreground">
                    Extracting text and identifying metric values
                  </p>
                </div>
              </div>
            )}

            {step === "mapping" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{file?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {extractedMetrics.length} values found
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleReset}>
                    Upload Different File
                  </Button>
                </div>

                {extractedMetrics.length > 0 ? (
                  <>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Found in PDF</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Maps To KPI</TableHead>
                            <TableHead className="text-right">Confidence</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {extractedMetrics.map((metric, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{metric.name}</TableCell>
                              <TableCell>{metric.value.toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {metric.matchedMetricId && (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  )}
                                  <Select
                                    value={metric.matchedMetricId || ""}
                                    onValueChange={(value) => handleMappingChange(index, value)}
                                  >
                                    <SelectTrigger className="w-[200px]">
                                      <SelectValue placeholder="Select KPI" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableMetrics?.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                          {m.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant={(metric.confidence || 0) >= 0.7 ? "default" : "secondary"}>
                                  {Math.round((metric.confidence || 0) * 100)}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={handleReset}>
                        Cancel
                      </Button>
                      <Button onClick={handleImport}>
                        <Upload className="h-4 w-4 mr-2" />
                        Import {extractedMetrics.filter(m => m.matchedMetricId).length} Metrics
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="font-medium">No metric values found</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      The PDF may not contain recognizable metric data.
                    </p>
                    <Button onClick={handleReset}>Try Another File</Button>
                  </div>
                )}
              </div>
            )}

            {step === "importing" && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="font-medium">Importing metrics...</p>
              </div>
            )}

            {step === "done" && importResults && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <div className="text-center">
                  <p className="font-medium text-lg">Import Complete!</p>
                  <p className="text-muted-foreground">
                    {importResults.imported} metrics imported
                    {importResults.skipped > 0 && `, ${importResults.skipped} skipped`}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleReset}>
                    Import Another
                  </Button>
                  <Button onClick={() => navigate("/scorecard")}>
                    View Scorecard
                  </Button>
                </div>
              </div>
            )}

            {step === "error" && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <div className="text-center">
                  <p className="font-medium text-lg">Something went wrong</p>
                  <p className="text-muted-foreground">{error}</p>
                </div>
                <Button onClick={handleReset}>Try Again</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
