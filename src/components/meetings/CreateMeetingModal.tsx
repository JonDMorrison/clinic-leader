import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addDays, setHours, setMinutes, format, nextMonday, addMonths } from "date-fns";
import { MEETING_TYPES, MeetingTypeKey, getMeetingTypeConfig } from "@/lib/meetings/meetingTypes";
import { Calendar, Clock, Target } from "lucide-react";

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

  const [meetingType, setMeetingType] = useState<MeetingTypeKey>("L10");
  const [title, setTitle] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [duration, setDuration] = useState(90);

  // Update defaults when meeting type changes
  useEffect(() => {
    const config = getMeetingTypeConfig(meetingType);
    setTitle(config.name);
    setDuration(config.defaultDuration);
    
    // Set appropriate default date based on meeting type
    const now = new Date();
    let target: Date;
    
    if (meetingType === "L10") {
      // Next Monday at 9am
      target = nextMonday(now);
      target = setHours(target, 9);
      target = setMinutes(target, 0);
    } else if (meetingType === "quarterly") {
      // 2 weeks from now at 9am (time to prepare)
      target = addDays(now, 14);
      target = setHours(target, 9);
      target = setMinutes(target, 0);
    } else {
      // Annual: 1 month from now
      target = addMonths(now, 1);
      target = setHours(target, 9);
      target = setMinutes(target, 0);
    }
    
    setScheduledFor(format(target, "yyyy-MM-dd'T'HH:mm"));
  }, [meetingType]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");

      const { data, error } = await supabase
        .from("meetings")
        .insert({
          organization_id: organizationId,
          type: meetingType,
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
      setMeetingType("L10");
    },
    onError: () => {
      toast({ title: "Failed to create meeting", variant: "destructive" });
    },
  });

  const config = getMeetingTypeConfig(meetingType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Meeting</DialogTitle>
          <DialogDescription>
            Schedule a new EOS meeting for your leadership team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Meeting Type Selection */}
          <div className="space-y-3">
            <Label>Meeting Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(MEETING_TYPES) as MeetingTypeKey[]).map((type) => {
                const typeConfig = MEETING_TYPES[type];
                const isSelected = meetingType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMeetingType(type)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                  >
                    <div className="font-medium text-sm">{typeConfig.name.split(" ")[0]}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {typeConfig.timeHorizon}
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* Meeting Type Description */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="font-medium text-foreground">{config.name}</div>
              <div className="text-muted-foreground mt-1">{config.description}</div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  {config.purpose}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.floor(config.defaultDuration / 60)}h {config.defaultDuration % 60}m
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={config.name}
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
              onChange={(e) => setDuration(parseInt(e.target.value) || config.defaultDuration)}
              min={15}
              max={720}
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
