import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth } from "date-fns";

export type MetricStatus = 'on_track' | 'off_track' | 'needs_target' | 'needs_data' | 'needs_owner';

export interface MetricStatusResult {
  status: MetricStatus;
  label: string;
  currentValue: number | null;
  target: number | null;
  delta: number | null;
  deltaPercent: number | null;
  direction: string | null;
  period: string | null;
  periodLabel: string | null;
  periodKey: string | null;
}

/**
 * Status label map
 */
const STATUS_LABELS: Record<MetricStatus, string> = {
  'needs_data': 'Needs Data',
  'needs_target': 'Needs Target',
  'needs_owner': 'Needs Owner',
  'off_track': 'Off Track',
  'on_track': 'On Track',
};

/**
 * Calculate metric status for monthly cadence using strict priority order:
 * 1. NEEDS_DATA - no result row or value is null
 * 2. NEEDS_TARGET - target missing
 * 3. NEEDS_OWNER - owner missing (optional, pass null to skip)
 * 4. ON_TRACK / OFF_TRACK - based on direction comparison
 */
export function calculateMetricStatus(
  value: number | null,
  target: number | null,
  direction: 'up' | 'down' | 'exact' | string | null,
  period: string | null,
  owner?: string | null
): MetricStatusResult {
  const periodLabel = period ? format(new Date(period), 'MMMM yyyy') : null;
  const periodKey = period ? format(new Date(period), 'yyyy-MM') : null;
  
  const baseResult = {
    currentValue: value,
    target,
    direction,
    period,
    periodLabel,
    periodKey,
  };

  // Priority 1: No data for selected period
  if (value === null || value === undefined) {
    return {
      ...baseResult,
      status: 'needs_data',
      label: STATUS_LABELS['needs_data'],
      delta: null,
      deltaPercent: null,
    };
  }

  // Priority 2: No target set
  if (target === null || target === undefined) {
    return {
      ...baseResult,
      status: 'needs_target',
      label: STATUS_LABELS['needs_target'],
      delta: null,
      deltaPercent: null,
    };
  }

  // Priority 3: No owner (only check if owner param explicitly provided as empty)
  if (owner !== undefined && (owner === null || owner === '')) {
    return {
      ...baseResult,
      status: 'needs_owner',
      label: STATUS_LABELS['needs_owner'],
      delta: value - target,
      deltaPercent: target !== 0 ? ((value - target) / target) * 100 : 0,
    };
  }

  // Priority 4: Direction evaluation (treat null direction as needs_target)
  if (!direction) {
    return {
      ...baseResult,
      status: 'needs_target',
      label: STATUS_LABELS['needs_target'],
      delta: null,
      deltaPercent: null,
    };
  }

  // Evaluate ON_TRACK vs OFF_TRACK
  let isOnTrack = false;
  
  switch (direction) {
    case 'up':
    case 'higher_is_better':
      isOnTrack = value >= target;
      break;
    case 'down':
    case 'lower_is_better':
      isOnTrack = value <= target;
      break;
    case 'exact':
      isOnTrack = value === target;
      break;
    default:
      // Default to higher_is_better
      isOnTrack = value >= target;
  }

  const delta = value - target;
  const deltaPercent = target !== 0 ? ((value - target) / target) * 100 : 0;

  return {
    ...baseResult,
    status: isOnTrack ? 'on_track' : 'off_track',
    label: isOnTrack ? STATUS_LABELS['on_track'] : STATUS_LABELS['off_track'],
    delta,
    deltaPercent,
  };
}

/**
 * Fetch metric status for multiple metrics for a specific period
 * Returns most recent monthly result for each metric
 */
export async function fetchMetricsWithStatus(
  organizationId: string,
  metricIds?: string[],
  periodKey?: string
): Promise<Map<string, MetricStatusResult>> {
  const statusMap = new Map<string, MetricStatusResult>();

  // Get metrics
  let metricsQuery = supabase
    .from('metrics')
    .select('id, name, target, direction, unit, cadence, is_active, owner')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (metricIds?.length) {
    metricsQuery = metricsQuery.in('id', metricIds);
  }

  const { data: metrics } = await metricsQuery;
  if (!metrics?.length) return statusMap;

  // Determine periods to fetch
  let periods: string[];
  if (periodKey) {
    periods = [`${periodKey}-01`];
  } else {
    // Get last 3 months
    periods = Array.from({ length: 3 }, (_, i) => 
      format(startOfMonth(subMonths(new Date(), i)), 'yyyy-MM-dd')
    );
  }

  const { data: results } = await supabase
    .from('metric_results')
    .select('metric_id, value, period_start, period_key')
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
      latestResult?.period_start ?? null,
      metric.owner
    );
    statusMap.set(metric.id, status);
  }

  return statusMap;
}

/**
 * Format value with unit
 */
export function formatMetricValue(value: number | null, unit: string): string {
  if (value === null || value === undefined) return '-';
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
    case 'needs_owner':
      return { label: 'Needs Owner', variant: 'outline', colorClass: 'text-warning' };
    case 'on_track':
    default:
      return { label: 'On Track', variant: 'default', colorClass: 'text-success' };
  }
}
