/**
 * Data Quality Summary Component
 * Shows quality metrics for both comparison groups
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EMR_QUALITY_THRESHOLDS } from "@/lib/analytics/emrComparisonTypes";

interface QualityMetrics {
  avgCompleteness: number | null;
  avgLatencyDays: number | null;
  avgConsistency: number | null;
}

interface DataQualitySummaryProps {
  janeQuality: QualityMetrics;
  nonJaneQuality: QualityMetrics;
  orgsExcluded: number;
  compact?: boolean;
}

function QualityBar({ 
  label, 
  value, 
  threshold, 
  isInverted = false,
  unit = '%'
}: { 
  label: string; 
  value: number | null; 
  threshold: number;
  isInverted?: boolean;
  unit?: string;
}) {
  if (value === null) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-muted-foreground">No data</span>
        </div>
        <Progress value={0} className="h-1.5" />
      </div>
    );
  }
  
  const displayValue = isInverted 
    ? Math.max(0, 100 - (value / threshold) * 100)
    : value;
  
  const meetsThreshold = isInverted 
    ? value <= threshold 
    : value >= threshold * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={meetsThreshold ? "text-green-600" : "text-amber-600"}>
          {isInverted ? `${value.toFixed(0)} ${unit}` : `${value.toFixed(0)}%`}
        </span>
      </div>
      <Progress 
        value={Math.min(100, displayValue)} 
        className="h-1.5"
      />
    </div>
  );
}

export function DataQualitySummary({ 
  janeQuality, 
  nonJaneQuality, 
  orgsExcluded,
  compact = false 
}: DataQualitySummaryProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          Completeness: Jane {janeQuality.avgCompleteness?.toFixed(0) ?? '—'}% / 
          Non-Jane {nonJaneQuality.avgCompleteness?.toFixed(0) ?? '—'}%
        </span>
        {orgsExcluded > 0 && (
          <Badge variant="outline" className="text-xs">
            {orgsExcluded} orgs excluded (quality)
          </Badge>
        )}
      </div>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Data Quality Summary</CardTitle>
            <CardDescription className="text-xs">
              Quality thresholds: ≥{EMR_QUALITY_THRESHOLDS.MIN_COMPLETENESS * 100}% completeness, 
              ≤{EMR_QUALITY_THRESHOLDS.MAX_LATENCY_DAYS}d latency, 
              ≥{EMR_QUALITY_THRESHOLDS.MIN_CONSISTENCY * 100}% consistency
            </CardDescription>
          </div>
          {orgsExcluded > 0 && (
            <Badge variant="secondary">
              {orgsExcluded} orgs excluded
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Jane Quality */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-primary">Jane-Integrated</h4>
            <QualityBar 
              label="Completeness" 
              value={janeQuality.avgCompleteness} 
              threshold={EMR_QUALITY_THRESHOLDS.MIN_COMPLETENESS}
            />
            <QualityBar 
              label="Latency" 
              value={janeQuality.avgLatencyDays} 
              threshold={EMR_QUALITY_THRESHOLDS.MAX_LATENCY_DAYS}
              isInverted
              unit="days"
            />
            <QualityBar 
              label="Consistency" 
              value={janeQuality.avgConsistency} 
              threshold={EMR_QUALITY_THRESHOLDS.MIN_CONSISTENCY}
            />
          </div>
          
          {/* Non-Jane Quality */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground">Non-Jane Sources</h4>
            <QualityBar 
              label="Completeness" 
              value={nonJaneQuality.avgCompleteness} 
              threshold={EMR_QUALITY_THRESHOLDS.MIN_COMPLETENESS}
            />
            <QualityBar 
              label="Latency" 
              value={nonJaneQuality.avgLatencyDays} 
              threshold={EMR_QUALITY_THRESHOLDS.MAX_LATENCY_DAYS}
              isInverted
              unit="days"
            />
            <QualityBar 
              label="Consistency" 
              value={nonJaneQuality.avgConsistency} 
              threshold={EMR_QUALITY_THRESHOLDS.MIN_CONSISTENCY}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
