import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Activity, DollarSign, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserMetricsSummary {
  totalVisits: number | null;
  totalInvoiced: number | null;
  visitsTrend: number | null;
  invoicedTrend: number | null;
  isLinked: boolean;
  dimensionLabel: string | null;
}

interface UserMetricsBadgeProps {
  metrics: UserMetricsSummary;
  compact?: boolean;
}

function TrendIndicator({ trend }: { trend: number | null }) {
  if (trend === null) return null;
  
  if (trend > 0) {
    return (
      <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="h-3 w-3" />
        <span className="text-[10px]">{trend}%</span>
      </span>
    );
  } else if (trend < 0) {
    return (
      <span className="flex items-center gap-0.5 text-destructive">
        <TrendingDown className="h-3 w-3" />
        <span className="text-[10px]">{Math.abs(trend)}%</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-muted-foreground">
      <Minus className="h-3 w-3" />
    </span>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
}

export function UserMetricsBadge({ metrics, compact = false }: UserMetricsBadgeProps) {
  if (!metrics.isLinked) {
    return null;
  }

  const hasData = metrics.totalVisits !== null || metrics.totalInvoiced !== null;

  if (!hasData) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Link2 className="h-3 w-3" />
        <span className="text-[10px]">Linked</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1 justify-center mt-1">
        {metrics.totalVisits !== null && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
            <Activity className="h-2.5 w-2.5" />
            {metrics.totalVisits}
            <TrendIndicator trend={metrics.visitsTrend} />
          </Badge>
        )}
        {metrics.totalInvoiced !== null && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
            <DollarSign className="h-2.5 w-2.5" />
            {formatCurrency(metrics.totalInvoiced)}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2 bg-muted/50 rounded-md text-xs">
      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
        This Week
      </div>
      <div className="flex items-center gap-3">
        {metrics.totalVisits !== null && (
          <div className="flex items-center gap-1">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">{metrics.totalVisits}</span>
            <span className="text-muted-foreground">visits</span>
            <TrendIndicator trend={metrics.visitsTrend} />
          </div>
        )}
        {metrics.totalInvoiced !== null && (
          <div className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">{formatCurrency(metrics.totalInvoiced)}</span>
            <TrendIndicator trend={metrics.invoicedTrend} />
          </div>
        )}
      </div>
    </div>
  );
}
