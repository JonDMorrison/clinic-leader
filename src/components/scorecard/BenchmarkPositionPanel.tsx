import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, TrendingDown, Minus, Lock } from "lucide-react";
import { startOfMonth, subMonths, format } from "date-fns";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { canAccessAdmin } from "@/lib/permissions";

interface BenchmarkPositionPanelProps {
  metricId: string;
}

interface BenchmarkSummary {
  team_value: number | null;
  cohort_name: string | null;
  cohort_p25: number | null;
  cohort_p50: number | null;
  cohort_p75: number | null;
  cohort_n_orgs: number;
  bucket_label: string;
  percentile_position: number | null;
  computed_at: string | null;
}

const bucketLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  top_25: {
    label: "Top 25%",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: <TrendingUp className="h-4 w-4" />,
  },
  above_median: {
    label: "Above Median",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    icon: <TrendingUp className="h-4 w-4" />,
  },
  below_median: {
    label: "Below Median",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    icon: <TrendingDown className="h-4 w-4" />,
  },
  bottom_25: {
    label: "Bottom 25%",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    icon: <TrendingDown className="h-4 w-4" />,
  },
  no_data: {
    label: "No Data",
    color: "bg-muted text-muted-foreground",
    icon: <Minus className="h-4 w-4" />,
  },
  no_benchmark_data: {
    label: "Benchmark Not Available",
    color: "bg-muted text-muted-foreground",
    icon: <Minus className="h-4 w-4" />,
  },
  insufficient_cohort_data: {
    label: "Insufficient Peer Data",
    color: "bg-muted text-muted-foreground",
    icon: <Minus className="h-4 w-4" />,
  },
};

export function BenchmarkPositionPanel({ metricId }: BenchmarkPositionPanelProps) {
  const { data: roleData, isLoading: roleLoading } = useIsAdmin();
  const isAdmin = canAccessAdmin(roleData);

  // Calculate last month's period
  const lastMonth = startOfMonth(subMonths(new Date(), 1));
  const periodStart = format(lastMonth, "yyyy-MM-dd");

  const { data: benchmark, isLoading, error } = useQuery({
    queryKey: ["benchmark-position", metricId, periodStart],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("org_get_benchmark_summary", {
        _metric_id: metricId,
        _period_type: "monthly",
        _period_start: periodStart,
      });
      
      if (error) {
        // Silently fail for non-admins or permission errors
        if (error.message.includes("Permission denied")) {
          return null;
        }
        throw error;
      }
      
      return (data as BenchmarkSummary[])?.[0] || null;
    },
    enabled: !!metricId && isAdmin,
    retry: false,
  });

  // Don't show panel if not admin
  if (roleLoading) {
    return null;
  }

  if (!isAdmin) {
    return (
      <Card className="border-muted">
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Benchmark data available for admins</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Benchmark Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !benchmark) {
    return null; // Silently hide if no data
  }

  const bucketInfo = bucketLabels[benchmark.bucket_label] || bucketLabels.no_data;
  const hasData = benchmark.bucket_label !== "no_data" && 
                  benchmark.bucket_label !== "no_benchmark_data" &&
                  benchmark.bucket_label !== "insufficient_cohort_data";

  const formatNumber = (value: number | null) => {
    if (value === null) return "—";
    return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Benchmark Position
          <Badge variant="outline" className="ml-auto text-xs font-normal">
            {format(lastMonth, "MMMM yyyy")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Position Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Your Position</span>
          <Badge className={`gap-1 ${bucketInfo.color}`}>
            {bucketInfo.icon}
            {bucketInfo.label}
          </Badge>
        </div>

        {hasData && (
          <>
            {/* Value comparison */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block">Your Value</span>
                <span className="font-semibold text-lg">
                  {formatNumber(benchmark.team_value)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Peer Median</span>
                <span className="font-semibold text-lg">
                  {formatNumber(benchmark.cohort_p50)}
                </span>
              </div>
            </div>

            {/* Percentile range */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>P25: {formatNumber(benchmark.cohort_p25)}</span>
                <span>P50: {formatNumber(benchmark.cohort_p50)}</span>
                <span>P75: {formatNumber(benchmark.cohort_p75)}</span>
              </div>
              
              {/* Visual bar */}
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1/4 bg-red-200" />
                <div className="absolute inset-y-0 left-1/4 w-1/4 bg-amber-200" />
                <div className="absolute inset-y-0 left-1/2 w-1/4 bg-blue-200" />
                <div className="absolute inset-y-0 left-3/4 w-1/4 bg-green-200" />
                
                {/* Position indicator */}
                {benchmark.team_value !== null && benchmark.cohort_p25 !== null && benchmark.cohort_p75 !== null && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background shadow"
                    style={{
                      left: `${Math.min(100, Math.max(0, 
                        benchmark.bucket_label === "bottom_25" ? 12.5 :
                        benchmark.bucket_label === "below_median" ? 37.5 :
                        benchmark.bucket_label === "above_median" ? 62.5 : 87.5
                      ))}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                )}
              </div>
            </div>

            {/* Cohort info */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Compared to {benchmark.cohort_n_orgs} peer organizations
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
