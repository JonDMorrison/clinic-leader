import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Mountain,
  RefreshCw,
  FileSpreadsheet,
  Loader2,
  Settings2,
  User
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getMonthlyPeriodSelection } from "@/lib/scorecard/periodHelper";
import { metricStatus, MetricStatusResult } from "@/lib/scorecard/metricStatus";

interface PulseData {
  offTrackCount: number;
  needsTargetCount: number;
  needsDataCount: number;
  needsOwnerCount: number;
  atRiskRocksCount: number;
  lastSyncDate: Date | null;
  lastSyncMonth: string | null;
  isAlignedMode: boolean;
  totalMetrics: number;
  hasGoogleSheet: boolean;
  syncStatus: string | null;
  selectedPeriodKey: string;
  periodLabel: string;
  hasAnyData: boolean;
}

export function MonthlyPulseWidget() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const { data: pulseData, isLoading } = useQuery({
    queryKey: ['monthly-pulse', currentUser?.team_id],
    queryFn: async (): Promise<PulseData | null> => {
      if (!currentUser?.team_id) return null;

      // Get organization settings
      const { data: orgData } = await supabase
        .from('teams')
        .select('scorecard_mode')
        .eq('id', currentUser.team_id)
        .single();

      // Get import config
      const { data: importConfig } = await supabase
        .from('scorecard_import_configs')
        .select('*')
        .eq('organization_id', currentUser.team_id)
        .maybeSingle();

      // Get period selection using the SINGLE SOURCE OF TRUTH helper
      const periodSelection = await getMonthlyPeriodSelection(currentUser.team_id);

      // Get all active metrics
      const { data: metrics } = await supabase
        .from('metrics')
        .select('id, name, target, direction, cadence, owner')
        .eq('organization_id', currentUser.team_id)
        .eq('is_active', true);

      if (!metrics?.length) {
        return {
          offTrackCount: 0,
          needsTargetCount: 0,
          needsDataCount: 0,
          needsOwnerCount: 0,
          atRiskRocksCount: 0,
          lastSyncDate: importConfig?.last_synced_at ? new Date(importConfig.last_synced_at) : null,
          lastSyncMonth: importConfig?.last_synced_month || null,
          isAlignedMode: orgData?.scorecard_mode === 'aligned',
          totalMetrics: 0,
          hasGoogleSheet: importConfig?.source === 'google_sheet' && !!importConfig?.sheet_id,
          syncStatus: importConfig?.status || null,
          selectedPeriodKey: periodSelection.selectedPeriodKey,
          periodLabel: periodSelection.periodLabel,
          hasAnyData: periodSelection.hasAnyData,
        };
      }

      // Get results for the selected period
      const periodStart = `${periodSelection.selectedPeriodKey}-01`;
      const { data: results } = await supabase
        .from('metric_results')
        .select('metric_id, value, period_key')
        .in('metric_id', metrics.map(m => m.id))
        .eq('period_type', 'monthly')
        .eq('period_start', periodStart);

      // Build results map
      const resultsByMetric = results?.reduce((acc, r) => {
        acc[r.metric_id] = r;
        return acc;
      }, {} as Record<string, { value: number | null; period_key: string }>) || {};

      // Calculate stats using the AUTHORITATIVE metricStatus engine
      let offTrackCount = 0;
      let needsTargetCount = 0;
      let needsDataCount = 0;
      let needsOwnerCount = 0;

      const monthlyMetrics = metrics.filter(m => m.cadence === 'monthly');

      for (const metric of monthlyMetrics) {
        const result = resultsByMetric[metric.id] || null;
        const status: MetricStatusResult = metricStatus(
          metric,
          result,
          periodSelection.selectedPeriodKey
        );

        switch (status.status) {
          case 'off_track':
            offTrackCount++;
            break;
          case 'needs_target':
            needsTargetCount++;
            break;
          case 'needs_data':
            needsDataCount++;
            break;
          case 'needs_owner':
            needsOwnerCount++;
            break;
          // on_track doesn't increment any counter
        }
      }

      // Get rocks with linked metrics for at-risk calculation
      const { data: rocks } = await supabase
        .from('rocks')
        .select('id, status')
        .eq('organization_id', currentUser.team_id)
        .neq('status', 'done');

      const { data: rockLinks } = await supabase
        .from('rock_metric_links')
        .select('rock_id, metric_id')
        .in('rock_id', rocks?.map(r => r.id) || []);

      // Calculate at-risk rocks
      let atRiskRocksCount = 0;
      for (const rock of rocks || []) {
        const linkedMetricIds = rockLinks?.filter(l => l.rock_id === rock.id).map(l => l.metric_id) || [];
        const hasOffTrackMetric = linkedMetricIds.some(metricId => {
          const metric = metrics.find(m => m.id === metricId);
          const result = resultsByMetric[metricId];
          if (!metric) return false;
          const status = metricStatus(metric, result || null, periodSelection.selectedPeriodKey);
          return status.status === 'off_track';
        });
        if (hasOffTrackMetric || rock.status === 'off_track') {
          atRiskRocksCount++;
        }
      }

      // Use import config's last sync if available
      let lastSyncDate: Date | null = null;
      let lastSyncMonth: string | null = null;
      
      if (importConfig?.last_synced_at) {
        lastSyncDate = new Date(importConfig.last_synced_at);
      }
      if (importConfig?.last_synced_month) {
        lastSyncMonth = importConfig.last_synced_month;
      }

      return {
        offTrackCount,
        needsTargetCount,
        needsDataCount,
        needsOwnerCount,
        atRiskRocksCount,
        lastSyncDate,
        lastSyncMonth,
        isAlignedMode: orgData?.scorecard_mode === 'aligned',
        totalMetrics: monthlyMetrics.length,
        hasGoogleSheet: importConfig?.source === 'google_sheet' && !!importConfig?.sheet_id,
        syncStatus: importConfig?.status || null,
        selectedPeriodKey: periodSelection.selectedPeriodKey,
        periodLabel: periodSelection.periodLabel,
        hasAnyData: periodSelection.hasAnyData,
      };
    },
    enabled: !!currentUser?.team_id,
    staleTime: 5 * 60 * 1000,
  });

  // Google Sheet sync mutation
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

      return response.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['monthly-pulse'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['metric-results'] });
      
      if (result.success && result.rows_upserted > 0) {
        toast.success(`Synced ${result.rows_upserted} metric values from Google Sheet`);
      } else if (result.error) {
        toast.error(result.error);
      } else if (result.rows_upserted === 0) {
        toast.info("No new data to sync");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Sync failed");
    },
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
            <div className="flex items-center gap-2">
              {/* Selected Period Badge - SINGLE SOURCE OF TRUTH */}
              <Badge variant="secondary" className="text-xs">
                {pulseData.periodLabel}
              </Badge>
              {pulseData.hasGoogleSheet && (
                <Badge variant="outline" className="text-xs border-success text-success">
                  <FileSpreadsheet className="w-3 h-3 mr-1" />
                  Google Sheet
                </Badge>
              )}
              {pulseData.isAlignedMode && (
                <Badge variant="outline" className="text-xs border-brand text-brand">Aligned Template</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Empty state when no data */}
          {!pulseData.hasAnyData && (
            <div className="text-center py-4 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-warning" />
              <p>No monthly scorecard data yet.</p>
              <p className="text-sm">Import or sync your first month's data to get started.</p>
            </div>
          )}

          {pulseData.hasAnyData && (
            <>
              {/* Last Sync Info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {pulseData.lastSyncDate ? (
                  <span>
                    Last synced: {pulseData.lastSyncMonth ? format(new Date(pulseData.lastSyncMonth + '-01'), 'MMMM yyyy') : 'N/A'}
                    {' '}({formatDistanceToNow(pulseData.lastSyncDate, { addSuffix: true })})
                  </span>
                ) : (
                  <span className="text-warning">No data synced yet</span>
                )}
              </div>

              {/* Stats Grid - uses authoritative metricStatus counts */}
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

                <div className={`p-3 rounded-lg border ${pulseData.needsOwnerCount > 0 ? 'border-warning/30 bg-warning/5' : 'border-border'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-warning" />
                    <span className="text-xs text-muted-foreground">Need Owners</span>
                  </div>
                  <p className={`text-2xl font-bold ${pulseData.needsOwnerCount > 0 ? 'text-warning' : 'text-foreground'}`}>
                    {pulseData.needsOwnerCount}
                  </p>
                </div>
              </div>

              {/* Rocks at Risk - separate row */}
              {pulseData.atRiskRocksCount > 0 && (
                <div className="p-3 rounded-lg border border-warning/30 bg-warning/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mountain className="w-4 h-4 text-warning" />
                      <span className="text-sm text-muted-foreground">Rocks at Risk</span>
                    </div>
                    <p className="text-xl font-bold text-warning">{pulseData.atRiskRocksCount}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {pulseData.hasGoogleSheet ? (
              <Button 
                className="flex-1 gradient-brand" 
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
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
            ) : (
              <Button 
                className="flex-1 gradient-brand" 
                onClick={() => navigate('/imports/monthly-report')}
              >
                <Upload className="w-4 h-4 mr-2" />
                Sync Monthly KPIs
              </Button>
            )}
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate('/scorecard/off-track')}
            >
              <Eye className="w-4 h-4 mr-2" />
              Review Off Track
            </Button>
          </div>

          {/* Template health link */}
          {pulseData.isAlignedMode && (
            <div className="pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/scorecard/template')}
              >
                <Settings2 className="w-3 h-3 mr-1" />
                View Template Health
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
