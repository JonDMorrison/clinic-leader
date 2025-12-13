import { useState, useMemo } from "react";
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
import { 
  Upload, Download, Loader2, CheckCircle, AlertTriangle, ArrowLeft, 
  ExternalLink, FileWarning, Table2, LayoutList, Columns, FileSpreadsheet,
  Info, AlertCircle, RotateCcw, ChevronRight
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  getWorkbookSheets, 
  parseSheet, 
  detectLayout, 
  findMetricMatch, 
  normalizeLabel,
  SheetInfo,
  ParsedSheet,
  LayoutDetection,
  indexToColumnLetter
} from "@/lib/importers/excelProfileParser";
import { parseCSV } from "@/lib/importers/csvParser";
import * as XLSX from 'xlsx';

// KPI-like keywords for sheet scoring
const KPI_KEYWORDS = [
  'revenue', 'visits', 'patients', 'profit', 'charges', 'close', 'rate',
  'collections', 'new', 'active', 'referrals', 'appointments', 'scheduled',
  'pvs', 'total', 'avg', 'average', 'gross', 'net', 'cancellations', 'no-shows',
  'monthly', 'kpi', 'metrics', 'scorecard', 'performance'
];

interface ExtractedValue {
  sourceLabel: string;
  value: any;
  numericValue: number | null;
  matchedMetricId: string | null;
  matchedMetricName: string | null;
  matchConfidence: number;
  matchType: string;
  status: 'matched' | 'unmatched' | 'invalid';
}

type Step = 'upload' | 'sheet-select' | 'preview' | 'mapping' | 'done';

