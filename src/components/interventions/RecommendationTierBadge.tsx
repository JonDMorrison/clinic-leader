/**
 * RecommendationTierBadge - Displays tier classification with tooltip
 */

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Star, Lightbulb, Compass } from "lucide-react";
import {
  classifyRecommendationTier,
  formatTierRequirements,
  type TierClassificationInputs,
  type TierConfig,
} from "@/lib/interventions/recommendationTiers";

interface RecommendationTierBadgeProps {
  sampleSize: number;
  confidenceScore: number;
  successRate: number;
  showTooltip?: boolean;
}

const TIER_ICONS = {
  star: Star,
  lightbulb: Lightbulb,
  compass: Compass,
};

export function RecommendationTierBadge({
  sampleSize,
  confidenceScore,
  successRate,
  showTooltip = true,
}: RecommendationTierBadgeProps) {
  const tierConfig = classifyRecommendationTier({
    sampleSize,
    confidenceScore,
    successRate,
  });

  const Icon = TIER_ICONS[tierConfig.icon];
  const requirements = formatTierRequirements(tierConfig.tier);

  const badge = (
    <Badge variant={tierConfig.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {tierConfig.label}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-medium mb-1">{tierConfig.label} Tier</p>
          <p className="text-xs text-muted-foreground mb-2">
            {tierConfig.description}
          </p>
          <div className="text-xs space-y-0.5">
            <p className="font-medium">Requirements:</p>
            {requirements.map((req, i) => (
              <p key={i} className="text-muted-foreground">• {req}</p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface TierRequirementStatusProps {
  tierConfig: TierConfig;
  currentValues: TierClassificationInputs;
}

export function TierRequirementStatus({
  tierConfig,
  currentValues,
}: TierRequirementStatusProps) {
  const thresholds = {
    recommend: { minSampleSize: 10, minConfidence: 0.6, minSuccessRate: 60 },
    suggest: { minSampleSize: 5, minConfidence: 0.4, minSuccessRate: 40 },
    explore: { minSampleSize: 0, minConfidence: 0, minSuccessRate: 0 },
  };

  const targetThreshold = thresholds[tierConfig.tier];

  return (
    <div className="space-y-2 text-xs">
      <StatusRow
        label="Sample Size"
        current={currentValues.sampleSize}
        required={targetThreshold.minSampleSize}
        unit=""
        isInteger
      />
      <StatusRow
        label="Confidence"
        current={currentValues.confidenceScore * 100}
        required={targetThreshold.minConfidence * 100}
        unit="%"
      />
      <StatusRow
        label="Success Rate"
        current={currentValues.successRate}
        required={targetThreshold.minSuccessRate}
        unit="%"
      />
    </div>
  );
}

function StatusRow({
  label,
  current,
  required,
  unit,
  isInteger = false,
}: {
  label: string;
  current: number;
  required: number;
  unit: string;
  isInteger?: boolean;
}) {
  const met = current >= required;
  const displayCurrent = isInteger ? Math.round(current) : current.toFixed(0);
  const displayRequired = isInteger ? required : required.toFixed(0);

  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={met ? "text-green-600 font-medium" : "text-muted-foreground"}>
        {displayCurrent}{unit} / {displayRequired}{unit} {met ? "✓" : ""}
      </span>
    </div>
  );
}
