import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link2, Link2Off, User, ExternalLink } from "lucide-react";
import type { ClinicianMapping } from "@/hooks/useClinicianMappings";

interface ClinicianMappingIndicatorProps {
  mapping: ClinicianMapping | undefined;
  onViewPerson: (userId: string) => void;
  onMapClinician: () => void;
}

/**
 * Shows mapping status for a clinician breakdown row.
 * - If mapped: shows "Mapped" badge with user name and "View Person" action
 * - If not mapped: shows "Not mapped" badge with "Map to User" action
 */
export function ClinicianMappingIndicator({
  mapping,
  onViewPerson,
  onMapClinician,
}: ClinicianMappingIndicatorProps) {
  const isMapped = mapping?.userId != null;

  if (isMapped) {
    return (
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs cursor-default"
              >
                <Link2 className="w-3 h-3 mr-1" />
                Mapped
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
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className="text-muted-foreground border-muted-foreground/30 text-xs"
      >
        <Link2Off className="w-3 h-3 mr-1" />
        Not mapped
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs text-primary"
        onClick={onMapClinician}
      >
        <ExternalLink className="w-3 h-3 mr-1" />
        Map
      </Button>
    </div>
  );
}
