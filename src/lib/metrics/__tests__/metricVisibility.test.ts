import { describe, it, expect } from "vitest";
import {
  resolveMetricDisplay,
  hasMetricData,
} from "../metricVisibility";

describe("metricVisibility", () => {
  it("null → no_data", () => {
    const result = resolveMetricDisplay(null);
    expect(result.state).toBe("no_data");
    expect(result.label).toBe("No data yet");
  });

  it("undefined → missing", () => {
    const result = resolveMetricDisplay(undefined);
    expect(result.state).toBe("missing");
    expect(result.label).toBe("—");
  });

  it("0 with treatZeroAsMissing=true → no_data", () => {
    const result = resolveMetricDisplay(0, undefined, { treatZeroAsMissing: true });
    expect(result.state).toBe("no_data");
    expect(result.label).toBe("No data yet");
  });

  it("0 with treatZeroAsMissing=false → renders normally", () => {
    const result = resolveMetricDisplay(0, undefined, { treatZeroAsMissing: false });
    expect(result.state).toBe("value");
    expect(result.value).toBe(0);
  });

  it("0 without options → renders normally", () => {
    const result = resolveMetricDisplay(0);
    expect(result.state).toBe("value");
    expect(result.value).toBe(0);
  });

  it("positive number → value", () => {
    const result = resolveMetricDisplay(42, "$");
    expect(result.state).toBe("value");
    expect(result.label).toContain("42");
  });

  it("hasMetricData returns false for zero when treatZeroAsMissing", () => {
    expect(hasMetricData(0, { treatZeroAsMissing: true })).toBe(false);
    expect(hasMetricData(0, { treatZeroAsMissing: false })).toBe(true);
    expect(hasMetricData(0)).toBe(true);
  });
});
