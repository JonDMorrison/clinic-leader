import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useHiddenJaneResources } from "@/hooks/useHiddenJaneResources";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreHorizontal,
  Plus,
  AlertTriangle,
  EyeOff,
  Eye,
  ChevronDown,
  ChevronRight,
  CalendarClock,
  DollarSign,
  Receipt,
  Users,
  Calendar,
  UserCog,
  MapPin,
  Stethoscope,
  Package,
  ClipboardList,
  Building2,
  FileSpreadsheet,
  TrendingUp,
  GripVertical,
  BarChart3,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { AddJaneMetricModal } from "@/components/data/AddJaneMetricModal";
import { CreateIssueFromMetricModal } from "@/components/scorecard/CreateIssueFromMetricModal";
import { MetricBreakdownModal } from "@/components/data/MetricBreakdownModal";
import { format, startOfWeek, startOfYear, subWeeks, subMonths } from "date-fns";
import type { MetricStatus } from "@/lib/scorecard/metricStatus";

// Metrics that have breakdowns available
const BREAKDOWN_IMPORT_KEYS = ["jane_total_visits", "jane_total_invoiced", "jane_total_collected"];

const STORAGE_KEY = "data-metrics-order";

// ===== JANE-SAFE SUPPORTED METRICS =====
// These are the ONLY metrics currently supported by the Jane data pipeline.
// Update this list as more import_keys become production-ready.
export const JANE_SUPPORTED_IMPORT_KEYS = [
  "jane_total_visits",
  "jane_new_patient_visits",
  "jane_no_shows",
  "jane_cancellation_rate",
  "jane_show_rate",
  "jane_total_invoiced",
  "jane_total_collected",
  "jane_avg_revenue_per_visit",
] as const;

// Map import_key to display configuration for supported Jane metrics
const JANE_SUPPORTED_METRICS: Array<{
  import_key: string;
  name: string;
  category: string;
  unit: string;
  direction: string;
}> = [
  { import_key: "jane_total_visits", name: "Total Visits", category: "Appointments", unit: "count", direction: "up" },
  { import_key: "jane_new_patient_visits", name: "New Patient Visits", category: "Appointments", unit: "count", direction: "up" },
  { import_key: "jane_no_shows", name: "No Shows", category: "Appointments", unit: "count", direction: "down" },
  { import_key: "jane_cancellation_rate", name: "Cancellation Rate %", category: "Appointments", unit: "%", direction: "down" },
  { import_key: "jane_show_rate", name: "Show Rate %", category: "Appointments", unit: "%", direction: "up" },
  { import_key: "jane_total_invoiced", name: "Total Invoiced", category: "Invoices", unit: "dollars", direction: "up" },
  { import_key: "jane_total_collected", name: "Total Collected Revenue", category: "Payments", unit: "dollars", direction: "up" },
  { import_key: "jane_avg_revenue_per_visit", name: "Average Revenue Per Visit", category: "Payments", unit: "dollars", direction: "up" },
];

// Template metrics for non-Jane users (hidden when Jane is connected)
const TEMPLATE_METRICS = [
  { name: "Total Revenue", category: "Revenue", unit: "dollars", direction: "up", source: "template" },
  { name: "Total Visits", category: "Visits", unit: "count", direction: "up", source: "template" },
  { name: "New Patient Visits", category: "Visits", unit: "count", direction: "up", source: "template" },
  { name: "Show Rate %", category: "Operations", unit: "%", direction: "up", source: "template" },
  { name: "Cancellation Rate %", category: "Operations", unit: "%", direction: "down", source: "template" },
  { name: "Provider Utilization %", category: "Operations", unit: "%", direction: "up", source: "template" },
  { name: "Average Revenue Per Visit", category: "Revenue", unit: "dollars", direction: "up", source: "template" },
  { name: "Patient Retention %", category: "Patients", unit: "%", direction: "up", source: "template" },
  { name: "No Shows", category: "Operations", unit: "count", direction: "down", source: "template" },
  { name: "Collections Rate %", category: "Revenue", unit: "%", direction: "up", source: "template" },
];

