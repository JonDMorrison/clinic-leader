import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useHiddenJaneResources } from "@/hooks/useHiddenJaneResources";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AddJaneMetricModal } from "@/components/data/AddJaneMetricModal";
import { CreateIssueFromMetricModal } from "@/components/scorecard/CreateIssueFromMetricModal";
import { format, startOfWeek, startOfYear, subWeeks, subMonths } from "date-fns";
import type { MetricStatus } from "@/lib/scorecard/metricStatus";

// Template metrics for non-Jane users (and as additional options)
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

// Dimensional metrics that can have multiple sub-rows
const DIMENSIONAL_METRICS: Record<string, { 
  dimensionKey: string; 
  dimensionLabel: string;
  table: string;
  column: string;
}> = {
  "Revenue by Provider": { 
    dimensionKey: "provider", 
    dimensionLabel: "Provider",
    table: "staging_invoices_jane",
    column: "staff_member_name"
  },
  "Revenue by Location": { 
    dimensionKey: "location", 
    dimensionLabel: "Location",
    table: "staging_payments_jane",
    column: "location_guid"
  },
  "Referral Sources": { 
    dimensionKey: "referral_source", 
    dimensionLabel: "Source",
    table: "staging_patients_jane",
    column: "referral_source"
  },
  "Revenue by Discipline": {
    dimensionKey: "discipline",
    dimensionLabel: "Discipline",
    table: "staging_invoices_jane",
    column: "income_category"
  },
};

// Jane resource definitions with metrics
const JANE_METRICS = [
  { name: "Total Visits", category: "Appointments", resourceKey: "appointments", unit: "count", direction: "up" },
  { name: "New Patient Visits", category: "Appointments", resourceKey: "appointments", unit: "count", direction: "up" },
  { name: "Show Rate %", category: "Appointments", resourceKey: "appointments", unit: "%", direction: "up" },
  { name: "Cancellation Rate %", category: "Appointments", resourceKey: "appointments", unit: "%", direction: "down" },
  { name: "No Shows", category: "Appointments", resourceKey: "appointments", unit: "count", direction: "down" },
  { name: "Total Collected Revenue", category: "Payments", resourceKey: "payments", unit: "dollars", direction: "up" },
  { name: "Average Revenue Per Visit", category: "Payments", resourceKey: "payments", unit: "dollars", direction: "up" },
  { name: "Total Invoiced", category: "Invoices", resourceKey: "invoices", unit: "dollars", direction: "up" },
  { name: "Revenue by Provider", category: "Invoices", resourceKey: "invoices", unit: "dollars", direction: "up", isDimensional: true },
  { name: "New Patients", category: "Patients", resourceKey: "patients", unit: "count", direction: "up" },
  { name: "Patient Retention", category: "Patients", resourceKey: "patients", unit: "%", direction: "up" },
  { name: "Referral Sources", category: "Patients", resourceKey: "patients", unit: "count", direction: "up", isDimensional: true },
  { name: "Practitioner Utilization", category: "Shifts", resourceKey: "shifts", unit: "%", direction: "up" },
  { name: "Available Hours", category: "Shifts", resourceKey: "shifts", unit: "count", direction: "up" },
  { name: "Provider Scorecards", category: "Staff", resourceKey: "staff_members", unit: "count", direction: "up" },
  { name: "Revenue by Location", category: "Locations", resourceKey: "locations", unit: "dollars", direction: "up", isDimensional: true },
  { name: "Service Mix", category: "Treatments", resourceKey: "treatments", unit: "count", direction: "up" },
  { name: "Revenue by Discipline", category: "Disciplines", resourceKey: "disciplines", unit: "dollars", direction: "up", isDimensional: true },
  // Coming soon
  { name: "Product Sales", category: "Products", resourceKey: "products", unit: "dollars", direction: "up", comingSoon: true },
  { name: "Inventory Turnover", category: "Products", resourceKey: "products", unit: "count", direction: "up", comingSoon: true },
  { name: "Waitlist Conversion", category: "Waitlist", resourceKey: "waitlist", unit: "%", direction: "up", comingSoon: true },
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
  name: string;
  category: string;
  source: "jane" | "template" | "manual";
  resourceKey?: string;
  unit: string;
  direction: string;
  comingSoon?: boolean;
  isTracked?: boolean;
  metricId?: string;
  weekValue?: number | null;
  monthValue?: number | null;
  ytdValue?: number | null;
  target?: number | null;
  status?: MetricStatus;
  isDimensional?: boolean;
  dimensions?: DimensionValue[];
  dimensionValue?: string; // For child rows
  parentName?: string; // For child rows
}

interface DataMetricsTableProps {
  isConnected: boolean;
}

