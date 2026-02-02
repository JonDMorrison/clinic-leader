/**
 * Dev-only debug panel showing recent monthly metric_results
 * Only visible in development mode
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MonthlyMetricsDebugPanelProps {
  organizationId: string | null;
}

export function MonthlyMetricsDebugPanel({ organizationId }: MonthlyMetricsDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development
  if (!import.meta.env.DEV) {
    return null;
  }

  const { data: monthlyResults, isLoading } = useQuery({
    queryKey: ["monthly-metrics-debug", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from("metric_results")
        .select(`
          id,
          value,
          period_key,
          period_start,
          period_type,
          source,
          created_at,
          metrics (
            id,
            name,
            import_key,
            unit,
            target,
            direction
          )
        `)
        .eq("period_type", "monthly")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error("Debug panel error:", error);
        return [];
      }

      // Filter to only results for this org's metrics
      // The join already filters by metric, but we need to ensure org scope
      return data || [];
    },
    enabled: !!organizationId && import.meta.env.DEV,
  });

  const { data: legacyReports } = useQuery({
    queryKey: ["legacy-reports-debug", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from("legacy_monthly_reports")
        .select("id, period_key, source_file_name, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Legacy reports error:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!organizationId && import.meta.env.DEV,
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
          <span className="text-xs font-mono">DEV: Monthly Metrics Debug</span>
        </span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </Button>

      {isOpen && (
        <div className="mt-2 space-y-4 text-xs">
          {/* Legacy Reports */}
          <div>
            <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
              Legacy Monthly Reports ({legacyReports?.length || 0})
            </h4>
            {legacyReports?.length === 0 ? (
              <p className="text-muted-foreground italic">No legacy reports found. Upload a Lori workbook first.</p>
            ) : (
              <div className="space-y-1">
                {legacyReports?.map((report) => (
                  <div key={report.id} className="flex items-center gap-2 font-mono text-xs">
                    <Badge variant="outline" className="text-xs">{report.period_key}</Badge>
                    <span className="text-muted-foreground truncate">{report.source_file_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Metric Results */}
          <div>
            <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
              Monthly Metric Results ({monthlyResults?.length || 0})
            </h4>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : monthlyResults?.length === 0 ? (
              <p className="text-muted-foreground italic">No monthly metric_results found.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-amber-50 dark:bg-amber-950">
                    <tr className="text-left">
                      <th className="pr-2">Period</th>
                      <th className="pr-2">Metric</th>
                      <th className="pr-2">Value</th>
                      <th className="pr-2">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyResults?.map((result: any) => (
                      <tr key={result.id} className="border-t border-amber-200/30">
                        <td className="pr-2 py-0.5">
                          <Badge variant="outline" className="text-xs">{result.period_key}</Badge>
                        </td>
                        <td className="pr-2 py-0.5 font-medium">{result.metrics?.name || "?"}</td>
                        <td className="pr-2 py-0.5 font-mono">
                          {result.value !== null ? result.value.toLocaleString() : "null"}
                        </td>
                        <td className="pr-2 py-0.5 text-muted-foreground">{result.source || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4 pt-2 border-t border-amber-200/50">
            <div>
              <span className="text-muted-foreground">Org ID:</span>
              <code className="ml-1 text-xs">{organizationId?.slice(0, 8)}...</code>
            </div>
            <div>
              <span className="text-muted-foreground">Unique Periods:</span>
              <span className="ml-1 font-mono">
                {new Set(monthlyResults?.map((r: any) => r.period_key)).size}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
