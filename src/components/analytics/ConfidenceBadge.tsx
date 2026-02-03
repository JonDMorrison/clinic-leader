/**
 * Confidence Badge Component
 * Shows confidence level for EMR comparisons
 */

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ConfidenceLabel, 
  SAFE_LANGUAGE,
  getConfidenceBadgeVariant 
} from "@/lib/analytics/emrComparisonTypes";
import { ShieldCheck, ShieldAlert, ShieldQuestion, ShieldX } from "lucide-react";

interface ConfidenceBadgeProps {
  confidence: ConfidenceLabel;
  showIcon?: boolean;
  showTooltip?: boolean;
}

export function ConfidenceBadge({ 
  confidence, 
  showIcon = true,
  showTooltip = true 
}: ConfidenceBadgeProps) {
  const variant = getConfidenceBadgeVariant(confidence);
  const description = SAFE_LANGUAGE.CONFIDENCE_DESCRIPTIONS[confidence];
  
  const Icon = {
    high: ShieldCheck,
    medium: ShieldAlert,
    low: ShieldQuestion,
    insufficient_data: ShieldX,
  }[confidence];
  
  const label = {
    high: 'High Confidence',
    medium: 'Medium Confidence',
    low: 'Low Confidence',
    insufficient_data: 'Insufficient Data',
  }[confidence];
  
  const badge = (
    <Badge variant={variant} className="gap-1">
      {showIcon && <Icon className="h-3 w-3" />}
      {label}
    </Badge>
  );
  
  if (!showTooltip) {
    return badge;
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
