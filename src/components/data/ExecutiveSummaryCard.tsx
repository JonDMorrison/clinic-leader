import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Users, Activity, CheckCircle } from "lucide-react";
import type { LegacyMonthPayload } from "./LegacyMonthlyReportView";
import { extractMetricsFromPayload } from "@/lib/legacy/legacyMetricMapping";
import { isMetricVerifiable } from "@/lib/legacy/legacyDerivedMetricAudit";

interface ExecutiveSummaryCardProps {
  payload: LegacyMonthPayload;
  periodKey: string;
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

export default function ExecutiveSummaryCard({ payload, periodKey }: ExecutiveSummaryCardProps) {
  const extracted = extractMetricsFromPayload(payload);
  
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
                            {isVerifiable && metric.value !== null && (
                              <Badge className="bg-success/20 text-success border-0 text-[9px] px-1 py-0">
                                <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                                Synced
                              </Badge>
                            )}
                            {!isVerifiable && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                Info
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
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-brand/30 bg-brand/5 border" />
          <span>Synced to Scorecard</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-muted bg-muted/20 border" />
          <span>Informational (not synced)</span>
        </div>
      </div>
    </div>
  );
}
