import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Settings, PenSquare, Search, Filter } from "lucide-react";
import { HelpHint } from "@/components/help/HelpHint";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddKpiModal } from "@/components/scorecard/AddKpiModal";
import { LoadDefaultsDialog } from "@/components/scorecard/LoadDefaultsDialog";
import { ScorecardOnboardingWizard } from "@/components/scorecard/ScorecardOnboardingWizard";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BackfillButton } from "@/components/scorecard/BackfillButton";
import { MetricCard } from "@/components/scorecard/MetricCard";
import { MetricDetailsDrawer } from "@/components/scorecard/MetricDetailsDrawer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfWeek, subWeeks, format } from "date-fns";

const Scorecard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [addKpiModalOpen, setAddKpiModalOpen] = useState(false);
  const [loadDefaultsOpen, setLoadDefaultsOpen] = useState(false);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Fetch current user first
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return null;

      const { data, error } = await supabase
        .from("users")
        .select("id, team_id")
        .eq("email", authData.user.email)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch metrics with last 12 weeks of data
  const { data: metricsData, isLoading, refetch } = useQuery({
    queryKey: ["scorecard-metrics", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];

      // Get last 12 weeks
      const weeks = Array.from({ length: 12 }, (_, i) => {
        const date = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
        return format(date, "yyyy-MM-dd");
      }).reverse();

      const { data: metrics, error: metricsError } = await supabase
        .from("metrics")
        .select("*")
        .eq("organization_id", currentUser.team_id)
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

  // Apply filters
  const filteredMetrics = metricsData?.filter(metric => {
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

  // Get unique values for filters
  const categories = Array.from(new Set(metricsData?.map(m => m.category) || []));
  const owners = Array.from(new Set(metricsData?.map(m => m.owner_name).filter(Boolean) || []));

  const totalMetrics = metricsData?.length || 0;
  const onTrackCount = metricsData?.filter(m => {
    if (!m.current_value || !m.target) return false;
    const isUp = m.direction === "up" || m.direction === ">=";
    return isUp ? m.current_value >= m.target : m.current_value <= m.target;
  }).length || 0;

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-brand bg-clip-text text-transparent mb-2 flex items-center">
            Scorecard
            <HelpHint term="Scorecard" context="scorecard_header" />
          </h1>
          {totalMetrics > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="muted">
                {totalMetrics} metrics tracked
              </Badge>
              <Badge variant="success">
                {onTrackCount} on target this week
              </Badge>
            </div>
          )}
        </div>
        
        {totalMetrics > 0 && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/scorecard/update")}
            >
              <PenSquare className="w-4 h-4 mr-2" />
              Weekly Update
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/setup/scorecard")}
            >
              <Settings className="w-4 h-4 mr-2" />
              Setup Wizard
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gradient-brand">
                  <Plus className="w-4 h-4 mr-2" />
                  New Metric
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLoadDefaultsOpen(true)}>
                  Load Defaults
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAddKpiModalOpen(true)}>
                  Custom Metric
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
      ) : totalMetrics === 0 ? (
        <ScorecardOnboardingWizard
          onQuickStart={() => setLoadDefaultsOpen(true)}
          onCustomKpi={() => setAddKpiModalOpen(true)}
        />
      ) : (
        <div className="space-y-6">
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

            {/* Owner Filter Row */}
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
              {(searchQuery || categoryFilter !== "all" || ownerFilter !== "all" || sourceFilter !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all");
                    setOwnerFilter("all");
                    setSourceFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Backfill Button */}
          <div className="flex justify-center">
            <BackfillButton 
              organizationId={currentUser?.team_id}
              hasJaneIntegration={!!janeIntegration}
            />
          </div>

          {/* Metrics Grid */}
          {filteredMetrics.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No metrics match your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMetrics.map((metric) => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  onClick={() => setSelectedMetricId(metric.id)}
                />
              ))}
            </div>
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
    </div>
  );
};

export default Scorecard;