const ImportMonthlyReport = () => {
  const navigate = useNavigate();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  
  // Step state
  const [step, setStep] = useState<Step>('upload');
  
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Sheet selection state
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  
  // Preview state
  const [parsedSheet, setParsedSheet] = useState<ParsedSheet | null>(null);
  const [layoutDetection, setLayoutDetection] = useState<LayoutDetection | null>(null);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [layoutType, setLayoutType] = useState<'row_metrics' | 'column_metrics'>('column_metrics');
  const [metricNameColIndex, setMetricNameColIndex] = useState(0);
  const [valueColIndex, setValueColIndex] = useState(1);
  
  // Mapping state
  const [extractedValues, setExtractedValues] = useState<ExtractedValue[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Results state
  const [importResults, setImportResults] = useState<{ imported: number; skipped: string[] } | null>(null);

  // Fetch metrics with import_key and aliases
  const { data: metrics } = useQuery({
    queryKey: ['metrics-for-import', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data, error } = await supabase
        .from('metrics')
        .select('id, name, unit, is_active, import_key, aliases')
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

  // Calculate sheet score based on KPI-like content
  const scoreSheet = (sheet: SheetInfo, workbook: XLSX.WorkBook): number => {
    const worksheet = workbook.Sheets[sheet.name];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    let score = 0;
    let numericCount = 0;
    let kpiKeywordCount = 0;
    
    // Scan first 25 rows
    for (let r = 0; r < Math.min(jsonData.length, 25); r++) {
      const row = jsonData[r] || [];
      for (let c = 0; c < Math.min(row.length, 15); c++) {
        const cell = row[c];
        if (cell === undefined || cell === null || cell === '') continue;
        
        // Count numeric cells
        if (typeof cell === 'number' || !isNaN(parseFloat(String(cell).replace(/[$,%]/g, '')))) {
          numericCount++;
        }
        
        // Check for KPI keywords
        if (typeof cell === 'string') {
          const lower = cell.toLowerCase();
          for (const keyword of KPI_KEYWORDS) {
            if (lower.includes(keyword)) {
              kpiKeywordCount++;
              break;
            }
          }
        }
      }
    }
    
    // Score based on: data rows, numeric cells, KPI keywords
    score += sheet.rowCount >= 8 ? 20 : sheet.rowCount * 2;
    score += Math.min(numericCount, 50);
    score += kpiKeywordCount * 5;
    
    return score;
  };

  // Handle file selection and parse workbook
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setStep('upload');
    setSheets([]);
    setWorkbook(null);
    setSelectedSheet('');
    setParsedSheet(null);
    setLayoutDetection(null);
    setExtractedValues([]);
    setImportResults(null);
    setIsProcessing(true);

    try {
      if (selectedFile.name.endsWith('.csv')) {
        // For CSV, skip sheet selection
        const content = await selectedFile.text();
        const parsed = parseCSV(content);
        const headers = parsed.headers;
        const rows = [headers, ...parsed.rows.map(r => headers.map(h => r[h]))];
        
        const fakeParsedSheet: ParsedSheet = {
          headers,
          rows,
          sheetName: 'CSV'
        };
        
        setParsedSheet(fakeParsedSheet);
        const layout = detectLayout(fakeParsedSheet);
        setLayoutDetection(layout);
        setLayoutType(layout.type);
        setHeaderRowIndex(layout.headerRowIndex);
        setStep('preview');
      } else {
        // For Excel, get all sheets
        const result = await getWorkbookSheets(selectedFile);
        setSheets(result.sheets);
        setWorkbook(result.workbook);
        
        // Auto-select best sheet
        if (result.sheets.length === 1) {
          setSelectedSheet(result.sheets[0].name);
          loadSheet(result.workbook, result.sheets[0].name);
        } else {
          // Score sheets and pick the best
          const scored = result.sheets.map(s => ({
            sheet: s,
            score: scoreSheet(s, result.workbook)
          })).sort((a, b) => b.score - a.score);
          
          // Auto-select the highest scoring sheet
          const bestSheet = scored[0].sheet.name;
          setSelectedSheet(bestSheet);
          setStep('sheet-select');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to read file');
    } finally {
      setIsProcessing(false);
    }
  };

  // Load and parse a specific sheet
  const loadSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const parsed = parseSheet(wb, sheetName, 50);
    setParsedSheet(parsed);
    
    // Auto-detect layout
    const layout = detectLayoutEnhanced(parsed);
    setLayoutDetection(layout);
    setLayoutType(layout.type);
    setHeaderRowIndex(layout.headerRowIndex);
    setMetricNameColIndex(0);
    setValueColIndex(1);
    
    setStep('preview');
  };

  // Enhanced layout detection with better header row detection
  const detectLayoutEnhanced = (parsed: ParsedSheet): LayoutDetection => {
    const { rows } = parsed;
    if (rows.length < 2) {
      return { type: 'column_metrics', confidence: 0.3, headerRowIndex: 0, detectedLabels: [] };
    }
    
    // Find the best header row by scanning first 25 rows
    let bestHeaderRow = 0;
    let bestHeaderScore = 0;
    
    for (let r = 0; r < Math.min(rows.length, 25); r++) {
      const row = rows[r] || [];
      let textCount = 0;
      let uniqueTexts = new Set<string>();
      let numericCount = 0;
      
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (typeof cell === 'string' && cell.length > 2 && cell.length < 100) {
          textCount++;
          uniqueTexts.add(cell.toLowerCase());
        }
        if (typeof cell === 'number' || !isNaN(parseFloat(String(cell)))) {
          numericCount++;
        }
      }
      
      // Header row should have many unique text labels and low numeric density
      const score = (uniqueTexts.size * 2) + textCount - (numericCount * 0.5);
      if (score > bestHeaderScore && row.length >= 3) {
        bestHeaderScore = score;
        bestHeaderRow = r;
      }
    }
    
    // Now detect layout using that header row
    const headerRow = rows[bestHeaderRow] || [];
    const dataRow = rows[bestHeaderRow + 1] || [];
    
    // Check column-based: headers are text, data is numeric
    let headerTextCount = 0;
    let dataNumericCount = 0;
    for (let i = 0; i < Math.max(headerRow.length, dataRow.length); i++) {
      if (typeof headerRow[i] === 'string' && String(headerRow[i]).length > 2) headerTextCount++;
      const val = dataRow[i];
      if (typeof val === 'number' || !isNaN(parseFloat(String(val).replace(/[$,%]/g, '')))) dataNumericCount++;
    }
    const colScore = headerRow.length > 0 ? 
      (headerTextCount / headerRow.length) * (dataRow.length > 0 ? dataNumericCount / dataRow.length : 0) : 0;
    
    // Check row-based: first column is text labels
    let firstColTextCount = 0;
    let secondColNumericCount = 0;
    for (let r = bestHeaderRow; r < Math.min(rows.length, bestHeaderRow + 20); r++) {
      const row = rows[r] || [];
      if (typeof row[0] === 'string' && String(row[0]).length > 2) firstColTextCount++;
      const val = row[1];
      if (typeof val === 'number' || !isNaN(parseFloat(String(val).replace(/[$,%]/g, '')))) secondColNumericCount++;
    }
    const rowsToCheck = Math.min(rows.length - bestHeaderRow, 20);
    const rowScore = rowsToCheck > 0 ? (firstColTextCount / rowsToCheck) * (secondColNumericCount / rowsToCheck) : 0;
    
    const isRowBased = rowScore > colScore;
    
    // Extract detected labels
    let detectedLabels: string[] = [];
    if (isRowBased) {
      detectedLabels = rows
        .slice(bestHeaderRow)
        .map(row => row[0])
        .filter(v => typeof v === 'string' && v.length > 2)
        .slice(0, 50);
    } else {
      detectedLabels = headerRow
        .filter(v => typeof v === 'string' && v.length > 2)
        .slice(0, 50);
    }
    
    return {
      type: isRowBased ? 'row_metrics' : 'column_metrics',
      confidence: Math.max(rowScore, colScore, 0.3),
      headerRowIndex: bestHeaderRow,
      metricNameColumn: isRowBased ? 'A' : undefined,
      valueColumn: isRowBased ? 'B' : undefined,
      detectedLabels
    };
  };

  // Handle sheet selection change
  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      loadSheet(workbook, sheetName);
    }
  };

  // Proceed from preview to mapping
  const proceedToMapping = () => {
    if (!parsedSheet || !metrics) return;
    
    const { rows } = parsedSheet;
    const extracted: ExtractedValue[] = [];
    
    if (layoutType === 'column_metrics') {
      // Headers contain metric names
      const headers = rows[headerRowIndex] || [];
      const dataRow = rows[headerRowIndex + 1] || [];
      
      for (let c = 0; c < headers.length; c++) {
        const sourceLabel = String(headers[c] || '').trim();
        if (!sourceLabel || sourceLabel.length < 2) continue;
        
        // Skip date/week columns
        if (/^(date|week|month|period|year|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i.test(sourceLabel)) continue;
        
        const rawValue = dataRow[c];
        const numericValue = parseNumericValue(rawValue);
        const match = findMetricMatch(sourceLabel, metrics);
        
        extracted.push({
          sourceLabel,
          value: rawValue,
          numericValue,
          matchedMetricId: match.metricId,
          matchedMetricName: match.metricId ? metrics.find(m => m.id === match.metricId)?.name || null : null,
          matchConfidence: match.confidence,
          matchType: match.matchType,
          status: match.metricId ? 'matched' : (numericValue !== null ? 'unmatched' : 'invalid'),
        });
      }
    } else {
      // Row-based: first column has names, value column has values
      for (let r = headerRowIndex; r < rows.length; r++) {
        const row = rows[r] || [];
        const sourceLabel = String(row[metricNameColIndex] || '').trim();
        if (!sourceLabel || sourceLabel.length < 2) continue;
        
        // Skip header-like rows
        if (/^(metric|name|kpi|measure|description)$/i.test(sourceLabel)) continue;
        
        const rawValue = row[valueColIndex];
        const numericValue = parseNumericValue(rawValue);
        const match = findMetricMatch(sourceLabel, metrics);
        
        extracted.push({
          sourceLabel,
          value: rawValue,
          numericValue,
          matchedMetricId: match.metricId,
          matchedMetricName: match.metricId ? metrics.find(m => m.id === match.metricId)?.name || null : null,
          matchConfidence: match.confidence,
          matchType: match.matchType,
          status: match.metricId ? 'matched' : (numericValue !== null ? 'unmatched' : 'invalid'),
        });
      }
    }
    
    setExtractedValues(extracted);
    setStep('mapping');
  };

  const parseNumericValue = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    
    const strVal = String(value).replace(/[$,%]/g, '').replace(/,/g, '').trim();
    const num = parseFloat(strVal);
    return isNaN(num) ? null : num;
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
      const [year, month] = selectedMonth.split('-').map(Number);
      const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const periodKey = `${year}-${String(month).padStart(2, '0')}`;
      
      const toImport = extractedValues.filter(e => e.matchedMetricId && e.numericValue !== null);
      const skipped: string[] = [];

      for (const ev of extractedValues) {
        if (!ev.matchedMetricId && ev.numericValue !== null) {
          skipped.push(`${ev.sourceLabel}: No matching metric`);
        } else if (ev.numericValue === null && ev.matchedMetricId) {
          skipped.push(`${ev.sourceLabel}: Invalid value`);
        }
      }

      const results = toImport.map(ev => ({
        metric_id: ev.matchedMetricId!,
        week_start: periodStart,
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
      setStep('done');
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

  const resetUpload = () => {
    setFile(null);
    setStep('upload');
    setSheets([]);
    setWorkbook(null);
    setSelectedSheet('');
    setParsedSheet(null);
    setLayoutDetection(null);
    setExtractedValues([]);
    setImportResults(null);
  };

  // Preview stats
  const previewStats = useMemo(() => {
    if (!parsedSheet) return null;
    
    const { rows } = parsedSheet;
    let numericCells = 0;
    let totalCells = 0;
    
    for (let r = 0; r < Math.min(rows.length, 20); r++) {
      const row = rows[r] || [];
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (cell !== undefined && cell !== null && cell !== '') {
          totalCells++;
          if (typeof cell === 'number' || !isNaN(parseFloat(String(cell).replace(/[$,%]/g, '')))) {
            numericCells++;
          }
        }
      }
    }
    
    return {
      rowCount: rows.length,
      colCount: Math.max(...rows.map(r => (r || []).length)),
      numericPercent: totalCells > 0 ? Math.round((numericCells / totalCells) * 100) : 0
    };
  }, [parsedSheet]);

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

      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-sm">
        <Badge variant={step === 'upload' ? 'default' : 'outline'}>1. Upload</Badge>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        {sheets.length > 1 && (
          <>
            <Badge variant={step === 'sheet-select' ? 'default' : 'outline'}>2. Select Sheet</Badge>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </>
        )}
        <Badge variant={step === 'preview' ? 'default' : 'outline'}>{sheets.length > 1 ? '3' : '2'}. Preview</Badge>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <Badge variant={step === 'mapping' ? 'default' : 'outline'}>{sheets.length > 1 ? '4' : '3'}. Map & Import</Badge>
      </div>

      {/* Done Results */}
      {step === 'done' && importResults && (
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
                <Button size="sm" onClick={() => navigate('/scorecard')}>View Scorecard</Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/scorecard/off-track')}>Review Off Track</Button>
                <Button size="sm" variant="outline" onClick={resetUpload}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Import Another
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
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

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Reading file...</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Step 2: Sheet Selection (for XLSX with multiple sheets) */}
      {step === 'sheet-select' && sheets.length > 1 && (
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Select Worksheet
            </h3>
            <p className="text-sm text-muted-foreground">
              Your file has {sheets.length} sheets. Select the one containing your KPI data.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Worksheet</Label>
            <Select value={selectedSheet} onValueChange={handleSheetChange}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Select a sheet" />
              </SelectTrigger>
              <SelectContent>
                {sheets.map((s, idx) => (
                  <SelectItem key={s.name} value={s.name}>
                    <span className="flex items-center gap-2">
                      {s.name}
                      <span className="text-xs text-muted-foreground">
                        ({s.rowCount} rows × {s.colCount} cols)
                      </span>
                      {idx === 0 && workbook && scoreSheet(s, workbook) > 50 && (
                        <Badge variant="secondary" className="text-xs">Recommended</Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Tip:</strong> Look for the sheet with your monthly KPI data (revenue, visits, etc.), not instructions or cover pages.
            </AlertDescription>
          </Alert>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && parsedSheet && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Table2 className="w-5 h-5" />
                Preview: {parsedSheet.sheetName}
              </h3>
              <p className="text-sm text-muted-foreground">
                Verify this looks like your KPI data before proceeding.
              </p>
            </div>
            {sheets.length > 1 && (
              <Button variant="outline" size="sm" onClick={() => setStep('sheet-select')}>
                Change Sheet
              </Button>
            )}
          </div>

          {/* Diagnostic Panel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground">Rows</p>
              <p className="text-xl font-bold">{previewStats?.rowCount}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground">Columns</p>
              <p className="text-xl font-bold">{previewStats?.colCount}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground">Header Row</p>
              <p className="text-xl font-bold">Row {headerRowIndex + 1}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground">Numeric %</p>
              <p className="text-xl font-bold">{previewStats?.numericPercent}%</p>
            </div>
          </div>

          {/* Warning if too few columns */}
          {previewStats && previewStats.colCount <= 2 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Low column count detected ({previewStats.colCount}).</strong> This might be an instructions or cover sheet.
                <ul className="list-disc list-inside mt-2 text-sm">
                  <li>Try selecting a different worksheet</li>
                  <li>Export the data tab as CSV and upload that</li>
                  <li>Ensure your data has multiple KPI columns</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Layout Detection */}
          <div className="space-y-3">
            <Label>Detected Layout</Label>
            <div className="flex gap-4">
              <Button
                variant={layoutType === 'column_metrics' ? 'default' : 'outline'}
                onClick={() => setLayoutType('column_metrics')}
                className="flex items-center gap-2"
              >
                <Columns className="w-4 h-4" />
                Column-Based
                {layoutDetection?.type === 'column_metrics' && (
                  <Badge variant="secondary" className="text-xs">Detected</Badge>
                )}
              </Button>
              <Button
                variant={layoutType === 'row_metrics' ? 'default' : 'outline'}
                onClick={() => setLayoutType('row_metrics')}
                className="flex items-center gap-2"
              >
                <LayoutList className="w-4 h-4" />
                Row-Based
                {layoutDetection?.type === 'row_metrics' && (
                  <Badge variant="secondary" className="text-xs">Detected</Badge>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {layoutType === 'column_metrics' 
                ? 'Metric names are in the header row, values in rows below'
                : 'Metric names are in the first column, values in adjacent columns'}
            </p>
          </div>

          {/* Header Row Selector */}
          <div className="space-y-2">
            <Label>Header Row</Label>
            <Select value={String(headerRowIndex)} onValueChange={(v) => setHeaderRowIndex(Number(v))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: Math.min(25, parsedSheet.rows.length) }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>Row {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* For row-based: select metric name and value columns */}
          {layoutType === 'row_metrics' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Metric Name Column</Label>
                <Select value={String(metricNameColIndex)} onValueChange={(v) => setMetricNameColIndex(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: previewStats?.colCount || 10 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        Column {indexToColumnLetter(i)} (#{i + 1})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value Column</Label>
                <Select value={String(valueColIndex)} onValueChange={(v) => setValueColIndex(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: previewStats?.colCount || 10 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        Column {indexToColumnLetter(i)} (#{i + 1})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-medium">#</TableHead>
                  {Array.from({ length: Math.min(previewStats?.colCount || 10, 10) }, (_, i) => (
                    <TableHead key={i} className="text-xs font-medium">
                      {indexToColumnLetter(i)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedSheet.rows.slice(0, 15).map((row, rowIdx) => (
                  <TableRow key={rowIdx} className={rowIdx === headerRowIndex ? 'bg-primary/10' : ''}>
                    <TableCell className="text-xs text-muted-foreground font-mono">{rowIdx + 1}</TableCell>
                    {Array.from({ length: Math.min(previewStats?.colCount || 10, 10) }, (_, colIdx) => (
                      <TableCell key={colIdx} className="text-xs max-w-32 truncate">
                        {row[colIdx] !== undefined && row[colIdx] !== null ? String(row[colIdx]) : ''}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={resetUpload}>Cancel</Button>
            <Button onClick={proceedToMapping} className="gradient-brand">
              Confirm & Proceed to Mapping
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Mapping */}
      {step === 'mapping' && extractedValues.length > 0 && (
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
            <div className="p-3 rounded-lg border bg-muted/50">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{extractedValues.length}</p>
            </div>
          </div>

          {/* Unmatched Warning for Locked Mode */}
          {isLockedMode && unmatchedCount > 0 && (
            <Alert className="border-warning bg-warning/10">
              <FileWarning className="h-4 w-4 text-warning" />
              <AlertDescription>
                <p className="font-medium">Unmatched items will be skipped</p>
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
                  <TableHead>Source Label</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Mapped Metric</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedValues.map((ev, index) => (
                  <TableRow key={index} className={ev.status === 'invalid' ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{ev.sourceLabel}</TableCell>
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
                      {ev.matchConfidence > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {Math.round(ev.matchConfidence * 100)}% ({ev.matchType})
                        </Badge>
                      )}
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
                        <Badge variant="secondary">Invalid Value</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setStep('preview')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Preview
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetUpload}>Cancel</Button>
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
          </div>
        </Card>
      )}
    </div>
  );
};

export default ImportMonthlyReport;
