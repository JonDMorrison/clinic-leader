import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Link as LinkIcon,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Circle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CreateIssueFromItemDialog } from "./CreateIssueFromItemDialog";
import { MetricStatusResult, getStatusDisplay } from "@/lib/scorecard/metricStatus";

interface AgendaItemRowProps {
  item: {
    id: string;
    title: string;
    description?: string | null;
    item_type: string;
    source_ref_type?: string | null;
    source_ref_id?: string | null;
    sort_order: number;
    is_deleted: boolean;
    section: string;
    discussed?: boolean;
    discussed_at?: string | null;
    created_issue_id?: string | null;
  };
  canEdit: boolean;
  isLiveMode: boolean;
  isCompleted: boolean;
  isFirst: boolean;
  isLast: boolean;
  organizationId: string;
  meetingId: string;
  periodKey: string;
  metricStatusObj?: (MetricStatusResult & { metricName?: string; metricUnit?: string }) | null;
}

export function AgendaItemRow({
  item,
  canEdit,
  isLiveMode,
  isCompleted,
  isFirst,
  isLast,
  organizationId,
  meetingId,
  periodKey,
  metricStatusObj,
}: AgendaItemRowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDescription, setEditDescription] = useState(item.description || "");
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateIssue, setShowCreateIssue] = useState(false);

  // Check if this item already has an issue created (uses dedicated column)
  const hasCreatedIssue = !!item.created_issue_id;

  // Update item mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<typeof item>) => {
      const { error } = await supabase
        .from("meeting_items")
        .update(updates)
        .eq("id", item.id)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-items", meetingId] });
    },
    onError: () => {
      toast({ title: "Failed to update item", variant: "destructive" });
    },
  });

  // Toggle discussed mutation
  const toggleDiscussedMutation = useMutation({
    mutationFn: async () => {
      const newDiscussed = !item.discussed;
      const { error } = await supabase
        .from("meeting_items")
        .update({
          discussed: newDiscussed,
          discussed_at: newDiscussed ? new Date().toISOString() : null,
        })
        .eq("id", item.id)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-items", meetingId] });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  // Soft delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("meeting_items")
        .update({ is_deleted: true })
        .eq("id", item.id)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-items", meetingId] });
      toast({ title: "Item removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove item", variant: "destructive" });
    },
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("meeting_items")
        .update({ is_deleted: false })
        .eq("id", item.id)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-items", meetingId] });
      toast({ title: "Item restored" });
    },
    onError: () => {
      toast({ title: "Failed to restore item", variant: "destructive" });
    },
  });

  // Move mutation (reorder)
  const moveMutation = useMutation({
    mutationFn: async (direction: "up" | "down") => {
      const { data: sectionItems, error: fetchError } = await supabase
        .from("meeting_items")
        .select("id, sort_order")
        .eq("meeting_id", meetingId)
        .eq("section", item.section)
        .eq("is_deleted", false)
        .order("sort_order");

      if (fetchError) throw fetchError;
      if (!sectionItems) return;

      const currentIndex = sectionItems.findIndex((i) => i.id === item.id);
      const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (swapIndex < 0 || swapIndex >= sectionItems.length) return;

      const currentItem = sectionItems[currentIndex];
      const swapItem = sectionItems[swapIndex];

      const { error: updateError } = await supabase.from("meeting_items").upsert([
        { id: currentItem.id, sort_order: swapItem.sort_order, organization_id: organizationId, meeting_id: meetingId, section: item.section, item_type: item.item_type, title: item.title },
        { id: swapItem.id, sort_order: currentItem.sort_order, organization_id: organizationId, meeting_id: meetingId, section: item.section, item_type: item.item_type, title: item.title },
      ]);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-items", meetingId] });
    },
    onError: () => {
      toast({ title: "Failed to reorder", variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      title: editTitle,
      description: editDescription || null,
    });
    setIsEditing(false);
  };

  const handleOpenLinkedIssue = () => {
    if (item.source_ref_type === "issue" && item.source_ref_id) {
      window.open(`/issues?highlight=${item.source_ref_id}`, "_blank");
    }
  };

  const hasLinked = item.source_ref_type && item.source_ref_id;
  const isLinkedIssue = item.item_type === "issue" && item.source_ref_id;

  // Get status badge for metrics
  const statusDisplay = metricStatusObj ? getStatusDisplay(metricStatusObj.status) : null;

  return (
    <>
      <div
        className={cn(
          "flex items-start gap-2 p-2 rounded border bg-card transition-colors",
          item.is_deleted && "opacity-50 bg-destructive/5 border-destructive/20",
          item.discussed && "bg-green-500/5 border-green-500/30"
        )}
      >
        {/* Expand/collapse for description */}
        <Button
          variant="ghost"
          size="sm"
          className="p-1 h-6 w-6"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <ChevronRight
            className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-90")}
          />
        </Button>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {isEditing && canEdit ? (
            <div className="space-y-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-8"
                autoFocus
              />
              {isExpanded && (
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                />
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditTitle(item.title);
                    setEditDescription(item.description || "");
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={cn("cursor-pointer", canEdit && "hover:bg-accent/50 rounded px-1")}
              onClick={() => canEdit && !item.is_deleted && setIsEditing(true)}
            >
              <p className={cn("text-sm font-medium", item.is_deleted && "line-through")}>
                {item.title}
              </p>
              {isExpanded && item.description && (
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{item.description}</p>
              )}
            </div>
          )}
        </div>

        {/* Badges and actions */}
        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          {/* Metric status badge (from real data) */}
          {item.item_type === "metric" && statusDisplay && (
            <Badge
              variant={statusDisplay.variant === "muted" ? "secondary" : statusDisplay.variant}
              className={cn("text-xs", statusDisplay.colorClass)}
            >
              {statusDisplay.label}
            </Badge>
          )}

          {/* Discussed badge */}
          {item.discussed && (
            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-700">
              Discussed
            </Badge>
          )}

          {/* Linked badge */}
          {hasLinked && (
            <Badge variant="outline" className="text-xs">
              <LinkIcon className="w-3 h-3 mr-1" />
              {item.source_ref_type}
            </Badge>
          )}

          {/* Created issue indicator */}
          {hasCreatedIssue && (
            <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-700">
              <AlertCircle className="w-3 h-3 mr-1" />
              Issue created
            </Badge>
          )}

          {item.is_deleted ? (
            canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-6 w-6"
                onClick={() => restoreMutation.mutate()}
                disabled={restoreMutation.isPending}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )
          ) : (
            <>
              {/* Live mode actions (also shown in completed for viewing) */}
              {(isLiveMode || isCompleted) && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "p-1 h-7 px-2",
                      item.discussed && "text-green-600"
                    )}
                    onClick={() => toggleDiscussedMutation.mutate()}
                    disabled={toggleDiscussedMutation.isPending || isCompleted}
                    title={item.discussed ? "Mark as not discussed" : "Mark as discussed"}
                  >
                    {item.discussed ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </Button>

                  {hasCreatedIssue ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-7 px-2 text-green-600"
                      onClick={() => window.open(`/issues?highlight=${item.created_issue_id}`, "_blank")}
                      title="Open created issue"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  ) : isLinkedIssue ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-7 px-2 text-blue-600"
                      onClick={handleOpenLinkedIssue}
                      title="Open linked issue"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  ) : !isCompleted ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-7 px-2"
                      onClick={() => setShowCreateIssue(true)}
                      title="Create Issue"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </Button>
                  ) : null}
                </>
              )}

              {/* Preview mode actions */}
              {canEdit && !isLiveMode && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-6 w-6"
                    onClick={() => moveMutation.mutate("up")}
                    disabled={isFirst || moveMutation.isPending}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-6 w-6"
                    onClick={() => moveMutation.mutate("down")}
                    disabled={isLast || moveMutation.isPending}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Issue Dialog */}
      <CreateIssueFromItemDialog
        open={showCreateIssue}
        onOpenChange={setShowCreateIssue}
        organizationId={organizationId}
        meetingId={meetingId}
        item={item}
        periodKey={periodKey}
        metricStatusObj={metricStatusObj}
        onIssueCreated={(issueId, itemId) => {
          // Update the meeting_item with created_issue_id
          supabase
            .from("meeting_items")
            .update({ created_issue_id: issueId })
            .eq("id", itemId)
            .eq("organization_id", organizationId)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ["meeting-items", meetingId] });
              queryClient.invalidateQueries({ queryKey: ["meeting-issues", meetingId] });
            });
        }}
      />
    </>
  );
}
