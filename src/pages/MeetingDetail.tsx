import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Play, Square, Printer, ArrowLeft, Info, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AgendaItemRow } from "@/components/meetings/AgendaItemRow";
import { AddItemModal } from "@/components/meetings/AddItemModal";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { generateL10Agenda, shouldGenerateAgenda } from "@/lib/meetings/agendaGenerator";

const SECTION_ORDER = ["scorecard", "rocks", "issues", "todo", "segue", "conclusion", "custom"];
const SECTION_LABELS: Record<string, string> = {
  scorecard: "Scorecard Review",
  rocks: "Rock Review",
  issues: "IDS (Issues)",
  todo: "To-Do Review",
  segue: "Segue",
  conclusion: "Conclusion",
  custom: "Custom Items",
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500/10 text-blue-600",
  in_progress: "bg-green-500/10 text-green-600",
  completed: "bg-gray-500/10 text-gray-600",
};

export default function MeetingDetail() {
  const { id: meetingId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const organizationId = currentUser?.team_id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const generationAttempted = useRef(false);

  // Auto-open start dialog if ?start=1
  useEffect(() => {
    if (searchParams.get("start") === "1") {
      setShowStartDialog(true);
    }
  }, [searchParams]);

  // Fetch meeting
  const { data: meeting, isLoading: meetingLoading } = useQuery({
    queryKey: ["meeting", meetingId],
    queryFn: async () => {
      if (!meetingId || !organizationId) return null;
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", meetingId)
        .eq("organization_id", organizationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!meetingId && !!organizationId,
  });

  // Fetch meeting items
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["meeting-items", meetingId, showDeleted],
    queryFn: async () => {
      if (!meetingId || !organizationId) return [];
      let query = supabase
        .from("meeting_items")
        .select("*")
        .eq("meeting_id", meetingId)
        .eq("organization_id", organizationId)
        .order("section")
        .order("sort_order");

      if (!showDeleted) {
        query = query.eq("is_deleted", false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!meetingId && !!organizationId,
  });

  // Auto-generate agenda when conditions are met
  useEffect(() => {
    async function tryGenerateAgenda() {
      if (!meeting || !organizationId || !meetingId) return;
      if (generationAttempted.current) return;
      if (isGenerating) return;
      if (itemsLoading) return;

      const shouldGenerate = await shouldGenerateAgenda(meeting, organizationId);
      if (!shouldGenerate) return;

      generationAttempted.current = true;
      setIsGenerating(true);

      const result = await generateL10Agenda(organizationId, meetingId);

      setIsGenerating(false);

      if (result.success) {
        toast({
          title: "Agenda prefilled",
          description: `${result.itemsCreated} items added for ${result.periodKey}. Edit or delete anything before you start.`,
        });
        queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });
        queryClient.invalidateQueries({ queryKey: ["meeting-items", meetingId] });
      } else if (result.error) {
        toast({
          title: "Failed to generate agenda",
          description: result.error,
          variant: "destructive",
        });
      }
    }

    tryGenerateAgenda();
  }, [meeting, organizationId, meetingId, itemsLoading, isGenerating, queryClient, toast]);

  // Start meeting mutation
  const startMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("meetings")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", meetingId)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ title: "Meeting started" });
      setShowStartDialog(false);
      // Clear URL param
      navigate(`/meetings/${meetingId}`, { replace: true });
    },
    onError: () => {
      toast({ title: "Failed to start meeting", variant: "destructive" });
    },
  });

  // End meeting mutation
  const endMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("meetings")
        .update({
          status: "completed",
          ended_at: new Date().toISOString(),
        })
        .eq("id", meetingId)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ title: "Meeting ended" });
      setShowEndDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to end meeting", variant: "destructive" });
    },
  });

  // Group items by section
  const groupedItems = SECTION_ORDER.reduce((acc, section) => {
    acc[section] = (items || []).filter((item) => item.section === section);
    return acc;
  }, {} as Record<string, typeof items>);

  const isPreviewMode = meeting?.status === "draft" || meeting?.status === "scheduled";
  const isLiveMode = meeting?.status === "in_progress";
  const isCompleted = meeting?.status === "completed";
  const canEdit = !isCompleted;

  if (meetingLoading || itemsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Meeting not found or you don't have access.</AlertDescription>
        </Alert>
        <Button variant="link" onClick={() => navigate("/meetings")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Meetings
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/meetings")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{meeting.title || "Level 10 Meeting"}</h1>
            <p className="text-muted-foreground">
              {format(new Date(meeting.scheduled_for), "PPP 'at' p")}
            </p>
          </div>
          <Badge className={statusColors[meeting.status]}>
            {meeting.status === "draft" && "Draft"}
            {meeting.status === "scheduled" && "Scheduled"}
            {meeting.status === "in_progress" && "In Progress"}
            {meeting.status === "completed" && "Completed"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {isPreviewMode && (
            <Button onClick={() => setShowStartDialog(true)}>
              <Play className="w-4 h-4 mr-2" />
              Start Meeting
            </Button>
          )}
          {isLiveMode && (
            <Button variant="destructive" onClick={() => setShowEndDialog(true)}>
              <Square className="w-4 h-4 mr-2" />
              End Meeting
            </Button>
          )}
          <Button variant="outline" disabled title="Print coming next">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          {canEdit && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Everything is editable</span>
              <Button variant="outline" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mode Banner */}
      {isPreviewMode && (
        <Alert className="border-blue-500/50 bg-blue-500/10">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            <strong>Preview Mode</strong> — This is your meeting preview. Edit, add, or remove items before you start.
          </AlertDescription>
        </Alert>
      )}
      {isLiveMode && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <Info className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            <strong>Live Mode</strong> — Meeting in progress. Changes are tracked.
          </AlertDescription>
        </Alert>
      )}
      {isCompleted && (
        <Alert className="border-gray-500/50 bg-gray-500/10">
          <Info className="h-4 w-4 text-gray-600" />
          <AlertDescription className="text-gray-700">
            <strong>Review Mode</strong> — This meeting has ended. Items are read-only.
          </AlertDescription>
        </Alert>
      )}

      {/* Show Deleted Toggle (admin only) */}
      {canEdit && (
        <div className="flex items-center gap-2">
          <Switch
            id="show-deleted"
            checked={showDeleted}
            onCheckedChange={setShowDeleted}
          />
          <Label htmlFor="show-deleted" className="text-sm text-muted-foreground">
            Show deleted items
          </Label>
        </div>
      )}

      {/* Agenda Sections */}
      <div className="space-y-4">
        {SECTION_ORDER.map((section) => {
          const sectionItems = groupedItems[section] || [];
          if (sectionItems.length === 0 && isCompleted) return null;

          return (
            <Card key={section}>
              <CardHeader className="py-3">
                <CardTitle className="text-base font-medium">
                  {SECTION_LABELS[section]}
                  <Badge variant="secondary" className="ml-2">
                    {sectionItems.filter((i) => !i.is_deleted).length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                {sectionItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No items in this section.{" "}
                    {canEdit && (
                      <button
                        className="text-primary hover:underline"
                        onClick={() => setShowAddModal(true)}
                      >
                        Add one
                      </button>
                    )}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {sectionItems.map((item, index) => (
                      <AgendaItemRow
                        key={item.id}
                        item={item}
                        canEdit={canEdit}
                        isFirst={index === 0}
                        isLast={index === sectionItems.length - 1}
                        organizationId={organizationId!}
                        meetingId={meetingId!}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Item Modal */}
      <AddItemModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        organizationId={organizationId!}
        meetingId={meetingId!}
      />

      {/* Start Meeting Dialog */}
      <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Meeting Now?</AlertDialogTitle>
            <AlertDialogDescription>
              This switches to Live mode. You can still add and edit items during the meeting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
            >
              Start Meeting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Meeting Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              You can still review it later, but editing will be disabled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => endMutation.mutate()}
              disabled={endMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              End Meeting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
