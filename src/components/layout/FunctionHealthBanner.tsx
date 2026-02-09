import { useFunctionHealth } from "@/hooks/useFunctionHealth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

/**
 * Admin-only banner shown when edge function health checks fail.
 * Shows degraded service names. Session-only dismissal.
 */
export function FunctionHealthBanner() {
  const { isHealthy, overallStatus, degradedServices, isLoading } = useFunctionHealth();
  const { data: roleData, isLoading: roleLoading } = useIsAdmin();
  const [dismissed, setDismissed] = useState(false);

  // Only show to admins
  if (roleLoading || !roleData?.isAdmin) return null;
  if (isLoading || isHealthy || dismissed) return null;

  const statusLabel = overallStatus === "down" ? "System down" : "System degraded";
  const serviceList = degradedServices.length > 0
    ? degradedServices.join(", ")
    : "Unknown service";

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
        <span className="text-destructive font-medium">
          {statusLabel}
        </span>
        <span className="text-destructive/80">
          — Affected: {serviceList}
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-destructive/60 hover:text-destructive p-1"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
