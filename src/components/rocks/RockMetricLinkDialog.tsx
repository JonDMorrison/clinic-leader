import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, TrendingUp, TrendingDown, Minus, Target, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { setRockMetricLinks, getLinkedMetricIds } from "@/lib/rocks/metricLinking";
import { toast } from "sonner";

interface RockMetricLinkDialogProps {
  open: boolean;
  onClose: () => void;
  rock: {
    id: string;
    title: string;
    quarter: string;
  };
  onSuccess?: () => void;
}

export const RockMetricLinkDialog = ({ open, onClose, rock, onSuccess }: RockMetricLinkDialogProps) => {
  const { data: currentUser } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMetricIds, setSelectedMetricIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [initialMetricIds, setInitialMetricIds] = useState<Set<string>>(new Set());

  // Fetch all metrics for the organization
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["all-metrics-for-linking", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];

      const { data, error } = await supabase
        .from("metrics")
        .select("id, name, category, target, direction, unit")
        .eq("organization_id", currentUser.team_id)
        .order("category")
        .order("name");

      if (error) throw error;

      // Get latest values
      const metricIds = data?.map((m) => m.id) || [];
      const { data: results } = await supabase
        .from("metric_results")
        .select("metric_id, value, week_start")
        .in("metric_id", metricIds)
        .order("week_start", { ascending: false });

      const latestValues: Record<string, number | null> = {};
      results?.forEach((r) => {
        if (!(r.metric_id in latestValues)) {
          latestValues[r.metric_id] = r.value;
        }
      });

      return data?.map((m) => ({
        ...m,
        latest_value: latestValues[m.id] ?? null,
      })) || [];
    },
    enabled: open && !!currentUser?.team_id,
  });

  // Load existing linked metrics when dialog opens
  useEffect(() => {
    if (open && rock.id) {
      getLinkedMetricIds(rock.id).then((ids) => {
        const idSet = new Set(ids);
        setSelectedMetricIds(idSet);
        setInitialMetricIds(idSet);
      });
    }
  }, [open, rock.id]);

  const filteredMetrics = metrics?.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Group metrics by category
  const metricsByCategory = filteredMetrics.reduce((acc, m) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  }, {} as Record<string, typeof filteredMetrics>);

  const handleToggleMetric = (metricId: string) => {
    setSelectedMetricIds((prev) => {
      const next = new Set(prev);
      if (next.has(metricId)) {
        next.delete(metricId);
      } else {
        next.add(metricId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!currentUser?.team_id) return;

    setIsSaving(true);
    const result = await setRockMetricLinks(
      rock.id,
      Array.from(selectedMetricIds),
      currentUser.team_id,
      currentUser.id
    );

    setIsSaving(false);

    if (result.success) {
      toast.success("KPI links updated");
      onSuccess?.();
      onClose();
    } else {
      toast.error(result.error || "Failed to update links");
    }
  };

  const hasChanges = () => {
    if (selectedMetricIds.size !== initialMetricIds.size) return true;
    for (const id of selectedMetricIds) {
      if (!initialMetricIds.has(id)) return true;
    }
    return false;
  };

  const getStatusIndicator = (metric: { latest_value: number | null; target: number | null; direction: string }) => {
    if (metric.latest_value === null || metric.target === null) {
      return <Minus className="w-4 h-4 text-muted-foreground" />;
    }

    const isUp = metric.direction === "up" || metric.direction === ">=";
    const diff = isUp ? metric.latest_value - metric.target : metric.target - metric.latest_value;
    const threshold = Math.abs(metric.target * 0.15);

    if (diff >= 0) {
      return <TrendingUp className="w-4 h-4 text-success" />;
    } else if (Math.abs(diff) <= threshold) {
      return <Minus className="w-4 h-4 text-warning" />;
    } else {
      return <TrendingDown className="w-4 h-4 text-danger" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-brand" />
            Link KPIs to Priority
          </DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="font-medium text-foreground">{rock.title}</span>
            <Badge variant="muted" className="ml-2">{rock.quarter}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search metrics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Metrics List */}
          <ScrollArea className="h-[350px] pr-4">
            {metricsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMetrics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {metrics?.length === 0 ? "No metrics found. Add some to your scorecard first." : "No metrics match your search."}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(metricsByCategory).map(([category, categoryMetrics]) => (
                  <div key={category}>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      {category}
                    </h4>
                    <div className="space-y-1">
                      {categoryMetrics.map((metric) => (
                        <label
                          key={metric.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedMetricIds.has(metric.id)}
                            onCheckedChange={() => handleToggleMetric(metric.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{metric.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {metric.latest_value !== null ? (
                                <>
                                  {metric.latest_value}
                                  {metric.unit && ` ${metric.unit}`}
                                  {metric.target !== null && (
                                    <span className="text-muted-foreground/70"> / Target: {metric.target}</span>
                                  )}
                                </>
                              ) : (
                                "No data"
                              )}
                            </p>
                          </div>
                          {getStatusIndicator(metric)}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Selection Summary */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              {selectedMetricIds.size} KPI{selectedMetricIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !hasChanges()}
                className="gradient-brand"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Links"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
