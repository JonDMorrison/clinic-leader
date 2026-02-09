import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FunctionHealthResult {
  healthy: boolean;
  errors: string[];
  timestamp: string;
}

/**
 * Pings the system-health edge function on app load.
 * Returns health status for admin banner display.
 * Only runs for authenticated users; polls every 10 minutes.
 */
export function useFunctionHealth() {
  const { data, isLoading, isError } = useQuery<FunctionHealthResult>({
    queryKey: ["system-function-health"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { healthy: true, errors: [], timestamp: new Date().toISOString() };
      }

      try {
        const { data, error } = await supabase.functions.invoke("system-health", {
          method: "POST",
          body: {},
        });

        if (error) {
          console.warn("[FunctionHealth] Health check failed:", error.message);
          return {
            healthy: false,
            errors: [`Health endpoint error: ${error.message}`],
            timestamp: new Date().toISOString(),
          };
        }

        const result = data as any;
        const errors: string[] = result?.details?.errors || [];
        const healthy = result?.env_ok && result?.db_ok && result?.endpoints_ok;

        return {
          healthy: !!healthy,
          errors,
          timestamp: result?.timestamp || new Date().toISOString(),
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn("[FunctionHealth] Health check unreachable:", msg);
        return {
          healthy: false,
          errors: [`Health check unreachable: ${msg}`],
          timestamp: new Date().toISOString(),
        };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    isHealthy: data?.healthy ?? true,
    errors: data?.errors ?? [],
    timestamp: data?.timestamp ?? null,
    isLoading,
    isError,
  };
}
