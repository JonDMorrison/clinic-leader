import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addDays, setHours, setMinutes, format, getDay, nextMonday } from "date-fns";

interface CreateMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: string;
  userId?: string;
  onSuccess: (meetingId: string) => void;
}

export function CreateMeetingModal({
  open,
  onOpenChange,
  organizationId,
  userId,
  onSuccess,
}: CreateMeetingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Default to next Monday at 9am
  const getDefaultDate = () => {
    const now = new Date();
    let target = nextMonday(now);
    target = setHours(target, 9);
    target = setMinutes(target, 0);
    return target;
  };

  const [title, setTitle] = useState("Level 10 Meeting");
  const [scheduledFor, setScheduledFor] = useState(
    format(getDefaultDate(), "yyyy-MM-dd'T'HH:mm")
  );
  const [duration, setDuration] = useState(90);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");

      const { data, error } = await supabase
        .from("meetings")
        .insert({
          organization_id: organizationId,
          type: "L10",
          title,
          scheduled_for: new Date(scheduledFor).toISOString(),
          duration_minutes: duration,
          status: "draft",
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ title: "Meeting created" });
      onSuccess(data.id);
      // Reset form
      setTitle("Level 10 Meeting");
      setScheduledFor(format(getDefaultDate(), "yyyy-MM-dd'T'HH:mm"));
      setDuration(90);
    },
    onError: () => {
      toast({ title: "Failed to create meeting", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Meeting</DialogTitle>
          <DialogDescription>
            Schedule a new Level 10 meeting for your team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Level 10 Meeting"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled">Date & Time</Label>
            <Input
              id="scheduled"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 90)}
              min={15}
              max={240}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !title}
          >
            {createMutation.isPending ? "Creating..." : "Create Meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
