/**
 * Quality Gate Warning Banner
 * 
 * Shows a warning when >30% of orgs were excluded from benchmark due to quality issues.
 * This ensures users understand that the comparison may have limited generalizability.
 */

import { AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QualityGateWarningBannerProps {
  /** Number of orgs included in the comparison */
  includedCount: number;
  /** Number of orgs excluded due to quality gates */
  excludedCount: number;
  /** Breakdown of exclusion reasons */
  exclusionReasons?: {
    lowCompleteness: number;
    highLatency: number;
    lowConsistency: number;
  };
  /** Quality thresholds used */
  thresholds?: {
    minCompleteness: number;
    minConsistency: number;
    maxLatencyDays: number;
  };
}

export function QualityGateWarningBanner({
  includedCount,
  excludedCount,
  exclusionReasons,
  thresholds = { minCompleteness: 0.85, minConsistency: 0.80, maxLatencyDays: 45 },
}: QualityGateWarningBannerProps) {
  const totalOrgs = includedCount + excludedCount;
  const exclusionRate = totalOrgs > 0 ? (excludedCount / totalOrgs) * 100 : 0;
  const isHighExclusion = exclusionRate > 30;

  if (excludedCount === 0) {
    return null;
  }

  return (
    <Alert variant={isHighExclusion ? "destructive" : "default"} className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Data Quality Filtering Applied
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                Organizations must meet quality thresholds to be included:
              </p>
              <ul className="text-xs mt-1 space-y-0.5">
                <li>• Completeness ≥ {(thresholds.minCompleteness * 100).toFixed(0)}%</li>
                <li>• Consistency ≥ {(thresholds.minConsistency * 100).toFixed(0)}%</li>
                <li>• Reporting delay ≤ {thresholds.maxLatencyDays} days</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <p>
            <strong>{includedCount}</strong> organizations included, 
            <strong className={isHighExclusion ? " text-destructive" : ""}> {excludedCount}</strong> excluded 
            ({exclusionRate.toFixed(1)}% exclusion rate)
          </p>
          
          {exclusionReasons && (excludedCount > 0) && (
            <div className="text-xs text-muted-foreground">
              Exclusion reasons:
              <ul className="mt-1 space-y-0.5">
                {exclusionReasons.lowCompleteness > 0 && (
                  <li>• Low completeness: {exclusionReasons.lowCompleteness} org(s)</li>
                )}
                {exclusionReasons.highLatency > 0 && (
                  <li>• High reporting latency: {exclusionReasons.highLatency} org(s)</li>
                )}
                {exclusionReasons.lowConsistency > 0 && (
                  <li>• Low consistency: {exclusionReasons.lowConsistency} org(s)</li>
                )}
              </ul>
            </div>
          )}

          {isHighExclusion && (
            <p className="text-xs font-medium mt-2">
              ⚠️ High exclusion rate may limit the generalizability of these results.
            </p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
