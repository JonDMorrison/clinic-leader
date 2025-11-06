import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { startOfWeek, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/Badge";

interface QuickEntryMobileProps {
  organizationId: string;
  onClose: () => void;
}

export function QuickEntryMobile({ organizationId, onClose }: QuickEntryMobileProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["metrics-quick-entry", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .eq("organization_id", organizationId)
        .order("category")
        .order("name");

      if (error) throw error;

      // Fetch existing values for this week
      const metricIds = data.map(m => m.id);
      const { data: results } = await supabase
        .from("metric_results")
        .select("metric_id, value")
        .in("metric_id", metricIds)
        .eq("week_start", weekStart);

      const existingValues = results?.reduce((acc, r) => {
        acc[r.metric_id] = r.value;
        return acc;
      }, {} as Record<string, number>) || {};

      return data.map(m => ({
        ...m,
        existingValue: existingValues[m.id],
      }));
    },
    enabled: !!organizationId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { metricId: string; value: number }) => {
      const { error } = await supabase
        .from("metric_results")
        .upsert({
          metric_id: data.metricId,
          week_start: weekStart,
          value: data.value,
          source: "manual",
        }, {
          onConflict: "metric_id,week_start",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scorecard-metrics"] });
      toast({ title: "Value saved" });
    },
  });

  const handleNext = async () => {
    if (!metrics) return;

    const currentMetric = metrics[currentIndex];
    const value = values[currentMetric.id];

    if (value && value.trim()) {
      await saveMutation.mutateAsync({
        metricId: currentMetric.id,
        value: parseFloat(value),
      });
    }

    if (currentIndex < metrics.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toast({ title: "All metrics updated!", description: "Great work!" });
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    if (!metrics) return;
    if (currentIndex < metrics.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  if (isLoading || !metrics || metrics.length === 0) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <p className="text-muted-foreground">Loading metrics...</p>
      </div>
    );
  }

  const currentMetric = metrics[currentIndex];
  const progress = ((currentIndex + 1) / metrics.length) * 100;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Quick Entry</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {currentIndex + 1} of {metrics.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metric Card */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-6 space-y-6">
          <div className="text-center space-y-2">
            <Badge variant="muted">{currentMetric.category}</Badge>
            <h3 className="text-2xl font-bold">{currentMetric.name}</h3>
            {currentMetric.existingValue && (
              <p className="text-sm text-muted-foreground">
                Current: {currentMetric.existingValue} {currentMetric.unit}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Value for week of {format(new Date(weekStart), "MMM d")}
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter value..."
                value={values[currentMetric.id] || ""}
                onChange={(e) =>
                  setValues({ ...values, [currentMetric.id]: e.target.value })
                }
                className="text-2xl text-center h-16"
                autoFocus
              />
            </div>

            {currentMetric.target && (
              <p className="text-sm text-center text-muted-foreground">
                Target: {currentMetric.target} {currentMetric.unit}
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Navigation */}
      <div className="border-t p-4 space-y-3">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <Button onClick={handleNext} className="flex-1">
            {currentIndex < metrics.length - 1 ? (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Finish
                <Check className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
        <Button variant="ghost" onClick={handleSkip} className="w-full">
          Skip
        </Button>
      </div>
    </div>
  );
}
