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
  FileWarning, FileSpreadsheet, AlertCircle, RotateCcw, Copy, ExternalLink,
  Calendar, FileCheck
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { getWorkbookSheets, parseSheet, normalizeLabel } from "@/lib/importers/excelProfileParser";
import { parseCSV } from "@/lib/importers/csvParser";
import { isLoriWorkbook, parseLoriWorkbookSync, LoriMonthPayload, LoriParseResult } from "@/lib/importers/loriWorkbookImporter";
import * as XLSX from 'xlsx';

// Required columns for canonical import
const REQUIRED_COLUMNS = ['metric_key', 'value', 'month'];
const OPTIONAL_COLUMNS = ['metric_name'];

type Step = 'upload' | 'sheet-select' | 'preview' | 'import' | 'done' | 'lori-preview' | 'lori-import';

interface ParseDiagnostics {
  fileName: string;
  fileType: string;
  sheetName: string | null;
  detectedHeaderRow: number;
  detectedHeaders: string[];
  rowCount: number;
  sampleFirstRow: Record<string, any>;
  hasRequiredColumns: boolean;
  missingColumns: string[];
}

interface ParsedRow {
  rowNumber: number;
  metric_key: string;
  metric_name?: string;
  value: any;
  month: string;
  numericValue: number | null;
  normalizedMonth: string | null;
  matchedMetricId: string | null;
  matchedMetricName: string | null;
  status: 'ready' | 'unmatched' | 'invalid_value' | 'invalid_month';
  reason?: string;
}

interface ImportSummary {
  processed: number;
  imported: number;
  skipped: ParsedRow[];
}

