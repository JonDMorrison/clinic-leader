import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Star, GripVertical, Sparkles, FileDown, Upload, FileSpreadsheet, MoreHorizontal, Trash2, RotateCcw, Settings } from "lucide-react";
import { HelpHint } from "@/components/help/HelpHint";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { metricStatus, normalizeDirection } from "@/lib/scorecard/metricStatus";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useOrgSafetyCheck } from "@/hooks/useOrgSafetyCheck";
import { supabase } from "@/integrations/supabase/client";
import { AddKpiModal } from "@/components/scorecard/AddKpiModal";
import { LoadDefaultsDialog } from "@/components/scorecard/LoadDefaultsDialog";
import { ScorecardOnboardingWizard } from "@/components/scorecard/ScorecardOnboardingWizard";
import { CreateFromVTODialog } from "@/components/scorecard/CreateFromVTODialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { MetricCard } from "@/components/scorecard/MetricCard";
import { MetricDetailsDrawer } from "@/components/scorecard/MetricDetailsDrawer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfWeek, subWeeks, format } from "date-fns";
import { AlertsPanel } from "@/components/scorecard/AlertsPanel";
import { PerformanceScoreCard } from "@/components/scorecard/PerformanceScoreCard";
import { MilestoneCelebration } from "@/components/scorecard/MilestoneCelebration";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TemplateSetupBanner } from "@/components/scorecard/TemplateSetupBanner";

