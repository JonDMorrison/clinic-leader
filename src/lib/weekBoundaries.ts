/**
 * Deterministic week boundary helpers for America/Los_Angeles.
 *
 * Weeks are Monday 00:00 → Sunday 23:59:59 (LA time).
 * "Completed" means the following Monday 00:00 LA has already passed.
 *
 * This module is the SINGLE SOURCE OF TRUTH used by:
 *   - generate-clinic-insights edge function (mirrored in Deno)
 *   - ClinicPulse dashboard component
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
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[dayStr] ?? 0;
}

export interface WeekBoundary {
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string;   // YYYY-MM-DD (Sunday)
}

/**
 * Returns the most recent COMPLETED Monday–Sunday week in LA time.
 *
 * "Completed" = the week's Sunday has fully elapsed, i.e. next Monday 00:00 LA
 * has already passed. This guarantees we never show partial/in-progress data.
 *
 * Example (today = Thursday 2026-02-27 in LA):
 *   This week started Mon 2026-02-23 → NOT completed yet (Sun 03-01 hasn't passed)
 *   Last completed week: Mon 2026-02-16 → Sun 2026-02-22 ✓
 */
export function getLatestCompletedWeek(now: Date = new Date()): WeekBoundary {
  const wd = weekdayLA(now); // 0=Sun..6=Sat
  // Days since last Monday: Mon=0, Tue=1, ..., Sun=6
  const daysSinceMonday = wd === 0 ? 6 : wd - 1;
  // This week's Monday (in-progress, never returned)
  const thisMonday = new Date(now.getTime() - daysSinceMonday * 86400000);
  // Last completed week
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
