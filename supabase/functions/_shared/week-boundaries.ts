/**
 * Shared week boundary helpers for Deno edge functions.
 *
 * SINGLE SOURCE OF TRUTH for all backend period calculations.
 * Frontend mirror: src/lib/weekBoundaries.ts
 *
 * All weeks are Monday 00:00 → Sunday 23:59:59 in America/Los_Angeles.
 * "Completed" means the following Monday 00:00 LA has already passed.
 */

const TZ = "America/Los_Angeles";

/** Returns YYYY-MM-DD for a Date in America/Los_Angeles */
export function formatDateLA(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const da = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${da}`;
}

/** Returns the weekday (0=Sun..6=Sat) in LA timezone */
export function weekdayLA(d: Date): number {
  const dayStr = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(d);
  return ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[dayStr] ?? 0;
}

export interface WeekBoundary {
  weekStart: string; // YYYY-MM-DD (Monday in LA)
  weekEnd: string;   // YYYY-MM-DD (Sunday in LA)
}

/**
 * Returns the most recent COMPLETED Monday–Sunday week in LA time.
 *
 * "Completed" = the week's Sunday has fully elapsed, i.e. next Monday 00:00 LA
 * has already passed. This guarantees we never show partial/in-progress data.
 */
export function getLatestCompletedWeek(now: Date = new Date()): WeekBoundary {
  const wd = weekdayLA(now);
  const daysSinceMonday = wd === 0 ? 6 : wd - 1;
  const thisMonday = new Date(now.getTime() - daysSinceMonday * 86400000);
  const prevMonday = new Date(thisMonday.getTime() - 7 * 86400000);
  const prevSunday = new Date(prevMonday.getTime() + 6 * 86400000);
  return { weekStart: formatDateLA(prevMonday), weekEnd: formatDateLA(prevSunday) };
}

/**
 * Returns the week immediately before a given weekStart.
 */
export function getPriorWeek(weekStart: string): WeekBoundary {
  const d = new Date(weekStart + "T12:00:00"); // noon to avoid DST edge
  const prev = new Date(d.getTime() - 7 * 86400000);
  const prevEnd = new Date(prev.getTime() + 6 * 86400000);
  return { weekStart: formatDateLA(prev), weekEnd: formatDateLA(prevEnd) };
}

/**
 * Returns the current in-progress week (Mon–Sun) in LA time.
 * Used by jane-kpi-rollup for "this week" metrics.
 */
export function getCurrentWeek(now: Date = new Date()): WeekBoundary {
  const wd = weekdayLA(now);
  const daysSinceMonday = wd === 0 ? 6 : wd - 1;
  const monday = new Date(now.getTime() - daysSinceMonday * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  return { weekStart: formatDateLA(monday), weekEnd: formatDateLA(sunday) };
}

/**
 * Returns the current month boundaries as YYYY-MM-DD strings in LA time.
 */
export function getCurrentMonth(now: Date = new Date()): { monthStart: string; monthEnd: string; monthKey: string } {
  const laDate = formatDateLA(now);
  const [y, m] = laDate.split("-");
  const lastDay = new Date(Number(y), Number(m), 0).getDate();
  return {
    monthStart: `${y}-${m}-01`,
    monthEnd: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
    monthKey: `${y}-${m}`,
  };
}

/**
 * Returns the YTD boundaries as YYYY-MM-DD strings in LA time.
 */
export function getYTDBoundaries(now: Date = new Date()): { ytdStart: string; ytdEnd: string; ytdKey: string } {
  const laDate = formatDateLA(now);
  const y = laDate.split("-")[0];
  return {
    ytdStart: `${y}-01-01`,
    ytdEnd: laDate,
    ytdKey: `${y}-YTD`,
  };
}
