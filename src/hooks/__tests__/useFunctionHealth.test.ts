import { describe, it, expect } from "vitest";
import { evaluateHealthStatus } from "@/hooks/useFunctionHealth";

describe("evaluateHealthStatus", () => {
  it("all healthy → healthy overall", () => {
    const result = evaluateHealthStatus({
      database: { status: "healthy", latency_ms: 50 },
      environment: { status: "healthy" },
      "ai-query-docs": { status: "healthy", latency_ms: 100 },
    });
    expect(result.overall_status).toBe("healthy");
    expect(result.degraded_services).toEqual([]);
  });

  it("slow service → degraded", () => {
    const result = evaluateHealthStatus({
      database: { status: "healthy", latency_ms: 50 },
      environment: { status: "healthy" },
      "ai-query-docs": { status: "degraded", latency_ms: 3000, reason: "slow" },
    });
    expect(result.overall_status).toBe("degraded");
    expect(result.degraded_services).toContain("ai-query-docs");
  });

  it("database failure → down", () => {
    const result = evaluateHealthStatus({
      database: { status: "down", error: "Connection refused", reason: "failed" },
      environment: { status: "healthy" },
      "ai-query-docs": { status: "healthy", latency_ms: 100 },
    });
    expect(result.overall_status).toBe("down");
  });

  it("2+ critical failures → down", () => {
    const result = evaluateHealthStatus({
      database: { status: "healthy", latency_ms: 50 },
      environment: { status: "healthy" },
      "ai-query-docs": { status: "down", reason: "failed" },
      "jane-sync": { status: "down", reason: "failed" },
    });
    expect(result.overall_status).toBe("down");
    expect(result.degraded_services).toHaveLength(2);
  });

  it("stale retention → degraded", () => {
    const result = evaluateHealthStatus({
      database: { status: "healthy", latency_ms: 50 },
      environment: { status: "healthy" },
      regression_retention: { status: "degraded", error: "Last purge 72h ago", reason: "slow" },
    });
    expect(result.overall_status).toBe("degraded");
    expect(result.degraded_services).toContain("regression_retention");
  });
});
