/**
 * Benchmark Quality Summary
 * 
 * Displays per-group quality metrics for benchmark comparisons.
 * Shows mean completeness, consistency, and latency for included orgs.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface QualitySummaryData {
  avgCompleteness: number | null;
  avgConsistency: number | null;
  avgLatencyDays: number | null;
}

interface BenchmarkQualitySummaryProps {
  /** Group label (e.g., "Jane Users") */
  groupLabel: string;
  /** Quality summary data */
  quality: QualitySummaryData | null;
  /** Number of included orgs */
  includedCount: number;
  /** Number of excluded orgs */
  excludedCount: number;
  /** Variant for styling */
  variant?: "jane" | "non-jane" | "default";
}

function getQualityLabel(value: number | null, threshold: number): { label: string; variant: "default" | "secondary" | "destructive" } {
  if (value === null) return { label: "N/A", variant: "secondary" };
  if (value >= threshold) return { label: "Good", variant: "default" };
  return { label: "Warning", variant: "destructive" };
}

export function BenchmarkQualitySummary({
  groupLabel,
  quality,
  includedCount,
  excludedCount,
  variant = "default",
}: BenchmarkQualitySummaryProps) {
  const completenessLabel = getQualityLabel(quality?.avgCompleteness ?? null, 0.85);
  const consistencyLabel = getQualityLabel(quality?.avgConsistency ?? null, 0.80);
  const latencyGood = quality?.avgLatencyDays !== null && quality.avgLatencyDays <= 45;

  const variantColors = {
    jane: "border-l-4 border-l-emerald-500",
    "non-jane": "border-l-4 border-l-blue-500",
    default: "",
  };

  return (
    <Card className={variantColors[variant]}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          {groupLabel}
          <Badge variant="outline" className="ml-2">
            {includedCount} included
            {excludedCount > 0 && (
              <span className="text-destructive ml-1">/ {excludedCount} excluded</span>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Completeness */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Completeness
            </span>
            <span className="font-medium">
              {quality?.avgCompleteness !== null
                ? `${(quality.avgCompleteness * 100).toFixed(1)}%`
                : "—"}
            </span>
          </div>
          <Progress 
            value={quality?.avgCompleteness ? quality.avgCompleteness * 100 : 0} 
            className="h-1.5"
          />
        </div>

        {/* Consistency */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Consistency
            </span>
            <span className="font-medium">
              {quality?.avgConsistency !== null
                ? `${(quality.avgConsistency * 100).toFixed(1)}%`
                : "—"}
            </span>
          </div>
          <Progress 
            value={quality?.avgConsistency ? quality.avgConsistency * 100 : 0} 
            className="h-1.5"
          />
        </div>

        {/* Latency */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Avg. Reporting Delay
            </span>
            <Badge variant={latencyGood ? "outline" : "destructive"} className="text-xs">
              {quality?.avgLatencyDays !== null
                ? `${quality.avgLatencyDays.toFixed(1)} days`
                : "—"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
