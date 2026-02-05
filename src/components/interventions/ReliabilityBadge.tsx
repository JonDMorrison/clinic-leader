/**
 * ReliabilityBadge - Displays reliability tier with tooltip
 * 
 * Shows reliability tier assessment for recommendations.
 * Indicates when evidence is weak and tier has been downgraded.
 */

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  AlertTriangle,
  TrendingDown,
  Info,
} from "lucide-react";
import {
  type ReliabilityResult,
  type ReliabilityTier,
  getReliabilityTierLabel,
  getReliabilityTierColor,
  getInsufficientEvidenceMessage,
} from "@/lib/interventions/recommendationReliabilityEvaluator";

interface ReliabilityBadgeProps {
  reliability: ReliabilityResult;
  showDetails?: boolean;
  compact?: boolean;
}

const TIER_ICONS: Record<ReliabilityTier, typeof Shield> = {
  strong_evidence: ShieldCheck,
  reliable_pattern: Shield,
  emerging_pattern: ShieldAlert,
  insufficient_evidence: ShieldQuestion,
};

export function ReliabilityBadge({
  reliability,
  showDetails = true,
  compact = false,
}: ReliabilityBadgeProps) {
  const Icon = TIER_ICONS[reliability.reliability_tier];
  const tierLabel = reliability.reliability_tier_label;
  const tierColor = getReliabilityTierColor(reliability.reliability_tier);

  const badge = (
    <Badge variant={tierColor.variant} className={`gap-1 ${tierColor.className}`}>
      <Icon className="h-3 w-3" />
      {!compact && tierLabel}
      {reliability.tier_downgraded && (
        <TrendingDown className="h-3 w-3 ml-0.5" />
      )}
    </Badge>
  );

  if (!showDetails) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{tierLabel}</span>
              <span className="text-xs text-muted-foreground">
                {reliability.reliability_score}%
              </span>
            </div>
            
            {/* Evidence Stats Summary */}
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sample size:</span>
                <span className="font-medium">{reliability.evidence_stats.sample_size}</span>
              </div>
              {reliability.evidence_stats.success_rate !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Success rate:</span>
                  <span className="font-medium">{reliability.evidence_stats.success_rate}%</span>
                </div>
              )}
              {reliability.evidence_stats.variance !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Variance:</span>
                  <span className="font-medium">{reliability.evidence_stats.variance.toFixed(1)}%</span>
                </div>
              )}
              {reliability.evidence_stats.recency_days !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recency:</span>
                  <span className="font-medium">{reliability.evidence_stats.recency_days}d</span>
                </div>
              )}
            </div>

            {reliability.tier_downgraded && (
              <div className="flex items-center gap-1.5 text-xs text-warning bg-warning/10 rounded px-2 py-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Tier downgraded from {reliability.original_tier}</span>
              </div>
            )}

            {reliability.reliability_tier === "insufficient_evidence" && (
              <p className="text-xs text-muted-foreground">
                {getInsufficientEvidenceMessage()}
              </p>
            )}

            {reliability.reliability_explanations.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-xs font-medium">Evidence Notes:</p>
                {reliability.reliability_explanations.slice(0, 3).map((exp, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {exp}</p>
                ))}
              </div>
            )}

            {reliability.downgrade_reason_codes.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Factors: </span>
                {reliability.downgrade_reason_codes.slice(0, 2).join(", ")}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ReliabilityBreakdownPanelProps {
  reliability: ReliabilityResult;
}

export function ReliabilityBreakdownPanel({ reliability }: ReliabilityBreakdownPanelProps) {
  const tierLabel = reliability.reliability_tier_label;

  return (
    <div className="space-y-3 p-3 rounded-lg border bg-background">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-1.5">
          <Info className="h-4 w-4 text-primary" />
          Evidence Reliability
        </h4>
        <ReliabilityBadge reliability={reliability} showDetails={false} />
      </div>

      {/* Overall Score */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Overall Score</span>
          <span className="font-medium">{reliability.reliability_score}%</span>
        </div>
        <Progress value={reliability.reliability_score} className="h-1.5" />
      </div>

      {/* Component Breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Component Scores:</p>
        <ComponentRow
          label="Pattern Availability"
          value={reliability.component_scores.pattern_availability}
        />
        <ComponentRow
          label="Evidence Stability"
          value={reliability.component_scores.evidence_stability}
        />
        <ComponentRow
          label="Baseline Integrity"
          value={reliability.component_scores.baseline_integrity}
        />
        <ComponentRow
          label="Execution Reliability"
          value={reliability.component_scores.execution_reliability}
        />
        <ComponentRow
          label="Data Density"
          value={reliability.component_scores.data_density}
        />
      </div>

      {/* Tier Downgrade Notice */}
      {reliability.tier_downgraded && (
        <div className="flex items-start gap-2 p-2 rounded bg-warning/10 border border-warning/20">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
          <div className="text-xs">
            <p className="font-medium">Tier Adjusted</p>
            <p className="text-muted-foreground">
              Changed from <span className="font-medium capitalize">{reliability.original_tier}</span> to{" "}
              <span className="font-medium capitalize">{reliability.effective_tier}</span> based on evidence quality.
            </p>
          </div>
        </div>
      )}

      {/* Explanations */}
      {reliability.reliability_explanations.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium">Notes:</p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {reliability.reliability_explanations.map((exp, i) => (
              <li key={i}>• {exp}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Insufficient Evidence Warning */}
      {reliability.reliability_tier === "insufficient_evidence" && (
        <div className="flex items-start gap-2 p-2 rounded bg-muted border">
          <ShieldQuestion className="h-4 w-4 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {getInsufficientEvidenceMessage()}
          </p>
        </div>
      )}
    </div>
  );
}

function ComponentRow({ label, value }: { label: string; value: number }) {
  const colorClass = value >= 70 
    ? "text-primary" 
    : value >= 50 
      ? "text-muted-foreground" 
      : "text-warning";

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Progress value={value} className="w-16 h-1" />
        <span className={`w-8 text-right font-medium ${colorClass}`}>{value}%</span>
      </div>
    </div>
  );
}

interface InsufficientEvidenceBannerProps {
  onLearnMore?: () => void;
}

export function InsufficientEvidenceBanner({ onLearnMore }: InsufficientEvidenceBannerProps) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg border border-muted bg-muted/50">
      <ShieldQuestion className="h-5 w-5 text-muted-foreground mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">Limited Evidence</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Not enough historical intervention evidence yet. This is an early hypothesis based on limited signals.
        </p>
        {onLearnMore && (
          <button
            onClick={onLearnMore}
            className="text-xs text-primary hover:underline mt-1"
          >
            Learn more about recommendations
          </button>
        )}
      </div>
    </div>
  );
}
