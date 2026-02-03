import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";

interface OutcomeRowProps {
  metricName: string;
  baselineValue: number | null;
  currentValue: number | null;
  actualDeltaValue: number | null;
  actualDeltaPercent: number | null;
  evaluationPeriodStart: string;
  evaluationPeriodEnd: string;
  evaluatedAt: string;
}

export function OutcomeRow({
  metricName,
  baselineValue,
  currentValue,
  actualDeltaValue,
  actualDeltaPercent,
  evaluationPeriodStart,
  evaluationPeriodEnd,
  evaluatedAt,
}: OutcomeRowProps) {
  const formatPeriod = (dateStr: string) => {
    try {
      return format(new Date(dateStr + "T00:00:00"), "MMM yyyy");
    } catch {
      return dateStr;
    }
  };

  const getDeltaIcon = () => {
    if (actualDeltaValue === null) return <Minus className="h-4 w-4" />;
    if (actualDeltaValue > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (actualDeltaValue < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4" />;
  };

  const getDeltaColor = () => {
    if (actualDeltaValue === null) return "text-muted-foreground";
    if (actualDeltaValue > 0) return "text-green-600 dark:text-green-400";
    if (actualDeltaValue < 0) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };

  return (
    <div className="p-4 rounded-lg border bg-card space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium">{metricName}</h4>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Calendar className="h-3 w-3" />
            <span>
              {formatPeriod(evaluationPeriodStart)} → {formatPeriod(evaluationPeriodEnd)}
            </span>
          </div>
        </div>
        <Badge variant="outline" className={getDeltaColor()}>
          {getDeltaIcon()}
          <span className="ml-1">
            {actualDeltaPercent !== null
              ? `${actualDeltaPercent > 0 ? "+" : ""}${actualDeltaPercent.toFixed(1)}%`
              : "N/A"}
          </span>
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Baseline</p>
          <p className="font-medium">
            {baselineValue !== null ? baselineValue.toLocaleString() : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Current</p>
          <p className="font-medium">
            {currentValue !== null ? currentValue.toLocaleString() : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Change</p>
          <p className={`font-medium ${getDeltaColor()}`}>
            {actualDeltaValue !== null
              ? `${actualDeltaValue > 0 ? "+" : ""}${actualDeltaValue.toLocaleString()}`
              : "—"}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Evaluated {format(new Date(evaluatedAt), "MMM d, yyyy 'at' h:mm a")}
      </p>
    </div>
  );
}
