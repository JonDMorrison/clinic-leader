import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, RefreshCw } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useOrgSafetyCheck } from "@/hooks/useOrgSafetyCheck";
import { InterventionFilters } from "@/components/interventions/InterventionFilters";
import { InterventionsTable, InterventionsTableSkeleton } from "@/components/interventions/InterventionsTable";
import { NewInterventionModal } from "@/components/interventions/NewInterventionModal";
import { EmptyInterventions } from "@/components/interventions/EmptyInterventions";
import type { InterventionStatus, InterventionType, InterventionWithDetails } from "@/lib/interventions/types";

const PAGE_SIZE = 25;

export default function Interventions() {
  const navigate = useNavigate();
  const { orgId, isLoading: userLoading, isValid, OrgMissingError } = useOrgSafetyCheck();
  const { data: currentUser } = useCurrentUser();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InterventionStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<InterventionType | "all">("all");

  // Pagination state
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Fetch interventions
  const {
    data: interventions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["interventions", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      // Get interventions
      const { data: interventionData, error: interventionError } = await supabase
        .from("interventions")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (interventionError) throw interventionError;

      // Get org users for owner lookup
      const { data: usersData } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("team_id", orgId);

      const usersMap = new Map((usersData || []).map((u) => [u.id, u]));

      // Get linked metrics count per intervention
      const { data: linksData, error: linksError } = await supabase
        .from("intervention_metric_links")
        .select("intervention_id");

      if (linksError) throw linksError;

      // Count links per intervention
      const linkCounts = new Map<string, number>();
      (linksData || []).forEach((link) => {
        const current = linkCounts.get(link.intervention_id) || 0;
        linkCounts.set(link.intervention_id, current + 1);
      });

      // Merge data
      const result: InterventionWithDetails[] = (interventionData || []).map((i) => ({
        ...i,
        owner: i.owner_user_id ? usersMap.get(i.owner_user_id) || null : null,
        linked_metrics_count: linkCounts.get(i.id) || 0,
      }));

      return result;
    },
    enabled: !!orgId,
  });

  // Fetch org users for modal
  const { data: users = [] } = useQuery({
    queryKey: ["users", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("team_id", orgId)
        .order("full_name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Filter interventions
  const filteredInterventions = useMemo(() => {
    if (!interventions) return [];

    return interventions.filter((i) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesTitle = i.title.toLowerCase().includes(searchLower);
        const matchesTags = i.tags?.some((t) => t.toLowerCase().includes(searchLower));
        if (!matchesTitle && !matchesTags) return false;
      }

      // Status filter
      if (statusFilter !== "all" && i.status !== statusFilter) return false;

      // Type filter
      if (typeFilter !== "all" && i.intervention_type !== typeFilter) return false;

      return true;
    });
  }, [interventions, search, statusFilter, typeFilter]);

  // Paginated interventions
  const visibleInterventions = filteredInterventions.slice(0, visibleCount);
  const hasMore = visibleCount < filteredInterventions.length;

  const handleRowClick = (id: string) => {
    navigate(`/interventions/${id}`);
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  // Loading state
  if (userLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Interventions</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <InterventionsTableSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Org missing state
  if (!isValid) {
    return <OrgMissingError />;
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Interventions</h1>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-4" />
            <p className="text-destructive font-medium mb-2">Failed to load interventions</p>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              {error instanceof Error ? error.message : "An unexpected error occurred"}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isEmpty = !isLoading && filteredInterventions.length === 0;
  const isEmptyWithNoFilters = isEmpty && !search && statusFilter === "all" && typeFilter === "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Interventions</h1>
          <p className="text-muted-foreground">
            Track strategic initiatives and measure their impact on key metrics
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Intervention
        </Button>
      </div>

      {/* Filters */}
      <InterventionFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
      />

      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <InterventionsTableSkeleton />
          ) : isEmptyWithNoFilters ? (
            <EmptyInterventions onCreateClick={() => setModalOpen(true)} />
          ) : isEmpty ? (
            <div className="text-center py-12 text-muted-foreground">
              No interventions match your filters.
            </div>
          ) : (
            <>
              <InterventionsTable
                interventions={visibleInterventions}
                onRowClick={handleRowClick}
              />

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <Button variant="outline" onClick={handleLoadMore}>
                    Load More ({filteredInterventions.length - visibleCount} remaining)
                  </Button>
                </div>
              )}

              {/* Results count */}
              <p className="text-sm text-muted-foreground text-center mt-4">
                Showing {visibleInterventions.length} of {filteredInterventions.length} interventions
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* New Intervention Modal */}
      <NewInterventionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        organizationId={orgId!}
        users={users}
      />
    </div>
  );
}
