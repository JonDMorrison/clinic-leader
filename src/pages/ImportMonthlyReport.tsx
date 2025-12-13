import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Download, Loader2, CheckCircle, AlertTriangle, ArrowLeft, ExternalLink, FileWarning } from "lucide-react";
import { parseExcel } from "@/lib/importers/excelParser";
import { parseCSV } from "@/lib/importers/csvParser";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface ExtractedValue {
  columnName: string;
  value: any;
  numericValue: number | null;
  matchedMetricId: string | null;
  matchedMetricName: string | null;
  status: 'matched' | 'unmatched' | 'invalid';
}

const ImportMonthlyReport = () => {
  const navigate = useNavigate();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedValues, setExtractedValues] = useState<ExtractedValue[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showPreview, setShowPreview] = useState(false);
  const [importResults, setImportResults] = useState<{ imported: number; skipped: string[] } | null>(null);

  const { data: metrics } = useQuery({
    queryKey: ['metrics-for-import', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data, error } = await supabase
        .from('metrics')
        .select('id, name, unit, is_active')
        .eq('organization_id', currentUser.team_id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  const { data: orgSettings } = useQuery({
    queryKey: ['org-settings', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;
      const { data, error } = await supabase
        .from('teams')
        .select('scorecard_mode')
        .eq('id', currentUser.team_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  const isLockedMode = orgSettings?.scorecard_mode === 'locked_to_template';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setShowPreview(false);
    setExtractedValues([]);
    setImportResults(null);
  };

  const findMatchingMetric = (columnName: string): { id: string; name: string } | null => {
    if (!metrics) return null;
    
    const normalized = columnName.toLowerCase().trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ');
    
    // Exact match first
    const exact = metrics.find(m => 
      m.name.toLowerCase().trim() === normalized ||
      m.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim() === normalized
    );
    if (exact) return { id: exact.id, name: exact.name };
    
    // Fuzzy match - contains or is contained
    const fuzzy = metrics.find(m => {
      const metricNorm = m.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      return metricNorm.includes(normalized) || normalized.includes(metricNorm);
    });
    if (fuzzy) return { id: fuzzy.id, name: fuzzy.name };
    
    return null;
  };

  const parseNumericValue = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    
    const strVal = String(value)
      .replace(/[$,%]/g, '')
      .replace(/,/g, '')
      .trim();
    
    const num = parseFloat(strVal);
    return isNaN(num) ? null : num;
  };

  const handleParse = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      let parsedData: any;

      if (file.name.endsWith('.csv')) {
        const content = await file.text();
        parsedData = parseCSV(content);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        parsedData = await parseExcel(file);
      } else {
        throw new Error('Unsupported file format. Please use CSV or Excel.');
      }

      // Take the first data row (or sum if multiple rows)
      const dataRow = parsedData.rows[0] || {};
      const extracted: ExtractedValue[] = [];

      for (const [columnName, rawValue] of Object.entries(dataRow)) {
        // Skip date/week columns
        if (/^(date|week|month|period|year)$/i.test(columnName.trim())) continue;
        
        const numericValue = parseNumericValue(rawValue);
        const match = findMatchingMetric(columnName);

        extracted.push({
          columnName,
          value: rawValue,
          numericValue,
          matchedMetricId: match?.id || null,
          matchedMetricName: match?.name || null,
          status: match ? 'matched' : (numericValue !== null ? 'unmatched' : 'invalid'),
        });
      }

      setExtractedValues(extracted);
      setShowPreview(true);
      
      const matchedCount = extracted.filter(e => e.status === 'matched').length;
      toast.success(`Parsed ${extracted.length} columns, ${matchedCount} matched to metrics`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to parse report');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMappingChange = (index: number, metricId: string | null) => {
    setExtractedValues(prev => {
      const updated = [...prev];
      if (metricId) {
        const metric = metrics?.find(m => m.id === metricId);
        updated[index].matchedMetricId = metricId;
        updated[index].matchedMetricName = metric?.name || null;
        updated[index].status = 'matched';
      } else {
        updated[index].matchedMetricId = null;
        updated[index].matchedMetricName = null;
        updated[index].status = updated[index].numericValue !== null ? 'unmatched' : 'invalid';
      }
      return updated;
    });
  };

  const handleImport = async () => {
    if (!currentUser?.team_id || !selectedMonth) {
      toast.error('Please select a month');
      return;
    }

    setIsProcessing(true);
    try {
      // Parse selected month to first day
      const [year, month] = selectedMonth.split('-').map(Number);
      const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const periodKey = `${year}-${String(month).padStart(2, '0')}`;
      
      const toImport = extractedValues.filter(e => e.matchedMetricId && e.numericValue !== null);
      const skipped: string[] = [];

      for (const ev of extractedValues) {
        if (!ev.matchedMetricId && ev.numericValue !== null) {
          skipped.push(`${ev.columnName}: No matching metric`);
        } else if (ev.numericValue === null && ev.matchedMetricId) {
          skipped.push(`${ev.columnName}: Invalid value`);
        }
      }

      // Insert metric results with monthly period fields
      const results = toImport.map(ev => ({
        metric_id: ev.matchedMetricId!,
        week_start: periodStart, // Legacy compatibility
        period_start: periodStart,
        period_type: 'monthly' as const,
        period_key: periodKey,
        value: ev.numericValue!,
        source: 'monthly_upload',
      }));

      if (results.length > 0) {
        const { error } = await supabase.from('metric_results').upsert(results, {
          onConflict: 'metric_id,period_type,period_start',
        });

        if (error) throw error;
      }

      setImportResults({ imported: results.length, skipped });
      toast.success(`Successfully imported ${results.length} metrics for ${format(new Date(periodStart), 'MMMM yyyy')}`);
    } catch (error: any) {
      toast.error(error.message || 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    if (!metrics) return;
    const headers = metrics.map(m => m.name);
    const example = metrics.map(() => '');
    const csv = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monthly-kpi-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const matchedCount = extractedValues.filter(e => e.status === 'matched').length;
  const unmatchedCount = extractedValues.filter(e => e.status === 'unmatched').length;

  if (userLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/scorecard')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Scorecard
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Monthly KPI Sync</h1>
        <p className="text-muted-foreground">Upload your monthly clinic report to populate scorecard metrics</p>
        {isLockedMode && (
          <Badge variant="outline" className="mt-2 border-brand text-brand">
            Locked to Template - Only existing metrics will be imported
          </Badge>
        )}
      </div>

      {/* Import Results */}
      {importResults && (
        <Alert className="border-success bg-success/10">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Import Complete!</p>
              <p>{importResults.imported} metrics imported for {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</p>
              {importResults.skipped.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium">Skipped ({importResults.skipped.length}):</p>
                  <ul className="list-disc list-inside">
                    {importResults.skipped.slice(0, 5).map((s, i) => <li key={i}>{s}</li>)}
                    {importResults.skipped.length > 5 && <li>...and {importResults.skipped.length - 5} more</li>}
                  </ul>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => navigate('/scorecard')}>
                  View Scorecard
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/scorecard/off-track')}>
                  Review Off Track
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* How It Works */}
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
                <span><strong>Column headers are matched</strong> to your scorecard metrics (fuzzy matching)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">4.</span>
                <span><strong>Review and confirm</strong> the mapping, select the reporting month, then import</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Upload Area */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Upload Report</Label>
            <Button variant="outline" size="sm" onClick={downloadTemplate} disabled={!metrics?.length}>
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

      {/* Preview & Mapping */}
      {showPreview && extractedValues.length > 0 && !importResults && (
        <Card className="p-6 space-y-6">
          {/* Month Selection */}
          <div className="space-y-2">
            <Label htmlFor="month">Select Month</Label>
            <Input
              id="month"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="max-w-sm"
            />
            <p className="text-sm text-success font-medium flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Importing as {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')} (monthly)
            </p>
          </div>

          {/* Summary */}
          <div className="flex gap-4">
            <div className="p-3 rounded-lg bg-success/10 border border-success/30">
              <p className="text-sm text-muted-foreground">Matched</p>
              <p className="text-2xl font-bold text-success">{matchedCount}</p>
            </div>
            <div className={`p-3 rounded-lg border ${unmatchedCount > 0 ? 'bg-warning/10 border-warning/30' : 'bg-muted/50'}`}>
              <p className="text-sm text-muted-foreground">Unmatched</p>
              <p className={`text-2xl font-bold ${unmatchedCount > 0 ? 'text-warning' : ''}`}>{unmatchedCount}</p>
            </div>
          </div>

          {/* Unmatched Warning for Locked Mode */}
          {isLockedMode && unmatchedCount > 0 && (
            <Alert className="border-warning bg-warning/10">
              <FileWarning className="h-4 w-4 text-warning" />
              <AlertDescription>
                <p className="font-medium">Unmatched columns will be skipped</p>
                <p className="text-sm">Your scorecard is locked to template. To add new metrics, go to the template page.</p>
                <Button size="sm" variant="link" className="p-0 h-auto text-warning" onClick={() => navigate('/scorecard/template')}>
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Manage Template
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Mapping Table */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Column Mapping</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Column Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Mapped Metric</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedValues.map((ev, index) => (
                  <TableRow key={index} className={ev.status === 'invalid' ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{ev.columnName}</TableCell>
                    <TableCell className="font-mono text-sm">{String(ev.value ?? '-')}</TableCell>
                    <TableCell>
                      <Select
                        value={ev.matchedMetricId || 'none'}
                        onValueChange={(val) => handleMappingChange(index, val === 'none' ? null : val)}
                        disabled={ev.numericValue === null}
                      >
                        <SelectTrigger className="w-56">
                          <SelectValue placeholder="Select metric" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Skip --</SelectItem>
                          {metrics?.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {ev.status === 'matched' && (
                        <Badge variant="outline" className="border-success text-success">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Matched
                        </Badge>
                      )}
                      {ev.status === 'unmatched' && (
                        <Badge variant="outline" className="border-warning text-warning">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Unmatched
                        </Badge>
                      )}
                      {ev.status === 'invalid' && (
                        <Badge variant="muted">Invalid Value</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowPreview(false);
              setExtractedValues([]);
              setFile(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isProcessing || matchedCount === 0} className="gradient-brand">
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${matchedCount} Metrics`
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ImportMonthlyReport;
