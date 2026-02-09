import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStorage, setStorage } from "@/lib/storage/versionedStorage";

interface ServiceCheck {
  status: "healthy" | "degraded" | "down";
  latency_ms?: number;
  error?: string;
  reason?: "failed" | "slow";
}

interface HealthCheckResult {
  overall_status: "healthy" | "degraded" | "down";
  degraded_services: string[];
  checks: Record<string, ServiceCheck>;
  last_successful_checks: Record<string, string>;
  version: string;
  timestamp: string;
}

const LAST_OK_KEY = "health-last-ok";

const SERVICE_ACTION_MAP: Record<string, string> = {
  database: "Check database connectivity",
  environment: "Check edge function deployment",
  "ai-query-docs": "Check AI docs edge function deployment",
  "jane-sync": "Check Jane connector status",
  "ai-intervention-insight": "Check AI intervention edge function",
  "system-health": "Check system health endpoint",
  "regression_retention": "Check purge scheduler",
};

function getActionSuggestion(service: string): string {
  return SERVICE_ACTION_MAP[service] || "Check edge function deployment";
}

/**
 * Pings the system-health edge function on app load.
 * Returns structured health status with degradation details for admin banner.
 * Polls every 10 minutes. Session-safe last_ok_at tracking.
 */
export function useFunctionHealth() {
  const { data, isLoading, isError } = useQuery<HealthCheckResult>({
    queryKey: ["system-function-health"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return {
          overall_status: "healthy" as const,
          degraded_services: [],
          checks: {},
          last_successful_checks: {},
          version: "unknown",
          timestamp: new Date().toISOString(),
        };
      }

      try {
        const { data, error } = await supabase.functions.invoke("system-health", {
          method: "POST",
          body: {},
        });

        if (error) {
          console.warn("[FunctionHealth] Health check failed:", error.message);
          return {
            overall_status: "down" as const,
            degraded_services: ["system-health"],
            checks: {},
            last_successful_checks: getStoredLastOk(),
            version: "unknown",
            timestamp: new Date().toISOString(),
          };
        }

        const result = data as HealthCheckResult;
        const resolved = {
          overall_status: result?.overall_status ?? "healthy",
          degraded_services: result?.degraded_services ?? [],
          checks: result?.checks ?? {},
          last_successful_checks: result?.last_successful_checks ?? {},
          version: result?.version ?? "unknown",
          timestamp: result?.timestamp ?? new Date().toISOString(),
        };

        // Persist last_ok_at for healthy services
        if (Object.keys(resolved.last_successful_checks).length > 0) {
          const stored = getStoredLastOk();
          const merged = { ...stored, ...resolved.last_successful_checks };
          setStorage(LAST_OK_KEY, merged);
          resolved.last_successful_checks = merged;
        }

        return resolved;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn("[FunctionHealth] Health check unreachable:", msg);
        return {
          overall_status: "down" as const,
          degraded_services: ["system-health"],
          checks: {},
          last_successful_checks: getStoredLastOk(),
          version: "unknown",
          timestamp: new Date().toISOString(),
        };
      }
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    overallStatus: data?.overall_status ?? "healthy",
    degradedServices: data?.degraded_services ?? [],
    checks: data?.checks ?? {},
    lastSuccessfulChecks: data?.last_successful_checks ?? {},
    version: data?.version ?? "unknown",
    isHealthy: (data?.overall_status ?? "healthy") === "healthy",
    timestamp: data?.timestamp ?? null,
    isLoading,
    isError,
    getActionSuggestion,
  };
}

function getStoredLastOk(): Record<string, string> {
  return getStorage<Record<string, string>>(LAST_OK_KEY) || {};
}

/**
 * Evaluate health status from check results.
 * Exported for testing purposes.
 */
export function evaluateHealthStatus(checks: Record<string, ServiceCheck>): {
  overall_status: "healthy" | "degraded" | "down";
  degraded_services: string[];
} {
  const degraded_services: string[] = [];
  let criticalFailCount = 0;

  for (const [name, check] of Object.entries(checks)) {
    if (check.status !== "healthy") {
      degraded_services.push(name);
      if (check.status === "down") criticalFailCount++;
    }
  }

  let overall_status: "healthy" | "degraded" | "down" = "healthy";
  if (checks.database?.status === "down" || checks.environment?.status !== "healthy" || criticalFailCount >= 2) {
    overall_status = "down";
  } else if (degraded_services.length > 0) {
    overall_status = "degraded";
  }

  return { overall_status, degraded_services };
}
