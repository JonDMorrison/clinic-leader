import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth } from "date-fns";

export type MetricStatus = 'on_track' | 'off_track' | 'needs_target' | 'needs_data';

export interface MetricStatusResult {
  status: MetricStatus;
  currentValue: number | null;
  target: number | null;
  delta: number | null;
  deltaPercent: number | null;
  period: string | null;
  periodLabel: string | null;
}

/**
 * Calculate metric status based on most recent monthly data
 * Shared helper used by Scorecard, OffTrack, MonthlyPulse, RealityGap
 */
export function calculateMetricStatus(
  value: number | null,
  target: number | null,
  direction: 'up' | 'down' | string,
  period: string | null
): MetricStatusResult {
  const periodLabel = period ? format(new Date(period), 'MMMM yyyy') : null;
  
  // No data for latest month
  if (value === null) {
    return {
      status: 'needs_data',
      currentValue: null,
      target,
      delta: null,
      deltaPercent: null,
      period,
      periodLabel,
    };
  }

  // Has data but no target
  if (target === null) {
    return {
      status: 'needs_target',
      currentValue: value,
      target: null,
      delta: null,
      deltaPercent: null,
      period,
      periodLabel,
    };
  }

  // Compare value to target using direction
  const isOnTrack = direction === 'up' 
    ? value >= target
    : value <= target;

  const delta = value - target;
  const deltaPercent = target !== 0 ? ((value - target) / target) * 100 : 0;

  return {
    status: isOnTrack ? 'on_track' : 'off_track',
    currentValue: value,
    target,
    delta,
    deltaPercent,
    period,
    periodLabel,
  };
}

/**
 * Fetch metric status for multiple metrics
 * Returns most recent monthly result for each metric
 */
export async function fetchMetricsWithStatus(
  organizationId: string,
  metricIds?: string[]
): Promise<Map<string, MetricStatusResult>> {
  const statusMap = new Map<string, MetricStatusResult>();

  // Get metrics
  let metricsQuery = supabase
    .from('metrics')
    .select('id, name, target, direction, unit, cadence, is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (metricIds?.length) {
    metricsQuery = metricsQuery.in('id', metricIds);
  }

  const { data: metrics } = await metricsQuery;
  if (!metrics?.length) return statusMap;

  // Get last 3 months of results
  const periods = Array.from({ length: 3 }, (_, i) => 
    format(startOfMonth(subMonths(new Date(), i)), 'yyyy-MM-dd')
  );

  const { data: results } = await supabase
    .from('metric_results')
    .select('metric_id, value, period_start')
    .in('metric_id', metrics.map(m => m.id))
    .eq('period_type', 'monthly')
    .in('period_start', periods)
    .order('period_start', { ascending: false });

  // Group results by metric, take most recent
  const resultsByMetric = results?.reduce((acc, r) => {
    if (!acc[r.metric_id]) acc[r.metric_id] = r;
    return acc;
  }, {} as Record<string, any>) || {};

  // Calculate status for each metric
  for (const metric of metrics) {
    const latestResult = resultsByMetric[metric.id];
    const status = calculateMetricStatus(
      latestResult?.value ?? null,
      metric.target,
      metric.direction,
      latestResult?.period_start ?? null
    );
    statusMap.set(metric.id, status);
  }

  return statusMap;
}

/**
 * Format value with unit
 */
export function formatMetricValue(value: number | null, unit: string): string {
  if (value === null) return '-';
  if (unit === '$') return `$${value.toLocaleString()}`;
  if (unit === '%') return `${value}%`;
  return value.toLocaleString();
}

/**
 * Get status display configuration
 */
export function getStatusDisplay(status: MetricStatus): {
  label: string;
  variant: 'destructive' | 'outline' | 'muted' | 'default';
  colorClass: string;
} {
  switch (status) {
    case 'off_track':
      return { label: 'Off Track', variant: 'destructive', colorClass: 'text-destructive' };
    case 'needs_target':
      return { label: 'Needs Target', variant: 'outline', colorClass: 'text-warning' };
    case 'needs_data':
      return { label: 'Needs Data', variant: 'muted', colorClass: 'text-muted-foreground' };
    case 'on_track':
    default:
      return { label: 'On Track', variant: 'default', colorClass: 'text-success' };
  }
}
