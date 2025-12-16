import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  Clock,
  Copy,
  Loader2,
  ExternalLink,
  Settings2,
  Download,
  ArrowUp
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface GoogleSheetSyncSectionProps {
  orgId: string;
  templateReady: boolean;
  missingImportKeysCount: number;
  duplicateImportKeysCount: number;
}

interface SyncResult {
  success: boolean;
  rows_processed: number;
  rows_upserted: number;
  unmatched_metric_keys: { key: string; rows: number[] }[];
  invalid_month_rows: { row: number; value: string }[];
  invalid_value_rows: { row: number; value: string }[];
  detected_headers: string[];
  last_synced_month: string | null;
  error?: string;
}

// Extract sheet ID from various Google Sheets URL formats
function extractSheetId(url: string): string | null {
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /^([a-zA-Z0-9-_]+)$/, // Just the ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function GoogleSheetSyncSection({ 
  orgId, 
  templateReady,
  missingImportKeysCount,
  duplicateImportKeysCount
}: GoogleSheetSyncSectionProps) {
  const queryClient = useQueryClient();
  
  // Local form state
  const [sheetUrl, setSheetUrl] = useState("");
  const [tabName, setTabName] = useState("Scorecard_Input");
  const [hasChanges, setHasChanges] = useState(false);
  
  // Sync result modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // Fetch current config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['scorecard-import-config', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scorecard_import_configs')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Initialize form from config
  useEffect(() => {
    if (config) {
      if (config.sheet_id) {
        setSheetUrl(`https://docs.google.com/spreadsheets/d/${config.sheet_id}/edit`);
      }
      if (config.tab_name) {
        setTabName(config.tab_name);
      }
    }
  }, [config]);

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const sheetId = extractSheetId(sheetUrl);
      if (!sheetId && sheetUrl.trim()) {
        throw new Error("Invalid Google Sheet URL");
      }

      const configData = {
        organization_id: orgId,
        source: sheetId ? 'google_sheet' : 'manual_upload',
        sheet_id: sheetId,
        tab_name: tabName || 'Scorecard_Input',
        status: sheetId ? 'not_configured' : 'not_configured',
      };

      if (config) {
        const { error } = await supabase
          .from('scorecard_import_configs')
          .update(configData)
          .eq('organization_id', orgId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('scorecard_import_configs')
          .insert(configData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scorecard-import-config'] });
      setHasChanges(false);
      toast.success("Google Sheet configuration saved");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save configuration");
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke('sync-scorecard-google-sheet', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Sync failed");
      }

      return response.data as SyncResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['scorecard-import-config'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['metric-results'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-pulse'] });
      
      setSyncResult(result);
      setShowResultModal(true);

      if (result.success && result.rows_upserted > 0) {
        toast.success(`Synced ${result.rows_upserted} metric values`);
      } else if (result.error) {
        toast.error(result.error);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Sync failed");
    },
  });

  const sheetId = extractSheetId(sheetUrl);
  const isConnected = config?.source === 'google_sheet' && config?.sheet_id;
  const canSync = templateReady && isConnected && !syncMutation.isPending;

  // Copy unmatched keys
  const copyUnmatchedKeys = () => {
    if (!syncResult?.unmatched_metric_keys) return;
    const text = syncResult.unmatched_metric_keys.map(u => u.key).join('\n');
    navigator.clipboard.writeText(text);
    toast.success("Copied unmatched keys to clipboard");
  };

  // Download unmatched keys as CSV
  const downloadUnmatchedKeysCsv = () => {
    if (!syncResult?.unmatched_metric_keys?.length) return;
    
    const header = "row_number,metric_key,reason";
    const rows = syncResult.unmatched_metric_keys.flatMap(u => 
      u.rows.map(rowNum => 
        `${rowNum},"${u.key}","metric_key not found in scorecard template"`
      )
    );
    const csv = [header, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unmatched_keys_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded unmatched keys CSV");
  };

  // Scroll to template health section
  const scrollToTemplateHealth = () => {
    setShowResultModal(false);
    const el = document.getElementById('metric-keys-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (configLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand" />
            Google Sheet Sync
          </CardTitle>
          <CardDescription>
            Connect a Google Sheet for one-click monthly data sync. The sheet must use canonical columns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {isConnected ? (
              <Badge variant="outline" className="border-success text-success">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Not connected
              </Badge>
            )}
            
            {config?.status === 'error' && (
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 mr-1" />
                Error
              </Badge>
            )}
            
            {config?.last_synced_at && (
              <Badge variant="outline" className="text-muted-foreground">
                <Clock className="w-3 h-3 mr-1" />
                {formatDistanceToNow(new Date(config.last_synced_at), { addSuffix: true })}
              </Badge>
            )}
            
            {config?.last_synced_month && (
              <Badge variant="outline" className="text-muted-foreground">
                Last: {format(new Date(config.last_synced_month + '-01'), 'MMM yyyy')}
              </Badge>
            )}
          </div>

          {/* Error message */}
          {config?.error_message && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{config.error_message}</AlertDescription>
            </Alert>
          )}

          {/* Template not ready warning */}
          {!templateReady && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Template not ready.</strong> 
                {missingImportKeysCount > 0 && ` ${missingImportKeysCount} metrics missing import keys.`}
                {duplicateImportKeysCount > 0 && ` ${duplicateImportKeysCount} duplicate import keys.`}
                {' '}Fix these issues above before syncing.
              </AlertDescription>
            </Alert>
          )}

          {/* Configuration form */}
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="sheet-url">Google Sheet Link</Label>
              <div className="flex gap-2">
                <Input
                  id="sheet-url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => {
                    setSheetUrl(e.target.value);
                    setHasChanges(true);
                  }}
                  className="flex-1"
                />
                {sheetId && (
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                  >
                    <a 
                      href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Paste the share link. Sheet must be shared with "Anyone with the link can view".
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tab-name">Tab Name</Label>
              <Input
                id="tab-name"
                placeholder="Scorecard_Input"
                value={tabName}
                onChange={(e) => {
                  setTabName(e.target.value);
                  setHasChanges(true);
                }}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Name of the sheet tab containing metric data (default: Scorecard_Input)
              </p>
            </div>

            {/* Required columns info */}
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">Required columns in your sheet:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><code className="bg-background px-1 rounded">metric_key</code> - Must match import keys from template</li>
                <li><code className="bg-background px-1 rounded">value</code> - Numeric value</li>
                <li><code className="bg-background px-1 rounded">month</code> - Format: YYYY-MM (e.g., 2024-01)</li>
              </ul>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            {hasChanges && (
              <Button 
                onClick={() => saveConfigMutation.mutate()}
                disabled={saveConfigMutation.isPending}
              >
                {saveConfigMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Settings2 className="w-4 h-4 mr-2" />
                )}
                Save Configuration
              </Button>
            )}

            <Button
              onClick={() => syncMutation.mutate()}
              disabled={!canSync}
              className={canSync ? "gradient-brand" : ""}
            >
              {syncMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Data Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Result Modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {syncResult?.success ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive" />
              )}
              Sync Results
            </DialogTitle>
            <DialogDescription>
              Summary of the Google Sheet sync operation
            </DialogDescription>
          </DialogHeader>

          {syncResult && (
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{syncResult.rows_processed}</p>
                  <p className="text-xs text-muted-foreground">Rows Processed</p>
                </div>
                <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
                  <p className="text-2xl font-bold text-success">{syncResult.rows_upserted}</p>
                  <p className="text-xs text-muted-foreground">Values Written</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">
                    {syncResult.rows_processed - syncResult.rows_upserted}
                  </p>
                  <p className="text-xs text-muted-foreground">Not Imported</p>
                </div>
              </div>

              {/* Last synced month */}
              {syncResult.last_synced_month && (
                <div className="text-sm text-muted-foreground">
                  Latest month synced: <strong>{format(new Date(syncResult.last_synced_month + '-01'), 'MMMM yyyy')}</strong>
                </div>
              )}

              {/* Detected headers (always show for debugging) */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Detected Headers:</p>
                <div className="flex flex-wrap gap-1">
                  {syncResult.detected_headers.map((h, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-mono">
                      {h}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Unrecognized metric keys */}
              {syncResult.unmatched_metric_keys.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong>{syncResult.unmatched_metric_keys.length} unrecognized metric keys</strong>
                        <p className="text-xs mt-1">
                          These keys don't exist in your template. In aligned mode, the scorecard stays consistent—unrecognized keys won't be added automatically.
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyUnmatchedKeys}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadUnmatchedKeysCsv}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          CSV
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 max-h-24 overflow-y-auto">
                      <ul className="text-xs space-y-1">
                        {syncResult.unmatched_metric_keys.slice(0, 5).map((u, i) => (
                          <li key={i} className="font-mono">
                            {u.key} (rows: {u.rows.join(', ')})
                          </li>
                        ))}
                        {syncResult.unmatched_metric_keys.length > 5 && (
                          <li className="text-muted-foreground">
                            ...and {syncResult.unmatched_metric_keys.length - 5} more
                          </li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Invalid months */}
              {syncResult.invalid_month_rows.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{syncResult.invalid_month_rows.length} invalid month values</strong>
                    <ul className="text-xs mt-1 space-y-1">
                      {syncResult.invalid_month_rows.slice(0, 3).map((r, i) => (
                        <li key={i}>Row {r.row}: "{r.value}"</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Invalid values */}
              {syncResult.invalid_value_rows.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{syncResult.invalid_value_rows.length} invalid numeric values</strong>
                    <ul className="text-xs mt-1 space-y-1">
                      {syncResult.invalid_value_rows.slice(0, 3).map((r, i) => (
                        <li key={i}>Row {r.row}: "{r.value}"</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Error */}
              {syncResult.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{syncResult.error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {syncResult?.unmatched_metric_keys && syncResult.unmatched_metric_keys.length > 0 && (
              <Button variant="outline" onClick={scrollToTemplateHealth}>
                <ArrowUp className="w-4 h-4 mr-2" />
                Fix Template
              </Button>
            )}
            <Button onClick={() => setShowResultModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}