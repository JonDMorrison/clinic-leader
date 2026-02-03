/**
 * Dev-only debug panel showing canonical selection details for a metric+period.
 * Shows candidates from metric_results, chosen canonical row, selection reason, and audit log.
 * Only visible in development mode.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight, Zap, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CanonicalSelectionDebugPanelProps {
  metricId: string | null;
  organizationId: string | null;
  periodType: 'week' | 'month';
  periodStart: string | null; // YYYY-MM-DD
}

export function CanonicalSelectionDebugPanel({
  metricId,
  organizationId,
  periodType,
  periodStart,
}: CanonicalSelectionDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development
  if (!import.meta.env.DEV) {
    return null;
  }

  const enabled = !!metricId && !!organizationId && !!periodStart && isOpen;

  // Fetch canonical result
  const { data: canonicalResult, isLoading: canonicalLoading } = useQuery({
    queryKey: ["canonical-debug", metricId, periodType, periodStart],
    queryFn: async () => {
      if (!metricId || !organizationId || !periodStart) return null;

      const { data, error } = await supabase
        .from("metric_canonical_results")
        .select("*")
        .eq("metric_id", metricId)
        .eq("organization_id", organizationId)
        .eq("period_type", periodType)
        .eq("period_start", periodStart)
        .maybeSingle();

      if (error) {
        console.error("Canonical debug error:", error);
        return null;
      }
      return data;
    },
    enabled,
  });

  // Fetch all candidate results from metric_results
  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ["candidates-debug", metricId, periodType, periodStart],
    queryFn: async () => {
      if (!metricId || !periodStart) return [];

      const query = supabase
        .from("metric_results")
        .select("id, value, source, created_at, updated_at, selection_meta")
        .eq("metric_id", metricId);

      if (periodType === 'week') {
        query.eq("week_start", periodStart);
      } else {
        query.eq("period_type", "monthly").eq("period_start", periodStart);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error("Candidates debug error:", error);
        return [];
      }
      return data || [];
    },
    enabled,
  });

  // Fetch audit log entry
  const { data: auditLog, isLoading: auditLoading } = useQuery({
    queryKey: ["audit-log-debug", metricId, periodType, periodStart],
    queryFn: async () => {
      if (!metricId || !organizationId || !periodStart) return null;

      const { data, error } = await supabase
        .from("metric_selection_audit_log")
        .select("*")
        .eq("metric_id", metricId)
        .eq("organization_id", organizationId)
        .eq("period_type", periodType)
        .eq("period_start", periodStart)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Audit log debug error:", error);
        return null;
      }
      return data;
    },
    enabled,
  });

  const isLoading = canonicalLoading || candidatesLoading || auditLoading;
  const hasCanonical = !!canonicalResult;

  return (
    <div className="border border-dashed border-purple-500 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 p-2 mt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30"
      >
        <span className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span className="text-xs font-mono">DEV: Canonical Selection Debug</span>
          {hasCanonical && (
            <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
              Canonical
            </Badge>
          )}
          {!hasCanonical && periodStart && (
            <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
              Fallback
            </Badge>
          )}
        </span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </Button>

      {isOpen && (
        <div className="mt-2 space-y-4 text-xs">
          {!periodStart ? (
            <p className="text-muted-foreground italic">Select a period to view canonical selection details.</p>
          ) : isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <>
              {/* Query Context */}
              <div className="bg-purple-100/50 dark:bg-purple-900/30 rounded p-2 font-mono text-[10px]">
                <span className="text-muted-foreground">Query:</span> metric_id={metricId?.slice(0, 8)}... | {periodType} | {periodStart}
              </div>

              {/* Canonical Result */}
              <div>
                <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-1 flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  Canonical Result
                </h4>
                {canonicalResult ? (
                  <div className="bg-background rounded border border-purple-200/50 p-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Value:</span>
                      <span className="font-mono font-semibold">
                        {canonicalResult.value !== null ? canonicalResult.value.toLocaleString() : "null"}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {canonicalResult.chosen_source || "—"}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground">
                      <span className="font-medium">Reason:</span> {canonicalResult.selection_reason}
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                      Computed: {canonicalResult.computed_at ? format(new Date(canonicalResult.computed_at), "MMM d HH:mm") : "—"}
                    </div>
                  </div>
                ) : (
                  <div className="bg-warning/10 border border-warning/30 rounded p-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="text-warning">No canonical result computed for this period. Using raw fallback.</span>
                  </div>
                )}
              </div>

              {/* Candidates */}
              <div>
                <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-1">
                  Candidates in metric_results ({candidates?.length || 0})
                </h4>
                {candidates?.length === 0 ? (
                  <p className="text-muted-foreground italic">No metric_results found for this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-purple-100/50 dark:bg-purple-900/30">
                        <tr className="text-left">
                          <th className="pr-2 py-1 font-medium">Source</th>
                          <th className="pr-2 py-1 font-medium">Value</th>
                          <th className="pr-2 py-1 font-medium">Audit Status</th>
                          <th className="pr-2 py-1 font-medium">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates?.map((candidate: any) => {
                          const isChosen = canonicalResult?.chosen_metric_result_id === candidate.id;
                          const auditStatus = candidate.selection_meta?.audit_status || 'N/A';
                          
                          return (
                            <tr 
                              key={candidate.id} 
                              className={cn(
                                "border-t border-purple-200/30",
                                isChosen && "bg-success/10"
                              )}
                            >
                              <td className="pr-2 py-1">
                                <Badge 
                                  variant={isChosen ? "default" : "outline"} 
                                  className="text-[10px]"
                                >
                                  {candidate.source || '-'}
                                  {isChosen && " ✓"}
                                </Badge>
                              </td>
                              <td className="pr-2 py-1 font-mono">
                                {candidate.value !== null ? candidate.value.toLocaleString() : 'null'}
                              </td>
                              <td className="pr-2 py-1">
                                <Badge 
                                  variant={auditStatus === 'PASS' ? 'success' : auditStatus === 'FAIL' ? 'destructive' : 'outline'}
                                  className="text-[10px]"
                                >
                                  {auditStatus}
                                </Badge>
                              </td>
                              <td className="pr-2 py-1 text-muted-foreground">
                                {candidate.updated_at 
                                  ? format(new Date(candidate.updated_at), 'MMM d HH:mm') 
                                  : format(new Date(candidate.created_at), 'MMM d HH:mm')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Audit Log */}
              <div>
                <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-1">
                  Selection Audit Log
                </h4>
                {auditLog ? (
                  <div className="bg-background rounded border border-purple-200/50 p-2 space-y-2">
                    <div className="text-muted-foreground">
                      <span className="font-medium">Reason:</span> {auditLog.reason}
                    </div>
                    <div className="text-[10px]">
                      <span className="text-muted-foreground">Chosen:</span>{" "}
                      <code className="bg-muted px-1 rounded">
                        {JSON.stringify(auditLog.chosen)}
                      </code>
                    </div>
                    <div className="text-[10px]">
                      <span className="text-muted-foreground">Candidate count:</span>{" "}
                      {Array.isArray(auditLog.candidate_sources) ? auditLog.candidate_sources.length : 0}
                    </div>
                    <details className="text-[10px]">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Show raw candidate_sources
                      </summary>
                      <pre className="mt-1 bg-muted p-2 rounded overflow-x-auto text-[9px]">
                        {JSON.stringify(auditLog.candidate_sources, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No audit log entry found.</p>
                )}
              </div>

              {/* Legend */}
              <div className="pt-2 border-t border-purple-200/50 text-[10px] text-muted-foreground">
                <span className="font-medium">Legend:</span>
                <span className="ml-2">✓ = chosen</span>
                <span className="ml-3">PASS = audit passed</span>
                <span className="ml-3">N/A = no audit required</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
