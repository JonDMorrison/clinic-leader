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
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, ArrowLeft, Download, Settings } from "lucide-react";
import { parseExcel } from "@/lib/importers/excelParser";
import { parseCSV } from "@/lib/importers/csvParser";

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
  is_active: boolean;
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

  const { data: existingMetrics } = useQuery({
    queryKey: ['metrics-template', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data, error } = await supabase
        .from('metrics')
        .select('id, name, category, unit, target, is_active')
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setShowPreview(false);
    setTemplateMetrics([]);
  };

  const inferDirection = (name: string, unit: string): 'up' | 'down' => {
    const lowerName = name.toLowerCase();
    const lowerUnit = unit.toLowerCase();
    
    // Lower is better for aging, days, cost metrics
    if (lowerName.includes('aging') || lowerName.includes('a/r days') || 
        lowerName.includes('cost') || lowerName.includes('expense') ||
        lowerName.includes('wait time') || lowerName.includes('cancellation')) {
      return 'down';
    }
    
    // Higher is better for revenue, profit, patients, visits
    return 'up';
  };

  const inferUnit = (name: string, value: any): string => {
    const lowerName = name.toLowerCase();
    const strValue = String(value || '');
    
    if (strValue.includes('$') || lowerName.includes('revenue') || 
        lowerName.includes('income') || lowerName.includes('charge') ||
        lowerName.includes('avg $') || lowerName.includes('per visit') ||
        lowerName.includes('per case')) {
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
    
    // Exact match
    const exact = existingMetrics.find(m => 
      m.name.toLowerCase().trim() === normalizedName
    );
    if (exact) return { id: exact.id, type: 'exact' };
    
    // Fuzzy match (contains)
    const fuzzy = existingMetrics.find(m => 
      m.name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(m.name.toLowerCase())
    );
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
        throw new Error('Unsupported file format');
      }

      // Extract metrics from template
      const metrics: TemplateMetric[] = [];
      
      // Assume first column is metric name, look for target/category columns
      for (const row of parsedData.rows) {
        const name = row['Metric'] || row['Name'] || row['KPI'] || Object.values(row)[0];
        if (!name || typeof name !== 'string' || name.trim().length < 2) continue;
        
        const category = row['Category'] || row['Type'] || 'General';
        const targetRaw = row['Target'] || row['Goal'] || null;
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
          matchedMetricId: match.id,
          matchType: match.type,
        });
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
            });
          
          if (!error) created++;
        }
      }

      return { created, updated };
    },
    onSuccess: ({ created, updated }) => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['scorecard-metrics'] });
      toast.success(`Template applied: ${created} created, ${updated} updated`);
      navigate('/scorecard');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to apply template');
    },
  });

  const metricsNotInTemplate = existingMetrics?.filter(m => 
    !templateMetrics.some(tm => tm.matchedMetricId === m.id)
  ) || [];

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand" />
            Upload Template
          </CardTitle>
          <CardDescription>
            Upload an Excel or CSV file with your metric definitions. Expected columns: Metric/Name, Category, Target
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

          {metricsNotInTemplate.length > 0 && (
            <Card className="border-warning/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="w-5 h-5" />
                  Metrics Not in Template ({metricsNotInTemplate.length})
                </CardTitle>
                <CardDescription>
                  These existing metrics are not in your template. They will remain unchanged but can be deactivated.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {metricsNotInTemplate.map(m => (
                    <Badge key={m.id} variant="muted">{m.name}</Badge>
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
