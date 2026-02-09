import { useFunctionHealth } from "@/hooks/useFunctionHealth";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

/**
 * Admin-only banner shown when edge function health checks fail.
 * Displays in the app layout when backend services are degraded.
 */
export function FunctionHealthBanner() {
  const { isHealthy, errors, isLoading } = useFunctionHealth();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || isHealthy || dismissed) return null;

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
        <span className="text-destructive font-medium">
          System health issue detected
        </span>
        {errors.length > 0 && (
          <span className="text-destructive/80">
            — {errors[0]}
            {errors.length > 1 && ` (+${errors.length - 1} more)`}
          </span>
        )}
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
