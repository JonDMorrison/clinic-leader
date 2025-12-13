import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, AlertTriangle, Target, TrendingDown, Plus, Loader2, Link as LinkIcon } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { toast } from "sonner";

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
  status: 'off_track' | 'needs_target' | 'needs_data';
}

const ScorecardOffTrack = () => {
  const navigate = useNavigate();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const { data: offTrackData, isLoading } = useQuery({
    queryKey: ['off-track-metrics', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return { metrics: [], lastSync: null };

      // Get all metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('metrics')
        .select('*')
        .eq('organization_id', currentUser.team_id)
        .eq('is_active', true)
        .order('category');

      if (metricsError) throw metricsError;

      // Get latest period results for monthly metrics
      const last3Months = Array.from({ length: 3 }, (_, i) => 
        format(startOfMonth(subMonths(new Date(), i)), 'yyyy-MM-dd')
      );

      const { data: results, error: resultsError } = await supabase
        .from('metric_results')
        .select('*')
        .in('metric_id', metrics?.map(m => m.id) || [])
        .eq('period_type', 'monthly')
        .in('period_start', last3Months)
        .order('period_start', { ascending: false });

      if (resultsError) throw resultsError;

      // Get linked rocks count
      const { data: rockLinks } = await supabase
        .from('rock_metric_links')
        .select('metric_id')
        .in('metric_id', metrics?.map(m => m.id) || []);

      const rockCountByMetric = rockLinks?.reduce((acc, link) => {
        acc[link.metric_id] = (acc[link.metric_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Process metrics
      const offTrackMetrics: OffTrackMetric[] = [];
      let lastSync: string | null = null;

      for (const metric of metrics || []) {
        const metricResults = results?.filter(r => r.metric_id === metric.id) || [];
        const latestResult = metricResults[0];

        if (latestResult && (!lastSync || latestResult.created_at > lastSync)) {
          lastSync = latestResult.created_at;
        }

        let status: 'off_track' | 'needs_target' | 'needs_data' | null = null;
        
        if (!metric.target) {
          status = 'needs_target';
        } else if (!latestResult) {
          status = 'needs_data';
        } else {
          const isOnTrack = metric.direction === 'up' 
            ? latestResult.value >= metric.target
            : latestResult.value <= metric.target;
          status = isOnTrack ? null : 'off_track';
        }

        if (status !== null) {
          offTrackMetrics.push({
            id: metric.id,
            name: metric.name,
            category: metric.category,
            target: metric.target,
            direction: metric.direction,
            unit: metric.unit,
            owner: metric.owner,
            currentValue: latestResult?.value ?? null,
            currentPeriod: latestResult?.period_start ?? null,
            linkedRocksCount: rockCountByMetric[metric.id] || 0,
            status,
          });
        }
      }

      return { metrics: offTrackMetrics, lastSync };
    },
    enabled: !!currentUser?.team_id,
  });

  const handleCreateIssue = (metric: OffTrackMetric) => {
    navigate(`/issues?create=true&title=${encodeURIComponent(`Off-track: ${metric.name}`)}`);
  };

  const getStatusBadge = (status: OffTrackMetric['status']) => {
    switch (status) {
      case 'off_track':
        return <Badge variant="destructive" className="gap-1"><TrendingDown className="w-3 h-3" />Off Track</Badge>;
      case 'needs_target':
        return <Badge variant="outline" className="text-warning border-warning gap-1"><Target className="w-3 h-3" />Needs Target</Badge>;
      case 'needs_data':
        return <Badge variant="muted" className="gap-1">Needs Data</Badge>;
    }
  };

  const formatValue = (value: number | null, unit: string) => {
    if (value === null) return '-';
    if (unit === '$') return `$${value.toLocaleString()}`;
    if (unit === '%') return `${value}%`;
    return value.toLocaleString();
  };

  if (userLoading || isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const offTrackCount = offTrackData?.metrics.filter(m => m.status === 'off_track').length || 0;
  const needsTargetCount = offTrackData?.metrics.filter(m => m.status === 'needs_target').length || 0;
  const needsDataCount = offTrackData?.metrics.filter(m => m.status === 'needs_data').length || 0;

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
          <AlertTriangle className="w-8 h-8 text-destructive" />
          Off Track Metrics
        </h1>
        <p className="text-muted-foreground">
          Review metrics that need attention based on monthly performance data
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={offTrackCount > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Off Track</p>
                <p className="text-3xl font-bold text-destructive">{offTrackCount}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>
        <Card className={needsTargetCount > 0 ? 'border-warning/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Target</p>
                <p className="text-3xl font-bold text-warning">{needsTargetCount}</p>
              </div>
              <Target className="w-8 h-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Data</p>
                <p className="text-3xl font-bold text-muted-foreground">{needsDataCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-muted-foreground/50" />
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
        </CardHeader>
        <CardContent>
          {offTrackData?.metrics.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>All metrics are on track!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked Rocks</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offTrackData?.metrics.map(metric => (
                  <TableRow key={metric.id}>
                    <TableCell className="font-medium">{metric.name}</TableCell>
                    <TableCell><Badge variant="muted">{metric.category}</Badge></TableCell>
                    <TableCell className={metric.status === 'off_track' ? 'text-destructive font-medium' : ''}>
                      {formatValue(metric.currentValue, metric.unit)}
                    </TableCell>
                    <TableCell>
                      {metric.target !== null ? formatValue(metric.target, metric.unit) : '-'}
                    </TableCell>
                    <TableCell>
                      {metric.currentPeriod ? format(new Date(metric.currentPeriod), 'MMM yyyy') : '-'}
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
                    <TableCell>
                      {metric.status === 'off_track' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCreateIssue(metric)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Issue
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default ScorecardOffTrack;
