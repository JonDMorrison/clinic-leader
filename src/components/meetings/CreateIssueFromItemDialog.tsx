import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assertOrgId } from "@/hooks/useOrgSafetyCheck";
import { Loader2 } from "lucide-react";

interface MeetingItem {
  id: string;
  title: string;
  description?: string | null;
  item_type: string;
  source_ref_type?: string | null;
  source_ref_id?: string | null;
}

interface CreateIssueFromItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  meetingId: string;
  item: MeetingItem;
  periodKey: string;
  onIssueCreated?: (issueId: string) => void;
}

export function CreateIssueFromItemDialog({
  open,
  onOpenChange,
  organizationId,
  meetingId,
  item,
  periodKey,
  onIssueCreated,
}: CreateIssueFromItemDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [priority, setPriority] = useState("2");
  const [ownerId, setOwnerId] = useState<string>("");

  // Generate prefilled content based on item type
  const generatePrefill = () => {
    const baseTitle = item.title.replace(/^(Metric|Rock|Issue): /, "");

    switch (item.item_type) {
      case "metric":
        return {
          title: `${baseTitle} is off-track (${periodKey})`,
          context: `Month: ${periodKey}\n${item.description || ""}\n\nRoot cause and next action:`,
        };
      case "rock":
        return {
          title: `Rock blocked: ${baseTitle}`,
          context: `${item.description || ""}\n\nWhat is blocking this Rock and what will we do next?`,
        };
      case "issue":
        return {
          title: `Related: ${baseTitle}`,
          context: `Spun off from issue "${baseTitle}" during meeting.\n\n${item.description || ""}`,
        };
      default:
        return {
          title: baseTitle,
          context: `Created from meeting agenda item.\nPeriod: ${periodKey}\n\nDefine the issue clearly and decide next action.`,
        };
    }
  };

  // Reset form when dialog opens with new item
  useEffect(() => {
    if (open && item) {
      const prefill = generatePrefill();
      setTitle(prefill.title);
      setContext(prefill.context);
      setPriority("2");
      setOwnerId("");
    }
  }, [open, item?.id]);

  // Fetch org users for owner selection
  const { data: users } = useQuery({
    queryKey: ["org-users", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("team_id", organizationId)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      assertOrgId(organizationId, "issue creation from meeting");

      // Build base issue data
      const baseData = {
        organization_id: organizationId,
        meeting_id: meetingId,
        meeting_item_id: item.id,
        title: title.trim(),
        context: context.trim() || null,
        priority: parseInt(priority),
        owner_id: ownerId || null,
        status: "open" as const,
        period_key: periodKey,
        metric_id: item.item_type === "metric" && item.source_ref_id ? item.source_ref_id : null,
        rock_id: item.item_type === "rock" && item.source_ref_id ? item.source_ref_id : null,
      };

      const { data, error } = await supabase
        .from("issues")
        .insert(baseData)
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Issue created" });
      queryClient.invalidateQueries({ queryKey: ["meeting-issues", meetingId] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      onIssueCreated?.(data.id);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create issue",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Issue</DialogTitle>
          <DialogDescription>
            Create an issue from this meeting item. It will be linked to this meeting for traceability.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="issue-title">Title *</Label>
            <Input
              id="issue-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue-context">Context</Label>
            <Textarea
              id="issue-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Additional details"
              rows={5}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">{context.length}/1000</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Critical</SelectItem>
                  <SelectItem value="2">2 - High</SelectItem>
                  <SelectItem value="3">3 - Medium</SelectItem>
                  <SelectItem value="4">4 - Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {(users || []).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !title.trim()}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Issue
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}