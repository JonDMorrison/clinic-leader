import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  meetingId: string;
  initialSection?: string;
}

const SECTIONS = [
  { value: "scorecard", label: "Scorecard Review" },
  { value: "rocks", label: "Rock Review" },
  { value: "issues", label: "Issues" },
  { value: "todo", label: "To-Do Review" },
  { value: "conclusion", label: "Conclusion" },
  { value: "custom", label: "Custom" },
];

const ITEM_TYPES = [
  { value: "text", label: "Text Note" },
  { value: "issue", label: "Link Issue" },
  { value: "rock", label: "Link Rock" },
  { value: "metric", label: "Link Metric" },
];

export function AddItemModal({
  open,
  onOpenChange,
  organizationId,
  meetingId,
  initialSection,
}: AddItemModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [section, setSection] = useState(initialSection || "custom");
  const [itemType, setItemType] = useState("text");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkedId, setLinkedId] = useState("");

  // Reset section when modal opens with initialSection
  useEffect(() => {
    if (open && initialSection) {
      setSection(initialSection);
    }
  }, [open, initialSection]);

  // Fetch issues for linking
  const { data: issues } = useQuery({
    queryKey: ["issues-for-linking", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issues")
        .select("id, title")
        .eq("organization_id", organizationId)
        .neq("status", "solved")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: open && itemType === "issue",
  });

  // Fetch rocks for linking
  const { data: rocks } = useQuery({
    queryKey: ["rocks-for-linking", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rocks")
        .select("id, title")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: open && itemType === "rock",
  });

  // Fetch metrics for linking
  const { data: metrics } = useQuery({
    queryKey: ["metrics-for-linking", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metrics")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name")
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: open && itemType === "metric",
  });

  // Get next sort_order for section
  const getNextSortOrder = async () => {
    const { data } = await supabase
      .from("meeting_items")
      .select("sort_order")
      .eq("meeting_id", meetingId)
      .eq("section", section)
      .order("sort_order", { ascending: false })
      .limit(1);
    return (data?.[0]?.sort_order ?? -1) + 1;
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const sortOrder = await getNextSortOrder();

      let finalTitle = title;
      let sourceRefType: string | null = null;
      let sourceRefId: string | null = null;

      if (itemType === "issue" && linkedId) {
        const issue = issues?.find((i) => i.id === linkedId);
        finalTitle = issue?.title || title;
        sourceRefType = "issue";
        sourceRefId = linkedId;
      } else if (itemType === "rock" && linkedId) {
        const rock = rocks?.find((r) => r.id === linkedId);
        finalTitle = rock?.title || title;
        sourceRefType = "rock";
        sourceRefId = linkedId;
      } else if (itemType === "metric" && linkedId) {
        const metric = metrics?.find((m) => m.id === linkedId);
        finalTitle = metric?.name || title;
        sourceRefType = "metric";
        sourceRefId = linkedId;
      }

      if (!finalTitle) throw new Error("Title required");

      const { error } = await supabase.from("meeting_items").insert({
        organization_id: organizationId,
        meeting_id: meetingId,
        section,
        item_type: itemType,
        title: finalTitle,
        description: description || null,
        source_ref_type: sourceRefType,
        source_ref_id: sourceRefId,
        sort_order: sortOrder,
        is_deleted: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-items", meetingId] });
      toast({ title: "Item added" });
      onOpenChange(false);
      // Reset form
      setSection("custom");
      setItemType("text");
      setTitle("");
      setDescription("");
      setLinkedId("");
    },
    onError: () => {
      toast({ title: "Failed to add item", variant: "destructive" });
    },
  });

  const canSubmit =
    itemType === "text" ? !!title : !!linkedId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Agenda Item</DialogTitle>
          <DialogDescription>
            Add a new item to the meeting agenda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Section</Label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Item Type</Label>
            <Select value={itemType} onValueChange={(v) => { setItemType(v); setLinkedId(""); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {itemType === "text" && (
            <>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Item title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details"
                  rows={2}
                />
              </div>
            </>
          )}

          {itemType === "issue" && (
            <div className="space-y-2">
              <Label>Select Issue</Label>
              <Select value={linkedId} onValueChange={setLinkedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an issue..." />
                </SelectTrigger>
                <SelectContent>
                  {issues?.map((issue) => (
                    <SelectItem key={issue.id} value={issue.id}>
                      {issue.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {itemType === "rock" && (
            <div className="space-y-2">
              <Label>Select Rock</Label>
              <Select value={linkedId} onValueChange={setLinkedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a rock..." />
                </SelectTrigger>
                <SelectContent>
                  {rocks?.map((rock) => (
                    <SelectItem key={rock.id} value={rock.id}>
                      {rock.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {itemType === "metric" && (
            <div className="space-y-2">
              <Label>Select Metric</Label>
              <Select value={linkedId} onValueChange={setLinkedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a metric..." />
                </SelectTrigger>
                <SelectContent>
                  {metrics?.map((metric) => (
                    <SelectItem key={metric.id} value={metric.id}>
                      {metric.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending || !canSubmit}
          >
            {addMutation.isPending ? "Adding..." : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
