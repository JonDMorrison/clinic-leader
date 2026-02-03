/**
 * Confidence Label Tests
 * 
 * Tests deterministic confidence label calculation
 */

import { describe, it, expect } from "vitest";
import { calculateTrendStability } from "@/lib/analytics/compareJaneOutcomes";

describe("Confidence Labels", () => {
  describe("calculateTrendStability", () => {
    it("returns 'stable' for low coefficient of variation (<15%)", () => {
      // CV = 10/100 * 100 = 10%
      const stability = calculateTrendStability(10, 100);
      expect(stability).toBe("stable");
    });

    it("returns 'moderate' for medium CV (15-35%)", () => {
      // CV = 25/100 * 100 = 25%
      const stability = calculateTrendStability(25, 100);
      expect(stability).toBe("moderate");
    });

    it("returns 'volatile' for high CV (>35%)", () => {
      // CV = 50/100 * 100 = 50%
      const stability = calculateTrendStability(50, 100);
      expect(stability).toBe("volatile");
    });

    it("returns 'volatile' when median is zero", () => {
      const stability = calculateTrendStability(10, 0);
      expect(stability).toBe("volatile");
    });

    it("handles boundary at 15%", () => {
      // Exactly 15% = moderate
      const stability = calculateTrendStability(15, 100);
      expect(stability).toBe("moderate");
    });

    it("handles boundary at 35%", () => {
      // Exactly 35% = volatile
      const stability = calculateTrendStability(35, 100);
      expect(stability).toBe("volatile");
    });

    it("handles negative values correctly", () => {
      // CV uses absolute value, so -10/100 = 10%
      const stability = calculateTrendStability(-10, 100);
      expect(stability).toBe("stable");
    });
  });

  describe("Determinism", () => {
    it("same inputs produce identical stability results", () => {
      const results = Array.from({ length: 10 }, () =>
        calculateTrendStability(20, 100)
      );
      expect(new Set(results).size).toBe(1);
    });
  });
});
