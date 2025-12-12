import { useState } from "react";
import { useCoreValues } from "@/hooks/useCoreValues";
import { useCoreValueShoutouts } from "@/hooks/useCoreValueShoutouts";
import type { CoreValue } from "@/lib/core-values/types";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, AlertCircle } from "lucide-react";

interface ShoutoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedValue?: CoreValue | null;
  meetingId?: string;
}

export function ShoutoutDialog({ open, onOpenChange, preselectedValue, meetingId }: ShoutoutDialogProps) {
  const { activeValues } = useCoreValues();
  const { createShoutout } = useCoreValueShoutouts(meetingId);
  const { data: user } = useCurrentUser();
  const orgId = user?.team_id;

  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedValueId, setSelectedValueId] = useState(preselectedValue?.id || "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch team members
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("team_id", orgId)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && open,
  });

  // Reset form when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedValueId(preselectedValue?.id || "");
      setSelectedUserId("");
      setNote("");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!selectedUserId || !selectedValueId) return;

    setSubmitting(true);
    try {
      await createShoutout.mutateAsync({
        recognized_user_id: selectedUserId,
        core_value_id: selectedValueId,
        note: note.trim() || undefined,
        meeting_id: meetingId,
      });
      handleOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Give a Shout-Out
          </DialogTitle>
          <DialogDescription>
            Recognize a teammate for living our values.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Recognize Teammate</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select teammate" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers?.filter(m => m.id !== user?.id).map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>For This Value</Label>
            <Select value={selectedValueId} onValueChange={setSelectedValueId}>
              <SelectTrigger>
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                {activeValues.map((value) => (
                  <SelectItem key={value.id} value={value.id}>
                    {value.title.split(" ").slice(0, 4).join(" ")}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Note (Optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Share a brief example of what they did..."
              maxLength={240}
              className="resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">{note.length}/240</p>
          </div>

          <Alert variant="default" className="bg-muted/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Keep notes free of patient names or identifying details.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedUserId || !selectedValueId || submitting}
          >
            {submitting ? "Sending..." : "Send Shout-Out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