export function DataMetricsTable({ isConnected }: DataMetricsTableProps) {
  const { data: currentUser } = useCurrentUser();
  const { hiddenResources, hideResource, unhideResource } = useHiddenJaneResources();
  const [searchQuery, setSearchQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());
  const [addMetricModal, setAddMetricModal] = useState<{
    open: boolean;
    resourceKey: string;
    metricName: string;
  }>({ open: false, resourceKey: "", metricName: "" });
  const [createIssueModal, setCreateIssueModal] = useState<{
    open: boolean;
    metric: DataMetric | null;
  }>({ open: false, metric: null });

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
      
      // Fetch providers from invoices
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
      } catch (e) {
        // Table may not be accessible
      }

      // Fetch locations from payments
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
      } catch (e) {
        // Table may not be accessible
      }

      // Fetch referral sources from patients
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
      } catch (e) {
        // Table may not be accessible
      }

      // Fetch disciplines/income categories from invoices
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
      } catch (e) {
        // Table may not be accessible
      }

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

  // Build the merged data list
  const dataMetrics = useMemo(() => {
    const metrics: DataMetric[] = [];

    // Add Jane metrics if connected
    if (isConnected) {
      JANE_METRICS.forEach(janeMetric => {
        const isHidden = hiddenResources.includes(janeMetric.resourceKey || "");
        if (isHidden && !showHidden) return;
        
        const tracked = trackedMetrics?.find(m => m.name.toLowerCase() === janeMetric.name.toLowerCase());
        
        // Get time values from results
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

        // Determine status
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

        // Get dimensions if this is a dimensional metric
        const dimensions = janeMetric.isDimensional && dimensionData 
          ? dimensionData[janeMetric.name] || []
          : undefined;

        metrics.push({
          name: janeMetric.name,
          category: janeMetric.category,
          source: "jane",
          resourceKey: janeMetric.resourceKey,
          unit: janeMetric.unit,
          direction: janeMetric.direction,
          comingSoon: janeMetric.comingSoon,
          isTracked: !!tracked,
          metricId: tracked?.id,
          weekValue,
          monthValue,
          ytdValue,
          target: tracked?.target,
          status,
          isDimensional: janeMetric.isDimensional,
          dimensions,
        });
      });
    }

    // Add template metrics that aren't already in Jane list
    TEMPLATE_METRICS.forEach(templateMetric => {
      const alreadyAdded = metrics.some(m => m.name.toLowerCase() === templateMetric.name.toLowerCase());
      if (alreadyAdded) return;

      const tracked = trackedMetrics?.find(m => m.name.toLowerCase() === templateMetric.name.toLowerCase());
      
      metrics.push({
        name: templateMetric.name,
        category: templateMetric.category,
        source: "template",
        unit: templateMetric.unit,
        direction: templateMetric.direction,
        isTracked: !!tracked,
        metricId: tracked?.id,
      });
    });

    // Filter by search
    if (searchQuery) {
      return metrics.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return metrics;
  }, [isConnected, trackedMetrics, metricResults, hiddenResources, showHidden, searchQuery, currentWeekStart, lastWeekStart, currentMonthKey, lastMonthKey, dimensionData]);

  // Count hidden
  const hiddenCount = isConnected 
    ? JANE_METRICS.filter(m => hiddenResources.includes(m.resourceKey || "")).length
    : 0;

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

  const renderMetricRow = (metric: DataMetric, isChild = false) => {
    const isHidden = metric.resourceKey && hiddenResources.includes(metric.resourceKey);
    const CategoryIcon = CATEGORY_ICONS[metric.category] || FileSpreadsheet;
    const isExpanded = expandedMetrics.has(metric.name);
    const hasDimensions = metric.isDimensional && metric.dimensions && metric.dimensions.length > 0;
    
    return (
      <motion.tr
        key={`${metric.source}-${metric.name}${metric.dimensionValue ? `-${metric.dimensionValue}` : ''}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: isHidden ? 0.5 : 1 }}
        exit={{ opacity: 0 }}
        className={`border-b transition-colors hover:bg-muted/50 ${isHidden ? 'bg-muted/20' : ''} ${isChild ? 'bg-muted/10' : ''}`}
      >
        <TableCell className="font-medium">
          <div className={`flex items-center gap-2 ${isChild ? 'pl-6' : ''}`}>
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
            {isChild && <div className="w-2" />}
            <CategoryIcon className="w-4 h-4 text-muted-foreground" />
            <span>{metric.dimensionValue || metric.name}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs capitalize">
            {metric.source === "jane" ? "Jane App" : metric.source}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground">{metric.category}</TableCell>
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
              {!metric.isTracked && !metric.comingSoon && (
                <DropdownMenuItem onClick={() => handleAddToScorecard(metric)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Scorecard
                </DropdownMenuItem>
              )}
              {metric.isTracked && metric.status === "off_track" && (
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
      </motion.tr>
    );
  };

  return (
    <div className="space-y-4">
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
        {hiddenCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHidden(!showHidden)}
            className="text-muted-foreground"
          >
            <EyeOff className="w-4 h-4 mr-1" />
            {hiddenCount} hidden
            <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showHidden ? 'rotate-180' : ''}`} />
          </Button>
        )}
      </div>

      {/* Data Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Data Point</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">This Week</TableHead>
              <TableHead className="text-right">This Month</TableHead>
              <TableHead className="text-right">YTD</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {dataMetrics.map((metric) => {
                const isExpanded = expandedMetrics.has(metric.name);
                const hasDimensions = metric.isDimensional && metric.dimensions && metric.dimensions.length > 0;

                return (
                  <>
                    {renderMetricRow(metric)}
                    {/* Render child rows if expanded */}
                    {isExpanded && hasDimensions && metric.dimensions!.map((dim) => {
                      // Check if this specific dimension is tracked
                      const childMetricName = `${metric.name} - ${dim.label}`;
                      const tracked = trackedMetrics?.find(m => 
                        m.name.toLowerCase() === childMetricName.toLowerCase()
                      );
                      
                      const childMetric: DataMetric = {
                        ...metric,
                        name: childMetricName,
                        dimensionValue: dim.label,
                        parentName: metric.name,
                        isDimensional: false,
                        dimensions: undefined,
                        isTracked: !!tracked,
                        metricId: tracked?.id,
                      };
                      
                      return renderMetricRow(childMetric, true);
                    })}
                  </>
                );
              })}
            </AnimatePresence>
            {dataMetrics.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
    </div>
  );
}
