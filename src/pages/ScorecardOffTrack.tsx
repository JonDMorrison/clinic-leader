import { useState, useMemo } from "react";
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
  RefreshCw
} from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { 
  calculateMetricStatus, 
  formatMetricValue, 
  type MetricStatus 
} from "@/lib/scorecard/metricStatus";
import { 
  getAvailablePeriods, 
  buildPeriodInfo, 
  periodKeyToStart,
  type PeriodInfo 
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
  statusResult: ReturnType<typeof calculateMetricStatus>;
}

const ScorecardOffTrack = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  
  // Period selection
  const availablePeriods = useMemo(() => getAvailablePeriods(), []);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState(
    searchParams.get('month') || availablePeriods[0]?.key || format(new Date(), 'yyyy-MM')
  );
  const periodInfo = useMemo(() => buildPeriodInfo(selectedPeriodKey, true), [selectedPeriodKey]);

  // Modal states
  const [issueModalMetric, setIssueModalMetric] = useState<OffTrackMetric | null>(null);
  const [assignOwnerMetric, setAssignOwnerMetric] = useState<OffTrackMetric | null>(null);
  const [setTargetMetric, setSetTargetMetric] = useState<OffTrackMetric | null>(null);
  const [newOwner, setNewOwner] = useState('');
  const [newTarget, setNewTarget] = useState('');

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

  // Main data query
  const { data: offTrackData, isLoading, refetch } = useQuery({
    queryKey: ['off-track-metrics', currentUser?.team_id, selectedPeriodKey],
    queryFn: async () => {
      if (!currentUser?.team_id) return { metrics: [], lastSync: null };

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

      // Process metrics and filter for those needing attention
      const offTrackMetrics: OffTrackMetric[] = [];
      let lastSync: string | null = null;

      for (const metric of metrics) {
        const result = resultsByMetric[metric.id];
        
        if (result?.created_at && (!lastSync || result.created_at > lastSync)) {
          lastSync = result.created_at;
        }

        // Calculate status using shared helper
        const statusResult = calculateMetricStatus(
          result?.value ?? null,
          metric.target,
          metric.direction,
          result?.period_start ?? periodStart,
          metric.owner
        );

        // Only include metrics that need attention
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
    enabled: !!currentUser?.team_id,
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
      toast.error(error.message || 'Failed to assign owner');
    },
  });

  // Update target mutation
  const updateTargetMutation = useMutation({
    mutationFn: async ({ metricId, target }: { metricId: string; target: number }) => {
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
      toast.error(error.message || 'Failed to update target');
    },
  });

  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriodKey(newPeriod);
    setSearchParams({ month: newPeriod });
  };

  const getStatusBadge = (status: MetricStatus) => {
    switch (status) {
      case 'off_track':
        return <Badge variant="destructive" className="gap-1"><TrendingDown className="w-3 h-3" />Off Track</Badge>;
      case 'needs_target':
        return <Badge variant="outline" className="text-warning border-warning gap-1"><Target className="w-3 h-3" />Needs Target</Badge>;
      case 'needs_data':
        return <Badge variant="muted" className="gap-1"><AlertTriangle className="w-3 h-3" />Needs Data</Badge>;
      case 'needs_owner':
        return <Badge variant="outline" className="text-warning border-warning gap-1"><User className="w-3 h-3" />Needs Owner</Badge>;
      default:
        return null;
    }
  };

  if (userLoading || isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  // Status counts
  const counts = {
    offTrack: offTrackData?.metrics.filter(m => m.status === 'off_track').length || 0,
    needsTarget: offTrackData?.metrics.filter(m => m.status === 'needs_target').length || 0,
    needsData: offTrackData?.metrics.filter(m => m.status === 'needs_data').length || 0,
    needsOwner: offTrackData?.metrics.filter(m => m.status === 'needs_owner').length || 0,
  };

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
          Monthly Scorecard Review
        </h1>
        <p className="text-muted-foreground">
          Metrics requiring attention for <span className="font-medium text-foreground">{periodInfo.periodLabel}</span>
        </p>
      </div>

      {/* Summary Cards - 4 columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={counts.offTrack > 0 ? 'border-destructive/50' : ''}>
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
        <Card className={counts.needsData > 0 ? 'border-muted-foreground/30' : ''}>
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
        <Card className={counts.needsTarget > 0 ? 'border-warning/50' : ''}>
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
        <Card className={counts.needsOwner > 0 ? 'border-warning/50' : ''}>
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

      {/* Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Metrics Requiring Attention ({offTrackData?.metrics.length || 0})</CardTitle>
          <CardDescription>Review each metric and take action to resolve gaps</CardDescription>
        </CardHeader>
        <CardContent>
          {offTrackData?.metrics.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">All metrics are on track for {periodInfo.periodLabel}!</p>
              <p className="text-sm mt-1">No action required this month.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Links</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offTrackData?.metrics.map(metric => (
                  <TableRow key={metric.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{metric.name}</p>
                        <Badge variant="muted" className="text-xs mt-1">{metric.category}</Badge>
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
                      {metric.target !== null ? formatMetricValue(metric.target, metric.unit) : '-'}
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
                        {metric.status === 'needs_owner' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setAssignOwnerMetric(metric)}
                          >
                            <User className="w-3 h-3 mr-1" />
                            Assign
                          </Button>
                        )}
                        {metric.status === 'needs_target' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSetTargetMetric(metric)}
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
                            Upload Data
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
          periodLabel={periodInfo.periodLabel}
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
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                placeholder={`Enter target (${setTargetMetric?.unit || '#'})`}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSetTargetMetric(null)}>Cancel</Button>
              <Button 
                onClick={() => {
                  if (setTargetMetric && newTarget) {
                    updateTargetMutation.mutate({ metricId: setTargetMetric.id, target: parseFloat(newTarget) });
                  }
                }}
                disabled={!newTarget || updateTargetMutation.isPending}
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
