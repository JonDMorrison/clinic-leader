/**
 * Data Quality Gating Tests
 * 
 * Tests quality threshold calculations and gating logic
 */

import { describe, it, expect } from "vitest";
import {
  calculateCompletenessScore,
  calculateLatencyScore,
  calculateConsistencyScore,
  computeOverallQualityScore,
} from "@/lib/analytics/emrDataQualityScore";

describe("Data Quality Scoring", () => {
  describe("calculateCompletenessScore", () => {
    it("returns 100 when all fields present and no critical missing", () => {
      const score = calculateCompletenessScore(10, 10, 0);
      expect(score).toBe(100);
    });

    it("returns correct score for partial field presence", () => {
      // 8/10 fields = 80%
      const score = calculateCompletenessScore(10, 8, 0);
      expect(score).toBe(80);
    });

    it("applies penalty for critical missing fields", () => {
      // 10/10 fields but 1 critical missing = 100 - 15 = 85
      const score = calculateCompletenessScore(10, 10, 1);
      expect(score).toBe(85);
    });

    it("applies heavy penalty for multiple critical missing fields", () => {
      // 2 critical missing = 100 - 30 = 70
      const score = calculateCompletenessScore(10, 10, 2);
      expect(score).toBe(70);
    });

    it("clamps score to minimum 0", () => {
      // 5 critical missing = 100 - 75 = 25, but with only 5/10 fields = 50 - 75 < 0
      const score = calculateCompletenessScore(10, 5, 5);
      expect(score).toBe(0);
    });

    it("handles zero expected fields", () => {
      const score = calculateCompletenessScore(0, 0, 0);
      expect(score).toBe(100);
    });
  });

  describe("calculateLatencyScore", () => {
    it("returns 100 for zero delay", () => {
      const score = calculateLatencyScore(0);
      expect(score).toBe(100);
    });

    it("returns 100 for delay within expected threshold", () => {
      const score = calculateLatencyScore(20, 24);
      expect(score).toBe(100);
    });

    it("returns 100 for delay exactly at threshold", () => {
      const score = calculateLatencyScore(24, 24);
      expect(score).toBe(100);
    });

    it("applies linear penalty beyond threshold", () => {
      // 48 hours = 24 over threshold, penalty = 24 * 2 = 48
      const score = calculateLatencyScore(48, 24);
      expect(score).toBe(52);
    });

    it("clamps to minimum 0", () => {
      // 100 hours = 76 over threshold, penalty = 76 * 2 = 152 > 100
      const score = calculateLatencyScore(100, 24);
      expect(score).toBe(0);
    });
  });

  describe("calculateConsistencyScore", () => {
    it("returns 100 for full coverage with no gaps", () => {
      const score = calculateConsistencyScore(12, 12, 0);
      expect(score).toBe(100);
    });

    it("returns correct score for partial coverage", () => {
      // 10/12 periods = 83.33%
      const score = calculateConsistencyScore(10, 12, 0);
      expect(score).toBeCloseTo(83.33, 1);
    });

    it("applies gap penalty", () => {
      // Full coverage but 2 gaps = 100 - 20 = 80
      const score = calculateConsistencyScore(12, 12, 2);
      expect(score).toBe(80);
    });

    it("combines coverage and gap penalties", () => {
      // 10/12 = 83.33, minus 10 for 1 gap = 73.33
      const score = calculateConsistencyScore(10, 12, 1);
      expect(score).toBeCloseTo(73.33, 1);
    });

    it("handles zero expected periods", () => {
      const score = calculateConsistencyScore(0, 0, 0);
      expect(score).toBe(100);
    });
  });

  describe("computeOverallQualityScore", () => {
    it("computes weighted average correctly", () => {
      // 100 * 0.4 + 80 * 0.3 + 60 * 0.3 = 40 + 24 + 18 = 82
      const score = computeOverallQualityScore(100, 80, 60);
      expect(score).toBe(82);
    });

    it("returns 100 for all perfect scores", () => {
      const score = computeOverallQualityScore(100, 100, 100);
      expect(score).toBe(100);
    });

    it("returns 0 for all zero scores", () => {
      const score = computeOverallQualityScore(0, 0, 0);
      expect(score).toBe(0);
    });

    it("allows custom weights", () => {
      // Equal weights: (100 + 80 + 60) / 3 = 80
      const score = computeOverallQualityScore(100, 80, 60, {
        completeness: 1/3,
        latency: 1/3,
        consistency: 1/3,
      });
      expect(score).toBe(80);
    });
  });

  describe("Determinism", () => {
    it("same inputs produce identical completeness scores", () => {
      const results = Array.from({ length: 10 }, () =>
        calculateCompletenessScore(10, 8, 1)
      );
      expect(new Set(results).size).toBe(1);
    });

    it("same inputs produce identical latency scores", () => {
      const results = Array.from({ length: 10 }, () =>
        calculateLatencyScore(36, 24)
      );
      expect(new Set(results).size).toBe(1);
    });

    it("same inputs produce identical overall scores", () => {
      const results = Array.from({ length: 10 }, () =>
        computeOverallQualityScore(85, 90, 75)
      );
      expect(new Set(results).size).toBe(1);
    });
  });
});