const Scorecard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [addKpiModalOpen, setAddKpiModalOpen] = useState(false);
  const [loadDefaultsOpen, setLoadDefaultsOpen] = useState(false);
  const [createFromVTOOpen, setCreateFromVTOOpen] = useState(false);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [celebratingMilestone, setCelebratingMilestone] = useState<any>(null);
  const [customOrder, setCustomOrder] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Use the shared hook for proper impersonation support
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { orgId, isValid, OrgMissingError } = useOrgSafetyCheck();
  const queryClient = useQueryClient();

  // Delete metric mutation
  const deleteMetricMutation = useMutation({
    mutationFn: async (metricId: string) => {
      const { error } = await supabase
        .from("metrics")
        .delete()
        .eq("id", metricId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scorecard-metrics"] });
    },
  });

  const handleDeleteMetric = (metricId: string) => {
    deleteMetricMutation.mutate(metricId);
  };

  // Reset all metrics mutation
  const resetScorecardMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.team_id) throw new Error("No organization");
      const { error } = await supabase
        .from("metrics")
        .delete()
        .eq("organization_id", currentUser.team_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scorecard-metrics"] });
    },
  });

  const handleResetScorecard = () => {
    const metricCount = metricsData?.length || 0;
    if (confirm(`⚠️ Reset Scorecard?\n\nThis will permanently delete all ${metricCount} metric${metricCount !== 1 ? 's' : ''} from your scorecard.\n\nThis action cannot be undone.`)) {
      resetScorecardMutation.mutate();
    }
  };

  // Fetch metrics with last 12 weeks of data
  const { data: metricsData, isLoading, isError, refetch } = useQuery({
    queryKey: ["scorecard-metrics", orgId],
    queryFn: async () => {
      if (!orgId) return []; // MULTI-TENANCY: Guard against missing org

      // Get last 12 weeks
      const weeks = Array.from({ length: 12 }, (_, i) => {
        const date = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
        return format(date, "yyyy-MM-dd");
      }).reverse();

      const { data: metrics, error: metricsError } = await supabase
        .from("metrics")
        .select("*, is_favorite")
        .eq("organization_id", currentUser.team_id)
        .order("is_favorite", { ascending: false })
        .order("category")
        .order("name");

      if (metricsError) throw metricsError;

      // Fetch all metric results for last 12 weeks
      const metricIds = metrics?.map(m => m.id) || [];
      const { data: results, error: resultsError } = await supabase
        .from("metric_results")
        .select("*")
        .in("metric_id", metricIds)
        .in("week_start", weeks)
        .order("week_start", { ascending: true });

      if (resultsError) throw resultsError;

      // Fetch owner names
      const ownerIds = Array.from(new Set(metrics?.map(m => m.owner).filter(Boolean) || []));
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", ownerIds);

      const userMap = users?.reduce((acc, u) => {
        acc[u.id] = u.full_name;
        return acc;
      }, {} as Record<string, string>) || {};

      // Group results by metric
      const resultsByMetric = results?.reduce((acc, r) => {
        if (!acc[r.metric_id]) acc[r.metric_id] = [];
        acc[r.metric_id].push(r);
        return acc;
      }, {} as Record<string, any[]>) || {};

      // Enrich metrics with computed data
      return metrics?.map(metric => {
        const metricResults = resultsByMetric[metric.id] || [];
        const last8 = metricResults.slice(-8);
        const current = metricResults[metricResults.length - 1];

        return {
          id: metric.id,
          name: metric.name,
          category: metric.category,
          unit: metric.unit,
          target: metric.target,
          direction: metric.direction,
          sync_source: metric.sync_source,
          owner_name: metric.owner ? userMap[metric.owner] : null,
          current_value: current?.value || null,
          last_8_weeks: last8.map(r => r.value),
          is_favorite: metric.is_favorite || false,
        };
      }) || [];
    },
    enabled: !!currentUser?.team_id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: users } = useQuery({
    queryKey: ["users", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];

      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("team_id", currentUser.team_id)
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  const { data: janeIntegration } = useQuery({
    queryKey: ["jane-integration", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;

      const { data } = await supabase
        .from("jane_integrations")
        .select("*")
        .eq("organization_id", currentUser.team_id)
        .eq("status", "connected")
        .maybeSingle();

      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  // Check if org has an active VTO for the "Create from VTO" button
  const { data: hasActiveVTO } = useQuery({
    queryKey: ["has-active-vto", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return false;

      const { data, error } = await supabase
        .from("vto")
        .select("id")
        .eq("organization_id", currentUser.team_id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error checking VTO:", error);
        return false;
      }
      return !!data;
    },
    enabled: !!currentUser?.team_id,
  });

  // Auto-generate alerts when data is loaded
  useQuery({
    queryKey: ["generate-alerts", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id || !metricsData || metricsData.length === 0) return null;

      // Import dynamically to avoid circular deps
      const { generateAlertsForOrganization } = await import("@/lib/alerts/alertGenerator");
      await generateAlertsForOrganization(currentUser.team_id);
      return true;
    },
    enabled: !!currentUser?.team_id && !!metricsData && metricsData.length > 0,
    staleTime: 10 * 60 * 1000, // Only regenerate every 10 minutes
    retry: false,
  });

  // Check for uncelebrated milestones
  useQuery({
    queryKey: ["uncelebrated-milestones", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;

      const { data, error } = await supabase
        .from("metric_milestones")
        .select("*, metrics(name, unit)")
        .eq("organization_id", currentUser.team_id)
        .eq("celebrated", false)
        .not("achieved_at", "is", null)
        .order("achieved_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      // Enrich milestone with metric info
      const metric = data.metrics as any;
      const enriched = {
        ...data,
        metric_name: metric?.name,
        metric_unit: metric?.unit,
      };

      setCelebratingMilestone(enriched);
      return enriched;
    },
    enabled: !!currentUser?.team_id && !celebratingMilestone,
    staleTime: Infinity, // Only check once per page load
  });

  // Apply filters and custom ordering
  let filteredMetrics = metricsData?.filter(metric => {
    if (showOnlyFavorites && !metric.is_favorite) {
      return false;
    }
    if (searchQuery && !metric.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (categoryFilter !== "all" && metric.category !== categoryFilter) {
      return false;
    }
    if (ownerFilter !== "all" && metric.owner_name !== ownerFilter) {
      return false;
    }
    if (sourceFilter !== "all" && metric.sync_source !== sourceFilter) {
      return false;
    }
    return true;
  }) || [];

  // Apply custom ordering if exists
  if (customOrder.length > 0) {
    filteredMetrics = [...filteredMetrics].sort((a, b) => {
      const indexA = customOrder.indexOf(a.id);
      const indexB = customOrder.indexOf(b.id);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredMetrics.findIndex((m) => m.id === active.id);
    const newIndex = filteredMetrics.findIndex((m) => m.id === over.id);

    const newOrder = arrayMove(filteredMetrics, oldIndex, newIndex).map((m) => m.id);
    setCustomOrder(newOrder);
  };

  // Get unique values for filters
  const categories = Array.from(new Set(metricsData?.map(m => m.category) || []));
  const owners = Array.from(new Set(metricsData?.map(m => m.owner_name).filter(Boolean) || []));

  const totalMetrics = metricsData?.length || 0;
  
  // Use metricStatus() for authoritative on-track calculation
  const onTrackCount = useMemo(() => {
    if (!metricsData) return 0;
    return metricsData.filter(m => {
      const statusResult = metricStatus(
        { target: m.target, direction: m.direction, owner: m.owner_name },
        { value: m.current_value },
        null // period_key not needed for simple on_track check
      );
      return statusResult.status === 'on_track';
    }).length;
  }, [metricsData]);

  return (
    <div className="space-y-6">
      {/* Template Setup Banner for locked-to-template orgs */}
      <TemplateSetupBanner />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-brand bg-clip-text text-transparent mb-2 flex items-center">
            Scorecard
            <HelpHint term="Scorecard" context="scorecard_header" />
          </h1>
        </div>
        
        {totalMetrics > 0 && (
          <div className="flex items-center gap-3">
            {/* Primary action: Import Data */}
            <Button 
              onClick={() => navigate("/imports/monthly-report")}
              className="gradient-brand"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </Button>

            {/* Secondary actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="w-4 h-4 mr-2" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAddKpiModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom Metric
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setLoadDefaultsOpen(true)}
                  disabled={!currentUser?.team_id}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Load Template Defaults
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/scorecard/setup")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Get Spreadsheet Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/scorecard/template")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Template Settings
                </DropdownMenuItem>
                {hasActiveVTO && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setCreateFromVTOOpen(true)}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Review V/TO Alignment
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleResetScorecard}
                  className="text-destructive focus:text-destructive"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Scorecard
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading your scorecard...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load scorecard. Please try refreshing.</p>
        </div>
      ) : totalMetrics === 0 ? (
        <ScorecardOnboardingWizard
          onManualSetup={() => navigate('/scorecard/setup')}
          hasActiveVTO={!!hasActiveVTO}
        />
      ) : (
        <div className="space-y-6">
          {/* Performance Score Card */}
          <PerformanceScoreCard metrics={metricsData || []} />

          {/* Alerts Panel */}
          <AlertsPanel 
            organizationId={currentUser?.team_id}
            currentUserId={currentUser?.id}
          />

          {/* Filters Section */}
          <div className="glass rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search metrics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Source Filter */}
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="jane">Jane</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Owner Filter & Favorites Row */}
            <div className="mt-3 flex items-center gap-3">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Filter by owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Owners</SelectItem>
                  {owners.map(owner => (
                    <SelectItem key={owner} value={owner}>{owner}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant={showOnlyFavorites ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className="gap-2"
              >
                <Star className={`h-4 w-4 ${showOnlyFavorites ? "fill-current" : ""}`} />
                Favorites Only
              </Button>

              {(searchQuery || categoryFilter !== "all" || ownerFilter !== "all" || sourceFilter !== "all" || showOnlyFavorites) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all");
                    setOwnerFilter("all");
                    setSourceFilter("all");
                    setShowOnlyFavorites(false);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          {filteredMetrics.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No metrics match your filters</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredMetrics.map((m) => m.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMetrics.map((metric) => (
                    <SortableMetricCard
                      key={metric.id}
                      metric={metric}
                      onClick={() => setSelectedMetricId(metric.id)}
                      onDelete={handleDeleteMetric}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {/* Details Drawer */}
      <MetricDetailsDrawer
        metricId={selectedMetricId}
        organizationId={currentUser?.team_id}
        hasJaneIntegration={!!janeIntegration}
        open={!!selectedMetricId}
        onClose={() => setSelectedMetricId(null)}
        onUpdate={refetch}
      />

      {/* Modals */}
      <AddKpiModal
        open={addKpiModalOpen}
        onClose={() => setAddKpiModalOpen(false)}
        users={users || []}
        onSuccess={refetch}
      />

      <LoadDefaultsDialog
        open={loadDefaultsOpen}
        onOpenChange={setLoadDefaultsOpen}
        organizationId={currentUser?.team_id || ""}
      />

      {/* Milestone Celebration */}
      {celebratingMilestone && (
        <MilestoneCelebration
          milestone={celebratingMilestone}
          onDismiss={() => setCelebratingMilestone(null)}
        />
      )}

        <CreateFromVTODialog
          open={createFromVTOOpen}
          onClose={() => setCreateFromVTOOpen(false)}
          onSuccess={refetch}
        />
    </div>
  );
};

// Sortable wrapper for MetricCard with delete functionality
function SortableMetricCard({ metric, onClick, onDelete }: { metric: any; onClick: () => void; onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: metric.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${metric.name}" from your scorecard?`)) {
      onDelete(metric.id);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle - top left */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing p-1 hover:bg-secondary rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      {/* Delete button - top right */}
      <button
        onClick={handleDelete}
        className="absolute top-2 right-2 z-10 p-1 hover:bg-destructive/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        title="Delete metric"
      >
        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
      </button>
      <MetricCard metric={metric} onClick={onClick} />
    </div>
  );
}

export default Scorecard;
