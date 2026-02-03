import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ExpectedDirection } from "@/lib/interventions/types";

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
  const [baselineValue, setBaselineValue] = useState<string>("");

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

  const resetForm = () => {
    setSelectedMetricId("");
    setExpectedDirection("up");
    setExpectedMagnitude("");
    setBaselineValue("");
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
        baseline_value: baselineValue ? parseFloat(baselineValue) : null,
        baseline_period_type: "month",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intervention-metrics", interventionId] });
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
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Link Metric</DialogTitle>
          <DialogDescription>
            Link a metric to track the expected impact of this intervention.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Metric Selection */}
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
              <p className="text-sm text-muted-foreground">
                {metrics.length === 0
                  ? "No active metrics found for this organization."
                  : "All metrics are already linked to this intervention."}
              </p>
            ) : (
              <Select value={selectedMetricId} onValueChange={setSelectedMetricId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a metric" />
                </SelectTrigger>
                <SelectContent>
                  {availableMetrics.map((metric) => (
                    <SelectItem key={metric.id} value={metric.id}>
                      {metric.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {/* Baseline Value */}
          <div className="grid gap-2">
            <Label htmlFor="baseline">Baseline Value</Label>
            <Input
              id="baseline"
              type="number"
              placeholder="Current metric value"
              value={baselineValue}
              onChange={(e) => setBaselineValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optional. The current value to compare against.
            </p>
          </div>
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
