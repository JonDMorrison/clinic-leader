import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Play, Eye, Copy, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format, addDays, setHours, setMinutes, nextMonday } from "date-fns";
import { CreateMeetingModal } from "@/components/meetings/CreateMeetingModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500/10 text-blue-600",
  in_progress: "bg-green-500/10 text-green-600",
  completed: "bg-gray-500/10 text-gray-600",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
};

export default function Meetings() {
  const { data: currentUser } = useCurrentUser();
  const organizationId = currentUser?.team_id;
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Fetch all meetings for org
  const { data: meetings, isLoading } = useQuery({
    queryKey: ["meetings", organizationId],
    queryFn: async () => {
      if (!organizationId) return { upcoming: [], past: [] };

      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("organization_id", organizationId)
        .order("scheduled_for", { ascending: true });

      if (error) throw error;

      const upcoming = (data || []).filter(
        (m) => m.status !== "completed" && m.scheduled_for >= sixHoursAgo
      );
      const past = (data || []).filter(
        (m) => m.status === "completed" || m.scheduled_for < sixHoursAgo
      );

      return { upcoming, past: past.reverse() };
    },
    enabled: !!organizationId,
  });

  // Delete meeting mutation
  const deleteMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const { error } = await supabase
        .from("meetings")
        .delete()
        .eq("id", meetingId)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ title: "Meeting deleted" });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: "Failed to delete meeting", variant: "destructive" });
    },
  });

  // Duplicate meeting mutation
  const duplicateMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      // Fetch original meeting
      const { data: original, error: fetchError } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", meetingId)
        .single();
      if (fetchError) throw fetchError;

      // Calculate next week same day
      const originalDate = new Date(original.scheduled_for);
      const nextWeekDate = addDays(originalDate, 7);

      // Create new meeting
      const { data: newMeeting, error: createError } = await supabase
        .from("meetings")
        .insert({
          organization_id: organizationId,
          type: original.type,
          title: original.title,
          scheduled_for: nextWeekDate.toISOString(),
          duration_minutes: original.duration_minutes,
          status: "draft",
          created_by: currentUser?.id,
        })
        .select()
        .single();
      if (createError) throw createError;

      // Copy meeting items
      const { data: items, error: itemsError } = await supabase
        .from("meeting_items")
        .select("*")
        .eq("meeting_id", meetingId)
        .eq("is_deleted", false);
      if (itemsError) throw itemsError;

      if (items && items.length > 0) {
        const newItems = items.map((item) => ({
          organization_id: organizationId,
          meeting_id: newMeeting.id,
          section: item.section,
          item_type: item.item_type,
          title: item.title,
          description: item.description,
          source_ref_type: item.source_ref_type,
          source_ref_id: item.source_ref_id,
          sort_order: item.sort_order,
          is_deleted: false,
        }));

        const { error: insertError } = await supabase
          .from("meeting_items")
          .insert(newItems);
        if (insertError) throw insertError;
      }

      return newMeeting;
    },
    onSuccess: (newMeeting) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ title: "Meeting duplicated" });
      navigate(`/meetings/${newMeeting.id}`);
    },
    onError: () => {
      toast({ title: "Failed to duplicate meeting", variant: "destructive" });
    },
  });

  const handleCreateSuccess = (meetingId: string) => {
    setShowCreateModal(false);
    navigate(`/meetings/${meetingId}`);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meetings</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Meeting
        </Button>
      </div>

      {/* Upcoming Meetings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          {meetings?.upcoming.length === 0 ? (
            <p className="text-muted-foreground text-sm">No upcoming meetings scheduled.</p>
          ) : (
            <div className="space-y-2">
              {meetings?.upcoming.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{meeting.title || "Level 10 Meeting"}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(meeting.scheduled_for), "PPP 'at' p")}
                      </p>
                    </div>
                    <Badge className={statusColors[meeting.status]}>
                      {statusLabels[meeting.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/meetings/${meeting.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    {(meeting.status === "draft" || meeting.status === "scheduled") && (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/meetings/${meeting.id}?start=1`)}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(meeting.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Meetings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Past Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          {meetings?.past.length === 0 ? (
            <p className="text-muted-foreground text-sm">No past meetings.</p>
          ) : (
            <div className="space-y-2">
              {meetings?.past.slice(0, 10).map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{meeting.title || "Level 10 Meeting"}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(meeting.scheduled_for), "PPP 'at' p")}
                      </p>
                    </div>
                    <Badge className={statusColors[meeting.status]}>
                      {statusLabels[meeting.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/meetings/${meeting.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateMutation.mutate(meeting.id)}
                      disabled={duplicateMutation.isPending}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Duplicate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Meeting Modal */}
      <CreateMeetingModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        organizationId={organizationId}
        userId={currentUser?.id}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this meeting and all its agenda items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
