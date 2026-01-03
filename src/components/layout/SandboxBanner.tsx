import { AlertTriangle } from "lucide-react";
import { isSandboxEnvironment, getEnvironmentConfig } from "@/lib/environment";

/**
 * Displays a prominent warning banner when in a sandbox environment
 * Makes it immediately obvious that this is not production
 */
export function SandboxBanner() {
  if (!isSandboxEnvironment()) {
    return null;
  }
  
  const config = getEnvironmentConfig();
  
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 py-1.5 px-4">
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4" />
        <span>
          {config.name === 'development' ? 'Development' : 'Staging'} Environment
          {' – '}
          <span className="font-normal">
            This is a sandbox. No production data is available, and changes here do not affect live systems.
          </span>
        </span>
      </div>
    </div>
  );
}
