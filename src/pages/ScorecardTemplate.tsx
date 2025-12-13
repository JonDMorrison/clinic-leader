import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, ArrowLeft, 
  Settings, Archive, User, Target, ChevronDown, ChevronUp, Download, Key,
  AlertCircle, Copy, Check
} from "lucide-react";
import { parseExcel } from "@/lib/importers/excelParser";
import { parseCSV } from "@/lib/importers/csvParser";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface ExistingMetric {
  id: string;
  name: string;
  category: string;
  unit: string;
  target: number | null;
  owner: string | null;
  is_active: boolean;
  direction: string;
  import_key: string | null;
  aliases: string[] | null;
}

// Generate import_key from metric name
const generateImportKey = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50);
};

const ScorecardTemplate = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [templateMetrics, setTemplateMetrics] = useState<TemplateMetric[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedForImport, setSelectedForImport] = useState<Set<number>>(new Set());
  
  // Import key editor state
  const [showImportKeyEditor, setShowImportKeyEditor] = useState(true);
  const [editingImportKeys, setEditingImportKeys] = useState<Record<string, string>>({});
  const [editingMetrics, setEditingMetrics] = useState<Record<string, { owner?: string; target?: number | null }>>({});
  
  // Duplicate resolver state
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<Map<string, ExistingMetric[]>>(new Map());
  const [selectedDuplicates, setSelectedDuplicates] = useState<Record<string, string>>({});
  
  // Template download copied state
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const { data: existingMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['metrics-template', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data, error } = await supabase
        .from('metrics')
        .select('id, name, category, unit, target, is_active, owner, direction, import_key, aliases')
        .eq('organization_id', currentUser.team_id)
        .order('name');
      if (error) throw error;
      return data as ExistingMetric[];
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

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('team_id', currentUser.team_id)
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  const isLockedMode = orgSettings?.scorecard_mode === 'locked_to_template';
  const activeMetrics = useMemo(() => existingMetrics?.filter(m => m.is_active) || [], [existingMetrics]);
  
  // Calculate template health metrics
  const missingImportKeys = useMemo(() => 
    activeMetrics.filter(m => !m.import_key || m.import_key.trim() === ''), 
    [activeMetrics]
  );
  
  const duplicateImportKeys = useMemo(() => {
    const keyCounts = new Map<string, ExistingMetric[]>();
    activeMetrics.forEach(m => {
      if (m.import_key && m.import_key.trim()) {
        const key = m.import_key.toLowerCase().trim();
        if (!keyCounts.has(key)) keyCounts.set(key, []);
        keyCounts.get(key)!.push(m);
      }
    });
    return Array.from(keyCounts.entries())
      .filter(([_, metrics]) => metrics.length > 1);
  }, [activeMetrics]);

  const duplicateNames = useMemo(() => {
    const nameCounts = new Map<string, ExistingMetric[]>();
    activeMetrics.forEach(m => {
      const name = m.name.toLowerCase().trim();
      if (!nameCounts.has(name)) nameCounts.set(name, []);
      nameCounts.get(name)!.push(m);
    });
    return Array.from(nameCounts.entries())
      .filter(([_, metrics]) => metrics.length > 1);
  }, [activeMetrics]);

  const missingTargets = useMemo(() => activeMetrics.filter(m => m.target === null), [activeMetrics]);
  const missingOwners = useMemo(() => activeMetrics.filter(m => !m.owner), [activeMetrics]);

  // Save import key mutation
  const saveImportKeyMutation = useMutation({
    mutationFn: async ({ metricId, importKey }: { metricId: string; importKey: string }) => {
      const { error } = await supabase
        .from('metrics')
        .update({ import_key: importKey.trim() || null })
        .eq('id', metricId)
        .eq('organization_id', currentUser?.team_id);
      if (error) throw error;
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
      for (const [metricId, importKey] of updates) {
        const { error } = await supabase
          .from('metrics')
          .update({ import_key: importKey.trim() || null })
          .eq('id', metricId)
          .eq('organization_id', currentUser?.team_id);
        if (error) throw error;
      }
      return updates.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['metrics-template'] });
      setEditingImportKeys({});
      toast.success(`Saved ${count} import keys`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save import keys');
    },
  });

  // Auto-generate import keys for metrics missing them
  const autoGenerateImportKeysMutation = useMutation({
    mutationFn: async () => {
      let count = 0;
      for (const metric of missingImportKeys) {
        const key = generateImportKey(metric.name);
        const { error } = await supabase
          .from('metrics')
          .update({ import_key: key })
          .eq('id', metric.id)
          .eq('organization_id', currentUser?.team_id);
        if (!error) count++;
      }
      return count;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['metrics-template'] });
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
        .eq('organization_id', currentUser?.team_id);
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
        .eq('organization_id', currentUser?.team_id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchMetrics();
      toast.success('Metric updated');
    },
  });

  // Generate and download template CSV
  const downloadTemplateCsv = () => {
    const rows = [
      ['metric_key', 'metric_name', 'value', 'month'],
      ...activeMetrics.map(m => [
        m.import_key || generateImportKey(m.name),
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
    a.download = 'Scorecard_Input_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  // Copy template to clipboard
  const copyTemplateToClipboard = () => {
    const rows = [
      ['metric_key', 'metric_name', 'value', 'month'],
      ...activeMetrics.map(m => [
        m.import_key || generateImportKey(m.name),
        m.name,
        '',
        ''
      ])
    ];
    const csv = rows.map(r => r.join('\t')).join('\n');
    navigator.clipboard.writeText(csv);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
    toast.success('Template copied to clipboard');
  };

  // Open duplicate resolver
  const openDuplicateResolver = () => {
    const groups = new Map<string, ExistingMetric[]>();
    duplicateNames.forEach(([name, metrics]) => {
      groups.set(name, metrics);
    });
    setDuplicateGroups(groups);
    setSelectedDuplicates({});
    setShowDuplicateDialog(true);
  };

  // Resolve duplicates
  const resolveDuplicatesMutation = useMutation({
    mutationFn: async () => {
      let archived = 0;
      for (const [name, metrics] of duplicateGroups) {
        const keepId = selectedDuplicates[name];
        if (!keepId) continue;
        
        for (const m of metrics) {
          if (m.id !== keepId) {
            const { error } = await supabase
              .from('metrics')
              .update({ is_active: false })
              .eq('id', m.id)
              .eq('organization_id', currentUser?.team_id);
            if (!error) archived++;
          }
        }
      }
      return archived;
    },
    onSuccess: (archived) => {
      queryClient.invalidateQueries({ queryKey: ['metrics-template'] });
      setShowDuplicateDialog(false);
      toast.success(`Archived ${archived} duplicate metrics`);
    },
  });

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
    if (!existingMetrics) return { type: 'new' };
    const normalizedName = name.toLowerCase().trim();
    
    const exact = existingMetrics.find(m => 
      m.name.toLowerCase().trim() === normalizedName ||
      (m.import_key && m.import_key.toLowerCase().trim() === normalizedName)
    );
    if (exact) return { id: exact.id, type: 'exact' };
    
    const fuzzy = existingMetrics.find(m => {
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
      if (!currentUser?.team_id) throw new Error('No organization');

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
            .eq('organization_id', currentUser.team_id);
          
          if (!error) updated++;
        } else if (!isLockedMode) {
          // Only create new metrics in flex mode
          const { error } = await supabase
            .from('metrics')
            .insert({
              organization_id: currentUser.team_id,
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
      queryClient.invalidateQueries({ queryKey: ['metrics-template'] });
      toast.success(`Template applied: ${created} created, ${updated} updated`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to apply template');
    },
  });

  const metricsNotInTemplate = existingMetrics?.filter(m => 
    m.is_active && !templateMetrics.some(tm => tm.matchedMetricId === m.id)
  ) || [];

  const templateReady = missingImportKeys.length === 0 && duplicateImportKeys.length === 0;

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
          <Settings className="w-8 h-8 text-brand" />
          Scorecard Template
        </h1>
        <p className="text-muted-foreground">
          Manage your canonical KPI list and import keys for monthly data uploads
        </p>
        {isLockedMode && (
          <Badge variant="outline" className="mt-2 border-brand text-brand">
            Locked to Template Mode
          </Badge>
        )}
      </div>

      {/* Template Health Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="w-5 h-5 text-brand" />
            Template Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground">Active Metrics</p>
              <p className="text-2xl font-bold">{activeMetrics.length}</p>
            </div>
            <div className={`p-3 rounded-lg border ${missingImportKeys.length > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-success/10 border-success/30'}`}>
              <p className="text-sm text-muted-foreground">Missing Import Keys</p>
              <p className={`text-2xl font-bold ${missingImportKeys.length > 0 ? 'text-destructive' : 'text-success'}`}>
                {missingImportKeys.length}
              </p>
            </div>
            <div className={`p-3 rounded-lg border ${duplicateImportKeys.length > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-success/10 border-success/30'}`}>
              <p className="text-sm text-muted-foreground">Duplicate Import Keys</p>
              <p className={`text-2xl font-bold ${duplicateImportKeys.length > 0 ? 'text-destructive' : 'text-success'}`}>
                {duplicateImportKeys.length}
              </p>
            </div>
            <div className={`p-3 rounded-lg border ${duplicateNames.length > 0 ? 'bg-warning/10 border-warning/30' : 'bg-muted/50'}`}>
              <p className="text-sm text-muted-foreground">Duplicate Names</p>
              <p className={`text-2xl font-bold ${duplicateNames.length > 0 ? 'text-warning' : ''}`}>
                {duplicateNames.length}
              </p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/50">
              <p className="text-sm text-muted-foreground">Ready for Import</p>
              <p className={`text-2xl font-bold ${templateReady ? 'text-success' : 'text-destructive'}`}>
                {templateReady ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            {missingImportKeys.length > 0 && (
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
            {duplicateNames.length > 0 && (
              <Button variant="outline" onClick={openDuplicateResolver}>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Resolve Duplicate Names
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Blocking alert if not ready */}
      {isLockedMode && !templateReady && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Import Blocked:</strong> All active metrics must have unique import keys before you can import monthly data.
            {missingImportKeys.length > 0 && ` ${missingImportKeys.length} metrics are missing import keys.`}
            {duplicateImportKeys.length > 0 && ` ${duplicateImportKeys.length} duplicate import keys found.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Generate Template CSV */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-brand" />
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
            <Button onClick={downloadTemplateCsv} disabled={activeMetrics.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
            <Button variant="outline" onClick={copyTemplateToClipboard} disabled={activeMetrics.length === 0}>
              {copiedTemplate ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copiedTemplate ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Key Editor */}
      <Collapsible open={showImportKeyEditor} onOpenChange={setShowImportKeyEditor}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Key className="w-5 h-5 text-brand" />
                  Assign Import Keys ({activeMetrics.length} metrics)
                </CardTitle>
                {showImportKeyEditor ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </CollapsibleTrigger>
            <CardDescription>
              Import keys are used for exact matching during monthly data upload. Each key must be unique.
            </CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric Name</TableHead>
                    <TableHead>Import Key</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeMetrics.map(metric => {
                    const currentKey = editingImportKeys[metric.id] ?? metric.import_key ?? '';
                    const isMissing = !currentKey.trim();
                    const isDuplicate = duplicateImportKeys.some(([key]) => 
                      key === currentKey.toLowerCase().trim()
                    );
                    
                    return (
                      <TableRow key={metric.id}>
                        <TableCell className="font-medium">{metric.name}</TableCell>
                        <TableCell>
                          <Input
                            value={currentKey}
                            placeholder={generateImportKey(metric.name)}
                            className={`w-48 ${isMissing ? 'border-destructive' : isDuplicate ? 'border-warning' : ''}`}
                            onChange={(e) => setEditingImportKeys(prev => ({
                              ...prev,
                              [metric.id]: e.target.value
                            }))}
                          />
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell>
                          {isMissing ? (
                            <Badge variant="destructive">Missing Key</Badge>
                          ) : isDuplicate ? (
                            <Badge variant="outline" className="border-warning text-warning">Duplicate</Badge>
                          ) : (
                            <Badge variant="outline" className="border-success text-success">OK</Badge>
                          )}
                        </TableCell>
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {Object.keys(editingImportKeys).length > 0 && (
                <div className="flex justify-end mt-4">
                  <Button 
                    onClick={() => bulkSaveImportKeysMutation.mutate()}
                    disabled={bulkSaveImportKeysMutation.isPending}
                  >
                    {bulkSaveImportKeysMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Save All Import Keys
                  </Button>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Upload Template for Metric Definitions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-brand" />
            Import Metric Definitions
          </CardTitle>
          <CardDescription>
            Upload an Excel/CSV to define or update your metric list (names, targets, owners). This is for defining metrics, not importing data.
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

      {/* Template Preview */}
      {showPreview && templateMetrics.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Template Preview ({templateMetrics.length} metrics)</CardTitle>
              <CardDescription>
                Review matches and select which metrics to import or update
                {isLockedMode && <span className="text-warning ml-2">(Locked mode: new metrics will be skipped)</span>}
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
                    <TableRow key={index} className={isLockedMode && metric.matchType === 'new' ? 'opacity-50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedForImport.has(index)}
                          disabled={isLockedMode && metric.matchType === 'new'}
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
                          <Badge variant="outline" className="border-success text-success">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Exact Match
                          </Badge>
                        )}
                        {metric.matchType === 'fuzzy' && (
                          <Badge variant="outline" className="border-warning text-warning">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Similar
                          </Badge>
                        )}
                        {metric.matchType === 'new' && (
                          <Badge variant={isLockedMode ? "destructive" : "outline"}>
                            {isLockedMode ? 'Blocked' : 'New'}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => applyTemplateMutation.mutate()}
              disabled={selectedForImport.size === 0 || applyTemplateMutation.isPending}
              className="gradient-brand"
            >
              {applyTemplateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                `Apply Template (${selectedForImport.size} metrics)`
              )}
            </Button>
          </div>
        </>
      )}

      {/* Duplicate Resolver Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Duplicate Metric Names</DialogTitle>
            <DialogDescription>
              For each group of duplicates, select the metric to keep. Others will be archived.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {Array.from(duplicateGroups.entries()).map(([name, metrics]) => (
              <div key={name} className="border rounded-lg p-4">
                <p className="font-medium mb-2">"{name}" ({metrics.length} duplicates)</p>
                <div className="space-y-2">
                  {metrics.map(m => (
                    <label key={m.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                      <input
                        type="radio"
                        name={`dup-${name}`}
                        checked={selectedDuplicates[name] === m.id}
                        onChange={() => setSelectedDuplicates(prev => ({ ...prev, [name]: m.id }))}
                      />
                      <span className="flex-1">{m.name}</span>
                      <Badge variant="muted">{m.category}</Badge>
                      {m.import_key && <Badge variant="outline">{m.import_key}</Badge>}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => resolveDuplicatesMutation.mutate()}
              disabled={Object.keys(selectedDuplicates).length !== duplicateGroups.size || resolveDuplicatesMutation.isPending}
            >
              {resolveDuplicatesMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Archive Duplicates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScorecardTemplate;
