/**
 * Dialog to trigger recomputation of canonical metric results
 * Calls compute_canonical_for_month or compute_canonical_for_week RPC
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle, AlertCircle, Calendar } from "lucide-react";
import { format, subMonths, startOfMonth, startOfWeek, subWeeks } from "date-fns";

interface RecomputeCanonicalsDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string | null;
}

export function RecomputeCanonicalsDialog({
  open,
  onClose,
  organizationId,
}: RecomputeCanonicalsDialogProps) {
  const { toast } = useToast();
  const [periodType, setPeriodType] = useState<"month" | "week">("month");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [result, setResult] = useState<any>(null);

  // Generate last 12 months for selection
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = startOfMonth(subMonths(new Date(), i));
    return {
      value: format(date, "yyyy-MM-dd"),
      label: format(date, "MMMM yyyy"),
    };
  });

  // Generate last 12 weeks for selection
  const weekOptions = Array.from({ length: 12 }, (_, i) => {
    const date = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
    return {
      value: format(date, "yyyy-MM-dd"),
      label: `Week of ${format(date, "MMM d, yyyy")}`,
    };
  });

  const recomputeMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !selectedPeriod) throw new Error("Missing data");

      const rpcName = periodType === "month" 
        ? "compute_canonical_for_month" 
        : "compute_canonical_for_week";

      const params = periodType === "month"
        ? { _org_id: organizationId, _month_start: selectedPeriod }
        : { _org_id: organizationId, _week_start: selectedPeriod };

      const { data, error } = await supabase.rpc(rpcName, params);

      if (error) throw error;
      return data as {
        success: boolean;
        total_metrics: number;
        success_count: number;
        error_count: number;
        results: any[];
        computed_at: string;
      };
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Canonicals recomputed",
        description: `Processed ${data?.total_metrics || 0} metrics. ${data?.success_count || 0} successful.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Recomputation failed",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setResult(null);
    setSelectedPeriod("");
    onClose();
  };

  const periodOptions = periodType === "month" ? monthOptions : weekOptions;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Recompute Canonical Results
          </DialogTitle>
          <DialogDescription>
            Run the canonical selection engine to determine authoritative values for all metrics in the selected period.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-4">
            {/* Period Type Selection */}
            <div className="space-y-2">
              <Label>Period Type</Label>
              <Select
                value={periodType}
                onValueChange={(v) => {
                  setPeriodType(v as "month" | "week");
                  setSelectedPeriod("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period Selection */}
            <div className="space-y-2">
              <Label>Select Period</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a period..." />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Info */}
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <p>This will:</p>
              <ul className="list-disc ml-4 mt-1 space-y-1">
                <li>Find all candidate values from metric_results</li>
                <li>Apply source policies and precedence overrides</li>
                <li>Select the canonical value for each metric</li>
                <li>Update metric_canonical_results table</li>
                <li>Log the selection to the audit trail</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {/* Success Summary */}
            <div className="rounded-lg border p-4 bg-success/10 border-success/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="font-semibold text-success">Recomputation Complete</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-2xl font-bold">{result.total_metrics || 0}</div>
                  <div className="text-muted-foreground">Total Metrics</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-success">{result.success_count || 0}</div>
                  <div className="text-muted-foreground">Successful</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-destructive">{result.error_count || 0}</div>
                  <div className="text-muted-foreground">Errors</div>
                </div>
              </div>
            </div>

            {/* Error Details */}
            {result.error_count > 0 && result.results && (
              <div className="rounded-lg border p-4 border-destructive/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <span className="font-semibold">Errors</span>
                </div>
                <div className="max-h-32 overflow-y-auto text-sm space-y-1">
                  {result.results
                    .filter((r: any) => r.error)
                    .map((r: any, i: number) => (
                      <div key={i} className="text-destructive">
                        {r.metric_name}: {r.error}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Detailed Results */}
            {result.results && result.results.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Show detailed results ({result.results.length} metrics)
                </summary>
                <div className="mt-2 max-h-48 overflow-y-auto rounded border p-2 space-y-1">
                  {result.results.map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="truncate flex-1">{r.metric_name || r.metric_id?.slice(0, 8)}</span>
                      {r.result?.chosen_source ? (
                        <span className="text-success ml-2">{r.result.chosen_source}</span>
                      ) : r.error ? (
                        <span className="text-destructive ml-2">Error</span>
                      ) : (
                        <span className="text-muted-foreground ml-2">No data</span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => recomputeMutation.mutate()}
                disabled={!selectedPeriod || recomputeMutation.isPending}
              >
                {recomputeMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Computing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Recompute
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
