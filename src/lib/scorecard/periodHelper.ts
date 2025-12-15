import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, subMonths, getQuarter, getYear } from "date-fns";

export interface PeriodInfo {
  selectedPeriodKey: string; // YYYY-MM
  periodStart: Date; // first day of month
  quarterKey: string; // Q1-2024
  periodLabel: string; // "January 2024"
  hasData: boolean;
}

export interface MonthlyPeriodSelection {
  selectedPeriodKey: string; // YYYY-MM
  periodStartDate: Date; // first day of month
  periodLabel: string; // "January 2024"
  hasAnyData: boolean;
  availablePeriodKeys: string[]; // list of YYYY-MM with data
}

/**
 * Get the current/selected period info for monthly metrics
 * This is the SINGLE SOURCE OF TRUTH for period selection in monthly orgs
 * 
 * Rules:
 * A) If metric_results exist for the org (monthly): defaultSelectedPeriodKey = max(period_key)
 * B) If no results exist: defaultSelectedPeriodKey = current month, hasAnyData = false
 */
export async function getMonthlyPeriodSelection(
  organizationId: string,
  maxPeriods: number = 12
): Promise<MonthlyPeriodSelection> {
  // Get all unique period_keys for this org's monthly results
  const { data: metricsWithResults } = await supabase
    .from('metrics')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (!metricsWithResults?.length) {
    // No active metrics, return current month with no data
    const now = new Date();
    const currentPeriodKey = format(now, 'yyyy-MM');
    return {
      selectedPeriodKey: currentPeriodKey,
      periodStartDate: startOfMonth(now),
      periodLabel: format(now, 'MMMM yyyy'),
      hasAnyData: false,
      availablePeriodKeys: [],
    };
  }

  // Get all distinct period_keys from metric_results for this org
  const { data: periodResults } = await supabase
    .from('metric_results')
    .select('period_key, period_start')
    .in('metric_id', metricsWithResults.map(m => m.id))
    .eq('period_type', 'monthly')
    .order('period_start', { ascending: false });

  // Extract unique period_keys
  const uniquePeriodKeys = [...new Set(periodResults?.map(r => r.period_key) || [])];
  const limitedPeriodKeys = uniquePeriodKeys.slice(0, maxPeriods);

  if (limitedPeriodKeys.length === 0) {
    // No monthly results exist, use current month
    const now = new Date();
    const currentPeriodKey = format(now, 'yyyy-MM');
    return {
      selectedPeriodKey: currentPeriodKey,
      periodStartDate: startOfMonth(now),
      periodLabel: format(now, 'MMMM yyyy'),
      hasAnyData: false,
      availablePeriodKeys: [],
    };
  }

  // Use the latest period_key as default
  const selectedPeriodKey = limitedPeriodKeys[0];
  const [year, month] = selectedPeriodKey.split('-').map(Number);
  const periodStartDate = new Date(year, month - 1, 1);

  return {
    selectedPeriodKey,
    periodStartDate,
    periodLabel: format(periodStartDate, 'MMMM yyyy'),
    hasAnyData: true,
    availablePeriodKeys: limitedPeriodKeys,
  };
}

/**
 * Legacy function - Get the current/selected period info for monthly metrics
 * @deprecated Use getMonthlyPeriodSelection instead for new code
 */
export async function getLatestPeriodForOrg(organizationId: string): Promise<PeriodInfo> {
  const selection = await getMonthlyPeriodSelection(organizationId);
  return {
    selectedPeriodKey: selection.selectedPeriodKey,
    periodStart: selection.periodStartDate,
    quarterKey: buildQuarterKey(selection.periodStartDate),
    periodLabel: selection.periodLabel,
    hasData: selection.hasAnyData,
  };
}

/**
 * Build quarter key from date
 */
function buildQuarterKey(date: Date): string {
  const quarter = getQuarter(date);
  const year = getYear(date);
  return `Q${quarter}-${year}`;
}

/**
 * Build period info from a YYYY-MM period key
 */
export function buildPeriodInfo(periodKey: string, hasData: boolean): PeriodInfo {
  const [year, month] = periodKey.split('-').map(Number);
  const periodStart = new Date(year, month - 1, 1);
  
  return {
    selectedPeriodKey: periodKey,
    periodStart,
    quarterKey: buildQuarterKey(periodStart),
    periodLabel: format(periodStart, 'MMMM yyyy'),
    hasData,
  };
}

/**
 * Get list of available periods (last 12 months from current date)
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
