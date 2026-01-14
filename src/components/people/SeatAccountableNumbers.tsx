import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, TrendingUp, TrendingDown, ExternalLink, Hash } from "lucide-react";
import { useSeatMetrics, SeatMetric } from "@/hooks/useSeatMetrics";

interface SeatAccountableNumbersProps {
  seatId: string;
  organizationId: string | undefined;
}

function formatImportKey(key: string): string {
  // Convert import_key like "jane_total_visits" to "Total Visits"
  return key
    .replace(/^jane_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatValue(value: number | null, importKey: string): string {
  if (value === null) return "—";
  
  if (importKey.includes("invoiced") || importKey.includes("revenue") || importKey.includes("amount")) {
    return value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value.toFixed(0)}`;
  }
  
  return value.toLocaleString();
}

export function SeatAccountableNumbers({ seatId, organizationId }: SeatAccountableNumbersProps) {
  const navigate = useNavigate();
  const { metrics, isLoading } = useSeatMetrics(seatId, organizationId);

  if (isLoading) {
    return (
      <div className="space-y-3 pt-3 border-t border-border">
        <h4 className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
          <Hash className="w-4 h-4" />
          Accountable Numbers
        </h4>
        <div className="animate-pulse space-y-2">
          <div className="h-16 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="space-y-3 pt-3 border-t border-border">
        <h4 className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
          <Hash className="w-4 h-4" />
          Accountable Numbers
        </h4>
        <p className="text-sm text-muted-foreground">
          No metrics assigned to this seat. Link metrics from the Data page.
        </p>
      </div>
    );
  }

  const handleViewInData = (metric: SeatMetric) => {
    // Build URL to /data with query params to expand the right metric/dimension
    const params = new URLSearchParams();
    if (metric.import_key) params.set("import_key", metric.import_key);
    if (metric.dimension_id) params.set("dimension_id", metric.dimension_id);
    if (metric.dimension_type) params.set("dimension_type", metric.dimension_type);
    
    navigate(`/data?${params.toString()}`);
  };

  return (
    <div className="space-y-3 pt-3 border-t border-border">
      <h4 className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
        <Hash className="w-4 h-4" />
        Accountable Numbers ({metrics.length})
      </h4>
      
      <div className="grid gap-3">
        {metrics.map((metric) => (
          <div 
            key={metric.id} 
            className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => handleViewInData(metric)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium text-sm truncate">
                    {formatImportKey(metric.import_key)}
                  </span>
                </div>
                {metric.dimension_label && (
                  <Badge variant="outline" className="text-xs">
                    {metric.dimension_label}
                  </Badge>
                )}
              </div>
              
              <div className="text-right shrink-0">
                <div className="text-lg font-bold">
                  {formatValue(metric.currentValue, metric.import_key)}
                </div>
                {metric.trend !== null && (
                  <div className={`flex items-center justify-end gap-0.5 text-xs ${
                    metric.trend > 0 
                      ? "text-emerald-600 dark:text-emerald-400" 
                      : metric.trend < 0 
                        ? "text-destructive" 
                        : "text-muted-foreground"
                  }`}>
                    {metric.trend > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : metric.trend < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : null}
                    {metric.trend !== 0 && `${Math.abs(metric.trend)}%`}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-end mt-2">
              <Button variant="ghost" size="sm" className="h-6 text-xs">
                <ExternalLink className="w-3 h-3 mr-1" />
                View in Data
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
