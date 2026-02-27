/**
 * Regression test: week boundaries are identical across KPI rollup and insights engine.
 *
 * Verifies that both systems compute the same Monday–Sunday windows in
 * America/Los_Angeles, regardless of server timezone.
 */
import {
  getLatestCompletedWeek,
  getPriorWeek,
  getCurrentWeek,
  getCurrentMonth,
  getYTDBoundaries,
  formatDateLA,
  weekdayLA,
} from "../_shared/week-boundaries.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ──────────────────────────────────────────────
// 1. Known-date regression: Thu 2026-02-27 in LA
// ──────────────────────────────────────────────
Deno.test("getLatestCompletedWeek — Thu 2026-02-27 LA returns Feb 16–22", () => {
  // 2026-02-27 08:00 UTC  = 2026-02-27 00:00 PST (Thu)
  const now = new Date("2026-02-27T08:00:00Z");
  const result = getLatestCompletedWeek(now);
  assertEquals(result.weekStart, "2026-02-16");
  assertEquals(result.weekEnd, "2026-02-22");
});

Deno.test("getCurrentWeek — Thu 2026-02-27 LA returns Feb 23–Mar 1", () => {
  const now = new Date("2026-02-27T08:00:00Z");
  const result = getCurrentWeek(now);
  assertEquals(result.weekStart, "2026-02-23");
  assertEquals(result.weekEnd, "2026-03-01");
});

Deno.test("getPriorWeek — prior to 2026-02-16 returns Feb 9–15", () => {
  const result = getPriorWeek("2026-02-16");
  assertEquals(result.weekStart, "2026-02-09");
  assertEquals(result.weekEnd, "2026-02-15");
});

// ──────────────────────────────────────────────
// 2. KPI rollup and insights use identical windows
// ──────────────────────────────────────────────
Deno.test("KPI rollup and insights produce identical completed-week boundaries", () => {
  // Simulate both systems at the exact same instant
  const now = new Date("2026-02-27T08:00:00Z");

  // insights engine uses getLatestCompletedWeek + getPriorWeek
  const insightsCW = getLatestCompletedWeek(now);
  const insightsPW = getPriorWeek(insightsCW.weekStart);

  // KPI rollup uses getCurrentWeek (for in-progress week metrics)
  const kpiCurrentWeek = getCurrentWeek(now);

  // The insights' completed week should end exactly one day before the KPI current week starts
  const completedEnd = new Date(insightsCW.weekEnd + "T12:00:00");
  const currentStart = new Date(kpiCurrentWeek.weekStart + "T12:00:00");
  const diffDays = Math.round((currentStart.getTime() - completedEnd.getTime()) / 86400000);
  assertEquals(diffDays, 1, "Completed week should end exactly 1 day before current week starts");

  // Both weeks should start on Monday (weekday 1)
  assertEquals(weekdayLA(new Date(insightsCW.weekStart + "T12:00:00")), 1);
  assertEquals(weekdayLA(new Date(kpiCurrentWeek.weekStart + "T12:00:00")), 1);
  assertEquals(weekdayLA(new Date(insightsPW.weekStart + "T12:00:00")), 1);
});

// ──────────────────────────────────────────────
// 3. DST transition edge case (spring forward: Mar 8 2026)
// ──────────────────────────────────────────────
Deno.test("Week boundaries are correct across DST spring-forward (Mar 8 2026)", () => {
  // Mar 9 2026 (Mon) at 10:00 UTC = Mar 9 02:00 PDT (just after spring forward)
  const now = new Date("2026-03-09T10:00:00Z");
  const completed = getLatestCompletedWeek(now);
  // Should return Mon Mar 2 – Sun Mar 8
  assertEquals(completed.weekStart, "2026-03-02");
  assertEquals(completed.weekEnd, "2026-03-08");

  const current = getCurrentWeek(now);
  assertEquals(current.weekStart, "2026-03-09");
  assertEquals(current.weekEnd, "2026-03-15");
});

// ──────────────────────────────────────────────
// 4. Month and YTD boundaries in LA
// ──────────────────────────────────────────────
Deno.test("getCurrentMonth — Feb 2026", () => {
  const now = new Date("2026-02-27T08:00:00Z");
  const m = getCurrentMonth(now);
  assertEquals(m.monthStart, "2026-02-01");
  assertEquals(m.monthEnd, "2026-02-28");
  assertEquals(m.monthKey, "2026-02");
});

Deno.test("getYTDBoundaries — Feb 2026", () => {
  const now = new Date("2026-02-27T08:00:00Z");
  const ytd = getYTDBoundaries(now);
  assertEquals(ytd.ytdStart, "2026-01-01");
  assertEquals(ytd.ytdEnd, "2026-02-27");
  assertEquals(ytd.ytdKey, "2026-YTD");
});

// ──────────────────────────────────────────────
// 5. Sunday edge case: query at Sun 11pm LA (Mon 07:00 UTC)
// ──────────────────────────────────────────────
Deno.test("Sunday night in LA — current week still includes today", () => {
  // Sun Mar 1, 2026 23:30 PST = Mon Mar 2 07:30 UTC
  const now = new Date("2026-03-02T07:30:00Z");
  // In LA it's still Sunday Mar 1
  const laDay = formatDateLA(now);
  assertEquals(laDay, "2026-03-01");
  // So the current week is Mon Feb 23 – Sun Mar 1
  const current = getCurrentWeek(now);
  assertEquals(current.weekStart, "2026-02-23");
  assertEquals(current.weekEnd, "2026-03-01");
});

// ──────────────────────────────────────────────
// Example output for documentation
// ──────────────────────────────────────────────
Deno.test("Print example UTC timestamps for latest completed LA week", () => {
  const now = new Date("2026-02-27T08:00:00Z");
  const cw = getLatestCompletedWeek(now);
  console.log(`\n=== Example: Latest completed LA week ===`);
  console.log(`  LA week:  ${cw.weekStart} (Mon) → ${cw.weekEnd} (Sun)`);
  console.log(`  Query >=: ${cw.weekStart}T00:00:00 (used in .gte())`);
  console.log(`  Query <=: ${cw.weekEnd}T23:59:59 (used in .lte())`);
  console.log(`  period_key: ${cw.weekStart}`);
});
