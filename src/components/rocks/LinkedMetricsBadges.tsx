import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Plus, AlertTriangle } from "lucide-react";
import { getLinkedMetricsForRock, LinkedMetricSummary } from "@/lib/rocks/metricLinking";
import { RockMetricLinkDialog } from "./RockMetricLinkDialog";
import { cn } from "@/lib/utils";

interface LinkedMetricsBadgesProps {
  rock: {
    id: string;
    title: string;
    quarter: string;
  };
  maxVisible?: number;
  onUpdate?: () => void;
}

export const LinkedMetricsBadges = ({ rock, maxVisible = 2, onUpdate }: LinkedMetricsBadgesProps) => {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const { data: linkedMetrics, refetch } = useQuery({
    queryKey: ["linked-metrics", rock.id],
    queryFn: () => getLinkedMetricsForRock(rock.id),
    staleTime: 30 * 1000, // 30 seconds
  });

  const hasRedMetrics = linkedMetrics?.some((m) => m.status_color === "red");
  const visibleMetrics = linkedMetrics?.slice(0, maxVisible) || [];
  const hiddenCount = (linkedMetrics?.length || 0) - maxVisible;

  const getStatusColorClass = (status: LinkedMetricSummary["status_color"]) => {
    switch (status) {
      case "green":
        return "border-success/50 bg-success/10 text-success";
      case "yellow":
        return "border-warning/50 bg-warning/10 text-warning";
      case "red":
        return "border-danger/50 bg-danger/10 text-danger";
      default:
        return "border-muted-foreground/30 bg-muted/50 text-muted-foreground";
    }
  };

  const handleSuccess = () => {
    refetch();
    onUpdate?.();
  };

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap">
        {linkedMetrics && linkedMetrics.length > 0 ? (
          <>
            {/* Risk indicator if any metric is red */}
            {hasRedMetrics && (
              <div className="flex items-center gap-1 text-danger text-xs mr-1">
                <AlertTriangle className="w-3 h-3" />
              </div>
            )}

            {/* Visible metric badges */}
            {visibleMetrics.map((metric) => (
              <Badge
                key={metric.id}
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-5 font-normal cursor-pointer hover:opacity-80 transition-opacity",
                  getStatusColorClass(metric.status_color)
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setLinkDialogOpen(true);
                }}
              >
                <TrendingUp className="w-2.5 h-2.5 mr-1" />
                <span className="truncate max-w-[80px]">{metric.name}</span>
              </Badge>
            ))}

            {/* Hidden count badge */}
            {hiddenCount > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-5 font-normal cursor-pointer hover:bg-muted/50"
                onClick={(e) => {
                  e.stopPropagation();
                  setLinkDialogOpen(true);
                }}
              >
                +{hiddenCount} more
              </Badge>
            )}
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground">No KPIs linked</span>
        )}

        {/* Link KPI button */}
        <Button
          size="sm"
          variant="ghost"
          className="h-5 px-1.5 text-[10px]"
          onClick={(e) => {
            e.stopPropagation();
            setLinkDialogOpen(true);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Plus className="w-3 h-3" />
          <span className="hidden sm:inline ml-0.5">KPI</span>
        </Button>
      </div>

      <RockMetricLinkDialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        rock={rock}
        onSuccess={handleSuccess}
      />
    </>
  );
};
