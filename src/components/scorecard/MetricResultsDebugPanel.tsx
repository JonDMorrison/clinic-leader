/**
 * Dev-only debug panel showing the last 6 metric_results rows for a selected metric.
 * Helps verify what data is actually in the database (period_start, value, source).
 * Only visible in development mode.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface MetricResultsDebugPanelProps {
  metricId: string | null;
}

export function MetricResultsDebugPanel({ metricId }: MetricResultsDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development
  if (!import.meta.env.DEV) {
    return null;
  }

  const { data: results, isLoading } = useQuery({
    queryKey: ["metric-results-debug", metricId],
    queryFn: async () => {
      if (!metricId) return [];

      const { data, error } = await supabase
        .from("metric_results")
        .select(`
          id,
          value,
          period_key,
          period_start,
          period_type,
          week_start,
          source,
          created_at,
          updated_at
        `)
        .eq("metric_id", metricId)
        .order("period_start", { ascending: false })
        .limit(6);

      if (error) {
        console.error("Debug panel error:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!metricId && import.meta.env.DEV && isOpen,
  });

  return (
    <div className="border border-dashed border-amber-500 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 p-2 mt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
      >
        <span className="flex items-center gap-2">
          <Bug className="w-4 h-4" />
          <span className="text-xs font-mono">DEV: Last 6 metric_results</span>
        </span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </Button>

      {isOpen && (
        <div className="mt-2 text-xs">
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : results?.length === 0 ? (
            <p className="text-muted-foreground italic">No metric_results found for this metric.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-amber-100/50 dark:bg-amber-900/30">
                  <tr className="text-left">
                    <th className="pr-2 py-1 font-medium">Period</th>
                    <th className="pr-2 py-1 font-medium">Value</th>
                    <th className="pr-2 py-1 font-medium">Source</th>
                    <th className="pr-2 py-1 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {results?.map((result: any) => {
                    const isNullValue = result.value === null;
                    return (
                      <tr 
                        key={result.id} 
                        className={`border-t border-amber-200/30 ${isNullValue ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}
                      >
                        <td className="pr-2 py-1">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {result.period_key || result.week_start?.slice(0, 10)}
                          </Badge>
                        </td>
                        <td className="pr-2 py-1 font-mono">
                          <span className={isNullValue ? 'text-destructive font-semibold' : ''}>
                            {result.value !== null ? result.value.toLocaleString() : 'null'}
                          </span>
                          {isNullValue && (
                            <span className="ml-1 text-destructive text-[9px]">⚠ excluded</span>
                          )}
                        </td>
                        <td className="pr-2 py-1">
                          <Badge 
                            variant={result.source === 'legacy_workbook' ? 'outline' : 'secondary'} 
                            className="text-[10px]"
                          >
                            {result.source || '-'}
                          </Badge>
                        </td>
                        <td className="pr-2 py-1 text-muted-foreground">
                          {result.updated_at 
                            ? format(new Date(result.updated_at), 'MMM d HH:mm') 
                            : format(new Date(result.created_at), 'MMM d HH:mm')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Legend */}
          <div className="mt-2 pt-2 border-t border-amber-200/50 text-[10px] text-muted-foreground">
            <span className="font-medium">Display rules:</span>
            <span className="ml-2">value=null → excluded | value=0 → shown (valid for real months)</span>
          </div>
        </div>
      )}
    </div>
  );
}
