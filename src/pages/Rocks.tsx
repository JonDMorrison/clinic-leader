import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RockCard } from "@/components/rocks/RockCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Target, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { toast } from "sonner";

const Rocks = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const quarterFilter = searchParams.get("quarter") || "all";
  const ownerFilter = searchParams.get("owner") || "all";

  const { data: rocks, isLoading, refetch } = useQuery({
    queryKey: ["rocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rocks")
        .select("*, users(full_name)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
  });

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

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const rockId = active.id as string;
    const newStatus = over.id as string;

    // Validate status
    if (!["on_track", "off_track", "done"].includes(newStatus)) return;

    const { error } = await supabase
      .from("rocks")
      .update({ status: newStatus as "on_track" | "off_track" | "done" })
      .eq("id", rockId);

    if (error) {
      toast.error("Failed to update rock status");
      return;
    }

    toast.success("Rock status updated");
    refetch();
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
          <SortableContext items={rocks.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {rocks.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No rocks in this status
                </div>
              ) : (
                rocks.map((rock) => <RockCard key={rock.id} rock={rock} onUpdate={refetch} />)
              )}
            </div>
          </SortableContext>
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
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Rocks</h1>
        <p className="text-muted-foreground">90-day priorities and goals</p>
      </div>

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

      {filteredRocks.length === 0 ? (
        <EmptyState
          icon={<Target className="w-12 h-12" />}
          title="No rocks found"
          description="No rocks match the selected filters."
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            <StatusColumn status="on_track" title="On Track" rocks={rocksByStatus.on_track} />
            <StatusColumn status="off_track" title="Off Track" rocks={rocksByStatus.off_track} />
            <StatusColumn status="done" title="Done" rocks={rocksByStatus.done} />
          </div>
        </DndContext>
      )}
    </div>
  );
};

export default Rocks;
