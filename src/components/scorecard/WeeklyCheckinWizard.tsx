import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Check, SkipForward, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { format, startOfWeek, subWeeks } from "date-fns";
import { cn } from "@/lib/utils";

interface Metric {
  id: string;
  name: string;
  unit: string;
  target: number | null;
  direction: string;
  owner: string | null;
  lastValue: number | null;
  lastWeekValue: number | null;
}

interface WeeklyCheckinWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function WeeklyCheckinWizard({ open, onOpenChange, onComplete }: WeeklyCheckinWizardProps) {
  const { data: currentUser } = useCurrentUser();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const lastWeekStart = format(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), "yyyy-MM-dd");

  useEffect(() => {
    if (open && currentUser?.team_id) {
      loadMetrics();
    }
  }, [open, currentUser?.team_id]);

  const loadMetrics = async () => {
    if (!currentUser?.team_id) return;
    setLoading(true);
    
    try {
      // Fetch metrics for the organization
      const { data: metricsData, error: metricsError } = await supabase
        .from("metrics")
        .select("id, name, unit, target, direction, owner")
        .eq("organization_id", currentUser.team_id)
        .order("display_priority", { ascending: true });

      if (metricsError) throw metricsError;

      // Fetch last two weeks of results
      const { data: resultsData, error: resultsError } = await supabase
        .from("metric_results")
        .select("metric_id, value, week_start")
        .in("metric_id", metricsData?.map(m => m.id) || [])
        .in("week_start", [weekStart, lastWeekStart]);

      if (resultsError) throw resultsError;

      // Build metrics with historical context
      const enrichedMetrics: Metric[] = (metricsData || []).map(m => {
        const currentWeekResult = resultsData?.find(r => r.metric_id === m.id && r.week_start === weekStart);
        const lastWeekResult = resultsData?.find(r => r.metric_id === m.id && r.week_start === lastWeekStart);
        
        return {
          ...m,
          lastValue: currentWeekResult?.value ?? null,
          lastWeekValue: lastWeekResult?.value ?? null,
        };
      });

      setMetrics(enrichedMetrics);
      
      // Pre-fill existing values
      const existingValues: Record<string, string> = {};
      enrichedMetrics.forEach(m => {
        if (m.lastValue !== null) {
          existingValues[m.id] = m.lastValue.toString();
        }
      });
      setValues(existingValues);
      
    } catch (err) {
      console.error("Error loading metrics:", err);
      toast.error("Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  const currentMetric = metrics[currentIndex];
  const progress = metrics.length > 0 ? ((currentIndex + 1) / metrics.length) * 100 : 0;

  const handleNext = () => {
    if (currentIndex < metrics.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleValueChange = (value: string) => {
    if (!currentMetric) return;
    setValues(prev => ({ ...prev, [currentMetric.id]: value }));
  };

  const handleComplete = async () => {
    setSaving(true);
    
    try {
      const updates = Object.entries(values)
        .filter(([_, val]) => val !== "" && val !== null)
        .map(([metricId, value]) => ({
          metric_id: metricId,
          week_start: weekStart,
          period_start: weekStart,
          period_type: "weekly" as const,
          period_key: weekStart,
          value: parseFloat(value),
          source: "checkin",
        }));

      for (const update of updates) {
        const { error } = await supabase
          .from("metric_results")
          .upsert(update, { onConflict: "metric_id,period_type,period_start" });
        
        if (error) throw error;
      }

      toast.success(`Saved ${updates.length} metric values`);
      onComplete?.();
      onOpenChange(false);
      setCurrentIndex(0);
    } catch (err) {
      console.error("Error saving check-in:", err);
      toast.error("Failed to save check-in");
    } finally {
      setSaving(false);
    }
  };

  const getTrendIcon = () => {
    if (!currentMetric?.lastWeekValue || !values[currentMetric.id]) return null;
    
    const currentVal = parseFloat(values[currentMetric.id]);
    const lastVal = currentMetric.lastWeekValue;
    const isUp = currentMetric.direction === "up";
    
    if (currentVal > lastVal) {
      return <TrendingUp className={cn("h-5 w-5", isUp ? "text-green-500" : "text-red-500")} />;
    } else if (currentVal < lastVal) {
      return <TrendingDown className={cn("h-5 w-5", isUp ? "text-red-500" : "text-green-500")} />;
    }
    return <Minus className="h-5 w-5 text-muted-foreground" />;
  };

  const isLastStep = currentIndex === metrics.length - 1;
  const filledCount = Object.values(values).filter(v => v !== "").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Progress Header */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Week of {format(new Date(weekStart), "MMM d, yyyy")}
            </span>
            <span className="text-sm font-medium">
              {currentIndex + 1} of {metrics.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Main Content */}
        <div className="p-6 min-h-[300px] flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : metrics.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-muted-foreground">No metrics found for your organization.</p>
              <Button variant="outline" className="mt-4" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : currentMetric ? (
            <>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">{currentMetric.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  What was your {currentMetric.name.toLowerCase()} this week?
                </p>

                {/* Context Cards */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {currentMetric.lastWeekValue !== null && (
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground mb-1">Last Week</p>
                      <p className="font-semibold">
                        {currentMetric.lastWeekValue.toLocaleString()}
                        {currentMetric.unit === "currency" && " $"}
                        {currentMetric.unit === "percent" && "%"}
                      </p>
                    </div>
                  )}
                  {currentMetric.target !== null && (
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground mb-1">Target</p>
                      <p className="font-semibold">
                        {currentMetric.target.toLocaleString()}
                        {currentMetric.unit === "currency" && " $"}
                        {currentMetric.unit === "percent" && "%"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="Enter value..."
                    value={values[currentMetric.id] || ""}
                    onChange={(e) => handleValueChange(e.target.value)}
                    className="text-lg h-14 pr-12"
                    autoFocus
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {getTrendIcon()}
                  </div>
                </div>

                {currentMetric.unit && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Unit: {currentMetric.unit}
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {!isLastStep && (
              <Button variant="ghost" onClick={handleSkip}>
                <SkipForward className="h-4 w-4 mr-1" />
                Skip
              </Button>
            )}
            
            {isLastStep ? (
              <Button onClick={handleComplete} disabled={saving}>
                <Check className="h-4 w-4 mr-1" />
                Complete ({filledCount} values)
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