const ImportMonthlyReport = () => {
  const navigate = useNavigate();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  
  // Step state
  const [step, setStep] = useState<Step>('upload');
  
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Sheet selection state
  const [sheets, setSheets] = useState<{ name: string; rowCount: number }[]>([]);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  
  // Diagnostics
  const [diagnostics, setDiagnostics] = useState<ParseDiagnostics | null>(null);
  
  // Preview state
  const [previewRows, setPreviewRows] = useState<any[][]>([]);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  
  // Parsed data
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  
  // Results
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  
  // Lori workbook state
  const [isLoriMode, setIsLoriMode] = useState(false);
  const [loriResult, setLoriResult] = useState<LoriParseResult | null>(null);
  const [loriImportProgress, setLoriImportProgress] = useState<{
    total: number;
    completed: number;
    results: { period_key: string; status: 'success' | 'error'; message?: string }[];
  } | null>(null);

  // Fetch metrics with import_key
  const { data: metrics } = useQuery({
    queryKey: ['metrics-for-import', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data, error } = await supabase
        .from('metrics')
        .select('id, name, import_key, is_active')
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

  const isAlignedMode = orgSettings?.scorecard_mode === 'aligned';

  // Check if template is ready (all metrics have import_key)
  const missingImportKeys = useMemo(() => 
    metrics?.filter(m => !m.import_key || m.import_key.trim() === '') || [],
    [metrics]
  );
  const templateReady = missingImportKeys.length === 0;

  // Build import_key -> metric lookup
  const importKeyMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    metrics?.forEach(m => {
      if (m.import_key && m.import_key.trim()) {
        map.set(normalizeLabel(m.import_key), { id: m.id, name: m.name });
      }
    });
    return map;
  }, [metrics]);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setStep('upload');
    setSheets([]);
    setWorkbook(null);
    setSelectedSheet('');
    setDiagnostics(null);
    setPreviewRows([]);
    setParsedRows([]);
    setImportSummary(null);
    setIsProcessing(true);

    try {
      if (selectedFile.name.endsWith('.csv')) {
        // For CSV, skip sheet selection
        const content = await selectedFile.text();
        const parsed = parseCSV(content);
        const headers = parsed.headers;
        const rows = [headers, ...parsed.rows.slice(0, 20).map(r => headers.map(h => r[h]))];
        
        setPreviewRows(rows);
        setHeaderRowIndex(0);
        
        const diag = buildDiagnostics(selectedFile.name, 'csv', null, 0, rows);
        setDiagnostics(diag);
        
        setStep('preview');
      } else {
        // For Excel, get all sheets
        const result = await getWorkbookSheets(selectedFile);
        const sheetInfos = result.sheets.map(s => ({ name: s.name, rowCount: s.rowCount }));
        setSheets(sheetInfos);
        setWorkbook(result.workbook);
        
        // Check if this is a Lori workbook (multi-month with Copy template)
        if (isLoriWorkbook(result.workbook)) {
          setIsLoriMode(true);
          const loriParsed = parseLoriWorkbookSync(result.workbook);
          setLoriResult(loriParsed);
          setStep('lori-preview');
        } else if (sheetInfos.length === 1) {
          setIsLoriMode(false);
          setSelectedSheet(sheetInfos[0].name);
          loadSheet(result.workbook, sheetInfos[0].name, selectedFile.name);
        } else {
          setIsLoriMode(false);
          // Find best sheet
          const best = findBestSheet(result.workbook, sheetInfos);
          setSelectedSheet(best);
          setStep('sheet-select');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to read file');
    } finally {
      setIsProcessing(false);
    }
  };

  // Find the sheet most likely to contain scorecard data
  const findBestSheet = (wb: XLSX.WorkBook, sheetInfos: { name: string }[]): string => {
    let bestSheet = sheetInfos[0].name;
    let bestScore = 0;
    
    for (const s of sheetInfos) {
      const worksheet = wb.Sheets[s.name];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Score based on having required columns
      let score = 0;
      for (const row of jsonData.slice(0, 10)) {
        const rowStr = JSON.stringify(row).toLowerCase();
        if (rowStr.includes('metric_key')) score += 50;
        if (rowStr.includes('value')) score += 30;
        if (rowStr.includes('month')) score += 30;
        if (rowStr.includes('metric')) score += 10;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestSheet = s.name;
      }
    }
    
    return bestSheet;
  };

  // Load and preview a specific sheet
  const loadSheet = (wb: XLSX.WorkBook, sheetName: string, fileName: string) => {
    const worksheet = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    // Find header row (row containing required columns)
    let headerIdx = 0;
    for (let r = 0; r < Math.min(jsonData.length, 20); r++) {
      const row = jsonData[r] || [];
      const rowStr = row.map(c => String(c || '').toLowerCase().trim());
      const hasKey = rowStr.some(c => c === 'metric_key');
      const hasValue = rowStr.some(c => c === 'value');
      const hasMonth = rowStr.some(c => c === 'month');
      if (hasKey && hasValue && hasMonth) {
        headerIdx = r;
        break;
      }
    }
    
    setHeaderRowIndex(headerIdx);
    setPreviewRows(jsonData.slice(0, 25));
    
    const diag = buildDiagnostics(fileName, 'xlsx', sheetName, headerIdx, jsonData);
    setDiagnostics(diag);
    
    setStep('preview');
  };

  // Build diagnostics object
  const buildDiagnostics = (
    fileName: string,
    fileType: string,
    sheetName: string | null,
    headerIdx: number,
    rows: any[][]
  ): ParseDiagnostics => {
    const headerRow = rows[headerIdx] || [];
    const headers = headerRow.map(h => String(h || '').trim());
    const normalizedHeaders = headers.map(h => h.toLowerCase());
    
    const hasRequired = REQUIRED_COLUMNS.every(col => 
      normalizedHeaders.includes(col)
    );
    const missing = REQUIRED_COLUMNS.filter(col => !normalizedHeaders.includes(col));
    
    const dataRow = rows[headerIdx + 1] || [];
    const sampleRow: Record<string, any> = {};
    headers.forEach((h, i) => {
      if (h) sampleRow[h] = dataRow[i];
    });
    
    return {
      fileName,
      fileType,
      sheetName,
      detectedHeaderRow: headerIdx + 1, // 1-indexed for display
      detectedHeaders: headers.filter(h => h),
      rowCount: rows.length - headerIdx - 1,
      sampleFirstRow: sampleRow,
      hasRequiredColumns: hasRequired,
      missingColumns: missing,
    };
  };

  // Handle sheet change
  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook && file) {
      loadSheet(workbook, sheetName, file.name);
    }
  };

  // Handle header row change
  const handleHeaderRowChange = (rowIdx: number) => {
    setHeaderRowIndex(rowIdx);
    if (previewRows.length > 0 && file) {
      const diag = buildDiagnostics(
        file.name,
        file.name.endsWith('.csv') ? 'csv' : 'xlsx',
        selectedSheet || null,
        rowIdx,
        previewRows
      );
      setDiagnostics(diag);
    }
  };

  // Proceed to import step - parse all data
  const proceedToImport = () => {
    if (!diagnostics?.hasRequiredColumns) {
      toast.error('Missing required columns: metric_key, value, month');
      return;
    }
    
    const headerRow = previewRows[headerRowIndex] || [];
    const headers = headerRow.map(h => String(h || '').trim().toLowerCase());
    
    const keyIdx = headers.indexOf('metric_key');
    const nameIdx = headers.indexOf('metric_name');
    const valueIdx = headers.indexOf('value');
    const monthIdx = headers.indexOf('month');
    
    const parsed: ParsedRow[] = [];
    
    for (let r = headerRowIndex + 1; r < previewRows.length; r++) {
      const row = previewRows[r] || [];
      const metricKey = String(row[keyIdx] || '').trim();
      const metricName = nameIdx >= 0 ? String(row[nameIdx] || '').trim() : undefined;
      const rawValue = row[valueIdx];
      const rawMonth = String(row[monthIdx] || '').trim();
      
      if (!metricKey) continue; // Skip empty rows
      
      // Parse value - BLANK is allowed (stored as null = Needs Data)
      let numericValue: number | null = null;
      let valueStatus: 'valid' | 'blank' | 'invalid' = 'valid';
      if (rawValue === null || rawValue === undefined || rawValue === '') {
        numericValue = null;
        valueStatus = 'blank'; // Blank is OK, stores as null
      } else {
        const strVal = String(rawValue).replace(/[$,%]/g, '').replace(/,/g, '').trim();
        if (strVal === '') {
          numericValue = null;
          valueStatus = 'blank';
        } else {
          numericValue = parseFloat(strVal);
          if (isNaN(numericValue)) {
            valueStatus = 'invalid';
          }
        }
      }
      
      // Parse month
      let normalizedMonth: string | null = null;
      if (rawMonth) {
        // Try YYYY-MM format
        const match = rawMonth.match(/^(\d{4})-(\d{1,2})$/);
        if (match) {
          normalizedMonth = `${match[1]}-${match[2].padStart(2, '0')}`;
        } else {
          // Try MM/YYYY or other formats
          const match2 = rawMonth.match(/(\d{1,2})\/(\d{4})/);
          if (match2) {
            normalizedMonth = `${match2[2]}-${match2[1].padStart(2, '0')}`;
          } else {
            // Try parsing as date
            const dateMatch = rawMonth.match(/(\d{4})[-/](\d{1,2})[-/]\d{1,2}/);
            if (dateMatch) {
              normalizedMonth = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}`;
            }
          }
        }
      }
      
      // Match metric by EXACT import_key only (no fuzzy matching in aligned mode)
      const normalizedKey = normalizeLabel(metricKey);
      const matchedMetric = importKeyMap.get(normalizedKey);
      
      // Determine status
      let status: ParsedRow['status'] = 'ready';
      let reason: string | undefined;
      
      if (!matchedMetric) {
        status = 'unmatched';
        reason = `metric_key "${metricKey}" not found in scorecard template`;
      } else if (valueStatus === 'invalid') {
        status = 'invalid_value';
        reason = `Invalid numeric value: "${rawValue}"`;
      } else if (!normalizedMonth) {
        status = 'invalid_month';
        reason = `Invalid month format: "${rawMonth}" (expected YYYY-MM)`;
      }
      // Note: blank values (valueStatus === 'blank') are valid and will be stored as null
      
      parsed.push({
        rowNumber: r + 1,
        metric_key: metricKey,
        metric_name: metricName,
        value: rawValue,
        month: rawMonth,
        numericValue,
        normalizedMonth,
        matchedMetricId: matchedMetric?.id || null,
        matchedMetricName: matchedMetric?.name || null,
        status,
        reason,
      });
    }
    
    setParsedRows(parsed);
    setStep('import');
  };

  // Execute import
  const executeImport = async () => {
    if (!currentUser?.team_id) return;
    
    setIsProcessing(true);
    try {
      const toImport = parsedRows.filter(r => r.status === 'ready');
      const skipped = parsedRows.filter(r => r.status !== 'ready');
      
      const results = toImport.map(r => ({
        metric_id: r.matchedMetricId!,
        week_start: `${r.normalizedMonth}-01`,
        period_start: `${r.normalizedMonth}-01`,
        period_type: 'monthly' as const,
        period_key: r.normalizedMonth!,
        value: r.numericValue!,
        source: 'monthly_upload',
        raw_row: {
          metric_key: r.metric_key,
          value: r.value,
          month: r.month,
        },
      }));

      if (results.length > 0) {
        const { error } = await supabase.from('metric_results').upsert(results, {
          onConflict: 'metric_id,period_type,period_start',
        });

        if (error) throw error;
      }

      setImportSummary({
        processed: parsedRows.length,
        imported: results.length,
        skipped,
      });
      setStep('done');
      toast.success(`Imported ${results.length} values`);
    } catch (error: any) {
      toast.error(error.message || 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy unmatched keys
  const copyUnmatchedKeys = () => {
    const unmatched = parsedRows.filter(r => r.status === 'unmatched');
    const text = unmatched.map(r => `Row ${r.rowNumber}: ${r.metric_key}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Download unmatched keys as CSV
  const downloadUnmatchedCsv = () => {
    const unmatched = parsedRows.filter(r => r.status === 'unmatched');
    const csv = [
      'row_number,metric_key,reason',
      ...unmatched.map(r => `${r.rowNumber},"${r.metric_key}","${r.reason || ''}"`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unmatched_metric_keys_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded unmatched keys CSV');
  };

  // Reset
  const resetUpload = () => {
    setFile(null);
    setStep('upload');
    setSheets([]);
    setWorkbook(null);
    setSelectedSheet('');
    setDiagnostics(null);
    setPreviewRows([]);
    setParsedRows([]);
    setImportSummary(null);
    setIsLoriMode(false);
    setLoriResult(null);
    setLoriImportProgress(null);
  };

  // Execute Lori workbook import
  const executeLoriImport = async () => {
    if (!currentUser?.team_id || !loriResult || loriResult.payloads.length === 0) return;
    
    setIsProcessing(true);
    setStep('lori-import');
    
    const results: { period_key: string; status: 'success' | 'error'; message?: string }[] = [];
    
    setLoriImportProgress({
      total: loriResult.payloads.length,
      completed: 0,
      results: [],
    });
    
    for (let i = 0; i < loriResult.payloads.length; i++) {
      const payload = loriResult.payloads[i];
      
      try {
        // Upsert into legacy_monthly_reports
        // Note: Table was just created, types may not be fully regenerated yet
        const { error } = await supabase
          .from('legacy_monthly_reports' as any)
          .upsert({
            organization_id: currentUser.team_id,
            period_key: payload.period_key,
            source_file_name: file?.name || null,
            payload: {
              sheet_name: payload.sheet_name,
              provider_table: payload.provider_table,
              referral_totals: payload.referral_totals,
              referral_sources: payload.referral_sources,
              extra_blocks: payload.extra_blocks,
              warnings: payload.warnings,
              verification: payload.verification,
              imported_at: new Date().toISOString(),
            },
          } as any, {
            onConflict: 'organization_id,period_key',
          });
        
        if (error) throw error;
        
        results.push({ period_key: payload.period_key, status: 'success' });
      } catch (err: any) {
        results.push({ 
          period_key: payload.period_key, 
          status: 'error', 
          message: err.message || 'Unknown error' 
        });
      }
      
      setLoriImportProgress({
        total: loriResult.payloads.length,
        completed: i + 1,
        results: [...results],
      });
    }
    
    setIsProcessing(false);
    
    const successCount = results.filter(r => r.status === 'success').length;
    if (successCount === results.length) {
      toast.success(`Successfully imported ${successCount} months`);
    } else if (successCount > 0) {
      toast.warning(`Imported ${successCount}/${results.length} months`);
    } else {
      toast.error('Import failed for all months');
    }
  };

  // Stats for import step
  const readyCount = parsedRows.filter(r => r.status === 'ready').length;
  const unmatchedCount = parsedRows.filter(r => r.status === 'unmatched').length;
  const invalidCount = parsedRows.filter(r => r.status === 'invalid_value' || r.status === 'invalid_month').length;

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
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Upload className="w-8 h-8 text-brand" />
          Import Monthly Data
        </h1>
        <p className="text-muted-foreground">
          Upload your monthly scorecard data using the canonical template format
        </p>
        {isAlignedMode && (
          <Badge variant="outline" className="mt-2 border-brand text-brand">
            Aligned Template Mode
          </Badge>
        )}
      </div>

      {/* Aligned mode banner */}
      {isAlignedMode && (
        <Alert className="border-primary bg-primary/5">
          <FileSpreadsheet className="h-4 w-4" />
          <AlertDescription>
            <strong>Aligned Monthly Scorecard:</strong> Upload must use Scorecard_Input format 
            (<code className="mx-1 px-1 bg-muted rounded">metric_key</code>, 
            <code className="mx-1 px-1 bg-muted rounded">value</code>, 
            <code className="mx-1 px-1 bg-muted rounded">month</code>). 
            Exact match using metric_key only — no fuzzy matching.
          </AlertDescription>
        </Alert>
      )}

      {/* Template not ready alert */}
      {isAlignedMode && !templateReady && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>Import Blocked:</strong> {missingImportKeys.length} metrics are missing import keys. 
              Set them up before importing data.
            </span>
            <Button size="sm" variant="outline" asChild>
              <a href="/scorecard/template">
                Fix Template <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Step: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-brand" />
              Upload Scorecard Data
            </CardTitle>
            <CardDescription>
              Upload a CSV or Excel file with columns: <code>metric_key</code>, <code>value</code>, <code>month</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2 flex-1">
                <p className="font-medium">Required columns:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>metric_key</strong> - Must match the import key in your scorecard template exactly</li>
                  <li><strong>value</strong> - Numeric value for the metric</li>
                  <li><strong>month</strong> - Month in YYYY-MM format (e.g., 2024-01)</li>
                </ul>
                <p className="mt-2 text-muted-foreground">
                  Optional: <strong>metric_name</strong> (for reference only, not used for matching)
                </p>
              </div>
              
              <Button
                variant="outline"
                onClick={() => {
                  if (!metrics?.length) {
                    toast.error('No metrics found to generate template');
                    return;
                  }
                  const csvContent = [
                    'metric_key,metric_name,value,month',
                    ...metrics
                      .filter(m => m.import_key)
                      .map(m => `${m.import_key},"${m.name}",,`)
                  ].join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `Scorecard_Template_${format(new Date(), 'yyyy-MM')}.csv`;
                  link.click();
                  toast.success('Template downloaded');
                }}
                disabled={!metrics?.length}
              >
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
                disabled={isAlignedMode && !templateReady}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Supports: Excel (.xlsx, .xls), CSV
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Sheet Select */}
      {step === 'sheet-select' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Worksheet</CardTitle>
            <CardDescription>
              Choose the sheet containing your scorecard data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {sheets.map(s => (
                <button
                  key={s.name}
                  className={`flex items-center justify-between p-4 rounded-lg border text-left transition-colors ${
                    selectedSheet === s.name 
                      ? 'border-brand bg-brand/5' 
                      : 'border-border hover:border-brand/50'
                  }`}
                  onClick={() => handleSheetChange(s.name)}
                >
                  <span className="font-medium">{s.name}</span>
                  <Badge variant="muted">{s.rowCount} rows</Badge>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={resetUpload}>
                Cancel
              </Button>
              <Button 
                onClick={() => workbook && file && loadSheet(workbook, selectedSheet, file.name)}
                disabled={!selectedSheet}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview */}
      {step === 'preview' && diagnostics && (
        <>
          {/* Diagnostics Panel */}
          <Card className={diagnostics.hasRequiredColumns ? '' : 'border-destructive'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {diagnostics.hasRequiredColumns ? (
                  <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                )}
                File Diagnostics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">File</p>
                  <p className="font-medium truncate">{diagnostics.fileName}</p>
                </div>
                {diagnostics.sheetName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Sheet</p>
                    <p className="font-medium">{diagnostics.sheetName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Header Row</p>
                  <Select 
                    value={String(headerRowIndex)} 
                    onValueChange={(v) => handleHeaderRowChange(parseInt(v))}
                  >
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: Math.min(previewRows.length, 25) }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>Row {i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Rows</p>
                  <p className="font-medium">{diagnostics.rowCount}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Detected Headers:</p>
                <div className="flex flex-wrap gap-2">
                  {diagnostics.detectedHeaders.map((h, i) => {
                    const isRequired = REQUIRED_COLUMNS.includes(h.toLowerCase());
                    const isOptional = OPTIONAL_COLUMNS.includes(h.toLowerCase());
                    return (
                      <Badge 
                        key={i} 
                        variant={isRequired ? 'default' : isOptional ? 'secondary' : 'muted'}
                        className={isRequired ? 'bg-success' : ''}
                      >
                        {h}
                        {isRequired && <CheckCircle className="w-3 h-3 ml-1" />}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {!diagnostics.hasRequiredColumns && (
                <Alert variant="destructive" className="mt-4">
                  <FileWarning className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Missing required columns for Aligned Scorecard:</strong> {diagnostics.missingColumns.join(', ')}
                    <div className="mt-2 text-sm">
                      <p>• You may be viewing a cover sheet or instructions tab</p>
                      <p>• Try selecting a different worksheet</p>
                      <p>• Try adjusting the header row</p>
                      <p>• Download the template from the Scorecard Template page</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Parse Log Panel */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Parse Log (debugging)
                </summary>
                <div className="mt-2 p-3 bg-muted/50 rounded-lg font-mono text-xs space-y-1">
                  <p><span className="text-muted-foreground">selected_sheet_name:</span> {diagnostics.sheetName || 'N/A (CSV)'}</p>
                  <p><span className="text-muted-foreground">header_row_index:</span> {diagnostics.detectedHeaderRow}</p>
                  <p><span className="text-muted-foreground">total_rows_parsed:</span> {diagnostics.rowCount}</p>
                  <p><span className="text-muted-foreground">total_columns_detected:</span> {diagnostics.detectedHeaders.length}</p>
                  <p><span className="text-muted-foreground">sample_first_row:</span></p>
                  <pre className="text-xs overflow-x-auto p-2 bg-background rounded">
                    {JSON.stringify(diagnostics.sampleFirstRow, null, 2)}
                  </pre>
                </div>
              </details>
            </CardContent>
          </Card>

          {/* Data Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Data Preview (first 15 rows)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      {(previewRows[headerRowIndex] || []).slice(0, 10).map((h, i) => (
                        <TableHead key={i}>{String(h || `Col ${i + 1}`)}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.slice(headerRowIndex + 1, headerRowIndex + 16).map((row, ri) => (
                      <TableRow key={ri}>
                        <TableCell className="text-muted-foreground">{headerRowIndex + ri + 2}</TableCell>
                        {(row || []).slice(0, 10).map((cell, ci) => (
                          <TableCell key={ci}>{String(cell ?? '')}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={resetUpload}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Start Over
            </Button>
            {sheets.length > 1 && (
              <Button variant="outline" onClick={() => setStep('sheet-select')}>
                Change Sheet
              </Button>
            )}
            <Button 
              onClick={proceedToImport}
              disabled={!diagnostics.hasRequiredColumns}
            >
              Continue to Import
            </Button>
          </div>
        </>
      )}

      {/* Step: Import */}
      {step === 'import' && (
        <>
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Import Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg border ${readyCount > 0 ? 'bg-success/10 border-success/30' : 'bg-muted/50'}`}>
                  <p className="text-sm text-muted-foreground">Ready to Import</p>
                  <p className="text-3xl font-bold text-success">{readyCount}</p>
                </div>
                <div className={`p-4 rounded-lg border ${unmatchedCount > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/50'}`}>
                  <p className="text-sm text-muted-foreground">Unmatched Keys</p>
                  <p className={`text-3xl font-bold ${unmatchedCount > 0 ? 'text-destructive' : ''}`}>{unmatchedCount}</p>
                </div>
                <div className={`p-4 rounded-lg border ${invalidCount > 0 ? 'bg-warning/10 border-warning/30' : 'bg-muted/50'}`}>
                  <p className="text-sm text-muted-foreground">Invalid Data</p>
                  <p className={`text-3xl font-bold ${invalidCount > 0 ? 'text-warning' : ''}`}>{invalidCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ready rows */}
          {readyCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  Ready to Import ({readyCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric Key</TableHead>
                      <TableHead>Matched Metric</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Month</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.filter(r => r.status === 'ready').slice(0, 20).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{r.metric_key}</TableCell>
                        <TableCell>{r.matchedMetricName}</TableCell>
                        <TableCell>{r.numericValue?.toLocaleString()}</TableCell>
                        <TableCell>{r.normalizedMonth}</TableCell>
                      </TableRow>
                    ))}
                    {readyCount > 20 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          ... and {readyCount - 20} more
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Unrecognized metric keys */}
          {unmatchedCount > 0 && (
            <Card className="border-destructive/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    Unrecognized Metric Keys ({unmatchedCount})
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyUnmatchedKeys}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy List
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadUnmatchedCsv}>
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href="/scorecard/template">
                        Fix in Template <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  These metric_keys were not found in your scorecard template. 
                  {isAlignedMode && " In aligned mode, the scorecard stays consistent. Unrecognized metric keys won't be added automatically."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Metric Key</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.filter(r => r.status === 'unmatched').map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.rowNumber}</TableCell>
                        <TableCell className="font-mono text-sm">{r.metric_key}</TableCell>
                        <TableCell>{r.value}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{r.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Invalid rows */}
          {invalidCount > 0 && (
            <Card className="border-warning/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="w-5 h-5" />
                  Invalid Rows ({invalidCount})
                </CardTitle>
                <CardDescription>
                  These rows have invalid values or month formats and will not be imported.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Metric Key</TableHead>
                      <TableHead>Original Value</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.filter(r => r.status === 'invalid_value' || r.status === 'invalid_month').map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.rowNumber}</TableCell>
                        <TableCell className="font-mono text-sm">{r.metric_key}</TableCell>
                        <TableCell className="text-destructive">{r.status === 'invalid_value' ? r.value : r.month}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{r.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setStep('preview')}>
              Back to Preview
            </Button>
            <Button 
              onClick={executeImport}
              disabled={readyCount === 0 || isProcessing}
              className="gradient-brand"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${readyCount} Values`
              )}
            </Button>
          </div>
        </>
      )}

      {/* Step: Lori Workbook Preview */}
      {step === 'lori-preview' && loriResult && (
        <>
          <Alert className="border-brand bg-brand/5">
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              <strong>Multi-Month Workbook Detected:</strong> This file contains {loriResult.payloads.length} monthly reports 
              that will be imported into the legacy data system.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand" />
                Months to Import ({loriResult.payloads.length})
              </CardTitle>
              <CardDescription>
                Each month's data will be stored as a complete payload for the Default data view
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {loriResult.payloads.map((payload) => (
                  <div 
                    key={payload.period_key} 
                    className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {payload.period_key}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Sheet: {payload.sheet_name}
                        </span>
                      </div>
                      {payload.warnings.length > 0 && (
                        <Badge variant="secondary" className="text-warning">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {payload.warnings.length} warning{payload.warnings.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-muted-foreground text-xs">Provider Table</p>
                        <p className="font-medium">
                          {payload.provider_table.rows.length} rows
                        </p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-muted-foreground text-xs">Referral Totals</p>
                        <p className="font-medium">
                          {payload.referral_totals.rows.length} rows
                        </p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-muted-foreground text-xs">Referral Sources</p>
                        <p className="font-medium">
                          {payload.referral_sources.rows.length} sources
                        </p>
                      </div>
                    </div>
                    
                    {payload.extra_blocks.length > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Extra blocks: {payload.extra_blocks.map(b => b.title).join(', ')}
                      </div>
                    )}
                    
                    {payload.warnings.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {payload.warnings.map((w, i) => (
                          <p key={i} className="text-xs text-warning flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {w}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {loriResult.skippedSheets.length > 0 && (
            <Card className="border-muted">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Skipped Sheets ({loriResult.skippedSheets.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {loriResult.skippedSheets.map((s, i) => (
                    <Badge key={i} variant="muted">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {loriResult.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {loriResult.errors.map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={resetUpload}>
              Cancel
            </Button>
            <Button 
              onClick={executeLoriImport}
              disabled={loriResult.payloads.length === 0 || isProcessing}
              className="gradient-brand"
            >
              <FileCheck className="w-4 h-4 mr-2" />
              Import {loriResult.payloads.length} Month{loriResult.payloads.length > 1 ? 's' : ''}
            </Button>
          </div>
        </>
      )}

      {/* Step: Lori Import Progress */}
      {step === 'lori-import' && loriImportProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-brand" />
                  Importing Months...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-success" />
                  Import Complete
                </>
              )}
            </CardTitle>
            <CardDescription>
              {loriImportProgress.completed} of {loriImportProgress.total} months processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-brand h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(loriImportProgress.completed / loriImportProgress.total) * 100}%` 
                }}
              />
            </div>

            {/* Results list */}
            <div className="grid gap-2">
              {loriImportProgress.results.map((r, i) => (
                <div 
                  key={i}
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    r.status === 'success' 
                      ? 'bg-success/5 border-success/30' 
                      : 'bg-destructive/5 border-destructive/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {r.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                    <span className="font-mono">{r.period_key}</span>
                  </div>
                  {r.message && (
                    <span className="text-sm text-destructive">{r.message}</span>
                  )}
                </div>
              ))}
            </div>

            {!isProcessing && (
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={resetUpload}>
                  Import Another File
                </Button>
                <Button onClick={() => navigate('/data')}>
                  View Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step: Done */}
      {step === 'done' && importSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="w-6 h-6" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                <p className="text-sm text-muted-foreground">Values Imported</p>
                <p className="text-3xl font-bold text-success">{importSummary.imported}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground">Not Imported</p>
                <p className="text-3xl font-bold">{importSummary.skipped.length}</p>
              </div>
            </div>

            {importSummary.skipped.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">Rows Not Imported:</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {importSummary.skipped.map((r, i) => (
                    <div key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span>Row {r.rowNumber}:</span>
                      <span className="font-mono">{r.metric_key}</span>
                      <span>- {r.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={resetUpload}>
                Import Another File
              </Button>
              <Button onClick={() => navigate('/scorecard')}>
                View Scorecard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImportMonthlyReport;
