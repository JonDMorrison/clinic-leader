import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth } from "date-fns";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { ExpectedDirection } from "@/lib/interventions/types";
import { logInterventionEventAsync } from "@/lib/interventions/eventLogger";

interface LinkMetricModalProps {
  open: boolean;
  onClose: () => void;
  interventionId: string;
  organizationId: string;
  existingMetricIds: string[];
}

export function LinkMetricModal({
  open,
  onClose,
  interventionId,
  organizationId,
  existingMetricIds,
}: LinkMetricModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedMetricId, setSelectedMetricId] = useState("");
  const [expectedDirection, setExpectedDirection] = useState<ExpectedDirection>("up");
  const [expectedMagnitude, setExpectedMagnitude] = useState<string>("");
  const [metricComboOpen, setMetricComboOpen] = useState(false);

  // Fetch available metrics for this org
  const { data: metrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ["org-metrics", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metrics")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!organizationId,
  });

  // Filter out already linked metrics
  const availableMetrics = metrics.filter((m) => !existingMetricIds.includes(m.id));
  const selectedMetric = metrics.find((m) => m.id === selectedMetricId);

  // Fetch baseline value for selected metric
  const { data: baselineData, isLoading: baselineLoading } = useQuery({
    queryKey: ["metric-baseline", selectedMetricId],
    queryFn: async () => {
      if (!selectedMetricId) return null;

      // Get first day of current month as baseline period start
      const baselinePeriodStart = startOfMonth(new Date());
      const periodKey = format(baselinePeriodStart, "yyyy-MM");

      // Try to fetch the most recent monthly metric result
      const { data, error } = await supabase
        .from("metric_results")
        .select("value, period_start, period_key")
        .eq("metric_id", selectedMetricId)
        .eq("period_type", "monthly")
        .order("period_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching baseline:", error);
        return { value: null, periodStart: format(baselinePeriodStart, "yyyy-MM-dd"), periodKey };
      }

      if (data) {
        return {
          value: data.value,
          periodStart: data.period_start,
          periodKey: data.period_key,
        };
      }

      // No data found, return null baseline with current month
      return {
        value: null,
        periodStart: format(baselinePeriodStart, "yyyy-MM-dd"),
        periodKey,
      };
    },
    enabled: !!selectedMetricId,
  });

  const resetForm = () => {
    setSelectedMetricId("");
    setExpectedDirection("up");
    setExpectedMagnitude("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const linkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("intervention_metric_links").insert({
        intervention_id: interventionId,
        metric_id: selectedMetricId,
        expected_direction: expectedDirection,
        expected_magnitude_percent: expectedMagnitude ? parseFloat(expectedMagnitude) : null,
        baseline_value: baselineData?.value ?? null,
        baseline_period_start: baselineData?.periodStart ?? format(startOfMonth(new Date()), "yyyy-MM-dd"),
        baseline_period_type: "month",
      });

      if (error) {
        // Handle unique violation (duplicate link)
        if (error.code === "23505") {
          throw new Error("This metric is already linked to this intervention.");
        }
        // Handle RLS failures
        if (error.code === "42501" || error.message.includes("permission")) {
          throw new Error("You don't have permission to link metrics to this intervention.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intervention-metrics", interventionId] });
      
      // Log event asynchronously
      logInterventionEventAsync(interventionId, "link_metric", {
        metric_id: selectedMetricId,
        expected_direction: expectedDirection,
        expected_magnitude_percent: expectedMagnitude ? parseFloat(expectedMagnitude) : null,
        baseline_value: baselineData?.value ?? null,
      });
      
      toast({
        title: "Metric linked",
        description: "The metric has been linked to this intervention.",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to link metric",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isValid = selectedMetricId !== "";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Link Metric</DialogTitle>
          <DialogDescription>
            Link a metric to track the expected impact of this intervention.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Metric Selection - Searchable Combobox */}
          <div className="grid gap-2">
            <Label>
              Metric <span className="text-destructive">*</span>
            </Label>
            {metricsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading metrics...
              </div>
            ) : availableMetrics.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">
                  {metrics.length === 0
                    ? "No active metrics found for this organization."
                    : "All metrics are already linked to this intervention."}
                </p>
              </div>
            ) : (
              <Popover open={metricComboOpen} onOpenChange={setMetricComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={metricComboOpen}
                    className="justify-between font-normal"
                  >
                    {selectedMetric ? selectedMetric.name : "Search and select a metric..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search metrics..." />
                    <CommandList>
                      <CommandEmpty>No metric found.</CommandEmpty>
                      <CommandGroup>
                        {availableMetrics.map((metric) => (
                          <CommandItem
                            key={metric.id}
                            value={metric.name}
                            onSelect={() => {
                              setSelectedMetricId(metric.id);
                              setMetricComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedMetricId === metric.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {metric.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Expected Direction */}
          <div className="grid gap-2">
            <Label>Expected Direction</Label>
            <Select value={expectedDirection} onValueChange={(v) => setExpectedDirection(v as ExpectedDirection)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="up">↑ Increase</SelectItem>
                <SelectItem value="down">↓ Decrease</SelectItem>
                <SelectItem value="stable">→ Stable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expected Magnitude */}
          <div className="grid gap-2">
            <Label htmlFor="magnitude">Expected Magnitude (%)</Label>
            <Input
              id="magnitude"
              type="number"
              min="0"
              max="500"
              placeholder="e.g., 15"
              value={expectedMagnitude}
              onChange={(e) => setExpectedMagnitude(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optional. Expected percentage change (0-500%).
            </p>
          </div>

          {/* Baseline Preview */}
          {selectedMetricId && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Baseline Capture
              </Label>
              {baselineLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading baseline...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Period</p>
                    <p className="font-medium">
                      {baselineData?.periodKey
                        ? format(new Date(baselineData.periodStart + "T00:00:00"), "MMMM yyyy")
                        : format(startOfMonth(new Date()), "MMMM yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Baseline Value</p>
                    <p className="font-medium">
                      {baselineData?.value !== null && baselineData?.value !== undefined
                        ? baselineData.value.toLocaleString()
                        : <span className="text-muted-foreground italic">No baseline yet</span>}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => linkMutation.mutate()}
            disabled={!isValid || linkMutation.isPending || availableMetrics.length === 0}
          >
            {linkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Link Metric
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
