import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  TrendingDown, 
  Target, 
  AlertTriangle, 
  Upload, 
  Eye,
  Clock,
  Mountain
} from "lucide-react";
import { format, subMonths, startOfMonth, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

export function MonthlyPulseWidget() {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();

  const { data: pulseData, isLoading } = useQuery({
    queryKey: ['monthly-pulse', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;

      // Get organization settings
      const { data: orgData } = await supabase
        .from('teams')
        .select('scorecard_mode')
        .eq('id', currentUser.team_id)
        .single();

      // Get all active metrics
      const { data: metrics } = await supabase
        .from('metrics')
        .select('id, name, target, direction, cadence')
        .eq('organization_id', currentUser.team_id)
        .eq('is_active', true);

      // Get latest monthly results
      const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const lastMonth = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');

      const { data: results } = await supabase
        .from('metric_results')
        .select('*')
        .in('metric_id', metrics?.map(m => m.id) || [])
        .eq('period_type', 'monthly')
        .in('period_start', [currentMonth, lastMonth])
        .order('created_at', { ascending: false });

      // Get rocks with linked metrics
      const { data: rocks } = await supabase
        .from('rocks')
        .select('id, status')
        .eq('organization_id', currentUser.team_id)
        .neq('status', 'done');

      const { data: rockLinks } = await supabase
        .from('rock_metric_links')
        .select('rock_id, metric_id')
        .in('rock_id', rocks?.map(r => r.id) || []);

      // Calculate stats
      let offTrackCount = 0;
      let needsTargetCount = 0;
      let needsDataCount = 0;
      let lastSyncDate: Date | null = null;
      let lastSyncMonth: string | null = null;

      const resultsByMetric = results?.reduce((acc, r) => {
        if (!acc[r.metric_id]) acc[r.metric_id] = [];
        acc[r.metric_id].push(r);
        return acc;
      }, {} as Record<string, any[]>) || {};

      for (const metric of metrics || []) {
        if (metric.cadence !== 'monthly') continue;
        
        const metricResults = resultsByMetric[metric.id] || [];
        const latestResult = metricResults[0];

        if (latestResult) {
          if (!lastSyncDate || new Date(latestResult.created_at) > lastSyncDate) {
            lastSyncDate = new Date(latestResult.created_at);
            lastSyncMonth = latestResult.period_start;
          }
        }

        if (!metric.target) {
          needsTargetCount++;
        } else if (!latestResult) {
          needsDataCount++;
        } else {
          const isOnTrack = metric.direction === 'up' 
            ? latestResult.value >= metric.target
            : latestResult.value <= metric.target;
          if (!isOnTrack) offTrackCount++;
        }
      }

      // Calculate at-risk rocks
      let atRiskRocksCount = 0;
      for (const rock of rocks || []) {
        const linkedMetricIds = rockLinks?.filter(l => l.rock_id === rock.id).map(l => l.metric_id) || [];
        const hasOffTrackMetric = linkedMetricIds.some(metricId => {
          const metric = metrics?.find(m => m.id === metricId);
          const latestResult = resultsByMetric[metricId]?.[0];
          if (!metric?.target || !latestResult) return false;
          return metric.direction === 'up' 
            ? latestResult.value < metric.target
            : latestResult.value > metric.target;
        });
        if (hasOffTrackMetric || rock.status === 'off_track') {
          atRiskRocksCount++;
        }
      }

      return {
        offTrackCount,
        needsTargetCount,
        needsDataCount,
        atRiskRocksCount,
        lastSyncDate,
        lastSyncMonth,
        isLockedMode: orgData?.scorecard_mode === 'locked_to_template',
        totalMetrics: metrics?.filter(m => m.cadence === 'monthly').length || 0,
      };
    },
    enabled: !!currentUser?.team_id,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !pulseData) return null;

  // Don't show if no monthly metrics
  if (pulseData.totalMetrics === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-brand/20 bg-gradient-to-br from-brand/5 via-background to-accent/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand" />
              Monthly Pulse
            </CardTitle>
            {pulseData.isLockedMode && (
              <Badge variant="outline" className="text-xs border-brand text-brand">Locked Template</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Last Sync Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {pulseData.lastSyncDate ? (
              <span>
                Last synced: {pulseData.lastSyncMonth ? format(new Date(pulseData.lastSyncMonth), 'MMMM yyyy') : 'N/A'}
                {' '}({formatDistanceToNow(pulseData.lastSyncDate, { addSuffix: true })})
              </span>
            ) : (
              <span className="text-warning">No data synced yet</span>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-lg border ${pulseData.offTrackCount > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Off Track</span>
              </div>
              <p className={`text-2xl font-bold ${pulseData.offTrackCount > 0 ? 'text-destructive' : 'text-foreground'}`}>
                {pulseData.offTrackCount}
              </p>
            </div>

            <div className={`p-3 rounded-lg border ${pulseData.needsTargetCount > 0 ? 'border-warning/30 bg-warning/5' : 'border-border'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-warning" />
                <span className="text-xs text-muted-foreground">Need Targets</span>
              </div>
              <p className={`text-2xl font-bold ${pulseData.needsTargetCount > 0 ? 'text-warning' : 'text-foreground'}`}>
                {pulseData.needsTargetCount}
              </p>
            </div>

            <div className={`p-3 rounded-lg border ${pulseData.needsDataCount > 0 ? 'border-muted-foreground/30 bg-muted/50' : 'border-border'}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Need Data</span>
              </div>
              <p className="text-2xl font-bold text-muted-foreground">
                {pulseData.needsDataCount}
              </p>
            </div>

            <div className={`p-3 rounded-lg border ${pulseData.atRiskRocksCount > 0 ? 'border-warning/30 bg-warning/5' : 'border-border'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Mountain className="w-4 h-4 text-warning" />
                <span className="text-xs text-muted-foreground">Rocks at Risk</span>
              </div>
              <p className={`text-2xl font-bold ${pulseData.atRiskRocksCount > 0 ? 'text-warning' : 'text-foreground'}`}>
                {pulseData.atRiskRocksCount}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              className="flex-1 gradient-brand" 
              onClick={() => navigate('/imports/monthly-report')}
            >
              <Upload className="w-4 h-4 mr-2" />
              Sync Monthly KPIs
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate('/scorecard/off-track')}
            >
              <Eye className="w-4 h-4 mr-2" />
              Review Off Track
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
