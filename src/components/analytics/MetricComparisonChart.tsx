/**
 * Metric Comparison Chart
 * Visualizes Jane vs Non-Jane performance with percentile bands
 */

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ErrorBar } from "recharts";
import { Badge } from "@/components/ui/badge";

interface BenchmarkAggregate {
  id: string;
  metric_key: string;
  period_key: string;
  emr_source_group: string;
  organization_count: number;
  median_value: number;
  percentile_25: number;
  percentile_75: number;
  std_deviation: number;
  sample_size: number;
}

interface MetricComparisonChartProps {
  benchmarks: BenchmarkAggregate[];
}

export function MetricComparisonChart({ benchmarks }: MetricComparisonChartProps) {
  const chartData = useMemo(() => {
    // Group by metric key
    const grouped = new Map<string, { jane?: BenchmarkAggregate; nonJane?: BenchmarkAggregate }>();
    
    for (const b of benchmarks) {
      if (!grouped.has(b.metric_key)) {
        grouped.set(b.metric_key, {});
      }
      const entry = grouped.get(b.metric_key)!;
      if (b.emr_source_group === "jane") {
        entry.jane = b;
      } else {
        entry.nonJane = b;
      }
    }

    // Build chart data
    return Array.from(grouped.entries())
      .filter(([_, v]) => v.jane && v.nonJane)
      .map(([key, { jane, nonJane }]) => ({
        metricKey: formatMetricKey(key),
        janeMedian: Math.round(jane!.median_value * 100) / 100,
        janeP25: jane!.percentile_25,
        janeP75: jane!.percentile_75,
        janeSampleSize: jane!.sample_size,
        nonJaneMedian: Math.round(nonJane!.median_value * 100) / 100,
        nonJaneP25: nonJane!.percentile_25,
        nonJaneP75: nonJane!.percentile_75,
        nonJaneSampleSize: nonJane!.sample_size,
        delta: jane!.median_value - nonJane!.median_value,
        deltaPercent: nonJane!.median_value !== 0 
          ? ((jane!.median_value - nonJane!.median_value) / nonJane!.median_value) * 100
          : 0,
      }))
      .slice(0, 10); // Limit to 10 metrics for readability
  }, [benchmarks]);

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No comparable metrics found between Jane and non-Jane groups.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis type="number" />
          <YAxis 
            type="category" 
            dataKey="metricKey" 
            tick={{ fontSize: 12 }}
            width={110}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="janeMedian" 
            name="Jane (Median)" 
            fill="hsl(var(--primary))" 
            radius={[0, 4, 4, 0]}
          />
          <Bar 
            dataKey="nonJaneMedian" 
            name="Non-Jane (Median)" 
            fill="hsl(var(--muted-foreground))" 
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Delta Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left">Metric</th>
              <th className="px-4 py-2 text-right">Jane Median</th>
              <th className="px-4 py-2 text-right">Non-Jane Median</th>
              <th className="px-4 py-2 text-right">Difference</th>
              <th className="px-4 py-2 text-center">Sample Size</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row) => (
              <tr key={row.metricKey} className="border-t">
                <td className="px-4 py-2 font-medium">{row.metricKey}</td>
                <td className="px-4 py-2 text-right">{row.janeMedian.toLocaleString()}</td>
                <td className="px-4 py-2 text-right">{row.nonJaneMedian.toLocaleString()}</td>
                <td className="px-4 py-2 text-right">
                  <Badge 
                    variant={row.deltaPercent > 0 ? "default" : row.deltaPercent < 0 ? "destructive" : "secondary"}
                  >
                    {row.deltaPercent > 0 ? "+" : ""}{row.deltaPercent.toFixed(1)}%
                  </Badge>
                </td>
                <td className="px-4 py-2 text-center text-muted-foreground">
                  {row.janeSampleSize} / {row.nonJaneSampleSize}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;

  const jane = payload.find((p: any) => p.dataKey === "janeMedian");
  const nonJane = payload.find((p: any) => p.dataKey === "nonJaneMedian");

  return (
    <div className="bg-popover border rounded-lg p-3 shadow-lg">
      <p className="font-medium mb-2">{label}</p>
      {jane && (
        <p className="text-sm">
          <span className="text-primary">Jane:</span> {jane.value?.toLocaleString()}
          <span className="text-muted-foreground ml-2">(n={jane.payload.janeSampleSize})</span>
        </p>
      )}
      {nonJane && (
        <p className="text-sm">
          <span className="text-muted-foreground">Non-Jane:</span> {nonJane.value?.toLocaleString()}
          <span className="text-muted-foreground ml-2">(n={nonJane.payload.nonJaneSampleSize})</span>
        </p>
      )}
    </div>
  );
}

function formatMetricKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .substring(0, 20);
}
