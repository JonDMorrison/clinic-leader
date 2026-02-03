/**
 * Recommendation Eligibility Tests
 * 
 * Tests determinism, cooldown, and target gating rules
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateDeviation,
  DEFAULT_ELIGIBILITY_THRESHOLDS,
  formatEligibilityReason,
  type EligibilityResult,
} from "@/lib/interventions/recommendationEligibility";

describe("Recommendation Eligibility", () => {
  describe("calculateDeviation", () => {
    it("returns null deviation when current value is null", () => {
      const result = calculateDeviation(null, 100, "up");
      expect(result.deviationPercent).toBeNull();
      expect(result.isOffTrack).toBe(false);
    });

    it("returns null deviation when target is null", () => {
      const result = calculateDeviation(80, null, "up");
      expect(result.deviationPercent).toBeNull();
      expect(result.isOffTrack).toBe(false);
    });

    it("returns null deviation when target is zero", () => {
      const result = calculateDeviation(80, 0, "up");
      expect(result.deviationPercent).toBeNull();
      expect(result.isOffTrack).toBe(false);
    });

    it("calculates positive deviation correctly for up metrics", () => {
      // Current 110, target 100 = +10% (on track for up metrics)
      const result = calculateDeviation(110, 100, "up");
      expect(result.deviationPercent).toBe(10);
      expect(result.isOffTrack).toBe(false);
    });

    it("calculates negative deviation correctly for up metrics", () => {
      // Current 80, target 100 = -20% (off track for up metrics)
      const result = calculateDeviation(80, 100, "up");
      expect(result.deviationPercent).toBe(-20);
      expect(result.isOffTrack).toBe(true);
    });

    it("identifies off-track for down metrics correctly", () => {
      // For down metrics (lower is better), being above target is bad
      // Current 120, target 100 = +20% (off track for down metrics)
      const result = calculateDeviation(120, 100, "down");
      expect(result.deviationPercent).toBe(20);
      expect(result.isOffTrack).toBe(true);
    });

    it("identifies on-track for down metrics correctly", () => {
      // Current 80, target 100 = -20% (on track for down metrics, lower is better)
      const result = calculateDeviation(80, 100, "down");
      expect(result.deviationPercent).toBe(-20);
      expect(result.isOffTrack).toBe(false);
    });

    it("handles boundary conditions at threshold", () => {
      // Exactly at -10% threshold for up metrics
      const result = calculateDeviation(90, 100, "up");
      expect(result.deviationPercent).toBe(-10);
      // At exactly -10%, should be off track (<=)
      expect(result.isOffTrack).toBe(true);
    });
  });

  describe("DEFAULT_ELIGIBILITY_THRESHOLDS", () => {
    it("has correct default values", () => {
      expect(DEFAULT_ELIGIBILITY_THRESHOLDS.MIN_DEVIATION_PERCENT).toBe(-10);
      expect(DEFAULT_ELIGIBILITY_THRESHOLDS.COOLDOWN_DAYS).toBe(30);
      expect(DEFAULT_ELIGIBILITY_THRESHOLDS.COOLDOWN_WORSENING_THRESHOLD).toBe(5);
      expect(DEFAULT_ELIGIBILITY_THRESHOLDS.MIN_SAMPLE_SIZE).toBe(3);
      expect(DEFAULT_ELIGIBILITY_THRESHOLDS.REQUIRE_TARGET).toBe(true);
    });
  });

  describe("formatEligibilityReason", () => {
    it("returns check icon for eligible metrics", () => {
      const result: EligibilityResult = {
        isEligible: true,
        reason: "eligible",
        target: 100,
        currentValue: 80,
        deviationPercent: -20,
        sampleSize: 5,
        cooldownActive: false,
        lastRunAt: null,
        lastDeviation: null,
        thresholdUsed: -10,
      };
      
      const formatted = formatEligibilityReason(result);
      expect(formatted.icon).toBe("check");
      expect(formatted.message).toBe("Eligible for recommendations");
    });

    it("returns target icon when no target configured", () => {
      const result: EligibilityResult = {
        isEligible: false,
        reason: "No target configured",
        target: null,
        currentValue: 80,
        deviationPercent: null,
        sampleSize: 5,
        cooldownActive: false,
        lastRunAt: null,
        lastDeviation: null,
        thresholdUsed: -10,
      };
      
      const formatted = formatEligibilityReason(result);
      expect(formatted.icon).toBe("target");
      expect(formatted.message).toBe("No target configured");
    });

    it("returns clock icon for cooldown active", () => {
      const result: EligibilityResult = {
        isEligible: false,
        reason: "Cooldown until 2026-03-01",
        target: 100,
        currentValue: 80,
        deviationPercent: -20,
        sampleSize: 5,
        cooldownActive: true,
        lastRunAt: "2026-02-01T00:00:00Z",
        lastDeviation: -18,
        thresholdUsed: -10,
      };
      
      const formatted = formatEligibilityReason(result);
      expect(formatted.icon).toBe("clock");
      expect(formatted.message).toBe("Cooldown active");
    });

    it("returns history icon for insufficient data", () => {
      const result: EligibilityResult = {
        isEligible: false,
        reason: "Insufficient history (2 periods, need 3)",
        target: 100,
        currentValue: 80,
        deviationPercent: -20,
        sampleSize: 2,
        cooldownActive: false,
        lastRunAt: null,
        lastDeviation: null,
        thresholdUsed: -10,
      };
      
      const formatted = formatEligibilityReason(result);
      expect(formatted.icon).toBe("history");
      expect(formatted.message).toBe("Insufficient historical data");
    });

    it("returns check icon when on track", () => {
      const result: EligibilityResult = {
        isEligible: false,
        reason: "At 5.0% vs target (threshold: -10.0%)",
        target: 100,
        currentValue: 105,
        deviationPercent: 5,
        sampleSize: 5,
        cooldownActive: false,
        lastRunAt: null,
        lastDeviation: null,
        thresholdUsed: -10,
      };
      
      const formatted = formatEligibilityReason(result);
      expect(formatted.icon).toBe("check");
      expect(formatted.message).toBe("On track");
    });
  });

  describe("Determinism", () => {
    it("same inputs produce identical deviation calculations", () => {
      // Run 10 times with same inputs
      const results = Array.from({ length: 10 }, () =>
        calculateDeviation(85, 100, "up")
      );
      
      // All results should be identical
      const first = results[0];
      results.forEach((result) => {
        expect(result.deviationPercent).toBe(first.deviationPercent);
        expect(result.isOffTrack).toBe(first.isOffTrack);
      });
    });

    it("same eligibility result produces identical formatted output", () => {
      const input: EligibilityResult = {
        isEligible: false,
        reason: "No target configured",
        target: null,
        currentValue: 80,
        deviationPercent: null,
        sampleSize: 5,
        cooldownActive: false,
        lastRunAt: null,
        lastDeviation: null,
        thresholdUsed: -10,
      };

      const results = Array.from({ length: 10 }, () =>
        formatEligibilityReason(input)
      );

      const first = results[0];
      results.forEach((result) => {
        expect(result.icon).toBe(first.icon);
        expect(result.message).toBe(first.message);
      });
    });
  });
});
