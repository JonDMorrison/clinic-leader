import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface HealthCheckResult {
  overall_status: "healthy" | "degraded" | "down";
  degraded_services: string[];
  checks: Record<string, { status: string; latency_ms?: number; error?: string }>;
  version: string;
  timestamp: string;
}

/**
 * Pings the system-health edge function on app load.
 * Returns structured health status for admin banner display.
 * Only runs for authenticated users; polls every 10 minutes.
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
            version: "unknown",
            timestamp: new Date().toISOString(),
          };
        }

        const result = data as HealthCheckResult;
        return {
          overall_status: result?.overall_status ?? "healthy",
          degraded_services: result?.degraded_services ?? [],
          checks: result?.checks ?? {},
          version: result?.version ?? "unknown",
          timestamp: result?.timestamp ?? new Date().toISOString(),
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn("[FunctionHealth] Health check unreachable:", msg);
        return {
          overall_status: "down" as const,
          degraded_services: ["system-health"],
          checks: {},
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
    version: data?.version ?? "unknown",
    isHealthy: (data?.overall_status ?? "healthy") === "healthy",
    timestamp: data?.timestamp ?? null,
    isLoading,
    isError,
  };
}
