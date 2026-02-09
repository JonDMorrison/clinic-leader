import { useFunctionHealth } from "@/hooks/useFunctionHealth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

/**
 * Admin-only banner shown when edge function health checks fail or are slow.
 * Shows degraded service names with reason and suggested action.
 * Session-only dismissal. Auto-collapses on recovery.
 */
export function FunctionHealthBanner() {
  const { isHealthy, overallStatus, degradedServices, checks, lastSuccessfulChecks, isLoading, getActionSuggestion } = useFunctionHealth();
  const { data: roleData, isLoading: roleLoading } = useIsAdmin();
  const [dismissed, setDismissed] = useState(false);

  // Only show to admins
  if (roleLoading || !roleData?.isAdmin) return null;
  if (isLoading || isHealthy || dismissed) return null;

  const statusLabel = overallStatus === "down" ? "System down" : "System degraded";

  // Build per-service detail
  const serviceDetails = degradedServices.map((name) => {
    const check = checks[name];
    const reason = check?.reason === "slow" ? "slow" : "failed";
    const latency = check?.latency_ms ? `${check.latency_ms}ms` : null;
    const lastOk = lastSuccessfulChecks[name];
    const lastOkLabel = lastOk
      ? new Date(lastOk).toLocaleTimeString()
      : "unknown";
    return { name, reason, latency, lastOkLabel };
  });

  // Get primary action suggestion
  const primaryAction = degradedServices.length > 0
    ? getActionSuggestion(degradedServices[0])
    : "Check system status";

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            <span className="text-destructive font-medium">{statusLabel}</span>
          </div>
          <div className="text-xs text-destructive/80 space-y-0.5 pl-6">
            {serviceDetails.map(({ name, reason, latency, lastOkLabel }) => (
              <div key={name}>
                <span className="font-medium">{name}</span>
                {" — "}
                {reason === "slow" ? `slow (${latency})` : "failed"}
                {" · last ok: "}
                {lastOkLabel}
              </div>
            ))}
            <div className="mt-1 text-destructive/70 italic">
              Suggested: {primaryAction}
            </div>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-destructive/60 hover:text-destructive p-1 flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
