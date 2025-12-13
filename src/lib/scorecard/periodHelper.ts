import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, startOfQuarter, getQuarter, getYear } from "date-fns";

export interface PeriodInfo {
  selectedPeriodKey: string; // YYYY-MM
  periodStart: Date; // first day of month
  quarterKey: string; // Q1-2024
  periodLabel: string; // "January 2024"
  hasData: boolean;
}

/**
 * Get the current/selected period info for monthly metrics
 * Default: latest period_key that exists in metric_results for the org
 * If none exist: use current month with hasData = false
 */
export async function getLatestPeriodForOrg(organizationId: string): Promise<PeriodInfo> {
  const { data: latestResult } = await supabase
    .from('metric_results')
    .select('period_key, period_start')
    .eq('period_type', 'monthly')
    .order('period_start', { ascending: false })
    .limit(1);
  
  // Need to filter by org through metrics table join
  const { data: metricsWithResults } = await supabase
    .from('metrics')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .limit(1);

  if (!metricsWithResults?.length) {
    // No active metrics, use current month
    return buildPeriodInfo(format(new Date(), 'yyyy-MM'), false);
  }

  const { data: orgLatest } = await supabase
    .from('metric_results')
    .select('period_key, period_start, metric_id')
    .in('metric_id', metricsWithResults.map(m => m.id))
    .eq('period_type', 'monthly')
    .order('period_start', { ascending: false })
    .limit(1);

  if (orgLatest && orgLatest.length > 0) {
    return buildPeriodInfo(orgLatest[0].period_key, true);
  }

  // No data yet, use current month
  return buildPeriodInfo(format(new Date(), 'yyyy-MM'), false);
}

/**
 * Build period info from a YYYY-MM period key
 */
export function buildPeriodInfo(periodKey: string, hasData: boolean): PeriodInfo {
  const [year, month] = periodKey.split('-').map(Number);
  const periodStart = new Date(year, month - 1, 1);
  const quarter = getQuarter(periodStart);
  const quarterYear = getYear(periodStart);
  
  return {
    selectedPeriodKey: periodKey,
    periodStart,
    quarterKey: `Q${quarter}-${quarterYear}`,
    periodLabel: format(periodStart, 'MMMM yyyy'),
    hasData,
  };
}

/**
 * Get list of available periods (last 12 months)
 */
export function getAvailablePeriods(): { key: string; label: string }[] {
  const periods: { key: string; label: string }[] = [];
  const now = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push({
      key: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    });
  }
  
  return periods;
}

/**
 * Convert period key to period_start date string (YYYY-MM-DD)
 */
export function periodKeyToStart(periodKey: string): string {
  return `${periodKey}-01`;
}

/**
 * Extract period key from period_start date
 */
export function periodStartToKey(periodStart: string | Date): string {
  const date = typeof periodStart === 'string' ? new Date(periodStart) : periodStart;
  return format(date, 'yyyy-MM');
}
