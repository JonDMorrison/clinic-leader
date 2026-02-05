/**
 * ConfidenceScoreBadge - Visual indicator for outcome confidence levels
 * 
 * Displays confidence score with color-coded styling:
 * - High (≥70): Green
 * - Moderate (50-69): Primary/Teal
 * - Low (30-49): Warning/Yellow
 * - Insufficient (<30): Muted
 */

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Shield, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getConfidenceConfigFromScore,
  type ConfidenceLevel,
  type OutcomeConfidenceResult,
} from "@/lib/interventions/outcomeConfidenceScore";

interface ConfidenceScoreBadgeProps {
  score: number;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  components?: OutcomeConfidenceResult["components"];
}

const LEVEL_ICONS: Record<ConfidenceLevel, typeof ShieldCheck> = {
  high: ShieldCheck,
  moderate: Shield,
  low: ShieldAlert,
  insufficient: ShieldQuestion,
};

export function ConfidenceScoreBadge({
  score,
  showTooltip = true,
  size = "md",
  showLabel = true,
  components,
}: ConfidenceScoreBadgeProps) {
  const config = getConfidenceConfigFromScore(score);
  const Icon = LEVEL_ICONS[config.level];
  
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  };
  
  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium",
        sizeClasses[size],
        config.colorClass,
        config.bgClass,
        config.borderClass
      )}
    >
      <Icon className={iconSizes[size]} />
      {showLabel ? (
        <span>{config.label}</span>
      ) : (
        <span>{score}%</span>
      )}
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{config.label}</span>
              <span className={cn("font-bold", config.colorClass)}>{score}%</span>
            </div>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            
            {components && (
              <div className="pt-2 border-t space-y-1.5">
                <ComponentRow 
                  label="Baseline Quality" 
                  value={components.baselineQuality} 
                />
                <ComponentRow 
                  label="Execution Health" 
                  value={components.executionHealth} 
                />
                <ComponentRow 
                  label="Data Density" 
                  value={components.dataDensity} 
                />
                <ComponentRow 
                  label="Pattern Strength" 
                  value={components.patternStrength} 
                />
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ComponentRow({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground w-24 truncate">{label}</span>
      <Progress value={pct} className="h-1 flex-1" />
      <span className="w-8 text-right font-medium">{pct}%</span>
    </div>
  );
}

/**
 * Compact inline confidence indicator
 */
interface ConfidenceIndicatorProps {
  score: number;
  className?: string;
}

export function ConfidenceIndicator({ score, className }: ConfidenceIndicatorProps) {
  const config = getConfidenceConfigFromScore(score);
  const Icon = LEVEL_ICONS[config.level];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1", className)}>
            <Icon className={cn("h-3.5 w-3.5", config.colorClass)} />
            <span className={cn("text-xs font-medium", config.colorClass)}>
              {score}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.label}: {config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Full confidence breakdown panel
 */
interface ConfidenceBreakdownPanelProps {
  result: OutcomeConfidenceResult;
}

export function ConfidenceBreakdownPanel({ result }: ConfidenceBreakdownPanelProps) {
  const config = getConfidenceConfigFromScore(result.score);
  const Icon = LEVEL_ICONS[config.level];
  
  return (
    <div className={cn("p-3 rounded-lg border", config.bgClass, config.borderClass)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", config.colorClass)} />
          <span className="font-medium">{config.label}</span>
        </div>
        <span className={cn("text-lg font-bold", config.colorClass)}>
          {result.score}%
        </span>
      </div>
      
      <p className="text-xs text-muted-foreground mb-3">
        {result.explanation}
      </p>
      
      <div className="space-y-2">
        <ComponentRowFull 
          label="Baseline Quality" 
          value={result.components.baselineQuality}
          weight={25}
        />
        <ComponentRowFull 
          label="Execution Health" 
          value={result.components.executionHealth}
          weight={25}
        />
        <ComponentRowFull 
          label="Data Density" 
          value={result.components.dataDensity}
          weight={25}
        />
        <ComponentRowFull 
          label="Pattern Strength" 
          value={result.components.patternStrength}
          weight={25}
        />
      </div>
    </div>
  );
}

function ComponentRowFull({ 
  label, 
  value, 
  weight 
}: { 
  label: string; 
  value: number; 
  weight: number;
}) {
  const pct = Math.round(value * 100);
  const contribution = Math.round(value * weight);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">
          {pct}% × {weight}% = <span className="font-medium text-foreground">{contribution}</span>
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}
