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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assertOrgId } from "@/hooks/useOrgSafetyCheck";
import { Loader2, AlertTriangle } from "lucide-react";
import { MetricStatusResult, STATUS_LABELS, formatMetricValue } from "@/lib/scorecard/metricStatus";
import { RockGapData } from "./RockGapPanel";

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
  metricStatusObj?: (MetricStatusResult & { metricName?: string; metricUnit?: string }) | null;
  rockGapData?: RockGapData | null;
  onIssueCreated?: (issueId: string, itemId: string) => void;
}

export function CreateIssueFromItemDialog({
  open,
  onOpenChange,
  organizationId,
  meetingId,
  item,
  periodKey,
  metricStatusObj,
  rockGapData,
  onIssueCreated,
}: CreateIssueFromItemDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [priority, setPriority] = useState("2");
  const [ownerId, setOwnerId] = useState<string>("");

  // Generate prefilled content based on item type and real data
  const generatePrefill = () => {
    const baseTitle = item.title.replace(/^(Metric|Rock|Issue): /, "");

    switch (item.item_type) {
      case "metric": {
        if (!metricStatusObj) {
          return {
            title: `Review metric: ${baseTitle} (${periodKey})`,
            context: `Metric data unavailable. Try refreshing the page.\n\nMonth: ${periodKey}`,
          };
        }

        const metricName = metricStatusObj.metricName || baseTitle;
        const unit = metricStatusObj.metricUnit || "";
        const value = metricStatusObj.value;
        const target = metricStatusObj.target;
        const status = metricStatusObj.status;
        const direction = metricStatusObj.direction;

        let metricTitle: string;
        switch (status) {
          case "off_track": metricTitle = `${metricName} off-track (${periodKey})`; break;
          case "needs_data": metricTitle = `${metricName} missing data (${periodKey})`; break;
          case "needs_target": metricTitle = `${metricName} missing target (${periodKey})`; break;
          case "needs_owner": metricTitle = `${metricName} missing owner (${periodKey})`; break;
          default: metricTitle = `Review metric: ${metricName} (${periodKey})`;
        }

        const valueDisplay = value !== null ? formatMetricValue(value, unit) : "No data";
        const targetDisplay = target !== null ? formatMetricValue(target, unit) : "Not set";
        const directionDisplay = direction ? direction.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "Not set";

        return {
          title: metricTitle,
          context: `Month: ${periodKey}\nValue: ${valueDisplay}\nTarget: ${targetDisplay}\nDirection: ${directionDisplay}\nStatus: ${STATUS_LABELS[status]}\n\nIdentify the root cause and define the next action to resolve this issue.`,
        };
      }
      case "rock": {
        if (!rockGapData) {
          return {
            title: `Rock blocked: ${baseTitle} (${periodKey})`,
            context: `Rock data unavailable.\n\nWhat is blocking progress, and what will we do next?`,
          };
        }

        const { rock, offTrackCount, needsDataCount, needsTargetCount, needsOwnerCount, linkedMetrics } = rockGapData;
        
        // Build context with real gap data
        const contextLines = [
          `Month: ${periodKey}`,
          `Rock: ${rock.title}`,
          `Owner: ${rock.owner_name || "Unassigned"}`,
          `Confidence: ${rock.confidence ? `${rock.confidence}/5` : "Not set"}`,
          ``,
          `Reality Gap Summary:`,
          `- Off Track: ${offTrackCount}`,
          `- Needs Data: ${needsDataCount}`,
          `- Needs Target: ${needsTargetCount}`,
          `- Needs Owner: ${needsOwnerCount}`,
        ];

        // Add top 3 problematic metrics
        const problematicMetrics = linkedMetrics.filter(m => m.status !== 'on_track').slice(0, 3);
        if (problematicMetrics.length > 0) {
          contextLines.push(``, `Top Issues:`);
          for (const m of problematicMetrics) {
            contextLines.push(`- ${m.name}: ${STATUS_LABELS[m.status]} (Value: ${formatMetricValue(m.value, m.unit)}, Target: ${formatMetricValue(m.target, m.unit)})`);
          }
        }

        contextLines.push(``, `What is blocking progress, and what will we do next?`);

        return {
          title: `Rock blocked: ${rock.title} (${periodKey})`,
          context: contextLines.join("\n"),
        };
      }
      case "issue":
        return {
          title: `Related: ${baseTitle}`,
          context: `This issue was spun off from "${baseTitle}" during the meeting.\n\n${item.description || ""}`,
        };
      default:
        return {
          title: baseTitle,
          context: `Created from meeting agenda item during the ${periodKey} review.\n\nClearly define the issue and determine the next action to resolve it.`,
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
  }, [open, item?.id, metricStatusObj]);

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
      toast({ title: "Issue created", description: title.trim() });
      queryClient.invalidateQueries({ queryKey: ["meeting-issues", meetingId] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["meeting-items", meetingId] });
      onIssueCreated?.(data.id, item.id);
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

  // Show warning if metric item but no status data
  const showDataWarning = item.item_type === "metric" && !metricStatusObj;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Issue</DialogTitle>
          <DialogDescription>
            Create an issue from this meeting item. It will be linked to this meeting for traceability.
          </DialogDescription>
        </DialogHeader>

        {showDataWarning && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Metric data unavailable. Try refreshing the page to load current values.
            </AlertDescription>
          </Alert>
        )}

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
              <Select value={ownerId || "none"} onValueChange={(val) => setOwnerId(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
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
