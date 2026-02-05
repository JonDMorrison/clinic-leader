/**
 * InterventionTimelineChart - Visualizes metric performance with intervention markers
 * 
 * Features:
 * - Metric trend line with baseline reference
 * - Intervention start/end markers
 * - Evaluation window overlay
 * - Multi-intervention overlay option
 */

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from "recharts";
import { format, parseISO, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Flag, Play, Target, CheckCircle2 } from "lucide-react";

interface MetricDataPoint {
  period: string;
  value: number;
  label: string;
}

interface InterventionMarker {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  baselineDate: string | null;
  baselineValue: number | null;
  status: string;
  isCurrentIntervention: boolean;
}

interface InterventionTimelineChartProps {
  metricName: string;
  metricData: MetricDataPoint[];
  currentIntervention: InterventionMarker;
  historicalInterventions?: InterventionMarker[];
  showHistorical?: boolean;
  evaluationPeriodStart?: string | null;
  evaluationPeriodEnd?: string | null;
  currentValue?: number | null;
  actualDelta?: number | null;
}

export function InterventionTimelineChart({
  metricName,
  metricData,
  currentIntervention,
  historicalInterventions = [],
  showHistorical = false,
  evaluationPeriodStart,
  evaluationPeriodEnd,
  currentValue,
  actualDelta,
}: InterventionTimelineChartProps) {
  // Process data for chart
  const chartData = useMemo(() => {
    return metricData.map((point) => ({
      ...point,
      date: parseISO(point.period).getTime(),
    })).sort((a, b) => a.date - b.date);
  }, [metricData]);

  // Calculate domain for Y axis
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    const values = chartData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || 10;
    return [Math.max(0, min - padding), max + padding];
  }, [chartData]);

  // Parse dates for markers
  const startTimestamp = currentIntervention.startDate 
    ? parseISO(currentIntervention.startDate).getTime() 
    : null;
  
  const endTimestamp = currentIntervention.endDate 
    ? parseISO(currentIntervention.endDate).getTime() 
    : null;
  
  const baselineTimestamp = currentIntervention.baselineDate 
    ? parseISO(currentIntervention.baselineDate).getTime() 
    : null;

  const evalStartTimestamp = evaluationPeriodStart 
    ? parseISO(evaluationPeriodStart).getTime() 
    : null;
  
  const evalEndTimestamp = evaluationPeriodEnd 
    ? parseISO(evaluationPeriodEnd).getTime() 
    : null;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const value = payload[0]?.value;
    const date = new Date(label);
    
    // Check if this is near an intervention marker
    const isNearStart = startTimestamp && Math.abs(label - startTimestamp) < 86400000 * 7;
    const isNearBaseline = baselineTimestamp && Math.abs(label - baselineTimestamp) < 86400000 * 7;
    
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium">{format(date, "MMM yyyy")}</p>
        <p className="text-muted-foreground">
          Value: <span className="text-foreground font-medium">{value?.toLocaleString()}</span>
        </p>
        {isNearBaseline && currentIntervention.baselineValue && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-600">
            <Flag className="h-3 w-3" />
            Baseline captured
          </div>
        )}
        {isNearStart && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-green-600">
            <Play className="h-3 w-3" />
            Intervention started
          </div>
        )}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No metric data available for visualization
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-primary" />
          <span>{metricName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Flag className="h-3 w-3 text-blue-500" />
          <span>Baseline</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Play className="h-3 w-3 text-green-500" />
          <span>Start</span>
        </div>
        {evalStartTimestamp && evalEndTimestamp && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 bg-primary/20 rounded-sm" />
            <span>Evaluation Window</span>
          </div>
        )}
        {currentIntervention.baselineValue !== null && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 border-t-2 border-dashed border-blue-400" />
            <span>Baseline Value ({currentIntervention.baselineValue.toLocaleString()})</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(ts) => format(new Date(ts), "MMM yy")}
              className="text-xs"
            />
            <YAxis 
              domain={yDomain}
              tickFormatter={(v) => v.toLocaleString()}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Evaluation window overlay */}
            {evalStartTimestamp && evalEndTimestamp && (
              <ReferenceArea
                x1={evalStartTimestamp}
                x2={evalEndTimestamp}
                fill="hsl(var(--primary))"
                fillOpacity={0.1}
                stroke="hsl(var(--primary))"
                strokeOpacity={0.3}
              />
            )}

            {/* Baseline value reference line */}
            {currentIntervention.baselineValue !== null && (
              <ReferenceLine
                y={currentIntervention.baselineValue}
                stroke="hsl(210, 70%, 60%)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
            )}

            {/* Baseline capture marker */}
            {baselineTimestamp && (
              <ReferenceLine
                x={baselineTimestamp}
                stroke="hsl(210, 70%, 60%)"
                strokeWidth={2}
                label={{
                  value: "📍",
                  position: "top",
                  fontSize: 14,
                }}
              />
            )}

            {/* Intervention start marker */}
            {startTimestamp && (
              <ReferenceLine
                x={startTimestamp}
                stroke="hsl(142, 70%, 45%)"
                strokeWidth={2}
                label={{
                  value: "▶",
                  position: "top",
                  fontSize: 12,
                }}
              />
            )}

            {/* Intervention end marker */}
            {endTimestamp && currentIntervention.status === "completed" && (
              <ReferenceLine
                x={endTimestamp}
                stroke="hsl(220, 10%, 50%)"
                strokeWidth={2}
                label={{
                  value: "✓",
                  position: "top",
                  fontSize: 12,
                }}
              />
            )}

            {/* Historical interventions (if enabled) */}
            {showHistorical && historicalInterventions.map((intervention, idx) => {
              const histStart = intervention.startDate 
                ? parseISO(intervention.startDate).getTime() 
                : null;
              
              if (!histStart) return null;
              
              return (
                <ReferenceLine
                  key={intervention.id}
                  x={histStart}
                  stroke="hsl(220, 10%, 60%)"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  strokeOpacity={0.6}
                />
              );
            })}

            {/* Main metric line */}
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--primary))" }}
              activeDot={{ r: 5, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Delta summary */}
      {actualDelta !== null && currentValue !== null && currentIntervention.baselineValue !== null && (
        <div className="flex items-center justify-center gap-4 pt-2 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Baseline</p>
            <p className="font-semibold">{currentIntervention.baselineValue.toLocaleString()}</p>
          </div>
          <div className="text-2xl text-muted-foreground">→</div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="font-semibold">{currentValue.toLocaleString()}</p>
          </div>
          <Badge
            variant="outline"
            className={actualDelta >= 0 
              ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300" 
              : "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300"
            }
          >
            {actualDelta >= 0 ? "+" : ""}{actualDelta.toLocaleString()}
          </Badge>
        </div>
      )}
    </div>
  );
}
