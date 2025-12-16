import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, ArrowLeft, 
  Settings, Archive, Download, Key, AlertCircle, Copy, Check, ShieldAlert,
  Lock, User, Target
} from "lucide-react";
import { parseExcel } from "@/lib/importers/excelParser";
import { parseCSV } from "@/lib/importers/csvParser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GoogleSheetSyncSection } from "@/components/scorecard/GoogleSheetSyncSection";
import { ResolveDuplicatesSection } from "@/components/scorecard/ResolveDuplicatesSection";
import { 
  computeTemplateHealth, 
  generateImportKey, 
  validateImportKeyUnique,
  type MetricWithHealth,
} from "@/lib/scorecard/templateHealth";
import { useOrgSafetyCheck } from "@/hooks/useOrgSafetyCheck";

interface TemplateMetric {
  name: string;
  category: string;
  unit: string;
  target: number | null;
  direction: 'up' | 'down';
  owner?: string;
  matchedMetricId?: string;
  matchType: 'exact' | 'fuzzy' | 'new';
}

const ScorecardTemplate = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: adminStatus, isLoading: adminLoading } = useIsAdmin();
  const { orgId, OrgMissingError } = useOrgSafetyCheck();
  
  const isAdmin = adminStatus?.isAdmin || adminStatus?.isManager || false;
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [templateMetrics, setTemplateMetrics] = useState<TemplateMetric[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedForImport, setSelectedForImport] = useState<Set<number>>(new Set());
  
  // Import key editor state
  const [editingImportKeys, setEditingImportKeys] = useState<Record<string, string>>({});
  const [editingMetrics, setEditingMetrics] = useState<Record<string, { owner?: string; target?: number | null }>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Template download copied state
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  
  // Leave confirmation state
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Fetch template health using the shared helper
  const { data: templateData, refetch: refetchMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['template-health', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('No organization');
      return computeTemplateHealth(orgId);
    },
    enabled: !!orgId,
  });

  const health = templateData?.health;
  const activeMetrics = templateData?.metrics || [];

  const { data: orgSettings } = useQuery({
    queryKey: ['org-settings', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('teams')
        .select('scorecard_mode')
        .eq('id', orgId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('team_id', orgId)
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const isAlignedMode = orgSettings?.scorecard_mode === 'aligned';
  const templateReady = health?.isReady || false;
  
  // Check for unsaved changes that would leave template invalid
  const hasUnsavedChanges = Object.keys(editingImportKeys).length > 0;
  const wouldLeaveInvalid = hasUnsavedChanges && !templateReady;

  // Handle navigation with validation for aligned orgs
  const handleNavigate = (path: string) => {
    if (isAlignedMode && wouldLeaveInvalid) {
      setPendingNavigation(path);
      setShowLeaveConfirm(true);
    } else {
      navigate(path);
    }
  };

  // Validate import key on change
  const handleImportKeyChange = (metricId: string, value: string) => {
    setEditingImportKeys(prev => ({ ...prev, [metricId]: value }));
    
    // Clear or set validation error
    const trimmedValue = value.trim();
    if (!trimmedValue && isAlignedMode) {
      setValidationErrors(prev => ({ ...prev, [metricId]: 'Import key is required for aligned organizations' }));
    } else if (trimmedValue && !validateImportKeyUnique(trimmedValue, metricId, activeMetrics)) {
      setValidationErrors(prev => ({ ...prev, [metricId]: 'This import key is already used by another metric' }));
    } else {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[metricId];
        return next;
      });
    }
  };

  // Save import key mutation with duplicate handling
  const saveImportKeyMutation = useMutation({
    mutationFn: async ({ metricId, importKey }: { metricId: string; importKey: string }) => {
      const { error } = await supabase
        .from('metrics')
        .update({ import_key: importKey.trim() || null })
        .eq('id', metricId)
        .eq('organization_id', orgId);
      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          throw new Error('This import key is already used by another metric');
        }
        throw error;
      }
    },
    onSuccess: () => {
      refetchMetrics();
      toast.success('Import key saved');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save import key');
    },
  });

  // Bulk save import keys
  const bulkSaveImportKeysMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(editingImportKeys);
      const errors: string[] = [];
      let saved = 0;
      
      for (const [metricId, importKey] of updates) {
        const { error } = await supabase
          .from('metrics')
          .update({ import_key: importKey.trim() || null })
          .eq('id', metricId)
          .eq('organization_id', orgId);
        if (error) {
          if (error.code === '23505') {
            errors.push(`Duplicate key: ${importKey}`);
          } else {
            errors.push(error.message);
          }
        } else {
          saved++;
        }
      }
      
      if (errors.length > 0) {
        throw new Error(`${saved} saved, ${errors.length} failed: ${errors.join(', ')}`);
      }
      
      return saved;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['template-health'] });
      setEditingImportKeys({});
      setValidationErrors({});
      toast.success(`Saved ${count} import keys`);
    },
    onError: (error: any) => {
      refetchMetrics();
      toast.error(error.message || 'Failed to save import keys');
    },
  });

  // Auto-generate import keys for metrics missing them
  const autoGenerateImportKeysMutation = useMutation({
    mutationFn: async () => {
      const missingKeyMetrics = activeMetrics.filter(m => m.isMissingKey);
      let count = 0;
      
      for (const metric of missingKeyMetrics) {
        const key = generateImportKey(metric.name);
        const { error } = await supabase
          .from('metrics')
          .update({ import_key: key })
          .eq('id', metric.id)
          .eq('organization_id', orgId);
        if (!error) count++;
      }
      return count;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['template-health'] });
      toast.success(`Auto-generated ${count} import keys`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to auto-generate import keys');
    },
  });

  const archiveMetricMutation = useMutation({
    mutationFn: async (metricId: string) => {
      const { error } = await supabase
        .from('metrics')
        .update({ is_active: false })
        .eq('id', metricId)
        .eq('organization_id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchMetrics();
      toast.success('Metric archived');
    },
  });

  const updateMetricMutation = useMutation({
    mutationFn: async ({ metricId, updates }: { metricId: string; updates: { owner?: string; target?: number | null } }) => {
      const { error } = await supabase
        .from('metrics')
        .update(updates)
        .eq('id', metricId)
        .eq('organization_id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchMetrics();
      toast.success('Metric updated');
    },
  });

  // Check if template can be generated (all keys assigned and no duplicates)
  const canGenerateTemplate = templateReady && activeMetrics.length > 0;

  // Generate and download template CSV
  const downloadTemplateCsv = () => {
    if (!canGenerateTemplate) {
      if ((health?.missing_import_keys_count || 0) > 0) {
        toast.error('Template not ready: assign Metric Keys for all active metrics.');
        return;
      }
      if ((health?.duplicate_import_keys_count || 0) > 0) {
        toast.error('Template not ready: resolve duplicate Metric Keys.');
        return;
      }
      toast.error('Template not ready.');
      return;
    }
    
    const rows = [
      ['metric_key', 'metric_name', 'value', 'month'],
      ...activeMetrics.map(m => [
        m.import_key || '',
        m.name,
        '',
        ''
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Scorecard_Input_TEMPLATE.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  // Copy template to clipboard
  const copyTemplateToClipboard = () => {
    if (!canGenerateTemplate) {
      if ((health?.missing_import_keys_count || 0) > 0) {
        toast.error('Template not ready: assign Metric Keys for all active metrics.');
        return;
      }
      if ((health?.duplicate_import_keys_count || 0) > 0) {
        toast.error('Template not ready: resolve duplicate Metric Keys.');
        return;
      }
      toast.error('Template not ready.');
      return;
    }
    
    const rows = [
      ['metric_key', 'metric_name', 'value', 'month'],
      ...activeMetrics.map(m => [
        m.import_key || '',
        m.name,
        '',
        ''
      ])
    ];
    const csv = rows.map(r => r.join('\t')).join('\n');
    navigator.clipboard.writeText(csv);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
    toast.success('Template CSV copied.');
  };

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Handler for when duplicates are resolved (refresh template health)
  const handleDuplicatesResolved = () => {
    refetchMetrics();
  };

  // Template import logic (for defining metrics from Excel)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setShowPreview(false);
    setTemplateMetrics([]);
  };

  const inferDirection = (name: string): 'up' | 'down' => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('aging') || lowerName.includes('a/r days') || 
        lowerName.includes('cost') || lowerName.includes('expense') ||
        lowerName.includes('wait time') || lowerName.includes('cancellation') ||
        lowerName.includes('no show') || lowerName.includes('days in')) {
      return 'down';
    }
    return 'up';
  };

  const inferUnit = (name: string, value: any): string => {
    const lowerName = name.toLowerCase();
    const strValue = String(value || '');
    
    if (strValue.includes('$') || lowerName.includes('revenue') || 
        lowerName.includes('income') || lowerName.includes('charge') ||
        lowerName.includes('avg $') || lowerName.includes('per visit') ||
        lowerName.includes('profit') || lowerName.includes('collection')) {
      return '$';
    }
    if (strValue.includes('%') || lowerName.includes('rate') || 
        lowerName.includes('margin') || lowerName.includes('percentage')) {
      return '%';
    }
    return '#';
  };

  const findMatch = (name: string): { id?: string; type: 'exact' | 'fuzzy' | 'new' } => {
    if (!activeMetrics.length) return { type: 'new' };
    const normalizedName = name.toLowerCase().trim();
    
    const exact = activeMetrics.find(m => 
      m.name.toLowerCase().trim() === normalizedName ||
      (m.import_key && m.import_key.toLowerCase().trim() === normalizedName)
    );
    if (exact) return { id: exact.id, type: 'exact' };
    
    const fuzzy = activeMetrics.find(m => {
      const existingNorm = m.name.toLowerCase().trim();
      return existingNorm.includes(normalizedName) || normalizedName.includes(existingNorm);
    });
    if (fuzzy) return { id: fuzzy.id, type: 'fuzzy' };
    
    return { type: 'new' };
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
        throw new Error('Unsupported file format. Use Excel or CSV.');
      }

      const metrics: TemplateMetric[] = [];
      const headers = parsedData.headers || [];
      const nameCol = headers.find((h: string) => 
        /^(metric|name|kpi|measure|indicator)$/i.test(h.trim())
      ) || headers[0];
      
      for (const row of parsedData.rows) {
        const name = row[nameCol] || row['Metric'] || row['Name'] || Object.values(row)[0];
        if (!name || typeof name !== 'string' || name.trim().length < 2) continue;
        if (/^(metric|name|kpi|category|total)$/i.test(name.trim())) continue;
        
        const category = row['Category'] || row['Type'] || 'General';
        const targetRaw = row['Target'] || row['Goal'] || null;
        const ownerRaw = row['Owner'] || null;
        const target = targetRaw ? parseFloat(String(targetRaw).replace(/[^0-9.-]/g, '')) : null;
        const unit = inferUnit(name, targetRaw);
        const direction = inferDirection(name);
        const match = findMatch(name);

        metrics.push({
          name: name.trim(),
          category: String(category).trim(),
          unit,
          target: isNaN(target!) ? null : target,
          direction,
          owner: ownerRaw ? String(ownerRaw).trim() : undefined,
          matchedMetricId: match.id,
          matchType: match.type,
        });
      }

      if (metrics.length === 0) {
        throw new Error('No metrics found in template.');
      }

      setTemplateMetrics(metrics);
      setSelectedForImport(new Set(metrics.map((_, i) => i)));
      setShowPreview(true);
      toast.success(`Parsed ${metrics.length} metrics from template`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to parse template');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No organization');

      const selectedMetrics = templateMetrics.filter((_, i) => selectedForImport.has(i));
      let created = 0, updated = 0;

      for (const metric of selectedMetrics) {
        const importKey = generateImportKey(metric.name);
        
        if (metric.matchedMetricId) {
          const { error } = await supabase
            .from('metrics')
            .update({
              category: metric.category,
              unit: metric.unit,
              target: metric.target,
              direction: metric.direction,
              cadence: 'monthly',
              is_locked: true,
              is_active: true,
              import_key: importKey,
              ...(metric.owner && { owner: metric.owner }),
            })
            .eq('id', metric.matchedMetricId)
            .eq('organization_id', orgId);
          
          if (!error) updated++;
        } else if (!isAlignedMode) {
          // Only create new metrics in flexible mode
          const { error } = await supabase
            .from('metrics')
            .insert({
              organization_id: orgId,
              name: metric.name,
              category: metric.category,
              unit: metric.unit,
              target: metric.target,
              direction: metric.direction,
              cadence: 'monthly',
              is_locked: true,
              sync_source: 'manual',
              import_key: importKey,
              ...(metric.owner && { owner: metric.owner }),
            });
          
          if (!error) created++;
        }
      }

      return { created, updated };
    },
    onSuccess: ({ created, updated }) => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['template-health'] });
      toast.success(`Template applied: ${created} created, ${updated} updated`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to apply template');
    },
  });

  if (userLoading || adminLoading || metricsLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (OrgMissingError) return <>{OrgMissingError}</>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => handleNavigate('/scorecard')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Scorecard
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          Scorecard Template
        </h1>
        <p className="text-muted-foreground">
          Manage your canonical KPI list and import keys for monthly data uploads
        </p>
        <div className="flex gap-2 mt-2">
          {isAlignedMode && (
            <Badge variant="outline" className="border-primary text-primary">
              <Lock className="w-3 h-3 mr-1" />
              Aligned Template Mode
            </Badge>
          )}
          {!isAdmin && (
            <Badge variant="secondary">
              <ShieldAlert className="w-3 h-3 mr-1" />
              Read-Only
            </Badge>
          )}
        </div>
      </div>

      {/* Admin-only message for non-admins */}
      {!isAdmin && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Read-Only Access</AlertTitle>
          <AlertDescription>
            Only admins can edit the Scorecard Template. Contact your organization admin to make changes.
          </AlertDescription>
        </Alert>
      )}

      {/* Template Health Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Template Health
          </CardTitle>
          <CardDescription>
            {templateReady 
              ? "Your template is ready for imports" 
              : "Fix issues below before importing data"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground">Active Metrics</p>
              <p className="text-2xl font-bold">{health?.total_active_metrics || 0}</p>
            </div>
            <div className={`p-3 rounded-lg border ${(health?.missing_import_keys_count || 0) > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-green-500/10 border-green-500/30'}`}>
              <p className="text-sm text-muted-foreground">Missing Keys</p>
              <p className={`text-2xl font-bold ${(health?.missing_import_keys_count || 0) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {health?.missing_import_keys_count || 0}
              </p>
            </div>
            <div className={`p-3 rounded-lg border ${(health?.duplicate_import_keys_count || 0) > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-green-500/10 border-green-500/30'}`}>
              <p className="text-sm text-muted-foreground">Duplicate Keys</p>
              <p className={`text-2xl font-bold ${(health?.duplicate_import_keys_count || 0) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {health?.duplicate_import_keys_count || 0}
              </p>
            </div>
            <div className={`p-3 rounded-lg border ${(health?.duplicate_metric_names_count || 0) > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-muted/50'}`}>
              <p className="text-sm text-muted-foreground">Duplicate Names</p>
              <p className={`text-2xl font-bold ${(health?.duplicate_metric_names_count || 0) > 0 ? 'text-amber-600' : ''}`}>
                {health?.duplicate_metric_names_count || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/50">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Target className="w-3 h-3" /> Missing Targets
              </p>
              <p className="text-2xl font-bold text-muted-foreground">{health?.missing_target_count || 0}</p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/50">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> Missing Owners
              </p>
              <p className="text-2xl font-bold text-muted-foreground">{health?.missing_owner_count || 0}</p>
            </div>
          </div>

          {/* Status indicator */}
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${templateReady ? 'bg-green-500/10 border border-green-500/30' : 'bg-destructive/10 border border-destructive/30'}`}>
            {templateReady ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-700">Template Ready for Imports</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-destructive" />
                <span className="font-medium text-destructive">Template Not Ready - Fix Issues Above</span>
              </>
            )}
          </div>

          {/* Action buttons (admin only) */}
          {isAdmin && (
            <div className="flex flex-wrap gap-3 mt-4">
              {(health?.missing_import_keys_count || 0) > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => autoGenerateImportKeysMutation.mutate()}
                  disabled={autoGenerateImportKeysMutation.isPending}
                >
                  {autoGenerateImportKeysMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  Auto-Generate Missing Keys
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocking panel for aligned orgs - with CTAs */}
      {isAlignedMode && !templateReady && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Import & Sync Blocked</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              An aligned scorecard requires a READY template before you can import or sync monthly data.
              {(health?.missing_import_keys_count || 0) > 0 && ` ${health?.missing_import_keys_count} metrics are missing import keys.`}
              {(health?.duplicate_import_keys_count || 0) > 0 && ` ${health?.duplicate_import_keys_count} metrics have duplicate import keys.`}
            </p>
            <div className="flex gap-2 mt-2">
              {(health?.missing_import_keys_count || 0) > 0 && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="bg-background"
                  onClick={() => scrollToSection('metric-keys-section')}
                >
                  <Key className="w-4 h-4 mr-1" />
                  Assign Metric Keys
                </Button>
              )}
              {(health?.duplicate_metric_names_count || 0) > 0 && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="bg-background"
                  onClick={() => scrollToSection('duplicates-section')}
                >
                  <Archive className="w-4 h-4 mr-1" />
                  Resolve Duplicates
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Google Sheet Sync Section - only for aligned mode */}
      {isAlignedMode && orgId && (
        <GoogleSheetSyncSection
          orgId={orgId}
          templateReady={templateReady}
          missingImportKeysCount={health?.missing_import_keys_count || 0}
          duplicateImportKeysCount={health?.duplicate_import_keys_count || 0}
        />
      )}

      {/* Generate Template CSV */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Generate Scorecard Input Template
          </CardTitle>
          <CardDescription>
            Download a CSV template with your metric keys. Fill in values and month, then upload.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <p className="font-medium">Template Instructions:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>metric_key</strong> - Do NOT edit this column. It must match exactly.</li>
              <li><strong>metric_name</strong> - For reference only, not used for matching.</li>
              <li><strong>value</strong> - Enter the numeric value for this metric.</li>
              <li><strong>month</strong> - Enter the month as YYYY-MM (e.g., 2024-01).</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={downloadTemplateCsv} 
              disabled={!canGenerateTemplate}
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
            <Button 
              variant="outline" 
              onClick={copyTemplateToClipboard} 
              disabled={!canGenerateTemplate}
            >
              {copiedTemplate ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copiedTemplate ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
          </div>
          
          {!canGenerateTemplate && activeMetrics.length > 0 && (
            <Alert variant="destructive" className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {(health?.missing_import_keys_count || 0) > 0 
                  ? 'Template not ready: assign Metric Keys for all active metrics.'
                  : 'Template not ready: resolve duplicate Metric Keys.'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Metric Key Editor - with anchor ID for scroll */}
      <Card id="metric-keys-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="w-5 h-5 text-primary" />
            Metric Keys ({activeMetrics.length} metrics)
          </CardTitle>
          <CardDescription>
            Import keys are used for exact matching during monthly data upload. Each key must be unique.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Metric Name</TableHead>
                  <TableHead>Import Key</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeMetrics.map(metric => {
                  const currentKey = editingImportKeys[metric.id] ?? metric.import_key ?? '';
                  const error = validationErrors[metric.id];
                  
                  return (
                    <TableRow key={metric.id}>
                      <TableCell className="font-medium">{metric.name}</TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <div className="space-y-1">
                            <Input
                              value={currentKey}
                              placeholder={generateImportKey(metric.name)}
                              className={`w-48 ${error ? 'border-destructive' : metric.isMissingKey ? 'border-amber-500' : metric.isDuplicateKey ? 'border-destructive' : ''}`}
                              onChange={(e) => handleImportKeyChange(metric.id, e.target.value)}
                            />
                            {error && (
                              <p className="text-xs text-destructive">{error}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{currentKey || '—'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Select
                            value={editingMetrics[metric.id]?.owner ?? metric.owner ?? ''}
                            onValueChange={(val) => setEditingMetrics(prev => ({
                              ...prev,
                              [metric.id]: { ...prev[metric.id], owner: val }
                            }))}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {teamMembers?.map(member => (
                                <SelectItem key={member.id} value={member.full_name || member.email}>
                                  {member.full_name || member.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground">{metric.owner || '—'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Input
                            type="number"
                            className="w-24"
                            placeholder="Target"
                            value={editingMetrics[metric.id]?.target ?? metric.target ?? ''}
                            onChange={(e) => setEditingMetrics(prev => ({
                              ...prev,
                              [metric.id]: { ...prev[metric.id], target: e.target.value ? parseFloat(e.target.value) : null }
                            }))}
                          />
                        ) : (
                          <span className="text-muted-foreground">{metric.target ?? '—'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {metric.isMissingKey ? (
                          <Badge variant="destructive">Missing Key</Badge>
                        ) : metric.isDuplicateKey ? (
                          <Badge variant="outline" className="border-destructive text-destructive">Duplicate Key</Badge>
                        ) : metric.isDuplicateName ? (
                          <Badge variant="outline" className="border-amber-500 text-amber-600">Duplicate Name</Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-500 text-green-600">OK</Badge>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => archiveMetricMutation.mutate(metric.id)}
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {isAdmin && Object.keys(editingImportKeys).length > 0 && (
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-muted-foreground">
                {Object.keys(editingImportKeys).length} unsaved changes
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setEditingImportKeys({});
                    setValidationErrors({});
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => bulkSaveImportKeysMutation.mutate()}
                  disabled={bulkSaveImportKeysMutation.isPending || Object.keys(validationErrors).length > 0}
                >
                  {bulkSaveImportKeysMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Save All Changes
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Template for Metric Definitions (admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Import Metric Definitions
            </CardTitle>
            <CardDescription>
              Upload an Excel/CSV to define or update your metric list (names, targets, owners). This is for defining metrics, not importing data.
              {isAlignedMode && (
                <span className="text-amber-600 ml-1">(Aligned mode: new metrics won't be added automatically)</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="max-w-sm mx-auto"
              />
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
                  'Parse Template'
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Template Preview */}
      {showPreview && templateMetrics.length > 0 && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Template Preview ({templateMetrics.length} metrics)</CardTitle>
            <CardDescription>
              Review matches and select which metrics to import or update
              {isAlignedMode && <span className="text-amber-600 ml-2">(Aligned mode: new metrics won't be added)</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Metric Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Match Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templateMetrics.map((metric, index) => (
                  <TableRow key={index} className={isAlignedMode && metric.matchType === 'new' ? 'opacity-50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedForImport.has(index)}
                        disabled={isAlignedMode && metric.matchType === 'new'}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(selectedForImport);
                          if (checked) newSet.add(index);
                          else newSet.delete(index);
                          setSelectedForImport(newSet);
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{metric.name}</TableCell>
                    <TableCell>{metric.category}</TableCell>
                    <TableCell>
                      {metric.target !== null ? (
                        metric.unit === '$' ? `$${metric.target.toLocaleString()}` :
                        metric.unit === '%' ? `${metric.target}%` :
                        metric.target
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {metric.matchType === 'exact' && (
                        <Badge variant="outline" className="border-green-500 text-green-600">Exact Match</Badge>
                      )}
                      {metric.matchType === 'fuzzy' && (
                        <Badge variant="outline" className="border-amber-500 text-amber-600">Fuzzy Match</Badge>
                      )}
                      {metric.matchType === 'new' && (
                        <Badge variant={isAlignedMode ? 'secondary' : 'outline'} className={!isAlignedMode ? 'border-blue-500 text-blue-600' : ''}>
                          {isAlignedMode ? 'Not in Template' : 'New Metric'}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => applyTemplateMutation.mutate()}
                disabled={applyTemplateMutation.isPending || selectedForImport.size === 0}
              >
                {applyTemplateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  `Apply Selected (${selectedForImport.size})`
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolve Duplicates Section (replaces old dialog) - with anchor ID */}
      {isAdmin && orgId && (health?.duplicate_metric_names_count || 0) > 0 && (
        <div id="duplicates-section">
          <ResolveDuplicatesSection
            orgId={orgId}
            isAdmin={isAdmin}
            duplicateCount={health?.duplicate_metric_names_count || 0}
            onResolved={handleDuplicatesResolved}
          />
        </div>
      )}

      {/* Leave Confirmation Dialog */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              Your template still has invalid Metric Keys. Fix before leaving to ensure imports work correctly.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveConfirm(false)}>
              Stay and Fix
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                setShowLeaveConfirm(false);
                if (pendingNavigation) navigate(pendingNavigation);
              }}
            >
              Leave Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScorecardTemplate;
