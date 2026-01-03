import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getEnvironmentConfig } from "@/lib/environment";
import { Server, FlaskConical, Code } from "lucide-react";

/**
 * Displays a badge indicating the current environment (Production/Staging/Development)
 * Only shown in non-production environments to avoid confusion
 */
export function EnvironmentBadge() {
  const config = getEnvironmentConfig();
  
  // Don't show badge in production - it's the expected default
  if (config.name === 'production') {
    return null;
  }
  
  const Icon = config.name === 'staging' ? FlaskConical : Code;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant={config.color}
          className="gap-1.5 text-xs font-medium cursor-help"
        >
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">
          {config.isSandbox ? (
            <>
              <span className="font-semibold">Sandbox Environment</span>
              <br />
              This is a {config.label.toLowerCase()} environment. Production data will not appear here, 
              and production connectors cannot be activated.
            </>
          ) : (
            <>
              <span className="font-semibold">Production Environment</span>
              <br />
              You are viewing live production data.
            </>
          )}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
