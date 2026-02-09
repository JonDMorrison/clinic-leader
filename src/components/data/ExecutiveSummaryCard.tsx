import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LegacyMonthPayload } from "./LegacyMonthlyReportView";
import { extractMetricsFromPayload } from "@/lib/legacy/legacyMetricMapping";
import { isMetricVerifiable } from "@/lib/legacy/legacyDerivedMetricAudit";

interface ExecutiveSummaryCardProps {
  payload: LegacyMonthPayload;
  periodKey: string;
  previousPayload?: LegacyMonthPayload | null;
}

/**
 * Format value based on metric unit
 */
function formatValue(value: number | null, metricKey: string): string {
  if (value === null) return "—";
  
  // Currency metrics
  if (metricKey.includes('production') || metricKey.includes('charges')) {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  
  // Count metrics
  return value.toLocaleString();
}

/**
 * Calculate percentage change between two values
 */
function calculateChange(
  currentValue: number | null, 
  previousValue: number | null
): { percent: number; direction: 'up' | 'down' | 'stable' } | null {
  if (currentValue === null || previousValue === null) return null;
  if (previousValue === 0 && currentValue === 0) return { percent: 0, direction: 'stable' };
  if (previousValue === 0) return { percent: 100, direction: currentValue > 0 ? 'up' : 'down' };
  
  const change = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  
  if (Math.abs(change) < 0.5) return { percent: 0, direction: 'stable' };
  
  return {
    percent: Math.abs(Math.round(change)),
    direction: change > 0 ? 'up' : 'down'
  };
}

/**
 * Get category for grouping
 */
function getCategory(metricKey: string): string {
  if (metricKey.startsWith('total_')) {
    if (metricKey.includes('production') || metricKey.includes('charges')) {
      return 'Revenue';
    }
    if (metricKey.includes('referral')) {
      return 'Referrals';
    }
    return 'Volume';
  }
  if (metricKey.includes('referral')) {
    return 'Referrals';
  }
  if (metricKey.startsWith('pain_mgmt')) {
    return 'Pain Management';
  }
  return 'Other';
}

/**
 * Get trend color based on direction and metric preference
 */
function getTrendColor(
  direction: 'up' | 'down' | 'stable',
  metricKey: string
): string {
  if (direction === 'stable') return 'text-muted-foreground';
  
  // For discharges, lower is better
  const isLowerBetter = metricKey === 'discharges';
  
  if (isLowerBetter) {
    return direction === 'up' ? 'text-destructive' : 'text-success';
  }
  return direction === 'up' ? 'text-success' : 'text-destructive';
}

export default function ExecutiveSummaryCard({ payload, periodKey, previousPayload }: ExecutiveSummaryCardProps) {
  const extracted = extractMetricsFromPayload(payload);
  const previousExtracted = previousPayload ? extractMetricsFromPayload(previousPayload) : [];
  
  // Create a map of previous values for quick lookup
  const previousValuesMap = new Map(
    previousExtracted.map(m => [m.metric_key, m.value])
  );
  
  // Check if we have any metrics with actual values
  const metricsWithValues = extracted.filter(m => m.value !== null);
  const hasPreviousData = previousExtracted.length > 0;
  
  // Group metrics by category
  const grouped = new Map<string, typeof extracted>();
  for (const metric of extracted) {
    const cat = getCategory(metric.metric_key);
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(metric);
  }
  
  // Order categories, filtering out groups where every metric is null or zero
  const categoryOrder = ['Volume', 'Revenue', 'Referrals', 'Pain Management', 'Other'];
  const sortedCategories = Array.from(grouped.keys())
    .filter(cat => {
      const metrics = grouped.get(cat) || [];
      return metrics.some(m => m.value !== null && m.value !== 0);
    })
    .sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));

  // If no metrics have data at all, hide the summary entirely
  if (extracted.length === 0 || sortedCategories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Executive Summary</h2>
          <Badge variant="outline" className="font-mono text-sm">
            {periodKey}
          </Badge>
        </div>
        {/* Stats summary */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{metricsWithValues.length} of {extracted.length} metrics populated</span>
          {!hasPreviousData && (
            <span className="text-amber-600">No prior month for comparison</span>
          )}
        </div>
      </div>

      {/* Metric Cards by Category */}
      <div className="space-y-6">
        {sortedCategories.map((category) => {
          const metrics = grouped.get(category) || [];
          
          return (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {metrics.filter(m => m.value !== null && m.value !== 0).map((metric) => {
                  const isVerifiable = isMetricVerifiable(metric.metric_key);
                  const previousValue = previousValuesMap.get(metric.metric_key);
                  const change = calculateChange(metric.value, previousValue ?? null);
                  const trendColor = change ? getTrendColor(change.direction, metric.metric_key) : 'text-muted-foreground';
                  
                  return (
                    <Card 
                      key={metric.metric_key} 
                      className={`transition-colors ${
                        isVerifiable 
                          ? 'border-brand/30 bg-brand/5' 
                          : 'border-muted bg-muted/20'
                      }`}
                    >
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <p className="text-sm text-muted-foreground leading-tight">
                              {metric.display_name}
                            </p>
                            <div className="flex items-baseline gap-2">
                              <p className="text-xl font-semibold tabular-nums">
                                {formatValue(metric.value, metric.metric_key)}
                              </p>
                              {/* Trend with percentage */}
                              {change && change.direction !== 'stable' && (
                                <span className={`flex items-center gap-0.5 text-sm font-medium ${trendColor}`}>
                                  {change.direction === 'up' ? (
                                    <TrendingUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <TrendingDown className="w-3.5 h-3.5" />
                                  )}
                                  {change.percent}%
                                </span>
                              )}
                              {change && change.direction === 'stable' && (
                                <span className={`flex items-center gap-0.5 text-sm ${trendColor}`}>
                                  <Minus className="w-3.5 h-3.5" />
                                  0%
                                </span>
                              )}
                              {!change && metric.value !== null && (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-success" />
          <span>Up vs last month</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-destructive" />
          <span>Down vs last month</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-3 h-3 rounded border-brand/30 bg-brand/5 border" />
          <span>Synced to Scorecard</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-muted bg-muted/20 border" />
          <span>Informational</span>
        </div>
      </div>
    </div>
  );
}
