import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getLinkedMetricsForRock, LinkedMetricSummary } from "@/lib/rocks/metricLinking";

interface RockReviewProps {
  rocks: any[];
}

const LinkedKPIsSummary = ({ rockId }: { rockId: string }) => {
  const { data: linkedMetrics } = useQuery({
    queryKey: ["linked-metrics-l10", rockId],
    queryFn: () => getLinkedMetricsForRock(rockId),
    staleTime: 60 * 1000, // 1 minute
  });

  if (!linkedMetrics || linkedMetrics.length === 0) {
    return null;
  }

  const getStatusIcon = (status: LinkedMetricSummary["status_color"]) => {
    switch (status) {
      case "green":
        return <TrendingUp className="w-3 h-3 text-success" />;
      case "red":
        return <TrendingDown className="w-3 h-3 text-danger" />;
      case "yellow":
        return <Minus className="w-3 h-3 text-warning" />;
      default:
        return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="mt-2 pt-2 border-t border-border/50">
      <p className="text-xs text-muted-foreground mb-1.5">Linked KPIs:</p>
      <div className="flex flex-wrap gap-2">
        {linkedMetrics.slice(0, 3).map((metric) => (
          <div 
            key={metric.id}
            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-muted/50"
          >
            {getStatusIcon(metric.status_color)}
            <span className="font-medium truncate max-w-[120px]">{metric.name}</span>
            {metric.latest_value !== null && (
              <span className="text-muted-foreground">
                – {metric.latest_value}
                {metric.target !== null && ` (${metric.target})`}
              </span>
            )}
          </div>
        ))}
        {linkedMetrics.length > 3 && (
          <span className="text-xs text-muted-foreground self-center">
            +{linkedMetrics.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
};

export const RockReview = ({ rocks }: RockReviewProps) => {
  const getStatusBadge = (status: string) => {
    if (status === "done") return { variant: "success", label: "Done" };
    if (status === "off_track") return { variant: "danger", label: "Off Track" };
    return { variant: "warning", label: "On Track" };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rock Review (5 min)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Are all rocks on track? Any blockers?
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rocks.map((rock) => {
            const statusBadge = getStatusBadge(rock.status);
            
            return (
              <div
                key={rock.id}
                className="p-3 rounded-lg border border-border hover:bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-brand" />
                    <div>
                      <p className="font-medium">{rock.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {rock.users?.full_name || "Unassigned"} • {rock.quarter}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {rock.confidence && (
                      <span className="text-sm text-muted-foreground">
                        {rock.confidence}% confident
                      </span>
                    )}
                    <Badge variant={statusBadge.variant as "success" | "danger" | "warning"}>
                      {statusBadge.label}
                    </Badge>
                  </div>
                </div>
                
                {/* Linked KPIs Summary */}
                <LinkedKPIsSummary rockId={rock.id} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
