/**
 * BaselineQualityBadge - Displays the quality flag for baseline data
 */

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";
import {
  type BaselineQualityFlag,
  getQualityFlagLabel,
  getQualityFlagColors,
} from "@/lib/interventions/baselineValidation";

interface BaselineQualityBadgeProps {
  flag: BaselineQualityFlag;
  reasons?: string[];
  showIcon?: boolean;
  size?: "sm" | "default";
}

export function BaselineQualityBadge({
  flag,
  reasons = [],
  showIcon = true,
  size = "default",
}: BaselineQualityBadgeProps) {
  const label = getQualityFlagLabel(flag);
  const colors = getQualityFlagColors(flag);

  const Icon = flag === "good" ? CheckCircle2 : flag === "iffy" ? AlertTriangle : XCircle;

  const badge = (
    <Badge
      variant="outline"
      className={`${colors} ${size === "sm" ? "text-xs px-1.5 py-0.5" : ""}`}
    >
      {showIcon && <Icon className={`mr-1 ${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"}`} />}
      {label}
    </Badge>
  );

  if (reasons.length === 0) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <ul className="text-xs space-y-1">
          {reasons.map((reason, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              {reason}
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
