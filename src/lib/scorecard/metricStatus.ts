import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth } from "date-fns";

/**
 * Authoritative metric status type - SINGLE SOURCE OF TRUTH
 * Priority order: NEEDS_DATA → NEEDS_TARGET → NEEDS_OWNER → ON_TRACK/OFF_TRACK
 */
export type MetricStatus = 'on_track' | 'off_track' | 'needs_target' | 'needs_data' | 'needs_owner';

/**
 * Normalized direction type for consistent evaluation
 */
export type NormalizedDirection = 'higher_is_better' | 'lower_is_better' | 'exact' | null;

/**
 * Authoritative metric status result - the exact contract for all status displays
 */
export interface MetricStatusResult {
  status: MetricStatus;
  label: string;
  value: number | null;
  target: number | null;
  delta: number | null;
  direction: NormalizedDirection;
  period_key: string | null;
  reasons: string[];
  // Legacy fields for backward compatibility
  currentValue?: number | null;
  deltaPercent?: number | null;
  period?: string | null;
  periodLabel?: string | null;
  periodKey?: string | null;
}

/**
 * Status label map - human-readable labels
 */
export const STATUS_LABELS: Record<MetricStatus, string> = {
  'needs_data': 'Needs Data',
  'needs_target': 'Needs Target',
  'needs_owner': 'Needs Owner',
  'off_track': 'Off Track',
  'on_track': 'On Track',
};

/**
 * Normalize direction from various formats to canonical form
 * Handles: 'up'/'down'/'exact' (legacy) and 'higher_is_better'/'lower_is_better'/'exact' (new)
 */
export function normalizeDirection(direction: string | null | undefined): NormalizedDirection {
  if (!direction) return null;
  
  const normalized = direction.toLowerCase().trim();
  
  switch (normalized) {
    case 'up':
    case 'higher_is_better':
    case 'higher':
      return 'higher_is_better';
    case 'down':
    case 'lower_is_better':
    case 'lower':
      return 'lower_is_better';
    case 'exact':
    case 'equal':
      return 'exact';
    default:
      // Unknown direction treated as null
      return null;
  }
}

/**
 * AUTHORITATIVE metricStatus function - SINGLE SOURCE OF TRUTH
 * 
 * Calculate metric status for monthly cadence using strict priority order:
 * 1. NEEDS_DATA - no result row or value is null
 * 2. NEEDS_TARGET - target missing OR direction is null
 * 3. NEEDS_OWNER - owner missing
 * 4. ON_TRACK / OFF_TRACK - based on direction comparison
 * 
 * @param metric - The metric definition (must include target, direction, owner)
 * @param resultForSelectedMonth - The metric_result row for the selected month (may be null/undefined)
 * @param periodKey - The selected period key (YYYY-MM)
 */
export function metricStatus(
  metric: {
    target?: number | null;
    direction?: string | null;
    owner?: string | null;
  },
  resultForSelectedMonth: {
    value?: number | null;
  } | null | undefined,
  periodKey: string | null
): MetricStatusResult {
  const value = resultForSelectedMonth?.value ?? null;
  const target = metric.target ?? null;
  const rawDirection = metric.direction;
  const owner = metric.owner;
  const normalizedDirection = normalizeDirection(rawDirection);
  
  const reasons: string[] = [];
  
  // Build base result
  const baseResult = {
    value,
    target,
    direction: normalizedDirection,
    period_key: periodKey,
    // Legacy compatibility
    currentValue: value,
    period: periodKey ? `${periodKey}-01` : null,
    periodLabel: periodKey ? format(new Date(periodKey + '-01'), 'MMMM yyyy') : null,
    periodKey,
  };
  
  // PRIORITY 1: NEEDS_DATA
  // No result row exists OR value is null
  if (value === null || value === undefined) {
    reasons.push('No value for this month.');
    return {
      ...baseResult,
      status: 'needs_data',
      label: STATUS_LABELS['needs_data'],
      delta: null,
      deltaPercent: null,
      reasons,
    };
  }
  
  // PRIORITY 2: NEEDS_TARGET
  // Target is null OR direction is null (need both to evaluate)
  if (target === null || target === undefined || normalizedDirection === null) {
    if (target === null || target === undefined) {
      reasons.push('Target not set.');
    }
    if (normalizedDirection === null) {
      reasons.push('Direction not set.');
    }
    return {
      ...baseResult,
      status: 'needs_target',
      label: STATUS_LABELS['needs_target'],
      delta: null,
      deltaPercent: null,
      reasons,
    };
  }
  
  // PRIORITY 3: NEEDS_OWNER
  // Owner is null or empty
  if (owner === null || owner === undefined || owner === '') {
    reasons.push('No owner assigned.');
    const delta = value - target;
    return {
      ...baseResult,
      status: 'needs_owner',
      label: STATUS_LABELS['needs_owner'],
      delta,
      deltaPercent: target !== 0 ? ((value - target) / target) * 100 : 0,
      reasons,
    };
  }
  
  // PRIORITY 4: Evaluate ON_TRACK vs OFF_TRACK using direction
  let isOnTrack = false;
  
  switch (normalizedDirection) {
    case 'higher_is_better':
      isOnTrack = value >= target;
      if (!isOnTrack) reasons.push('Value is below target.');
      break;
    case 'lower_is_better':
      isOnTrack = value <= target;
      if (!isOnTrack) reasons.push('Value is above target.');
      break;
    case 'exact':
      isOnTrack = value === target;
      if (!isOnTrack) reasons.push('Value does not match target exactly.');
      break;
  }
  
  const delta = value - target;
  const deltaPercent = target !== 0 ? ((value - target) / target) * 100 : 0;
  
  if (isOnTrack) {
    reasons.push('Metric is on track.');
  }
  
  return {
    ...baseResult,
    status: isOnTrack ? 'on_track' : 'off_track',
    label: isOnTrack ? STATUS_LABELS['on_track'] : STATUS_LABELS['off_track'],
    delta,
    deltaPercent,
    reasons,
  };
}

/**
 * @deprecated Use metricStatus() instead - this is kept for backward compatibility
 */
export function calculateMetricStatus(
  value: number | null,
  target: number | null,
  direction: 'up' | 'down' | 'exact' | string | null,
  period: string | null,
  owner?: string | null
): MetricStatusResult {
  const periodKey = period ? format(new Date(period), 'yyyy-MM') : null;
  return metricStatus(
    { target, direction, owner },
    { value },
    periodKey
  );
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

  // Calculate status for each metric using the authoritative metricStatus function
  for (const metric of metrics) {
    const latestResult = resultsByMetric[metric.id];
    const status = metricStatus(
      metric,
      latestResult ?? null,
      latestResult?.period_key ?? periodKey ?? null
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
