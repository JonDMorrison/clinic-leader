import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Target, Loader2, CheckCircle, AlertCircle, Circle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { setMetricRockLinks, getLinkedRockIds } from "@/lib/rocks/metricLinking";
import { toast } from "sonner";

interface MetricRockLinkDialogProps {
  open: boolean;
  onClose: () => void;
  metric: {
    id: string;
    name: string;
  };
  onSuccess?: () => void;
}

export const MetricRockLinkDialog = ({ open, onClose, metric, onSuccess }: MetricRockLinkDialogProps) => {
  const { data: currentUser } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRockIds, setSelectedRockIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [initialRockIds, setInitialRockIds] = useState<Set<string>>(new Set());

  // Fetch all rocks for the organization
  const { data: rocks, isLoading: rocksLoading } = useQuery({
    queryKey: ["all-rocks-for-linking", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];

      // First get user IDs in the team
      const { data: users } = await supabase
        .from("users")
        .select("id")
        .eq("team_id", currentUser.team_id);

      const userIds = users?.map((u) => u.id) || [];
      if (userIds.length === 0) return [];

      const { data, error } = await supabase
        .from("rocks")
        .select("id, title, quarter, status, users(full_name)")
        .in("owner_id", userIds)
        .order("quarter", { ascending: false })
        .order("title");

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!currentUser?.team_id,
  });

  // Load existing linked rocks when dialog opens
  useEffect(() => {
    if (open && metric.id) {
      getLinkedRockIds(metric.id).then((ids) => {
        const idSet = new Set(ids);
        setSelectedRockIds(idSet);
        setInitialRockIds(idSet);
      });
    }
  }, [open, metric.id]);

  const filteredRocks = rocks?.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.quarter.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Group rocks by quarter
  const rocksByQuarter = filteredRocks.reduce((acc, r) => {
    if (!acc[r.quarter]) acc[r.quarter] = [];
    acc[r.quarter].push(r);
    return acc;
  }, {} as Record<string, typeof filteredRocks>);

  const handleToggleRock = (rockId: string) => {
    setSelectedRockIds((prev) => {
      const next = new Set(prev);
      if (next.has(rockId)) {
        next.delete(rockId);
      } else {
        next.add(rockId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!currentUser?.team_id) return;

    setIsSaving(true);
    const result = await setMetricRockLinks(
      metric.id,
      Array.from(selectedRockIds),
      currentUser.team_id,
      currentUser.id
    );

    setIsSaving(false);

    if (result.success) {
      toast.success("Priority links updated");
      onSuccess?.();
      onClose();
    } else {
      toast.error(result.error || "Failed to update links");
    }
  };

  const hasChanges = () => {
    if (selectedRockIds.size !== initialRockIds.size) return true;
    for (const id of selectedRockIds) {
      if (!initialRockIds.has(id)) return true;
    }
    return false;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "off_track":
        return <AlertCircle className="w-4 h-4 text-danger" />;
      default:
        return <Circle className="w-4 h-4 text-brand" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "done":
        return "Done";
      case "off_track":
        return "Off Track";
      default:
        return "On Track";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-brand" />
            Link to Quarterly Priorities
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{metric.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search priorities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Rocks List */}
          <ScrollArea className="h-[350px] pr-4">
            {rocksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRocks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {rocks?.length === 0 ? "No quarterly priorities found. Create some in the Rocks page first." : "No priorities match your search."}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(rocksByQuarter).map(([quarter, quarterRocks]) => (
                  <div key={quarter}>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      {quarter}
                    </h4>
                    <div className="space-y-1">
                      {quarterRocks.map((rock) => (
                        <label
                          key={rock.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedRockIds.has(rock.id)}
                            onCheckedChange={() => handleToggleRock(rock.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{rock.title}</p>
                            {rock.users && (
                              <p className="text-xs text-muted-foreground">
                                Owner: {(rock.users as any)?.full_name || "Unassigned"}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(rock.status)}
                            <span className="text-xs text-muted-foreground">{getStatusLabel(rock.status)}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Selection Summary */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              {selectedRockIds.size} priorit{selectedRockIds.size !== 1 ? "ies" : "y"} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !hasChanges()}
                className="gradient-brand"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Links"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
