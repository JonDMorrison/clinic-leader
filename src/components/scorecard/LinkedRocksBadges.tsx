import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Plus } from "lucide-react";
import { getLinkedRocksForMetric, LinkedRockSummary } from "@/lib/rocks/metricLinking";
import { MetricRockLinkDialog } from "./MetricRockLinkDialog";
import { cn } from "@/lib/utils";

interface LinkedRocksBadgesProps {
  metric: {
    id: string;
    name: string;
  };
  maxVisible?: number;
  onUpdate?: () => void;
}

export const LinkedRocksBadges = ({ metric, maxVisible = 2, onUpdate }: LinkedRocksBadgesProps) => {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const { data: linkedRocks, refetch } = useQuery({
    queryKey: ["linked-rocks", metric.id],
    queryFn: () => getLinkedRocksForMetric(metric.id),
    staleTime: 30 * 1000, // 30 seconds
  });

  const visibleRocks = linkedRocks?.slice(0, maxVisible) || [];
  const hiddenCount = (linkedRocks?.length || 0) - maxVisible;

  const getStatusColorClass = (status: LinkedRockSummary["status"]) => {
    switch (status) {
      case "done":
        return "border-success/50 bg-success/10 text-success";
      case "off_track":
        return "border-danger/50 bg-danger/10 text-danger";
      default:
        return "border-brand/50 bg-brand/10 text-brand";
    }
  };

  const handleSuccess = () => {
    refetch();
    onUpdate?.();
  };

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap">
        {linkedRocks && linkedRocks.length > 0 ? (
          <>
            {/* Visible rock badges */}
            {visibleRocks.map((rock) => (
              <Badge
                key={rock.id}
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-5 font-normal cursor-pointer hover:opacity-80 transition-opacity",
                  getStatusColorClass(rock.status)
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setLinkDialogOpen(true);
                }}
              >
                <Target className="w-2.5 h-2.5 mr-1" />
                <span className="truncate max-w-[80px]">{rock.title}</span>
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
          <span className="text-[10px] text-muted-foreground">Not linked</span>
        )}

        {/* Link to Priority button */}
        <Button
          size="sm"
          variant="ghost"
          className="h-5 px-1.5 text-[10px]"
          onClick={(e) => {
            e.stopPropagation();
            setLinkDialogOpen(true);
          }}
        >
          <Plus className="w-3 h-3" />
          <span className="hidden sm:inline ml-0.5">Priority</span>
        </Button>
      </div>

      <MetricRockLinkDialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        metric={metric}
        onSuccess={handleSuccess}
      />
    </>
  );
};
