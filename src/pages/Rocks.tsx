import { useMemo, useState, useEffect } from "react";
import { getStorage, setStorage } from "@/lib/storage/versionedStorage";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RockCard } from "@/components/rocks/RockCard";
import { NewRockModal } from "@/components/rocks/NewRockModal";
import { CreateFromScorecardDialog } from "@/components/rocks/CreateFromScorecardDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Target, Filter, Plus, Sparkles, BarChart3, Calendar, History } from "lucide-react";
import { HelpHint } from "@/components/help/HelpHint";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LoadDefaultRocksDialog } from "@/components/rocks/LoadDefaultRocksDialog";
import { QuarterTransitionBanner } from "@/components/rocks/QuarterTransitionBanner";
import { ArchiveRocksDialog } from "@/components/rocks/ArchiveRocksDialog";
import { getCurrentQuarter } from "@/lib/rocks/templates";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  DragOverlay,
} from "@dnd-kit/core";

import { toast } from "sonner";

const Rocks = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const quarterFilter = searchParams.get("quarter") || "all";
  const ownerFilter = searchParams.get("owner") || "all";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadDefaultsOpen, setLoadDefaultsOpen] = useState(false);
  const [createFromScorecardOpen, setCreateFromScorecardOpen] = useState(false);
  const [showTransitionBanner, setShowTransitionBanner] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeRock, setActiveRock] = useState<any>(null);
  const currentQuarter = getCurrentQuarter();

  // Use centralized current user hook for org context
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const organizationId = currentUser?.team_id;

  const { data: rocks, isLoading: rocksLoading, refetch } = useQuery({
    queryKey: ["rocks", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from("rocks")
        .select("*, users(full_name)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: users } = useQuery({
    queryKey: ["users", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("team_id", organizationId)
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const isLoading = userLoading || rocksLoading;

  const quarters = useMemo(() => {
    if (!rocks) return [];
    return Array.from(new Set(rocks.map((r) => r.quarter))).sort();
  }, [rocks]);

  const filteredRocks = useMemo(() => {
    if (!rocks) return [];
    return rocks.filter((rock) => {
      if (quarterFilter !== "all" && rock.quarter !== quarterFilter) return false;
      if (ownerFilter !== "all" && rock.owner_id !== ownerFilter) return false;
      return true;
    });
  }, [rocks, quarterFilter, ownerFilter]);

  const rocksByStatus = useMemo(() => {
    return {
      on_track: filteredRocks.filter((r) => r.status === "on_track"),
      off_track: filteredRocks.filter((r) => r.status === "off_track"),
      done: filteredRocks.filter((r) => r.status === "done"),
    };
  }, [filteredRocks]);

  // Check if we should show transition banner
  const lastQuarterRocks = useMemo(() => {
    if (!rocks) return { completed: [], incomplete: [] };
    
    // Get the previous quarter's rocks
    const lastQuarter = quarters[quarters.length - 2]; // Second to last quarter
    if (!lastQuarter) return { completed: [], incomplete: [] };
    
    const lastQuarterRocksFiltered = rocks.filter(r => r.quarter === lastQuarter);
    return {
      completed: lastQuarterRocksFiltered.filter(r => r.status === 'done'),
      incomplete: lastQuarterRocksFiltered.filter(r => r.status !== 'done'),
    };
  }, [rocks, quarters]);

  // Show banner if there are completed or incomplete rocks from last quarter
  useEffect(() => {
    const dismissed = getStorage<boolean>(`transition-banner-dismissed-${currentQuarter}`);
    if (!dismissed && (lastQuarterRocks.completed.length > 0 || lastQuarterRocks.incomplete.length > 0)) {
      setShowTransitionBanner(true);
    }
  }, [lastQuarterRocks, currentQuarter]);

  const handleDismissBanner = () => {
    setStorage(`transition-banner-dismissed-${currentQuarter}`, true);
    setShowTransitionBanner(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const rock = rocks?.find(r => r.id === active.id);
    setActiveRock(rock);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const rockId = active.id as string;
    const newStatus = over.id as string;

    // Validate status
    if (!["on_track", "off_track", "done"].includes(newStatus)) return;

    // MULTI-TENANCY: Add org filter to rock status update
    const { error } = await supabase
      .from("rocks")
      .update({ status: newStatus as "on_track" | "off_track" | "done" })
      .eq("id", rockId)
      .eq("organization_id", organizationId);

    if (error) {
      toast.error("Failed to update rock status");
      return;
    }

    toast.success("Rock status updated");
    refetch();
    
    setActiveId(null);
    setActiveRock(null);
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params);
  };

  const StatusColumn = ({ status, title, rocks }: { status: string; title: string; rocks: any[] }) => {
    const { setNodeRef } = useDroppable({ id: status });

    return (
      <div className="flex-1 min-w-[300px]">
        <div ref={setNodeRef} className="bg-muted/50 rounded-lg p-4 h-full min-h-[400px]">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            {title}
            <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full">
              {rocks.length}
            </span>
          </h3>
          <div className="space-y-3">
            {rocks.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No rocks in this status
              </div>
            ) : (
              rocks.map((rock) => <RockCard key={rock.id} rock={rock} onUpdate={refetch} />)
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Rocks</h1>
        <p className="text-muted-foreground">Loading rocks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showTransitionBanner && (
        <QuarterTransitionBanner
          completedCount={lastQuarterRocks.completed.length}
          incompleteCount={lastQuarterRocks.incomplete.length}
          onPlanQuarter={() => {
            setIsModalOpen(true);
          }}
          onHandleIncomplete={() => setArchiveDialogOpen(true)}
          onDismiss={handleDismissBanner}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
            Rocks
            <HelpHint term="Rock" context="rocks_header" />
          </h1>
          <p className="text-muted-foreground">90-day priorities and goals</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href="/rocks/monthly-review">
              <Calendar className="w-4 h-4 mr-2" />
              Monthly Review
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="/rocks/quarterly-close">
              <History className="w-4 h-4 mr-2" />
              Quarterly Close
            </a>
          </Button>
          <Button onClick={() => setCreateFromScorecardOpen(true)} variant="outline">
            <BarChart3 className="w-4 h-4 mr-2" />
            Create from Scorecard
          </Button>
          {rocks && rocks.length > 0 && (
            <Button onClick={() => setLoadDefaultsOpen(true)} variant="outline">
              <Sparkles className="w-4 h-4 mr-2" />
              Load Defaults
            </Button>
          )}
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Rock
          </Button>
        </div>
      </div>

      <NewRockModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        users={users || []}
        onSuccess={refetch}
        organizationId={organizationId || ''}
      />

      <LoadDefaultRocksDialog
        open={loadDefaultsOpen}
        onOpenChange={setLoadDefaultsOpen}
        organizationId={currentUser?.team_id || ""}
      />

      <div className="flex items-end gap-4 p-4 bg-card rounded-lg border border-border">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <div className="flex-1 flex gap-4">
          <div className="space-y-2">
            <Label htmlFor="quarter-filter" className="text-xs">Quarter</Label>
            <Select value={quarterFilter} onValueChange={(v) => handleFilterChange("quarter", v)}>
              <SelectTrigger id="quarter-filter" className="w-[180px]">
                <SelectValue placeholder="All Quarters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters</SelectItem>
                {quarters.map((q) => (
                  <SelectItem key={q} value={q}>
                    {q}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner-filter" className="text-xs">Owner</Label>
            <Select value={ownerFilter} onValueChange={(v) => handleFilterChange("owner", v)}>
              <SelectTrigger id="owner-filter" className="w-[180px]">
                <SelectValue placeholder="All Owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!rocks || rocks.length === 0 ? (
        <EmptyState
          icon={<Target className="w-12 h-12" />}
          title="No Rocks yet"
          description="Create 90-day priorities from your scorecard insights or start with EOS defaults"
          action={
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => setCreateFromScorecardOpen(true)} className="gradient-brand">
                <BarChart3 className="w-4 h-4 mr-2" />
                Create from Scorecard
              </Button>
              <Button onClick={() => setLoadDefaultsOpen(true)} variant="outline">
                <Sparkles className="w-4 h-4 mr-2" />
                Load Default Rocks
              </Button>
            </div>
          }
        />
      ) : filteredRocks.length === 0 ? (
        <EmptyState
          icon={<Target className="w-12 h-12" />}
          title="No rocks found"
          description="No rocks match the selected filters."
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            <StatusColumn status="on_track" title="On Track" rocks={rocksByStatus.on_track} />
            <StatusColumn status="off_track" title="Off Track" rocks={rocksByStatus.off_track} />
            <StatusColumn status="done" title="Done" rocks={rocksByStatus.done} />
          </div>

          <DragOverlay>
            {activeId && activeRock ? (
              <div className="opacity-90 rotate-2 scale-105">
                <RockCard rock={activeRock} onUpdate={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <NewRockModal open={isModalOpen} onClose={() => setIsModalOpen(false)} users={users || []} onSuccess={refetch} organizationId={organizationId || ''} />
      
      <LoadDefaultRocksDialog 
        open={loadDefaultsOpen}
        onOpenChange={setLoadDefaultsOpen}
        organizationId={currentUser?.team_id || ''}
      />

      <CreateFromScorecardDialog
        open={createFromScorecardOpen}
        onClose={() => setCreateFromScorecardOpen(false)}
        onSuccess={refetch}
      />

      <ArchiveRocksDialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        incompleteRocks={lastQuarterRocks.incomplete}
        onSuccess={refetch}
      />
    </div>
  );
};

export default Rocks;
