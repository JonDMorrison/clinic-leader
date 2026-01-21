import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link2, Link2Off, User, ExternalLink, Unlink } from "lucide-react";
import type { ClinicianMapping } from "@/hooks/useClinicianMappings";

interface ClinicianMappingIndicatorProps {
  mapping: ClinicianMapping | undefined;
  onViewPerson: (userId: string) => void;
  onMapClinician: () => void;
  onUnmapClinician?: (userId: string) => void;
  /** True if user can manage clinician mappings (managers & admins) */
  canManageUsers?: boolean;
}

/**
 * Shows mapping status for a clinician breakdown row.
 * - If mapped: shows "Mapped to: {name}" badge with "View" and "Unmap" actions
 * - If not mapped: shows "Not mapped" badge with "Map to User" action
 */
export function ClinicianMappingIndicator({
  mapping,
  onViewPerson,
  onMapClinician,
  onUnmapClinician,
  canManageUsers = false,
}: ClinicianMappingIndicatorProps) {
  const isMapped = mapping?.userId != null;

  if (isMapped) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs cursor-default max-w-[140px] truncate"
              >
                <Link2 className="w-3 h-3 mr-1 shrink-0" />
                <span className="truncate">Connected</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">
                Mapped to: <strong>{mapping.userName}</strong>
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => onViewPerson(mapping.userId!)}
        >
          <User className="w-3 h-3 mr-1" />
          View
        </Button>
        {canManageUsers && onUnmapClinician && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => onUnmapClinician(mapping.userId!)}
                >
                  <Unlink className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Remove mapping</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-primary hover:border-primary"
            onClick={onMapClinician}
          >
            <Link2Off className="w-3 h-3 mr-1" />
            Connect
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">
            Link this clinician to a team member so their metrics appear in the People Analyzer
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
