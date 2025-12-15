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
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  };
  canEdit: boolean;
  isFirst: boolean;
  isLast: boolean;
  organizationId: string;
  meetingId: string;
}

export function AgendaItemRow({
  item,
  canEdit,
  isFirst,
  isLast,
  organizationId,
  meetingId,
}: AgendaItemRowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDescription, setEditDescription] = useState(item.description || "");
  const [isEditing, setIsEditing] = useState(false);

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
      // Fetch all items in same section
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

      // Swap sort_order values
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

  const hasLinked = item.source_ref_type && item.source_ref_id;

  return (
    <div
      className={cn(
        "flex items-start gap-2 p-2 rounded border bg-card",
        item.is_deleted && "opacity-50 bg-destructive/5 border-destructive/20"
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
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            )}
          </div>
        )}
      </div>

      {/* Badges and actions */}
      <div className="flex items-center gap-1 shrink-0">
        {hasLinked && (
          <Badge variant="outline" className="text-xs">
            <LinkIcon className="w-3 h-3 mr-1" />
            {item.source_ref_type}
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
          canEdit && (
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
          )
        )}
      </div>
    </div>
  );
}
