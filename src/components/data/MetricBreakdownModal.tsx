import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { UserCog, MapPin, Stethoscope, Calendar, CalendarDays, TrendingUp } from "lucide-react";
import { format, startOfWeek, startOfMonth } from "date-fns";

interface BreakdownData {
  dimension_type: string;
  dimension_id: string;
  dimension_label: string;
  value: number;
  period_type: string;
  period_key: string;
}

interface MetricBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricName: string;
  importKey: string;
  organizationId: string;
  unit: string;
}

// Which dimensions are available for each metric
const METRIC_DIMENSIONS: Record<string, string[]> = {
  jane_total_visits: ["clinician", "location", "discipline"],
  jane_total_invoiced: ["clinician", "location"],
  jane_total_collected: ["location"], // Clinician not reliably available
};

const DIMENSION_CONFIG: Record<string, { label: string; icon: typeof UserCog }> = {
  clinician: { label: "Clinicians", icon: UserCog },
  location: { label: "Locations", icon: MapPin },
  discipline: { label: "Disciplines", icon: Stethoscope },
};

type PeriodType = "weekly" | "monthly" | "ytd";

const PERIOD_OPTIONS: { value: PeriodType; label: string; icon: typeof Calendar }[] = [
  { value: "weekly", label: "This Week", icon: Calendar },
  { value: "monthly", label: "This Month", icon: CalendarDays },
  { value: "ytd", label: "YTD", icon: TrendingUp },
];

export function MetricBreakdownModal({
  open,
  onOpenChange,
  metricName,
  importKey,
  organizationId,
  unit,
}: MetricBreakdownModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("monthly");
  
  const dimensions = METRIC_DIMENSIONS[importKey] || [];

  // Calculate period key based on selected period
  const now = new Date();
  const periodKey = (() => {
    if (selectedPeriod === "weekly") {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      return weekStart.toISOString().slice(0, 10);
    } else if (selectedPeriod === "monthly") {
      return format(now, "yyyy-MM");
    } else {
      return `${now.getFullYear()}-YTD`;
    }
  })();

  const periodLabel = (() => {
    if (selectedPeriod === "weekly") {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      return `Week of ${format(weekStart, "MMM d, yyyy")}`;
    } else if (selectedPeriod === "monthly") {
      return format(startOfMonth(now), "MMMM yyyy");
    } else {
      return `Year to Date (${now.getFullYear()})`;
    }
  })();

  const { data: breakdowns, isLoading } = useQuery({
    queryKey: ["metric-breakdowns", importKey, selectedPeriod, periodKey, organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metric_breakdowns")
        .select("dimension_type, dimension_id, dimension_label, value, period_type, period_key")
        .eq("import_key", importKey)
        .eq("period_type", selectedPeriod)
        .eq("period_key", periodKey)
        .eq("organization_id", organizationId);

      if (error) {
        console.error("Error fetching breakdowns:", error);
        return [];
      }
      
      return data as BreakdownData[];
    },
    enabled: open && !!importKey,
  });

  const formatValue = (value: number): string => {
    if (unit === "dollars" || unit === "$") {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (unit === "%") {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  const getBreakdownsByDimension = (dimensionType: string): BreakdownData[] => {
    if (!breakdowns) return [];
    return breakdowns
      .filter(b => b.dimension_type === dimensionType)
      .sort((a, b) => b.value - a.value); // Sort descending by value
  };

  const getTotalForDimension = (dimensionType: string): number => {
    const items = getBreakdownsByDimension(dimensionType);
    return items.reduce((sum, item) => sum + item.value, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{metricName} Breakdown</DialogTitle>
          <DialogDescription>
            {periodLabel}
          </DialogDescription>
        </DialogHeader>

        {/* Period Selector */}
        <div className="flex justify-center mb-4">
          <ToggleGroup 
            type="single" 
            value={selectedPeriod} 
            onValueChange={(value) => value && setSelectedPeriod(value as PeriodType)}
            className="bg-muted rounded-lg p-1"
          >
            {PERIOD_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <ToggleGroupItem 
                  key={option.value} 
                  value={option.value}
                  className="flex items-center gap-2 px-4 data-[state=on]:bg-background data-[state=on]:shadow-sm"
                >
                  <Icon className="w-4 h-4" />
                  {option.label}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </div>

        {dimensions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No breakdowns available for this metric.
          </div>
        ) : (
          <Tabs defaultValue={dimensions[0]} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${dimensions.length}, 1fr)` }}>
              {dimensions.map((dim) => {
                const config = DIMENSION_CONFIG[dim];
                const Icon = config?.icon || UserCog;
                return (
                  <TabsTrigger key={dim} value={dim} className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {config?.label || dim}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {dimensions.map((dim) => {
              const items = getBreakdownsByDimension(dim);
              const total = getTotalForDimension(dim);

              return (
                <TabsContent key={dim} value={dim} className="flex-1 overflow-auto mt-4">
                  {isLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : items.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No data available for this dimension in the selected period.
                    </div>
                  ) : (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                            <TableHead className="text-right w-[100px]">% of Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, index) => {
                            const percentage = total > 0 ? (item.value / total) * 100 : 0;
                            return (
                              <TableRow key={item.dimension_id}>
                                <TableCell className="font-mono text-muted-foreground">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {item.dimension_label}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatValue(item.value)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline" className="font-mono">
                                    {percentage.toFixed(1)}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {/* Total row */}
                          <TableRow className="bg-muted/50 font-semibold">
                            <TableCell></TableCell>
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatValue(total)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className="font-mono">
                                100%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
