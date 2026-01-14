import { startOfWeek, format, subWeeks, subMonths } from "date-fns";

export type PeriodType = "weekly" | "monthly" | "ytd";

/**
 * Canonical period key generation - used across /data, People Analyzer, and seat accountability
 * This MUST match the logic in jane-kpi-rollup edge function
 */
export function getCurrentPeriodKey(periodType: PeriodType): string {
  const now = new Date();
  
  if (periodType === "weekly") {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    return weekStart.toISOString().slice(0, 10); // "2026-01-13"
  } else if (periodType === "monthly") {
    return format(now, "yyyy-MM"); // "2026-01"
  } else {
    return `${now.getFullYear()}-YTD`; // "2026-YTD"
  }
}

/**
 * Get the previous period key for trend calculations
 */
export function getPreviousPeriodKey(periodType: PeriodType): string {
  const now = new Date();
  
  if (periodType === "weekly") {
    const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    return prevWeekStart.toISOString().slice(0, 10);
  } else if (periodType === "monthly") {
    return format(subMonths(now, 1), "yyyy-MM");
  } else {
    // For YTD, previous is last year's YTD
    return `${now.getFullYear() - 1}-YTD`;
  }
}

/**
 * Get both current and previous period keys for a given period type
 */
export function getPeriodKeys(periodType: PeriodType): { current: string; previous: string } {
  return {
    current: getCurrentPeriodKey(periodType),
    previous: getPreviousPeriodKey(periodType),
  };
}

/**
 * Get the week start date formatted as yyyy-MM-dd (convenience function)
 */
export function getCurrentWeekStart(): string {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  return format(weekStart, "yyyy-MM-dd");
}

/**
 * Get the previous week start date formatted as yyyy-MM-dd
 */
export function getPreviousWeekStart(): string {
  const now = new Date();
  const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  return format(prevWeekStart, "yyyy-MM-dd");
}
