import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface MetricAlert {
  id: string;
  metric_id: string;
  alert_type: string;
  message: string;
  tip: string | null;
  week_of: string;
  metrics: {
    name: string;
    owner: string | null;
    organization_id: string;
  };
}

interface ConvertToIssueDialogProps {
  open: boolean;
  onClose: () => void;
  alert: MetricAlert | null;
  onSuccess: () => void;
}

export const ConvertToIssueDialog = ({ open, onClose, alert, onSuccess }: ConvertToIssueDialogProps) => {
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [priority, setPriority] = useState("3");
  const [ownerId, setOwnerId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const { data: users } = useQuery({
    queryKey: ["users", alert?.metrics?.organization_id],
    queryFn: async () => {
      if (!alert?.metrics?.organization_id) return [];
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("team_id", alert.metrics.organization_id)
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!alert?.metrics?.organization_id && open,
  });

  // Pre-fill form when alert changes
  useEffect(() => {
    if (alert) {
      // Generate title from alert message
      const metricName = alert.metrics.name;
      setTitle(`${metricName} is off-track`);
      
      // Generate context from alert message and tip
      let contextText = alert.message;
      if (alert.tip) {
        contextText += `\n\n💡 Coaching Tip: ${alert.tip}`;
      }
      contextText += `\n\nWeek of: ${alert.week_of}`;
      setContext(contextText);

      // Set priority based on alert severity
      if (alert.alert_type === "off_target") {
        // Check if severely off target (>30%)
        const match = alert.message.match(/(\d+)% off target/);
        const percentOff = match ? parseInt(match[1]) : 0;
        setPriority(percentOff > 30 ? "5" : "3"); // Critical if >30%, High otherwise
      } else if (alert.alert_type === "downtrend") {
        setPriority("3"); // High
      } else {
        setPriority("2"); // Medium for missing data
      }

      // Set owner if metric has one
      if (alert.metrics.owner) {
        setOwnerId(alert.metrics.owner);
      }
    }
  }, [alert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!alert || !title.trim()) {
      toast({
        title: "Error",
        description: "Please provide a title",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Call edge function to create issue with VTO links
      const { data, error } = await supabase.functions.invoke("create-issue-from-alert", {
        body: {
          alertId: alert.id,
          metricId: alert.metric_id,
          organizationId: alert.metrics.organization_id,
          title: title.trim(),
          context: context.trim() || null,
          priority: parseInt(priority),
          ownerId: ownerId && ownerId !== "_unassigned" ? ownerId : null,
        },
      });

      if (error) throw error;

      toast({
        title: "Issue created",
        description: "Issue has been created and linked to your VTO goals",
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Error creating issue:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create issue",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setContext("");
    setPriority("3");
    setOwnerId("");
    onClose();
  };

  if (!alert) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Issue from Alert</DialogTitle>
          <DialogDescription>
            Convert this metric alert into a trackable issue. The issue will be automatically linked to related VTO goals.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Context</Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Additional context and details"
              rows={6}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">{context.length}/1000</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Low</SelectItem>
                  <SelectItem value="2">2 - Medium</SelectItem>
                  <SelectItem value="3">3 - High</SelectItem>
                  <SelectItem value="4">4 - Very High</SelectItem>
                  <SelectItem value="5">5 - Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger id="owner">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_unassigned">Unassigned</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Issue
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Missing import
import { useQuery } from "@tanstack/react-query";
