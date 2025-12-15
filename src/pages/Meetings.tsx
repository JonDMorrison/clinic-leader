import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Play, Eye, Copy, Trash2, PlayCircle, FileText, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";
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

interface MeetingWithCounts {
  id: string;
  title: string | null;
  scheduled_for: string;
  status: string;
  type: string;
  duration_minutes: number;
  created_by: string | null;
  organization_id: string;
  agenda_generated: boolean;
  started_at: string | null;
  ended_at: string | null;
  level10_score: number | null;
  outcome_headline: string | null;
  itemCount: number;
  issueCount: number;
}

export default function Meetings() {
  const { data: currentUser } = useCurrentUser();
  const organizationId = currentUser?.team_id;
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("upcoming");

  // Fetch all meetings with item and issue counts
  const { data: meetings, isLoading } = useQuery({
    queryKey: ["meetings-with-counts", organizationId],
    queryFn: async () => {
      if (!organizationId) return { upcoming: [], past: [], inProgress: null };

      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

      // Fetch meetings
      const { data: meetingsData, error: meetingsError } = await supabase
        .from("meetings")
        .select("*")
        .eq("organization_id", organizationId)
        .order("scheduled_for", { ascending: true });

      if (meetingsError) throw meetingsError;

      const meetingIds = (meetingsData || []).map((m) => m.id);

      // Fetch item counts
      const { data: itemCounts } = await supabase
        .from("meeting_items")
        .select("meeting_id")
        .eq("organization_id", organizationId)
        .eq("is_deleted", false)
        .in("meeting_id", meetingIds);

      // Fetch issue counts
      const { data: issueCounts } = await supabase
        .from("issues")
        .select("meeting_id")
        .eq("organization_id", organizationId)
        .in("meeting_id", meetingIds);

      // Count per meeting
      const itemCountMap: Record<string, number> = {};
      const issueCountMap: Record<string, number> = {};

      (itemCounts || []).forEach((item) => {
        itemCountMap[item.meeting_id] = (itemCountMap[item.meeting_id] || 0) + 1;
      });
      (issueCounts || []).forEach((issue) => {
        if (issue.meeting_id) {
          issueCountMap[issue.meeting_id] = (issueCountMap[issue.meeting_id] || 0) + 1;
        }
      });

      // Enrich meetings
      const enriched: MeetingWithCounts[] = (meetingsData || []).map((m) => ({
        ...m,
        itemCount: itemCountMap[m.id] || 0,
        issueCount: issueCountMap[m.id] || 0,
      }));

      // Find in-progress meeting
      const inProgress = enriched.find((m) => m.status === "in_progress") || null;

      const upcoming = enriched.filter(
        (m) => m.status !== "completed" && m.scheduled_for >= sixHoursAgo
      );
      const past = enriched
        .filter((m) => m.status === "completed" || m.scheduled_for < sixHoursAgo)
        .reverse();

      return { upcoming, past, inProgress };
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
      queryClient.invalidateQueries({ queryKey: ["meetings-with-counts"] });
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
      const { data: original, error: fetchError } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", meetingId)
        .single();
      if (fetchError) throw fetchError;

      const originalDate = new Date(original.scheduled_for);
      const nextWeekDate = addDays(originalDate, 7);

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
      queryClient.invalidateQueries({ queryKey: ["meetings-with-counts"] });
      toast({ title: "Meeting duplicated" });
      navigate(`/meetings/${newMeeting.id}`);
    },
    onError: () => {
      toast({ title: "Failed to duplicate meeting", variant: "destructive" });
    },
  });

  const handleCreateSuccess = (newMeetingId: string) => {
    setShowCreateModal(false);
    navigate(`/meetings/${newMeetingId}`);
  };

  const MeetingRow = ({ meeting, showDuplicate = false }: { meeting: MeetingWithCounts; showDuplicate?: boolean }) => (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{meeting.title || "Level 10 Meeting"}</p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(meeting.scheduled_for), "PPP 'at' p")}
          </p>
        </div>
        <Badge className={statusColors[meeting.status]}>
          {statusLabels[meeting.status]}
        </Badge>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {meeting.itemCount}
          </span>
          {meeting.issueCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="w-3 h-3" />
              {meeting.issueCount}
            </span>
          )}
          {meeting.level10_score && (
            <span className={`font-medium ${
              meeting.level10_score >= 8 ? "text-green-600" : meeting.level10_score >= 5 ? "text-amber-600" : "text-red-600"
            }`}>
              {meeting.level10_score}/10
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/meetings/${meeting.id}`)}
        >
          <Eye className="w-4 h-4 mr-1" />
          {meeting.status === "completed" ? "Review" : "Preview"}
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
        {meeting.status === "in_progress" && (
          <Button
            size="sm"
            variant="default"
            onClick={() => navigate(`/meetings/${meeting.id}`)}
          >
            <Play className="w-4 h-4 mr-1" />
            Resume
          </Button>
        )}
        {showDuplicate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => duplicateMutation.mutate(meeting.id)}
            disabled={duplicateMutation.isPending}
          >
            <Copy className="w-4 h-4 mr-1" />
            Duplicate
          </Button>
        )}
        {meeting.status !== "completed" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(meeting.id)}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );

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

      {/* Resume In-Progress Meeting Banner */}
      {meetings?.inProgress && (
        <Card className="border-green-500/50 bg-green-500/10">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <PlayCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-semibold text-green-700">Meeting in Progress</p>
                  <p className="text-sm text-green-600">
                    {meetings.inProgress.title || "Level 10 Meeting"} • Started {format(new Date(meetings.inProgress.started_at || meetings.inProgress.scheduled_for), "h:mm a")}
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate(`/meetings/${meetings.inProgress?.id}`)}>
                <Play className="w-4 h-4 mr-2" />
                Resume Meeting
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({meetings?.upcoming.length || 0})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({meetings?.past.length || 0})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({(meetings?.upcoming.length || 0) + (meetings?.past.length || 0)})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
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
                    <MeetingRow key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Past Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              {meetings?.past.length === 0 ? (
                <p className="text-muted-foreground text-sm">No past meetings.</p>
              ) : (
                <div className="space-y-2">
                  {meetings?.past.slice(0, 20).map((meeting) => (
                    <MeetingRow key={meeting.id} meeting={meeting} showDuplicate />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...(meetings?.upcoming || []), ...(meetings?.past || [])].map((meeting) => (
                  <MeetingRow key={meeting.id} meeting={meeting} showDuplicate={meeting.status === "completed"} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