const CATEGORY_ICONS: Record<string, typeof CalendarClock> = {
  Appointments: CalendarClock,
  Payments: DollarSign,
  Invoices: Receipt,
  Patients: Users,
  Shifts: Calendar,
  Staff: UserCog,
  Locations: MapPin,
  Treatments: Stethoscope,
  Products: Package,
  Waitlist: ClipboardList,
  Disciplines: Building2,
  Revenue: DollarSign,
  Visits: CalendarClock,
  Operations: TrendingUp,
};

interface DimensionValue {
  value: string;
  label: string;
}

interface DataMetric {
  id: string; // Unique ID for drag and drop
  name: string;
  category: string;
  source: "jane" | "template" | "manual";
  resourceKey?: string;
  unit: string;
  direction: string;
  comingSoon?: boolean;
  isTracked?: boolean;
  metricId?: string;
  importKey?: string; // For identifying breakdown-capable metrics
  weekValue?: number | null;
  monthValue?: number | null;
  ytdValue?: number | null;
  target?: number | null;
  status?: MetricStatus;
  isDimensional?: boolean;
  dimensions?: DimensionValue[];
  dimensionValue?: string;
  parentName?: string;
  hasBreakdown?: boolean; // Whether this metric has breakdown data available
}

interface DataMetricsTableProps {
  isConnected: boolean;
}

