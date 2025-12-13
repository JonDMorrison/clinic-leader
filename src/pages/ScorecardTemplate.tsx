import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, ArrowLeft, 
  Settings, Archive, User, Target, ChevronDown, ChevronUp 
} from "lucide-react";
import { parseExcel } from "@/lib/importers/excelParser";
import { parseCSV } from "@/lib/importers/csvParser";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
}

const ScorecardTemplate = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [templateMetrics, setTemplateMetrics] = useState<TemplateMetric[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedForImport, setSelectedForImport] = useState<Set<number>>(new Set());
  const [showOwnerEditor, setShowOwnerEditor] = useState(false);
  const [editingMetrics, setEditingMetrics] = useState<Record<string, { owner?: string; target?: number | null }>>({});

  const { data: existingMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['metrics-template', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data, error } = await supabase
        .from('metrics')
        .select('id, name, category, unit, target, is_active, owner, direction')
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setShowPreview(false);
    setTemplateMetrics([]);
  };

  const inferDirection = (name: string, unit: string): 'up' | 'down' => {
    const lowerName = name.toLowerCase();
    
    // Lower is better for aging, days, cost, expense, wait time, cancellation metrics
    if (lowerName.includes('aging') || lowerName.includes('a/r days') || 
        lowerName.includes('cost') || lowerName.includes('expense') ||
        lowerName.includes('wait time') || lowerName.includes('cancellation') ||
        lowerName.includes('no show') || lowerName.includes('days in')) {
      return 'down';
    }
    
    // Higher is better for everything else (revenue, profit, patients, visits, etc.)
    return 'up';
  };

  const inferUnit = (name: string, value: any): string => {
    const lowerName = name.toLowerCase();
    const strValue = String(value || '');
    
    if (strValue.includes('$') || lowerName.includes('revenue') || 
        lowerName.includes('income') || lowerName.includes('charge') ||
        lowerName.includes('avg $') || lowerName.includes('per visit') ||
        lowerName.includes('per case') || lowerName.includes('gross') ||
        lowerName.includes('collection') || lowerName.includes('profit')) {
      return '$';
    }
    if (strValue.includes('%') || lowerName.includes('rate') || 
        lowerName.includes('margin') || lowerName.includes('percentage') ||
        lowerName.includes('close rate')) {
      return '%';
    }
    return '#';
  };

  const findMatch = (name: string): { id?: string; type: 'exact' | 'fuzzy' | 'new' } => {
    if (!existingMetrics) return { type: 'new' };
    
    const normalizedName = name.toLowerCase().trim();
    
    // Exact match (case-insensitive)
    const exact = existingMetrics.find(m => 
      m.name.toLowerCase().trim() === normalizedName
    );
    if (exact) return { id: exact.id, type: 'exact' };
    
    // Fuzzy match (contains or is contained)
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

      // Extract metrics from template
      const metrics: TemplateMetric[] = [];
      
      // Smart header detection - look for common metric column names
      const headers = parsedData.headers || [];
      const nameCol = headers.find((h: string) => 
        /^(metric|name|kpi|measure|indicator)$/i.test(h.trim())
      ) || headers[0];
      
      for (const row of parsedData.rows) {
        const name = row[nameCol] || row['Metric'] || row['Name'] || row['KPI'] || Object.values(row)[0];
        if (!name || typeof name !== 'string' || name.trim().length < 2) continue;
        
        // Skip header-like rows
        if (/^(metric|name|kpi|category|total)$/i.test(name.trim())) continue;
        
        const category = row['Category'] || row['Type'] || row['Group'] || 'General';
        const targetRaw = row['Target'] || row['Goal'] || row['Benchmark'] || null;
        const ownerRaw = row['Owner'] || row['Responsible'] || null;
        const target = targetRaw ? parseFloat(String(targetRaw).replace(/[^0-9.-]/g, '')) : null;
        const unit = inferUnit(name, targetRaw);
        const direction = inferDirection(name, unit);
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
        throw new Error('No metrics found in template. Ensure the first column contains metric names.');
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
        if (metric.matchedMetricId) {
          // Update existing metric
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
              ...(metric.owner && { owner: metric.owner }),
            })
            .eq('id', metric.matchedMetricId);
          
          if (!error) updated++;
        } else {
          // Create new metric
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
              ...(metric.owner && { owner: metric.owner }),
            });
          
          if (!error) created++;
        }
      }

      return { created, updated };
    },
    onSuccess: ({ created, updated }) => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['scorecard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-template'] });
      toast.success(`Template applied: ${created} created, ${updated} updated`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to apply template');
    },
  });

  const archiveMetricMutation = useMutation({
    mutationFn: async (metricId: string) => {
      const { error } = await supabase
        .from('metrics')
        .update({ is_active: false })
        .eq('id', metricId);
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
        .eq('id', metricId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchMetrics();
      toast.success('Metric updated');
    },
  });

  const metricsNotInTemplate = existingMetrics?.filter(m => 
    m.is_active && !templateMetrics.some(tm => tm.matchedMetricId === m.id)
  ) || [];

  const activeMetrics = existingMetrics?.filter(m => m.is_active) || [];
  const missingTargets = activeMetrics.filter(m => m.target === null);
  const missingOwners = activeMetrics.filter(m => !m.owner);

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
          Import your Excel template to define the official KPI list for your monthly scorecard
        </p>
        {orgSettings?.scorecard_mode === 'locked_to_template' && (
          <Badge variant="outline" className="mt-2 border-brand text-brand">
            Locked to Template Mode
          </Badge>
        )}
      </div>

      {/* Template Health Summary */}
      {activeMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="w-5 h-5 text-brand" />
              Template Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground">Total Metrics</p>
                <p className="text-2xl font-bold">{activeMetrics.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-success">{activeMetrics.length}</p>
              </div>
              <div className={`p-3 rounded-lg border ${missingTargets.length > 0 ? 'bg-warning/10 border-warning/30' : 'bg-muted/50'}`}>
                <p className="text-sm text-muted-foreground">Missing Targets</p>
                <p className={`text-2xl font-bold ${missingTargets.length > 0 ? 'text-warning' : ''}`}>{missingTargets.length}</p>
              </div>
              <div className={`p-3 rounded-lg border ${missingOwners.length > 0 ? 'bg-warning/10 border-warning/30' : 'bg-muted/50'}`}>
                <p className="text-sm text-muted-foreground">Missing Owners</p>
                <p className={`text-2xl font-bold ${missingOwners.length > 0 ? 'text-warning' : ''}`}>{missingOwners.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Owners & Targets Editor */}
      {(missingTargets.length > 0 || missingOwners.length > 0) && (
        <Collapsible open={showOwnerEditor} onOpenChange={setShowOwnerEditor}>
          <Card className="border-warning/30">
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5 text-warning" />
                    Assign Owners & Targets
                  </CardTitle>
                  {showOwnerEditor ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </CollapsibleTrigger>
              <CardDescription>
                {missingOwners.length} metrics missing owners, {missingTargets.length} missing targets
              </CardDescription>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...missingOwners, ...missingTargets.filter(m => m.owner)]
                      .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)
                      .map(metric => (
                        <TableRow key={metric.id}>
                          <TableCell className="font-medium">{metric.name}</TableCell>
                          <TableCell><Badge variant="muted">{metric.category}</Badge></TableCell>
                          <TableCell>
                            <Select
                              value={editingMetrics[metric.id]?.owner ?? metric.owner ?? ''}
                              onValueChange={(val) => setEditingMetrics(prev => ({
                                ...prev,
                                [metric.id]: { ...prev[metric.id], owner: val }
                              }))}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Select owner" />
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
                              className="w-28"
                              placeholder="Target"
                              value={editingMetrics[metric.id]?.target ?? metric.target ?? ''}
                              onChange={(e) => setEditingMetrics(prev => ({
                                ...prev,
                                [metric.id]: { ...prev[metric.id], target: e.target.value ? parseFloat(e.target.value) : null }
                              }))}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!editingMetrics[metric.id]}
                              onClick={() => {
                                if (editingMetrics[metric.id]) {
                                  updateMetricMutation.mutate({
                                    metricId: metric.id,
                                    updates: editingMetrics[metric.id]
                                  });
                                  setEditingMetrics(prev => {
                                    const next = { ...prev };
                                    delete next[metric.id];
                                    return next;
                                  });
                                }
                              }}
                            >
                              Save
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Upload Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand" />
            Upload Template
          </CardTitle>
          <CardDescription>
            Upload an Excel or CSV file with your metric definitions. Expected columns: Metric/Name, Category, Target, Owner (optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Metric Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Match Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templateMetrics.map((metric, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Checkbox
                          checked={selectedForImport.has(index)}
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
                      <TableCell>{metric.unit}</TableCell>
                      <TableCell>
                        <Select
                          value={metric.direction}
                          onValueChange={(val) => {
                            const updated = [...templateMetrics];
                            updated[index].direction = val as 'up' | 'down';
                            setTemplateMetrics(updated);
                          }}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="up">↑ Up</SelectItem>
                            <SelectItem value="down">↓ Down</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
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
                            Similar Match
                          </Badge>
                        )}
                        {metric.matchType === 'new' && (
                          <Badge variant="outline">New</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Metrics not in template */}
          {metricsNotInTemplate.length > 0 && (
            <Card className="border-warning/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="w-5 h-5" />
                  Metrics Not in Template ({metricsNotInTemplate.length})
                </CardTitle>
                <CardDescription>
                  These existing metrics are not in your template. You can archive them to hide from scorecard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metricsNotInTemplate.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="font-medium">{m.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => archiveMetricMutation.mutate(m.id)}
                      >
                        <Archive className="w-4 h-4 mr-1" />
                        Archive
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
    </div>
  );
};

export default ScorecardTemplate;
