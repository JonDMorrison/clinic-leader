import { useState, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  AlertTriangle, 
  Target, 
  TrendingDown, 
  Plus, 
  Loader2, 
  Link as LinkIcon,
  User,
  Calendar,
  RefreshCw,
  Upload,
  Settings,
  Database
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  metricStatus, 
  formatMetricValue, 
  type MetricStatus,
  type MetricStatusResult
} from "@/lib/scorecard/metricStatus";
import { 
  getMonthlyPeriodSelection,
  periodKeyToStart,
  type MonthlyPeriodSelection 
} from "@/lib/scorecard/periodHelper";
import { CreateIssueFromMetricModal } from "@/components/scorecard/CreateIssueFromMetricModal";

interface OffTrackMetric {
  id: string;
  name: string;
  category: string;
  target: number | null;
  direction: string;
  unit: string;
  owner: string | null;
  currentValue: number | null;
  currentPeriod: string | null;
  linkedRocksCount: number;
  status: MetricStatus;
  statusResult: MetricStatusResult;
}

const ScorecardOffTrack = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  
  // Section refs for scroll-to
  const offTrackRef = useRef<HTMLDivElement>(null);
  const needsDataRef = useRef<HTMLDivElement>(null);
  const needsTargetRef = useRef<HTMLDivElement>(null);
  const needsOwnerRef = useRef<HTMLDivElement>(null);
  
  // Period selection state - will be populated from helper
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('');
  const [periodSelection, setPeriodSelection] = useState<MonthlyPeriodSelection | null>(null);

  // Modal states
  const [issueModalMetric, setIssueModalMetric] = useState<OffTrackMetric | null>(null);
  const [assignOwnerMetric, setAssignOwnerMetric] = useState<OffTrackMetric | null>(null);
  const [setTargetMetric, setSetTargetMetric] = useState<OffTrackMetric | null>(null);
  const [newOwner, setNewOwner] = useState('');
  const [newTarget, setNewTarget] = useState('');

  // Fetch period selection using the shared helper
  const { data: periodData, isLoading: periodLoading } = useQuery({
    queryKey: ['monthly-period-selection', currentUser?.team_id],
    queryFn: async () => {
      const selection = await getMonthlyPeriodSelection(currentUser!.team_id);
      // Initialize selected period from URL or default
      const urlMonth = searchParams.get('month');
      const effectivePeriod = urlMonth && selection.availablePeriodKeys.includes(urlMonth) 
        ? urlMonth 
        : selection.selectedPeriodKey;
      
      setSelectedPeriodKey(effectivePeriod);
      setPeriodSelection(selection);
      return selection;
    },
    enabled: !!currentUser?.team_id,
  });

  // Fetch users for owner assignment
  const { data: users } = useQuery({
    queryKey: ['org-users', currentUser?.team_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('team_id', currentUser!.team_id)
        .order('full_name');
      return data || [];
    },
    enabled: !!currentUser?.team_id,
  });

  // Main data query - uses the authoritative metricStatus helper
  const { data: offTrackData, isLoading, refetch } = useQuery({
    queryKey: ['off-track-metrics', currentUser?.team_id, selectedPeriodKey],
    queryFn: async () => {
      if (!currentUser?.team_id || !selectedPeriodKey) return { metrics: [], lastSync: null };

      const orgId = currentUser.team_id;
      const periodStart = periodKeyToStart(selectedPeriodKey);

      // Get all active metrics for org
      const { data: metrics, error: metricsError } = await supabase
        .from('metrics')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('category');

      if (metricsError) throw metricsError;
      if (!metrics?.length) return { metrics: [], lastSync: null };

      // Get results for selected period only
      const { data: results, error: resultsError } = await supabase
        .from('metric_results')
        .select('*')
        .in('metric_id', metrics.map(m => m.id))
        .eq('period_type', 'monthly')
        .eq('period_start', periodStart);

      if (resultsError) throw resultsError;

      // Get linked rocks count
      const { data: rockLinks } = await supabase
        .from('rock_metric_links')
        .select('metric_id')
        .eq('organization_id', orgId)
        .in('metric_id', metrics.map(m => m.id));

      const rockCountByMetric = rockLinks?.reduce((acc, link) => {
        acc[link.metric_id] = (acc[link.metric_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Build result map
      const resultsByMetric = results?.reduce((acc, r) => {
        acc[r.metric_id] = r;
        return acc;
      }, {} as Record<string, any>) || {};

      // Process metrics using the AUTHORITATIVE metricStatus helper
      const offTrackMetrics: OffTrackMetric[] = [];
      let lastSync: string | null = null;

      for (const metric of metrics) {
        const result = resultsByMetric[metric.id];
        
        if (result?.created_at && (!lastSync || result.created_at > lastSync)) {
          lastSync = result.created_at;
        }

        // Use the authoritative metricStatus helper
        const statusResult = metricStatus(
          { target: metric.target, direction: metric.direction, owner: metric.owner },
          result ? { value: result.value } : null,
          selectedPeriodKey
        );

        // Only include metrics that need attention (not on_track)
        if (statusResult.status !== 'on_track') {
          offTrackMetrics.push({
            id: metric.id,
            name: metric.name,
            category: metric.category,
            target: metric.target,
            direction: metric.direction,
            unit: metric.unit,
            owner: metric.owner,
            currentValue: result?.value ?? null,
            currentPeriod: result?.period_start ?? null,
            linkedRocksCount: rockCountByMetric[metric.id] || 0,
            status: statusResult.status,
            statusResult,
          });
        }
      }

      return { metrics: offTrackMetrics, lastSync };
    },
    enabled: !!currentUser?.team_id && !!selectedPeriodKey,
  });

  // Update owner mutation
  const updateOwnerMutation = useMutation({
    mutationFn: async ({ metricId, ownerId }: { metricId: string; ownerId: string }) => {
      const { error } = await supabase
        .from('metrics')
        .update({ owner: ownerId })
        .eq('id', metricId)
        .eq('organization_id', currentUser!.team_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['off-track-metrics'] });
      toast.success('Owner assigned');
      setAssignOwnerMetric(null);
      setNewOwner('');
    },
    onError: (error: any) => {
      toast.error(error.message || "You don't have permission to edit scorecard metrics.");
    },
  });

  // Update target mutation
  const updateTargetMutation = useMutation({
    mutationFn: async ({ metricId, target }: { metricId: string; target: number | null }) => {
      const { error } = await supabase
        .from('metrics')
        .update({ target })
        .eq('id', metricId)
        .eq('organization_id', currentUser!.team_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['off-track-metrics'] });
      toast.success('Target updated');
      setSetTargetMetric(null);
      setNewTarget('');
    },
    onError: (error: any) => {
      toast.error(error.message || "You don't have permission to edit scorecard metrics.");
    },
  });

  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriodKey(newPeriod);
    setSearchParams({ month: newPeriod });
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const getStatusBadge = (status: MetricStatus) => {
    switch (status) {
      case 'off_track':
        return <Badge variant="destructive" className="gap-1"><TrendingDown className="w-3 h-3" />Off Track</Badge>;
      case 'needs_target':
        return <Badge variant="outline" className="text-warning border-warning gap-1"><Target className="w-3 h-3" />Needs Target</Badge>;
      case 'needs_data':
        return <Badge variant="secondary" className="gap-1"><AlertTriangle className="w-3 h-3" />Needs Data</Badge>;
      case 'needs_owner':
        return <Badge variant="outline" className="text-warning border-warning gap-1"><User className="w-3 h-3" />Needs Owner</Badge>;
      default:
        return null;
    }
  };

  // Get period label
  const getPeriodLabel = () => {
    if (!selectedPeriodKey) return '';
    try {
      return format(new Date(selectedPeriodKey + '-01'), 'MMMM yyyy');
    } catch {
      return selectedPeriodKey;
    }
  };

  if (userLoading || periodLoading || isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  // Filter metrics by status
  const metricsByStatus = {
    offTrack: offTrackData?.metrics.filter(m => m.status === 'off_track') || [],
    needsData: offTrackData?.metrics.filter(m => m.status === 'needs_data') || [],
    needsTarget: offTrackData?.metrics.filter(m => m.status === 'needs_target') || [],
    needsOwner: offTrackData?.metrics.filter(m => m.status === 'needs_owner') || [],
  };

  // Sort off-track by absolute delta descending (largest gap first)
  metricsByStatus.offTrack.sort((a, b) => {
    const deltaA = Math.abs(a.statusResult.delta || 0);
    const deltaB = Math.abs(b.statusResult.delta || 0);
    return deltaB - deltaA;
  });

  // Sort others alphabetically
  metricsByStatus.needsData.sort((a, b) => a.name.localeCompare(b.name));
  metricsByStatus.needsTarget.sort((a, b) => a.name.localeCompare(b.name));
  metricsByStatus.needsOwner.sort((a, b) => a.name.localeCompare(b.name));

  const counts = {
    offTrack: metricsByStatus.offTrack.length,
    needsData: metricsByStatus.needsData.length,
    needsTarget: metricsByStatus.needsTarget.length,
    needsOwner: metricsByStatus.needsOwner.length,
  };

  // Build available periods list for dropdown
  const availablePeriods = periodSelection?.availablePeriodKeys.map(key => ({
    key,
    label: format(new Date(key + '-01'), 'MMMM yyyy'),
  })) || [];

  // If no periods available, add current month
  if (availablePeriods.length === 0 && selectedPeriodKey) {
    availablePeriods.push({
      key: selectedPeriodKey,
      label: getPeriodLabel(),
    });
  }

  // Empty state when no data at all
  if (!periodSelection?.hasAnyData) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/scorecard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-muted-foreground" />
            Off-Track Scorecard
          </h1>
          <p className="text-muted-foreground">
            Showing status for {getPeriodLabel()}
          </p>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">No monthly scorecard data yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start by syncing your scorecard data or uploading your first monthly report.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => navigate('/scorecard/template')}>
                <Settings className="w-4 h-4 mr-2" />
                Fix Template
              </Button>
              <Button variant="outline" onClick={() => navigate('/imports/monthly-report')}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Month
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render a metric table section
  const renderMetricSection = (
    title: string,
    metrics: OffTrackMetric[],
    sectionRef: React.RefObject<HTMLDivElement>,
    emptyMessage: string
  ) => {
    if (metrics.length === 0) return null;

    return (
      <Card ref={sectionRef}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {title} <Badge variant="secondary">{metrics.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Links</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map(metric => (
                <TableRow key={metric.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{metric.name}</p>
                      <Badge variant="secondary" className="text-xs mt-1">{metric.category}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {metric.owner ? (
                      <span className="text-sm">{users?.find(u => u.id === metric.owner)?.full_name || metric.owner}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className={metric.status === 'off_track' ? 'text-destructive font-medium' : ''}>
                    {formatMetricValue(metric.currentValue, metric.unit)}
                  </TableCell>
                  <TableCell>
                    {metric.target !== null ? formatMetricValue(metric.target, metric.unit) : '—'}
                  </TableCell>
                  <TableCell>{getStatusBadge(metric.status)}</TableCell>
                  <TableCell>
                    {metric.linkedRocksCount > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <LinkIcon className="w-3 h-3" />
                        {metric.linkedRocksCount}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {metric.status === 'off_track' && (
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => setIssueModalMetric(metric)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Issue
                        </Button>
                      )}
                      {(metric.status === 'needs_owner' || !metric.owner) && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setAssignOwnerMetric(metric)}
                        >
                          <User className="w-3 h-3 mr-1" />
                          Assign
                        </Button>
                      )}
                      {(metric.status === 'needs_target' || metric.target === null) && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSetTargetMetric(metric);
                            setNewTarget(metric.target?.toString() || '');
                          }}
                        >
                          <Target className="w-3 h-3 mr-1" />
                          Set Target
                        </Button>
                      )}
                      {metric.status === 'needs_data' && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => navigate('/imports/monthly-report')}
                        >
                          <Upload className="w-3 h-3 mr-1" />
                          Upload
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const totalIssues = counts.offTrack + counts.needsData + counts.needsTarget + counts.needsOwner;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/scorecard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriodKey} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availablePeriods.map(p => (
                <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-destructive" />
          Off-Track Scorecard
        </h1>
        <p className="text-muted-foreground">
          Showing status for <span className="font-medium text-foreground">{getPeriodLabel()}</span>
        </p>
      </div>

      {/* Summary Cards - 4 columns, clickable to scroll */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer hover:border-destructive/70 transition-colors ${counts.offTrack > 0 ? 'border-destructive/50' : ''}`}
          onClick={() => scrollToSection(offTrackRef)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Off Track</p>
                <p className={`text-3xl font-bold ${counts.offTrack > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {counts.offTrack}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:border-muted-foreground/50 transition-colors"
          onClick={() => scrollToSection(needsDataRef)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Data</p>
                <p className="text-3xl font-bold text-muted-foreground">{counts.needsData}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:border-warning/70 transition-colors ${counts.needsTarget > 0 ? 'border-warning/50' : ''}`}
          onClick={() => scrollToSection(needsTargetRef)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Target</p>
                <p className={`text-3xl font-bold ${counts.needsTarget > 0 ? 'text-warning' : 'text-foreground'}`}>
                  {counts.needsTarget}
                </p>
              </div>
              <Target className="w-8 h-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:border-warning/70 transition-colors ${counts.needsOwner > 0 ? 'border-warning/50' : ''}`}
          onClick={() => scrollToSection(needsOwnerRef)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Owner</p>
                <p className={`text-3xl font-bold ${counts.needsOwner > 0 ? 'text-warning' : 'text-foreground'}`}>
                  {counts.needsOwner}
                </p>
              </div>
              <User className="w-8 h-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {offTrackData?.lastSync && (
        <p className="text-sm text-muted-foreground">
          Data last synced: {format(new Date(offTrackData.lastSync), 'MMM d, yyyy h:mm a')}
        </p>
      )}

      {/* All On Track State */}
      {totalIssues === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-success opacity-70" />
            <p className="font-medium text-lg">All metrics are on track for {getPeriodLabel()}!</p>
            <p className="text-sm text-muted-foreground mt-1">No action required this month.</p>
          </CardContent>
        </Card>
      )}

      {/* Metric Sections by Status */}
      {renderMetricSection('Off Track', metricsByStatus.offTrack, offTrackRef, 'No off-track metrics')}
      {renderMetricSection('Needs Data', metricsByStatus.needsData, needsDataRef, 'All metrics have data')}
      {renderMetricSection('Needs Target', metricsByStatus.needsTarget, needsTargetRef, 'All metrics have targets')}
      {renderMetricSection('Needs Owner', metricsByStatus.needsOwner, needsOwnerRef, 'All metrics have owners')}

      {/* Create Issue Modal */}
      {issueModalMetric && currentUser?.team_id && (
        <CreateIssueFromMetricModal
          open={!!issueModalMetric}
          onClose={() => setIssueModalMetric(null)}
          organizationId={currentUser.team_id}
          metric={{
            id: issueModalMetric.id,
            name: issueModalMetric.name,
            target: issueModalMetric.target,
            direction: issueModalMetric.direction,
            unit: issueModalMetric.unit,
            currentValue: issueModalMetric.currentValue,
            status: issueModalMetric.status,
          }}
          periodKey={selectedPeriodKey}
          periodLabel={getPeriodLabel()}
        />
      )}

      {/* Assign Owner Dialog */}
      <Dialog open={!!assignOwnerMetric} onOpenChange={() => setAssignOwnerMetric(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Assign Owner</DialogTitle>
            <DialogDescription>
              Select an owner for <span className="font-medium">{assignOwnerMetric?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Select value={newOwner} onValueChange={setNewOwner}>
              <SelectTrigger>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {users?.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignOwnerMetric(null)}>Cancel</Button>
              <Button 
                onClick={() => {
                  if (assignOwnerMetric && newOwner) {
                    updateOwnerMutation.mutate({ metricId: assignOwnerMetric.id, ownerId: newOwner });
                  }
                }}
                disabled={!newOwner || updateOwnerMutation.isPending}
              >
                {updateOwnerMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Set Target Dialog */}
      <Dialog open={!!setTargetMetric} onOpenChange={() => setSetTargetMetric(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Set Target</DialogTitle>
            <DialogDescription>
              Set a target for <span className="font-medium">{setTargetMetric?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="target">Target Value</Label>
              <Input
                id="target"
                type="number"
                step="any"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                placeholder={`Enter target (${setTargetMetric?.unit || '#'})`}
              />
              {setTargetMetric?.direction && (
                <p className="text-xs text-muted-foreground">
                  Direction: {setTargetMetric.direction === 'up' ? 'Higher is better' : 
                             setTargetMetric.direction === 'down' ? 'Lower is better' : setTargetMetric.direction}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSetTargetMetric(null)}>Cancel</Button>
              <Button 
                onClick={() => {
                  if (setTargetMetric) {
                    const targetValue = newTarget.trim() ? parseFloat(newTarget) : null;
                    if (newTarget.trim() && isNaN(targetValue as number)) {
                      toast.error('Please enter a valid number');
                      return;
                    }
                    updateTargetMutation.mutate({ metricId: setTargetMetric.id, target: targetValue });
                  }
                }}
                disabled={updateTargetMutation.isPending}
              >
                {updateTargetMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScorecardOffTrack;