// Sortable row component
function SortableMetricRow({
  metric,
  isChild,
  isHidden,
  isExpanded,
  hasDimensions,
  formatValue,
  getStatusBadge,
  toggleExpanded,
  handleAddToScorecard,
  handleCreateIssue,
  handleHide,
  handleUnhide,
  handleViewBreakdown,
}: {
  metric: DataMetric;
  isChild: boolean;
  isHidden: boolean;
  isExpanded: boolean;
  hasDimensions: boolean;
  formatValue: (value: number | null | undefined, unit: string) => string;
  getStatusBadge: (metric: DataMetric, isChild?: boolean) => React.ReactNode;
  toggleExpanded: (name: string) => void;
  handleAddToScorecard: (metric: DataMetric) => void;
  handleCreateIssue: (metric: DataMetric) => void;
  handleHide: (resourceKey: string) => void;
  handleUnhide: (resourceKey: string) => void;
  handleViewBreakdown: (metric: DataMetric) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: metric.id, disabled: isChild });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : isHidden ? 0.5 : 1,
  };

  const CategoryIcon = CATEGORY_ICONS[metric.category] || FileSpreadsheet;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b transition-colors hover:bg-muted/50 ${isHidden ? 'bg-muted/20' : ''} ${isChild ? 'bg-muted/10' : ''} ${isDragging ? 'bg-muted' : ''}`}
    >
      <TableCell className="font-medium">
        <div className={`flex items-center gap-2 ${isChild ? 'pl-8' : ''}`}>
          {!isChild && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          {isChild && <div className="w-6" />}
          {hasDimensions && !isChild && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 p-0"
              onClick={() => toggleExpanded(metric.name)}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          )}
          {!hasDimensions && !isChild && <div className="w-5" />}
          <CategoryIcon className="w-4 h-4 text-muted-foreground" />
          <span>{metric.dimensionValue || metric.name}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs capitalize whitespace-nowrap">
          {metric.source === "jane" ? "Jane App" : metric.source}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-mono">
        {metric.isTracked ? formatValue(metric.weekValue, metric.unit) : "—"}
      </TableCell>
      <TableCell className="text-right font-mono">
        {metric.isTracked ? formatValue(metric.monthValue, metric.unit) : "—"}
      </TableCell>
      <TableCell className="text-right font-mono">
        {metric.isTracked ? formatValue(metric.ytdValue, metric.unit) : "—"}
      </TableCell>
      <TableCell>{getStatusBadge(metric, isChild)}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {metric.hasBreakdown && metric.metricId && (
              <>
                <DropdownMenuItem onClick={() => handleViewBreakdown(metric)}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Breakdown
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {!metric.isTracked && !metric.comingSoon && (
              <DropdownMenuItem onClick={() => handleAddToScorecard(metric)}>
                <Plus className="w-4 h-4 mr-2" />
                Add to Scorecard
              </DropdownMenuItem>
            )}
            {!metric.comingSoon && (
              <DropdownMenuItem onClick={() => handleCreateIssue(metric)}>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Create Issue
              </DropdownMenuItem>
            )}
            {metric.source === "jane" && metric.resourceKey && !isChild && (
              isHidden ? (
                <DropdownMenuItem onClick={() => handleUnhide(metric.resourceKey!)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Show
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleHide(metric.resourceKey!)}>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Hide
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </tr>
  );
}

export function DataMetricsTable({ isConnected }: DataMetricsTableProps) {
  const { data: currentUser } = useCurrentUser();
  const { hiddenResources, hideResource, unhideResource } = useHiddenJaneResources();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());
  const [metricOrder, setMetricOrder] = useState<string[]>([]);
  const [addMetricModal, setAddMetricModal] = useState<{
    open: boolean;
    resourceKey: string;
    metricName: string;
  }>({ open: false, resourceKey: "", metricName: "" });
  const [createIssueModal, setCreateIssueModal] = useState<{
    open: boolean;
    metric: DataMetric | null;
  }>({ open: false, metric: null });
  const [breakdownModal, setBreakdownModal] = useState<{
    open: boolean;
    metric: DataMetric | null;
  }>({ open: false, metric: null });

  // Load saved order from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setMetricOrder(JSON.parse(saved));
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Save order to localStorage
  const saveOrder = (order: string[]) => {
    setMetricOrder(order);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch tracked metrics
  const { data: trackedMetrics } = useQuery({
    queryKey: ["tracked-metrics", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data } = await supabase
        .from("metrics")
        .select("id, name, target, direction, unit, sync_source")
        .eq("organization_id", currentUser.team_id)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!currentUser?.team_id,
  });

  // Fetch dimension values from Jane staging tables
  const { data: dimensionData } = useQuery({
    queryKey: ["dimension-values", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return {};
      
      const results: Record<string, DimensionValue[]> = {};
      
      try {
        const { data: providers } = await supabase
          .from("staging_invoices_jane")
          .select("staff_member_name")
          .eq("organization_id", currentUser.team_id)
          .not("staff_member_name", "is", null)
          .limit(100);
        
        if (providers) {
          const uniqueProviders = [...new Set(providers.map(p => p.staff_member_name).filter(Boolean))];
          results["Revenue by Provider"] = uniqueProviders.map(p => ({ value: p!, label: p! }));
        }
      } catch (e) {}

      try {
        const { data: locations } = await supabase
          .from("staging_payments_jane")
          .select("location_guid")
          .eq("organization_id", currentUser.team_id)
          .not("location_guid", "is", null)
          .limit(100);
        
        if (locations) {
          const uniqueLocations = [...new Set(locations.map(l => l.location_guid).filter(Boolean))];
          results["Revenue by Location"] = uniqueLocations.map(l => ({ value: l!, label: `Location ${l!.slice(-6)}` }));
        }
      } catch (e) {}

      try {
        const { data: sources } = await supabase
          .from("staging_patients_jane")
          .select("referral_source")
          .eq("organization_id", currentUser.team_id)
          .not("referral_source", "is", null)
          .limit(100);
        
        if (sources) {
          const uniqueSources = [...new Set(sources.map(s => s.referral_source).filter(Boolean))];
          results["Referral Sources"] = uniqueSources.map(s => ({ value: s!, label: s! }));
        }
      } catch (e) {}

      try {
        const { data: disciplines } = await supabase
          .from("staging_invoices_jane")
          .select("income_category")
          .eq("organization_id", currentUser.team_id)
          .not("income_category", "is", null)
          .limit(100);
        
        if (disciplines) {
          const uniqueDisciplines = [...new Set(disciplines.map(d => d.income_category).filter(Boolean))];
          results["Revenue by Discipline"] = uniqueDisciplines.map(d => ({ value: d!, label: d! }));
        }
      } catch (e) {}

      return results;
    },
    enabled: !!currentUser?.team_id && isConnected,
  });

  // Calculate date ranges
  const now = new Date();
  const currentWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const lastWeekStart = format(startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const currentMonthKey = format(now, "yyyy-MM");
  const lastMonthKey = format(subMonths(now, 1), "yyyy-MM");
  const yearStart = format(startOfYear(now), "yyyy-MM-dd");

  // Fetch metric results for time columns
  const { data: metricResults } = useQuery({
    queryKey: ["metric-results-for-data", currentUser?.team_id, trackedMetrics?.map(m => m.id)],
    queryFn: async () => {
      if (!currentUser?.team_id || !trackedMetrics?.length) return { weekly: [], monthly: [], ytd: [] };
      
      const metricIds = trackedMetrics.map(m => m.id);
      
      const { data: weeklyData } = await supabase
        .from("metric_results")
        .select("metric_id, value, week_start")
        .in("metric_id", metricIds)
        .in("week_start", [currentWeekStart, lastWeekStart])
        .eq("period_type", "weekly");

      const { data: monthlyData } = await supabase
        .from("metric_results")
        .select("metric_id, value, period_key")
        .in("metric_id", metricIds)
        .in("period_key", [currentMonthKey, lastMonthKey])
        .eq("period_type", "monthly");

      const { data: ytdData } = await supabase
        .from("metric_results")
        .select("metric_id, value, period_key")
        .in("metric_id", metricIds)
        .eq("period_type", "monthly")
        .gte("period_start", yearStart);

      return {
        weekly: weeklyData || [],
        monthly: monthlyData || [],
        ytd: ytdData || [],
      };
    },
    enabled: !!currentUser?.team_id && !!trackedMetrics?.length,
  });

  // Build the merged data list - JANE-SAFE: Only show supported metrics when Jane is connected
  const rawDataMetrics = useMemo(() => {
    const metrics: DataMetric[] = [];

    if (isConnected) {
      // When Jane is connected, show ONLY the 8 supported pipeline metrics
      JANE_SUPPORTED_METRICS.forEach(janeMetric => {
        // Match by import_key (source of truth) from tracked metrics
        const tracked = trackedMetrics?.find(m => {
          // First try to match by import_key if the metric has it
          const metricWithImportKey = m as typeof m & { import_key?: string };
          if (metricWithImportKey.import_key) {
            return metricWithImportKey.import_key === janeMetric.import_key;
          }
          // Fallback to name matching for compatibility
          return m.name.toLowerCase() === janeMetric.name.toLowerCase();
        });
        
        let weekValue: number | null = null;
        let monthValue: number | null = null;
        let ytdValue: number | null = null;

        if (tracked && metricResults) {
          const weekResult = metricResults.weekly.find(r => r.metric_id === tracked.id && r.week_start === currentWeekStart)
            || metricResults.weekly.find(r => r.metric_id === tracked.id && r.week_start === lastWeekStart);
          weekValue = weekResult?.value ?? null;

          const monthResult = metricResults.monthly.find(r => r.metric_id === tracked.id && r.period_key === currentMonthKey)
            || metricResults.monthly.find(r => r.metric_id === tracked.id && r.period_key === lastMonthKey);
          monthValue = monthResult?.value ?? null;

          const ytdResults = metricResults.ytd.filter(r => r.metric_id === tracked.id);
          ytdValue = ytdResults.length > 0 
            ? ytdResults.reduce((sum, r) => sum + (r.value || 0), 0)
            : null;
        }

        let status: MetricStatus = "needs_data";
        if (tracked && monthValue !== null && tracked.target !== null) {
          const isHigherBetter = tracked.direction === "up" || tracked.direction === "higher_is_better" || tracked.direction === ">=";
          if (isHigherBetter) {
            status = monthValue >= tracked.target ? "on_track" : "off_track";
          } else {
            status = monthValue <= tracked.target ? "on_track" : "off_track";
          }
        } else if (tracked && monthValue !== null) {
          status = "on_track";
        }

        const hasBreakdown = BREAKDOWN_IMPORT_KEYS.includes(janeMetric.import_key);

        metrics.push({
          id: `jane-${janeMetric.import_key}`,
          name: janeMetric.name,
          category: janeMetric.category,
          source: "jane",
          unit: janeMetric.unit,
          direction: janeMetric.direction,
          isTracked: !!tracked,
          metricId: tracked?.id,
          importKey: janeMetric.import_key,
          hasBreakdown,
          weekValue,
          monthValue,
          ytdValue,
          target: tracked?.target,
          status,
        });
      });
    } else {
      // When Jane is NOT connected, show template metrics
      TEMPLATE_METRICS.forEach(templateMetric => {
        const tracked = trackedMetrics?.find(m => m.name.toLowerCase() === templateMetric.name.toLowerCase());
        
        metrics.push({
          id: `template-${templateMetric.name}`,
          name: templateMetric.name,
          category: templateMetric.category,
          source: "template",
          unit: templateMetric.unit,
          direction: templateMetric.direction,
          isTracked: !!tracked,
          metricId: tracked?.id,
        });
      });
    }

    return metrics;
  }, [isConnected, trackedMetrics, metricResults, currentWeekStart, lastWeekStart, currentMonthKey, lastMonthKey]);

  // Apply custom order and search filter
  const dataMetrics = useMemo(() => {
    let metrics = [...rawDataMetrics];
    
    // Apply custom order if exists
    if (metricOrder.length > 0) {
      metrics.sort((a, b) => {
        const aIndex = metricOrder.indexOf(a.id);
        const bIndex = metricOrder.indexOf(b.id);
        // Items not in order go to the end
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }

    // Apply search filter
    if (searchQuery) {
      metrics = metrics.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return metrics;
  }, [rawDataMetrics, metricOrder, searchQuery]);


  const formatValue = (value: number | null | undefined, unit: string): string => {
    if (value === null || value === undefined) return "—";
    if (unit === "dollars") return `$${value.toLocaleString()}`;
    if (unit === "%") return `${value.toFixed(1)}%`;
    return value.toLocaleString();
  };

  const getStatusBadge = (metric: DataMetric, isChild?: boolean) => {
    if (metric.comingSoon) {
      return <Badge variant="outline" className="text-xs">Coming Soon</Badge>;
    }
    if (metric.isDimensional && !isChild && metric.dimensions && metric.dimensions.length > 0) {
      return <Badge variant="secondary" className="text-xs">{metric.dimensions.length} items</Badge>;
    }
    // For Jane-connected orgs: all supported metrics show as "Tracked" 
    // (they're in the pipeline, even if no data yet)
    if (metric.source === "jane") {
      if (metric.isTracked) {
        if (metric.status === "off_track") {
          return <Badge variant="destructive" className="text-xs">Off Track</Badge>;
        }
        if (metric.status === "on_track" && metric.monthValue !== null) {
          return <Badge variant="default" className="text-xs bg-success text-success-foreground">Tracked</Badge>;
        }
      }
      // Supported metric but no data yet
      return <Badge variant="secondary" className="text-xs">Tracked</Badge>;
    }
    if (metric.isTracked) {
      if (metric.status === "off_track") {
        return <Badge variant="destructive" className="text-xs">Off Track</Badge>;
      }
      return <Badge variant="default" className="text-xs bg-success text-success-foreground">Tracked</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Available</Badge>;
  };

  const toggleExpanded = (metricName: string) => {
    const newExpanded = new Set(expandedMetrics);
    if (newExpanded.has(metricName)) {
      newExpanded.delete(metricName);
    } else {
      newExpanded.add(metricName);
    }
    setExpandedMetrics(newExpanded);
  };

  const handleAddToScorecard = (metric: DataMetric) => {
    setAddMetricModal({
      open: true,
      resourceKey: metric.resourceKey || "",
      metricName: metric.dimensionValue 
        ? `${metric.parentName} - ${metric.dimensionValue}` 
        : metric.name,
    });
  };

  const handleCreateIssue = (metric: DataMetric) => {
    setCreateIssueModal({ open: true, metric });
  };

  const handleHide = (resourceKey: string) => {
    hideResource(resourceKey);
  };

  const handleUnhide = (resourceKey: string) => {
    unhideResource(resourceKey);
  };

  const handleViewBreakdown = (metric: DataMetric) => {
    setBreakdownModal({ open: true, metric });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = dataMetrics.findIndex(m => m.id === active.id);
      const newIndex = dataMetrics.findIndex(m => m.id === over.id);
      
      const newOrder = arrayMove(dataMetrics.map(m => m.id), oldIndex, newIndex);
      saveOrder(newOrder);
    }
  };

  return (
    <div className="space-y-4">
      {/* Helper text for Jane-connected orgs */}
      {isConnected && (
        <p className="text-sm text-muted-foreground">
          Showing currently supported Jane pipeline metrics.
        </p>
      )}

      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search metrics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[320px]">Data Point</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">This Week</TableHead>
              <TableHead className="text-right">This Month</TableHead>
              <TableHead className="text-right">YTD</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={dataMetrics.map(m => m.id)}
                strategy={verticalListSortingStrategy}
              >
                {dataMetrics.map((metric) => {
                  const isExpanded = expandedMetrics.has(metric.name);
                  const hasDimensions = metric.isDimensional && metric.dimensions && metric.dimensions.length > 0;
                  const isHidden = metric.resourceKey ? hiddenResources.includes(metric.resourceKey) : false;

                  return (
                    <AnimatePresence key={metric.id} mode="popLayout">
                      <SortableMetricRow
                        metric={metric}
                        isChild={false}
                        isHidden={isHidden}
                        isExpanded={isExpanded}
                        hasDimensions={hasDimensions}
                        formatValue={formatValue}
                        getStatusBadge={getStatusBadge}
                        toggleExpanded={toggleExpanded}
                        handleAddToScorecard={handleAddToScorecard}
                        handleCreateIssue={handleCreateIssue}
                        handleHide={handleHide}
                        handleUnhide={handleUnhide}
                        handleViewBreakdown={handleViewBreakdown}
                      />
                      {/* Render child rows if expanded */}
                      {isExpanded && hasDimensions && metric.dimensions!.map((dim) => {
                        const childMetricName = `${metric.name} - ${dim.label}`;
                        const tracked = trackedMetrics?.find(m => 
                          m.name.toLowerCase() === childMetricName.toLowerCase()
                        );
                        
                        const childMetric: DataMetric = {
                          ...metric,
                          id: `${metric.id}-${dim.value}`,
                          name: childMetricName,
                          dimensionValue: dim.label,
                          parentName: metric.name,
                          isDimensional: false,
                          dimensions: undefined,
                          isTracked: !!tracked,
                          metricId: tracked?.id,
                        };
                        
                        return (
                          <SortableMetricRow
                            key={childMetric.id}
                            metric={childMetric}
                            isChild={true}
                            isHidden={false}
                            isExpanded={false}
                            hasDimensions={false}
                            formatValue={formatValue}
                            getStatusBadge={getStatusBadge}
                            toggleExpanded={toggleExpanded}
                            handleAddToScorecard={handleAddToScorecard}
                            handleCreateIssue={handleCreateIssue}
                            handleHide={handleHide}
                            handleUnhide={handleUnhide}
                            handleViewBreakdown={handleViewBreakdown}
                          />
                        );
                      })}
                    </AnimatePresence>
                  );
                })}
              </SortableContext>
            </DndContext>
            {dataMetrics.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No metrics found. {searchQuery && "Try a different search term."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Metric Modal */}
      <AddJaneMetricModal
        open={addMetricModal.open}
        onOpenChange={(open) => setAddMetricModal(prev => ({ ...prev, open }))}
        resourceKey={addMetricModal.resourceKey}
        metricName={addMetricModal.metricName}
      />

      {/* Create Issue Modal */}
      {createIssueModal.metric && currentUser?.team_id && (
        <CreateIssueFromMetricModal
          open={createIssueModal.open}
          onClose={() => setCreateIssueModal({ open: false, metric: null })}
          organizationId={currentUser.team_id}
          metric={{
            id: createIssueModal.metric.metricId || "",
            name: createIssueModal.metric.name,
            target: createIssueModal.metric.target || null,
            direction: createIssueModal.metric.direction,
            unit: createIssueModal.metric.unit,
            currentValue: createIssueModal.metric.monthValue || null,
            status: createIssueModal.metric.status || "needs_data",
          }}
          periodKey={currentMonthKey}
          periodLabel={format(now, "MMMM yyyy")}
        />
      )}

      {/* Metric Breakdown Modal */}
      {breakdownModal.metric && currentUser?.team_id && (
        <MetricBreakdownModal
          open={breakdownModal.open}
          onOpenChange={(open) => setBreakdownModal({ open, metric: open ? breakdownModal.metric : null })}
          metricName={breakdownModal.metric.name}
          importKey={breakdownModal.metric.importKey || ""}
          organizationId={currentUser.team_id}
          unit={breakdownModal.metric.unit}
        />
      )}
    </div>
  );
}
