import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ForecastBadgeProps {
  predicted: number;
  confidence: number;
  unit: string;
  trend: "up" | "down";
}

export const ForecastBadge = ({ predicted, confidence, unit, trend }: ForecastBadgeProps) => {
  const formatValue = (value: number) => {
    if (unit === "$") return `$${value.toFixed(0)}`;
    if (unit === "%") return `${value.toFixed(1)}%`;
    return value.toFixed(1);
  };

  const confidenceColor = confidence >= 80 ? "success" : confidence >= 60 ? "warning" : "muted";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <Badge variant={confidenceColor} className="text-xs italic">
              {trend === "up" ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {formatValue(predicted)}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-semibold mb-1">AI Forecast</p>
            <p>Next week: {formatValue(predicted)}</p>
            <p>Confidence: {confidence}%</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
