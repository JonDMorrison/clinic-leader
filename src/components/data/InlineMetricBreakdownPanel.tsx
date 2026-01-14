import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { UserCog, MapPin, Stethoscope, Calendar, CalendarDays, TrendingUp, X, ChevronDown } from "lucide-react";
import { format, startOfWeek } from "date-fns";

interface BreakdownData {
  dimension_type: string;
  dimension_id: string;
  dimension_label: string;
  value: number;
  period_type: string;
  period_key: string;
}

interface InlineMetricBreakdownPanelProps {
  importKey: string;
  metricName: string;
  unit: string;
  organizationId: string;
  onClose: () => void;
}

// Which dimensions are available for each metric
const METRIC_DIMENSIONS: Record<string, string[]> = {
  jane_total_visits: ["clinician", "discipline", "location"],
  jane_total_invoiced: ["clinician", "location"],
  jane_total_collected: ["location"],
};

const DIMENSION_CONFIG: Record<string, { label: string; icon: typeof UserCog }> = {
  clinician: { label: "Clinician", icon: UserCog },
  location: { label: "Location", icon: MapPin },
  discipline: { label: "Discipline", icon: Stethoscope },
};

type PeriodType = "weekly" | "monthly" | "ytd";

const PERIOD_OPTIONS: { value: PeriodType; label: string; icon: typeof Calendar }[] = [
  { value: "weekly", label: "This Week", icon: Calendar },
  { value: "monthly", label: "This Month", icon: CalendarDays },
  { value: "ytd", label: "YTD", icon: TrendingUp },
];

// Cache for breakdown results
const breakdownCache = new Map<string, BreakdownData[]>();

function getCacheKey(importKey: string, periodType: string, organizationId: string): string {
  return `${organizationId}-${importKey}-${periodType}`;
}

export function InlineMetricBreakdownPanel({
  importKey,
  metricName,
  unit,
  organizationId,
  onClose,
}: InlineMetricBreakdownPanelProps) {
  const dimensions = METRIC_DIMENSIONS[importKey] || [];
  const defaultDimension = dimensions.includes("clinician") ? "clinician" : dimensions[0] || "location";
  
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("weekly");
  const [selectedDimension, setSelectedDimension] = useState(defaultDimension);
  const [showAll, setShowAll] = useState(false);

  // Calculate the period key that matches what jane-kpi-rollup writes
  const periodKey = useMemo(() => {
    const now = new Date();
    if (selectedPeriod === "weekly") {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      return weekStart.toISOString().slice(0, 10);
    } else if (selectedPeriod === "monthly") {
      return format(now, "yyyy-MM");
    } else {
      return `${now.getFullYear()}-YTD`;
    }
  }, [selectedPeriod]);

  const cacheKey = getCacheKey(importKey, selectedPeriod, organizationId);

  const { data: breakdowns, isLoading } = useQuery({
    queryKey: ["inline-metric-breakdowns", importKey, selectedPeriod, periodKey, organizationId],
    queryFn: async () => {
      // Check cache first
      const cached = breakdownCache.get(cacheKey);
      if (cached) return cached;

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

      const result = data as BreakdownData[];
      // Cache the result
      breakdownCache.set(cacheKey, result);
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
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
      .sort((a, b) => b.value - a.value);
  };

  const getTotalForDimension = (dimensionType: string): number => {
    const items = getBreakdownsByDimension(dimensionType);
    return items.reduce((sum, item) => sum + item.value, 0);
  };

  const items = getBreakdownsByDimension(selectedDimension);
  const total = getTotalForDimension(selectedDimension);
  const displayItems = showAll ? items : items.slice(0, 10);
  const hasMore = items.length > 10;

  return (
    <div className="bg-muted/30 border-x border-b rounded-b-lg p-4 -mt-px">
      {/* Header with period selector and close button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">{metricName} Breakdown</span>
          <ToggleGroup 
            type="single" 
            value={selectedPeriod} 
            onValueChange={(value) => value && setSelectedPeriod(value as PeriodType)}
            className="bg-background border rounded-md"
            size="sm"
          >
            {PERIOD_OPTIONS.map((option) => (
              <ToggleGroupItem 
                key={option.value} 
                value={option.value}
                className="text-xs px-3 h-7 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 px-2">
          <X className="w-4 h-4" />
          <span className="ml-1 text-xs">Close</span>
        </Button>
      </div>

      {/* Dimension tabs */}
      {dimensions.length > 1 && (
        <Tabs value={selectedDimension} onValueChange={setSelectedDimension} className="mb-3">
          <TabsList className="h-8">
            {dimensions.map((dim) => {
              const config = DIMENSION_CONFIG[dim];
              const Icon = config?.icon || UserCog;
              return (
                <TabsTrigger key={dim} value={dim} className="text-xs px-3 h-7 flex items-center gap-1.5">
                  <Icon className="w-3 h-3" />
                  {config?.label || dim}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      )}

      {/* Breakdown table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground text-sm">
          No data received for this period yet.
        </div>
      ) : (
        <div className="border rounded-md bg-background">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[40px] text-xs h-8">#</TableHead>
                <TableHead className="text-xs h-8">Name</TableHead>
                <TableHead className="text-right text-xs h-8">Value</TableHead>
                <TableHead className="text-right w-[80px] text-xs h-8">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayItems.map((item, index) => {
                const percentage = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <TableRow key={item.dimension_id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-muted-foreground text-xs py-2">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-sm py-2">
                      {item.dimension_label}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm py-2">
                      {formatValue(item.value)}
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {percentage.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Total row */}
              <TableRow className="bg-muted/50 font-semibold hover:bg-muted/50">
                <TableCell className="py-2"></TableCell>
                <TableCell className="text-sm py-2">Total</TableCell>
                <TableCell className="text-right font-mono text-sm py-2">
                  {formatValue(total)}
                </TableCell>
                <TableCell className="text-right py-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    100%
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          
          {/* Show all / Show less toggle */}
          {hasMore && (
            <div className="border-t p-2 text-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAll(!showAll)}
                className="text-xs h-7"
              >
                <ChevronDown className={`w-3 h-3 mr-1 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                {showAll ? `Show less` : `Show all ${items.length} items`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
