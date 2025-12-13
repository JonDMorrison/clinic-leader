import { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Download, Loader2 } from "lucide-react";
import { parseExcel } from "@/lib/importers/excelParser";
import { parseCSV } from "@/lib/importers/csvParser";
import { MetricMappingTable } from "@/components/imports/MetricMappingTable";
import { useQuery } from "@tanstack/react-query";

interface Mapping {
  extractedField: string;
  value: any;
  suggestedMetric: string;
  confidence: number;
  mappedMetricId?: string;
}

const ImportMonthlyReport = () => {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [period, setPeriod] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);

  const { data: metrics } = useQuery({
    queryKey: ['metrics', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data, error } = await supabase
        .from('metrics')
        .select('id, name')
        .eq('organization_id', currentUser.team_id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setShowPreview(false);
    setMappings([]);
  };

  const handleParse = async () => {
    if (!file || !currentUser?.team_id) return;

    setIsProcessing(true);
    try {
      let extractedData: any;

      // Parse based on file type
      if (file.name.endsWith('.csv')) {
        const content = await file.text();
        extractedData = parseCSV(content);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        extractedData = await parseExcel(file);
      } else {
        throw new Error('Unsupported file format. Please use CSV or Excel.');
      }

      // Send to AI for mapping
      const { data, error } = await supabase.functions.invoke('parse-monthly-report', {
        body: {
          extractedData,
          organizationId: currentUser.team_id,
        },
      });

      if (error) throw error;

      setMappings(data.mappings || []);
      setPeriod(data.period || '');
      setShowPreview(true);
      toast.success('Report parsed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to parse report');
      console.error('Parse error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMappingChange = (index: number, metricId: string) => {
    setMappings(prev => {
      const updated = [...prev];
      updated[index].mappedMetricId = metricId;
      return updated;
    });
  };

  // Normalize date to first of month for monthly imports
  const normalizeToMonthStart = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Date(date.getFullYear(), date.getMonth(), 1)
      .toISOString().split('T')[0];
  };

  const handleImport = async () => {
    if (!period || !currentUser?.team_id) {
      toast.error('Please select a period');
      return;
    }

    setIsProcessing(true);
    try {
      const normalizedPeriod = normalizeToMonthStart(period);
      const periodKey = normalizedPeriod.slice(0, 7); // 'YYYY-MM'
      
      // Insert metric results with monthly period fields
      const results = mappings
        .filter(m => m.mappedMetricId)
        .map(m => ({
          metric_id: m.mappedMetricId,
          week_start: normalizedPeriod, // Keep for legacy compat
          period_start: normalizedPeriod,
          period_type: 'monthly' as const,
          period_key: periodKey,
          value: parseFloat(String(m.value).replace(/[^0-9.-]/g, '')),
          source: 'monthly_upload',
        }));

      const { error } = await supabase.from('metric_results').upsert(results, {
        onConflict: 'metric_id,period_type,period_start',
      });

      if (error) throw error;

      toast.success(`Successfully imported ${results.length} metrics`);
      setFile(null);
      setShowPreview(false);
      setMappings([]);
      setPeriod('');
    } catch (error: any) {
      toast.error(error.message || 'Import failed');
      console.error('Import error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['Week Of', 'MVAs', 'New Patients', 'LNI Cases', 'Close Rate', 'Total Visits', 'Outgoing Charges', 'Avg Per Visit', 'Avg Per Case', 'Gross Income'];
    const example = ['2025-06-16', '23', '58', '12', '85', '412', '125000', '175', '3200', '215000'];
    const csv = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monthly-report-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (userLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Monthly Report Import</h1>
        <p className="text-muted-foreground">Upload your monthly clinic report to automatically populate scorecard metrics</p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">How It Works</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">1.</span>
                <span><strong>Download the template</strong> (optional) to see the expected format with all KPI columns</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">2.</span>
                <span><strong>Upload your report</strong> - Excel (.xlsx, .xls) or CSV format with your clinic's monthly data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">3.</span>
                <span><strong>AI automatically maps</strong> your column headers to scorecard metrics (e.g., "# MVAs" → "MVAs")</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">4.</span>
                <span><strong>Review and confirm</strong> the mapping, select the reporting period, then import</span>
              </li>
            </ul>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">💡 Tips:</strong> Include metrics like MVAs, New Patients, LNI Cases, Close Rate, Total Visits, 
              Outgoing Charges, Avg $ Per Visit, Avg $ Per Case, and Gross Income. The AI handles common formats like percentages, 
              dollar signs, and commas automatically.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Upload Report</Label>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>

          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="max-w-sm mx-auto"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Supports: Excel (.xlsx, .xls), CSV
            </p>
            {file && (
              <p className="text-sm text-foreground mt-2 font-medium">
                Selected: {file.name}
              </p>
            )}
          </div>

          {file && !showPreview && (
            <Button onClick={handleParse} disabled={isProcessing} className="w-full">
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Parse Report'
              )}
            </Button>
          )}
        </div>
      </Card>

      {showPreview && mappings.length > 0 && (
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="period">Select Month</Label>
            <Input
              id="period"
              type="month"
              value={period ? period.slice(0, 7) : ''}
              onChange={(e) => setPeriod(e.target.value + '-01')}
              className="max-w-sm"
            />
            {period && (
              <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                ✓ Importing as {new Date(period).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (monthly)
              </p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Preview & Mapping</h3>
            <MetricMappingTable
              mappings={mappings}
              availableMetrics={metrics || []}
              onMappingChange={handleMappingChange}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${mappings.filter(m => m.mappedMetricId).length} Metrics`
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ImportMonthlyReport;
