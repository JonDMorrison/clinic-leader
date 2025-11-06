import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { Sparklines, SparklinesLine } from "react-sparklines";
import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MetricData {
  id: string;
  name: string;
  category: string;
  unit: string;
  target: number | null;
  direction: string;
  sync_source: string;
  owner_name: string | null;
  current_value: number | null;
  last_8_weeks: (number | null)[];
}

interface MetricCardProps {
  metric: MetricData;
  onClick: () => void;
}

const getPerformanceColor = (
  actual: number | null,
  target: number | null,
  direction: string
): "green" | "amber" | "red" | "gray" => {
  if (!actual || !target) return "gray";

  const percentage = (actual / target) * 100;
  const isUp = direction === "up" || direction === ">=";

  if (isUp) {
    if (percentage >= 100) return "green";
    if (percentage >= 90) return "amber";
    return "red";
  } else {
    if (percentage <= 100) return "green";
    if (percentage <= 110) return "amber";
    return "red";
  }
};

const getColorClasses = (color: "green" | "amber" | "red" | "gray") => {
  switch (color) {
    case "green":
      return "bg-green-100 text-green-800 border-green-300";
    case "amber":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "red":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
};

export const MetricCard = ({ metric, onClick }: MetricCardProps) => {
  const navigate = useNavigate();
  const performanceColor = getPerformanceColor(
    metric.current_value,
    metric.target,
    metric.direction
  );

  const sparklineData = metric.last_8_weeks.map(v => v ?? 0);
  const hasData = metric.last_8_weeks.some(v => v !== null);

  const handleUpdateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/scorecard/update?metricId=${metric.id}`);
  };

  return (
    <div onClick={onClick} className="cursor-pointer">
      <Card className="glass p-4 hover:border-primary/40 transition-all">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">{metric.name}</h3>
              <div className="flex items-center gap-2">
                <Badge variant="muted" className="text-xs">
                  {metric.category}
                </Badge>
                {metric.owner_name && (
                  <span className="text-xs text-muted-foreground">
                    {metric.owner_name}
                  </span>
                )}
              </div>
            </div>
            <Badge 
              variant={metric.sync_source === "jane" ? "brand" : "muted"}
              className="text-xs"
            >
              {metric.sync_source === "jane" ? "Jane" : "Manual"}
            </Badge>
          </div>

          {/* Target */}
          {metric.target && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Target:</span>
              <Badge variant="muted" className="text-xs">
                {metric.direction === "up" || metric.direction === ">=" ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {metric.target} {metric.unit}
              </Badge>
            </div>
          )}

          {/* Sparkline */}
          {hasData && (
            <div className="h-12">
              <Sparklines data={sparklineData} width={200} height={40}>
                <SparklinesLine 
                  color={
                    performanceColor === "green" ? "#22c55e" :
                    performanceColor === "amber" ? "#f59e0b" :
                    performanceColor === "red" ? "#ef4444" : "#9ca3af"
                  }
                  style={{ strokeWidth: 2, fill: "none" }}
                />
              </Sparklines>
            </div>
          )}

          {/* Current Value */}
          <div className={`p-3 rounded-lg border ${getColorClasses(performanceColor)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">This Week</p>
                <p className="text-lg font-bold">
                  {metric.current_value !== null 
                    ? `${metric.current_value} ${metric.unit}` 
                    : "No data"}
                </p>
              </div>
              {metric.current_value !== null && metric.target && (
                <div className="text-right">
                  <p className="text-xs opacity-80">vs Target</p>
                  <p className="text-sm font-semibold">
                    {((metric.current_value / metric.target) * 100).toFixed(0)}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Update Link */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full"
            onClick={handleUpdateClick}
          >
            <ExternalLink className="w-3 h-3 mr-2" />
            Update Data
          </Button>
        </div>
      </Card>
    </div>
  );
};
