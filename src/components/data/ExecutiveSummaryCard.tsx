import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, DollarSign, Users, Activity, CheckCircle } from "lucide-react";
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
 * Get icon for metric category
 */
function getMetricIcon(metricKey: string) {
  if (metricKey.includes('production') || metricKey.includes('charges')) {
    return DollarSign;
  }
  if (metricKey.includes('patient') || metricKey.includes('visit')) {
    return Users;
  }
  if (metricKey.includes('referral')) {
    return TrendingUp;
  }
  return Activity;
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
 * Get trend direction by comparing current and previous values
 */
function getTrend(
  currentValue: number | null, 
  previousValue: number | null,
  direction: 'higher_is_better' | 'lower_is_better' = 'higher_is_better'
): 'up' | 'down' | 'stable' | null {
  if (currentValue === null || previousValue === null) return null;
  if (previousValue === 0 && currentValue === 0) return 'stable';
  if (previousValue === 0) return currentValue > 0 ? 'up' : 'down';
  
  const change = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  
  // Consider < 1% change as stable
  if (Math.abs(change) < 1) return 'stable';
  
  return change > 0 ? 'up' : 'down';
}

/**
 * Get trend color based on direction and metric preference
 */
function getTrendColor(
  trend: 'up' | 'down' | 'stable' | null,
  metricKey: string
): string {
  if (trend === null || trend === 'stable') return 'text-muted-foreground';
  
  // For most metrics, higher is better
  // For discharges, lower is better
  const isLowerBetter = metricKey === 'discharges';
  
  if (isLowerBetter) {
    return trend === 'up' ? 'text-destructive' : 'text-success';
  }
  return trend === 'up' ? 'text-success' : 'text-destructive';
}

export default function ExecutiveSummaryCard({ payload, periodKey, previousPayload }: ExecutiveSummaryCardProps) {
  const extracted = extractMetricsFromPayload(payload);
  const previousExtracted = previousPayload ? extractMetricsFromPayload(previousPayload) : [];
  
  // Create a map of previous values for quick lookup
  const previousValuesMap = new Map(
    previousExtracted.map(m => [m.metric_key, m.value])
  );
  
  // Group metrics by category
  const grouped = new Map<string, typeof extracted>();
  for (const metric of extracted) {
    const cat = getCategory(metric.metric_key);
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(metric);
  }
  
  // Order categories
  const categoryOrder = ['Volume', 'Revenue', 'Referrals', 'Pain Management', 'Other'];
  const sortedCategories = Array.from(grouped.keys()).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="flex items-center gap-3 pb-2 border-b">
        <h2 className="text-lg font-semibold">Executive Summary</h2>
        <Badge variant="outline" className="font-mono">
          {periodKey}
        </Badge>
      </div>

      {/* Metric Cards by Category */}
      <div className="space-y-6">
        {sortedCategories.map((category) => {
          const metrics = grouped.get(category) || [];
          
          return (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {metrics.map((metric) => {
                  const Icon = getMetricIcon(metric.metric_key);
                  const isVerifiable = isMetricVerifiable(metric.metric_key);
                  const previousValue = previousValuesMap.get(metric.metric_key);
                  const trend = getTrend(metric.value, previousValue ?? null);
                  const trendColor = getTrendColor(trend, metric.metric_key);
                  
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
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground leading-tight">
                              {metric.display_name}
                            </p>
                            <p className="text-xl font-semibold tabular-nums">
                              {formatValue(metric.value, metric.metric_key)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            {/* Trend indicator */}
                            {trend === 'up' && (
                              <TrendingUp className={`w-4 h-4 ${trendColor}`} />
                            )}
                            {trend === 'down' && (
                              <TrendingDown className={`w-4 h-4 ${trendColor}`} />
                            )}
                            {trend === 'stable' && (
                              <Minus className={`w-4 h-4 ${trendColor}`} />
                            )}
                            {trend === null && metric.value !== null && isVerifiable && (
                              <Badge className="bg-muted/50 text-muted-foreground border-0 text-[9px] px-1 py-0">
                                No prior
                              </Badge>
                            )}
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
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-4 border-t">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-success" />
          <span>Up vs last month</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-destructive" />
          <span>Down vs last month</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Minus className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Stable</span>
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
