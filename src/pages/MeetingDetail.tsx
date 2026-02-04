import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Play, Square, Printer, ArrowLeft, Info, AlertCircle, ListChecks } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AgendaItemRow } from "@/components/meetings/AgendaItemRow";
import { AddItemModal } from "@/components/meetings/AddItemModal";
import { MeetingPrepChecklist } from "@/components/meetings/MeetingPrepChecklist";
import { MeetingPrepInsights } from "@/components/meetings/MeetingPrepInsights";
import { MeetingReviewSummary } from "@/components/meetings/MeetingReviewSummary";
import { MeetingCommitmentsSection } from "@/components/meetings/MeetingCommitmentsSection";
import { MeetingPrintView } from "@/components/meetings/MeetingPrintView";

import { SectionNavigator } from "@/components/l10/SectionNavigator";
import { SectionTimer } from "@/components/l10/SectionTimer";
import { LiveTodoPanel } from "@/components/meetings/LiveTodoPanel";
import { useRecurringIssues } from "@/hooks/useRecurringIssues";
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
import { generateQuarterlyAgenda } from "@/lib/meetings/quarterlyAgendaGenerator";
import { generateAnnualAgenda } from "@/lib/meetings/annualAgendaGenerator";
import { getMeetingTypeConfig, getSectionOrder, getSectionLabels, getSectionTimers } from "@/lib/meetings/meetingTypes";
import { getMonthlyPeriodSelection, periodKeyToStart } from "@/lib/scorecard/periodHelper";
import { metricStatus, MetricStatusResult, normalizeDirection, MetricStatus } from "@/lib/scorecard/metricStatus";
import { RockGapData } from "@/components/meetings/RockGapPanel";

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
  const [addModalSection, setAddModalSection] = useState<string | undefined>(undefined);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [periodKey, setPeriodKey] = useState<string>("");
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [level10Score, setLevel10Score] = useState<number | null>(null);
  const [outcomeHeadline, setOutcomeHeadline] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const generationAttempted = useRef(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Handle prep checklist add item
  const handlePrepAddItem = (section: string) => {
    setAddModalSection(section);
    setShowAddModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // Scroll to section by index - will use SECTION_ORDER from meeting config
  const handleNavigateSection = (index: number) => {
    setCurrentSectionIndex(index);
  };

  // Auto-open start dialog if ?start=1
  useEffect(() => {
    if (searchParams.get("start") === "1") {
      setShowStartDialog(true);
    }
  }, [searchParams]);

  // Get period key for the org
  useEffect(() => {
    async function fetchPeriod() {
      if (!organizationId) return;
      const period = await getMonthlyPeriodSelection(organizationId);
      setPeriodKey(period.selectedPeriodKey);
    }
    fetchPeriod();
  }, [organizationId]);

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

  // Get meeting type config (default to L10 if no meeting loaded yet)
  const meetingType = meeting?.type || "L10";
  const meetingConfig = getMeetingTypeConfig(meetingType);
  const SECTION_ORDER = getSectionOrder(meetingType);
  const SECTION_LABELS = getSectionLabels(meetingType);
  const SECTION_TIMERS = getSectionTimers(meetingType);

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

  // Collect metric IDs from meeting items
  const metricIds = (items || [])
    .filter((item) => item.item_type === "metric" && item.source_ref_id)
    .map((item) => item.source_ref_id as string);

  // Batch fetch metrics and results for metric items
  const { data: metricStatusMap } = useQuery({
    queryKey: ["meeting-metric-status", metricIds, periodKey],
    queryFn: async (): Promise<Map<string, MetricStatusResult>> => {
      if (!metricIds.length || !periodKey || !organizationId) {
        return new Map();
      }

      // Fetch metrics
      const { data: metrics } = await supabase
        .from("metrics")
        .select("id, name, target, direction, owner, unit")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .in("id", metricIds);

      if (!metrics?.length) return new Map();

      // Fetch metric results for the selected period
      const { data: results } = await supabase
        .from("metric_results")
        .select("metric_id, value, period_key")
        .in("metric_id", metricIds)
        .eq("period_type", "monthly")
        .eq("period_key", periodKey);

      // Build result lookup
      const resultsByMetric = (results || []).reduce((acc, r) => {
        acc[r.metric_id] = r;
        return acc;
      }, {} as Record<string, { value: number | null }>);

      // Compute status for each metric
      const statusMap = new Map<string, MetricStatusResult>();
      for (const metric of metrics) {
        const result = resultsByMetric[metric.id] ?? null;
        const status = metricStatus(metric, result, periodKey);
        // Add metric name and unit for display
        statusMap.set(metric.id, {
          ...status,
          metricName: metric.name,
          metricUnit: metric.unit,
        } as MetricStatusResult & { metricName: string; metricUnit: string });
      }

      return statusMap;
    },
    enabled: metricIds.length > 0 && !!periodKey && !!organizationId,
  });

  // Collect rock IDs from meeting items
  const rockIds = (items || [])
    .filter((item) => item.item_type === "rock" && item.source_ref_id)
    .map((item) => item.source_ref_id as string);

  // Batch fetch rock data with reality gap for rock items
  const { data: rockGapMap } = useQuery({
    queryKey: ["meeting-rock-data", rockIds, periodKey, organizationId],
    queryFn: async (): Promise<Map<string, RockGapData>> => {
      if (!rockIds.length || !periodKey || !organizationId) {
        return new Map();
      }

      // Fetch rocks with owner info
      const { data: rocks } = await supabase
        .from("rocks")
        .select("id, title, owner_id, confidence, status, quarter, users(id, full_name)")
        .eq("organization_id", organizationId)
        .in("id", rockIds);

      if (!rocks?.length) return new Map();

      // Fetch rock_metric_links for these rocks
      const { data: links } = await supabase
        .from("rock_metric_links")
        .select("rock_id, metric_id")
        .eq("organization_id", organizationId)
        .in("rock_id", rockIds);

      const linksByRock: Record<string, string[]> = {};
      for (const link of links || []) {
        if (!linksByRock[link.rock_id]) linksByRock[link.rock_id] = [];
        linksByRock[link.rock_id].push(link.metric_id);
      }

      // Collect all metric IDs from rock links
      const allLinkedMetricIds = Array.from(new Set((links || []).map(l => l.metric_id)));

      // Fetch metrics
      const { data: metrics } = allLinkedMetricIds.length > 0
        ? await supabase
            .from("metrics")
            .select("id, name, target, direction, owner, unit")
            .eq("organization_id", organizationId)
            .eq("is_active", true)
            .in("id", allLinkedMetricIds)
        : { data: [] };

      // Fetch metric results for the period
      const periodStart = periodKeyToStart(periodKey);
      const { data: results } = allLinkedMetricIds.length > 0
        ? await supabase
            .from("metric_results")
            .select("metric_id, value, period_key")
            .in("metric_id", allLinkedMetricIds)
            .eq("period_type", "monthly")
            .eq("period_start", periodStart)
        : { data: [] };

      // Build result lookup
      const resultsByMetric = (results || []).reduce((acc, r) => {
        acc[r.metric_id] = r;
        return acc;
      }, {} as Record<string, { value: number | null }>);

      // Build metrics map
      const metricsById = (metrics || []).reduce((acc, m) => {
        acc[m.id] = m;
        return acc;
      }, {} as Record<string, typeof metrics[0]>);

      // Compute gap data for each rock
      const gapMap = new Map<string, RockGapData>();

      for (const rock of rocks) {
        const linkedMetricIds = linksByRock[rock.id] || [];
        const linkedMetrics: RockGapData["linkedMetrics"] = [];

        let offTrackCount = 0;
        let needsDataCount = 0;
        let needsTargetCount = 0;
        let needsOwnerCount = 0;
        let onTrackCount = 0;

        for (const metricId of linkedMetricIds) {
          const metric = metricsById[metricId];
          if (!metric) continue;

          const result = resultsByMetric[metricId] ?? null;
          const statusResult = metricStatus(metric, result, periodKey);

          switch (statusResult.status) {
            case 'off_track': offTrackCount++; break;
            case 'needs_data': needsDataCount++; break;
            case 'needs_target': needsTargetCount++; break;
            case 'needs_owner': needsOwnerCount++; break;
            case 'on_track': onTrackCount++; break;
          }

          linkedMetrics.push({
            id: metric.id,
            name: metric.name,
            target: metric.target,
            direction: normalizeDirection(metric.direction),
            unit: metric.unit,
            owner: metric.owner,
            value: result?.value ?? null,
            status: statusResult.status,
            statusResult,
            delta: statusResult.delta,
          });
        }

        // Sort metrics: OFF_TRACK first by abs delta, then others
        const statusOrder: Record<MetricStatus, number> = {
          'off_track': 0, 'needs_data': 1, 'needs_target': 2, 'needs_owner': 3, 'on_track': 4,
        };
        linkedMetrics.sort((a, b) => {
          const orderDiff = statusOrder[a.status] - statusOrder[b.status];
          if (orderDiff !== 0) return orderDiff;
          if (a.status === 'off_track' && b.status === 'off_track') {
            return Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0);
          }
          return a.name.localeCompare(b.name);
        });

        gapMap.set(rock.id, {
          rock: {
            id: rock.id,
            title: rock.title,
            owner_id: rock.owner_id,
            owner_name: (rock.users as any)?.full_name || null,
            confidence: rock.confidence,
            status: rock.status,
            quarter: rock.quarter,
          },
          offTrackCount,
          needsDataCount,
          needsTargetCount,
          needsOwnerCount,
          onTrackCount,
          totalLinkedMetrics: linkedMetrics.length,
          linkedMetrics,
          periodKey,
          periodLabel: `${periodKey.slice(0, 4)}-${periodKey.slice(5)}`,
        });
      }

      return gapMap;
    },
    enabled: rockIds.length > 0 && !!periodKey && !!organizationId,
  });

  // Fetch issues created in this meeting
  const { data: meetingIssues } = useQuery({
    queryKey: ["meeting-issues", meetingId],
    queryFn: async () => {
      if (!meetingId || !organizationId) return [];
      const { data, error } = await supabase
        .from("issues")
        .select("id, title, status, meeting_item_id")
        .eq("meeting_id", meetingId)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!meetingId && !!organizationId,
  });

  // Fetch todos for this meeting (for recap)
  const { data: meetingTodos } = useQuery({
    queryKey: ["meeting-todos", meetingId],
    queryFn: async () => {
      if (!meetingId || !organizationId) return [];
      const { data, error } = await supabase
        .from("todos")
        .select("id, title, done_at, owner_id")
        .eq("meeting_id", meetingId)
        .eq("organization_id", organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!meetingId && !!organizationId,
  });

  const openTodosCount = (meetingTodos || []).filter(t => !t.done_at).length;

  // Fetch recurring issues for badge display in live/completed mode
  const { data: recurringIssues } = useRecurringIssues({
    organizationId,
    enabled: meeting?.status === "in_progress" || meeting?.status === "completed",
  });

  // Build recurring issues lookup map
  const recurringIssueMap = new Map<string, number>();
  for (const ri of recurringIssues || []) {
    recurringIssueMap.set(ri.id, ri.meetingCount);
  }

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

      // Use the appropriate agenda generator based on meeting type
      let result;
      if (meeting.type === "quarterly") {
        result = await generateQuarterlyAgenda(organizationId, meetingId);
      } else if (meeting.type === "annual") {
        result = await generateAnnualAgenda(organizationId, meetingId);
      } else {
        result = await generateL10Agenda(organizationId, meetingId);
      }

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
          level10_score: level10Score,
          outcome_headline: outcomeHeadline || null,
          outcome_notes: outcomeNotes || null,
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
      // Reset score state
      setLevel10Score(null);
      setOutcomeHeadline("");
      setOutcomeNotes("");
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

  // Count discussed items for live mode
  const discussedCount = (items || []).filter((i) => i.discussed && !i.is_deleted).length;
  const totalItems = (items || []).filter((i) => !i.is_deleted).length;

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
    <div className="p-6 space-y-6 print:p-0 print:space-y-0">
      {/* Header - hidden on print */}
      <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
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
        <div className="flex items-center gap-2 flex-wrap">
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
          <Button variant="outline" onClick={handlePrint}>
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
        <Alert className="border-blue-500/50 bg-blue-500/10 print:hidden">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            <strong>Preview Mode</strong> — This agenda is a starting point. Edit or delete anything before you start.
          </AlertDescription>
        </Alert>
      )}
      {isLiveMode && (
        <div className="space-y-3 print:hidden">
          <Alert className="border-green-500/50 bg-green-500/10">
            <Info className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 flex items-center justify-between flex-wrap gap-2">
              <span>
                <strong>Live Meeting</strong> — Click ○ to mark items discussed. Click ⚠ to create an Issue.
              </span>
              <span className="text-sm">
                {discussedCount}/{totalItems} discussed
              </span>
            </AlertDescription>
          </Alert>
          <SectionNavigator
            sections={SECTION_ORDER}
            sectionLabels={SECTION_LABELS}
            currentSectionIndex={currentSectionIndex}
            onNavigate={handleNavigateSection}
          />
        </div>
      )}
      {isCompleted && (
        <Alert className="border-gray-500/50 bg-gray-500/10 print:hidden">
          <Info className="h-4 w-4 text-gray-600" />
          <AlertDescription className="text-gray-700">
            <strong>Review Mode</strong> — This meeting has ended. Items are read-only.
          </AlertDescription>
        </Alert>
      )}

      {/* Prep Checklist for Preview Mode */}
      {isPreviewMode && (
        <div className="print:hidden space-y-4">
          <MeetingPrepChecklist
            periodKey={periodKey}
            onAddItem={handlePrepAddItem}
          />
          {organizationId && meetingId && (
            <MeetingPrepInsights
              meetingId={meetingId}
              organizationId={organizationId}
            />
          )}
        </div>
      )}

      {/* Review Summary for Completed Mode */}
      {isCompleted && (
        <div className="print:hidden">
          <MeetingReviewSummary
            meeting={meeting}
            discussedCount={discussedCount}
            totalItems={totalItems}
            issues={meetingIssues || []}
          />
        </div>
      )}

      {/* Commitments Section - shows intervention signals and prompts */}
      {organizationId && meetingId && (
        <div className="print:hidden">
          <MeetingCommitmentsSection
            meetingId={meetingId}
            organizationId={organizationId}
          />
        </div>
      )}

      {/* Show Deleted Toggle (admin only) */}
      {canEdit && !isLiveMode && (
        <div className="flex items-center gap-2 print:hidden">
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:block">
        {/* Agenda Sections - Main content */}
        <div className="lg:col-span-3 space-y-4 print:space-y-6">
          {SECTION_ORDER.map((section, sectionIdx) => {
            const sectionItems = groupedItems[section] || [];
            if (sectionItems.length === 0 && isCompleted) return null;

            return (
              <Card 
                key={section} 
                ref={(el) => { sectionRefs.current[section] = el; }}
                id={`section-${section}`}
              >
                <CardHeader className="py-3">
                  <CardTitle className="text-base font-medium flex items-center justify-between">
                    <span>
                      {SECTION_LABELS[section]}
                      <Badge variant="secondary" className="ml-2">
                        {sectionItems.filter((i) => !i.is_deleted).length}
                      </Badge>
                    </span>
                    {isLiveMode && SECTION_TIMERS[section] && (
                      <SectionTimer defaultMinutes={SECTION_TIMERS[section]} />
                    )}
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
                      {sectionItems.map((item, index) => {
                        // Get real metric status from prefetched data
                        const metricStatusObj = item.item_type === "metric" && item.source_ref_id
                          ? metricStatusMap?.get(item.source_ref_id) ?? null
                          : null;

                        // Get rock gap data from prefetched data
                        const rockGapData = item.item_type === "rock" && item.source_ref_id
                          ? rockGapMap?.get(item.source_ref_id) ?? null
                          : null;

                        // Get recurring issue info for issue items
                        const recurringInfo = item.item_type === "issue" && item.source_ref_id
                          ? {
                              isRecurring: recurringIssueMap.has(item.source_ref_id),
                              meetingCount: recurringIssueMap.get(item.source_ref_id) || 0,
                            }
                          : null;

                        return (
                          <AgendaItemRow
                            key={item.id}
                            item={item}
                            canEdit={canEdit}
                            isLiveMode={isLiveMode}
                            isCompleted={isCompleted}
                            isFirst={index === 0}
                            isLast={index === sectionItems.length - 1}
                            organizationId={organizationId!}
                            meetingId={meetingId!}
                            periodKey={periodKey}
                            metricStatusObj={metricStatusObj}
                            rockGapData={rockGapData}
                            recurringInfo={recurringInfo}
                          />
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Sidebar - To-Dos + Issues */}
        {(isLiveMode || isCompleted) && (
          <div id="todos-sidebar" className="lg:col-span-1 space-y-4 print:hidden">
            {/* To-Do Panel */}
            {organizationId && meetingId && (
              <LiveTodoPanel
                organizationId={organizationId}
                meetingId={meetingId}
                disabled={isCompleted}
              />
            )}
            
            {/* Issues created in this meeting */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <ListChecks className="w-4 h-4" />
                  Issues created
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                {(meetingIssues || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No issues created yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(meetingIssues || []).map((issue) => (
                      <div
                        key={issue.id}
                        className="p-2 rounded border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/issues?highlight=${issue.id}`)}
                      >
                        <p className="text-sm font-medium truncate">{issue.title}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {issue.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      <AddItemModal
        open={showAddModal}
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) setAddModalSection(undefined);
        }}
        organizationId={organizationId!}
        meetingId={meetingId!}
        initialSection={addModalSection}
      />

      {/* Print View (hidden on screen, shown when printing) */}
      <MeetingPrintView
        meeting={meeting}
        items={items || []}
        issues={meetingIssues || []}
        metricStatusMap={metricStatusMap}
        rockGapMap={rockGapMap}
        periodKey={periodKey}
      />

      {/* Start Meeting Dialog */}
      <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start meeting now?</AlertDialogTitle>
            <AlertDialogDescription>
              This switches to Live mode. You can still create Issues and mark items discussed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
            >
              Start
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Meeting Dialog with Recap */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>End meeting?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>This completes the meeting. You can still review it later.</p>
                
                {/* Recap summary */}
                <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                  <p className="font-medium text-foreground">Meeting Summary</p>
                  <div className="flex justify-between">
                    <span>Items discussed:</span>
                    <span className="font-medium">{discussedCount}/{totalItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Issues created:</span>
                    <span className="font-medium">{(meetingIssues || []).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>To-Dos:</span>
                    <span className="font-medium">{(meetingTodos || []).length}</span>
                  </div>
                </div>

                {/* Level 10 Score Section */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-foreground">Level 10 score (optional)</Label>
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setLevel10Score(level10Score === score ? null : score)}
                          className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                            level10Score === score
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted hover:bg-muted/80 text-muted-foreground"
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">This is for improving meetings, not judging people.</p>
                  </div>
                  <div>
                    <Label htmlFor="headline" className="text-sm text-muted-foreground">Headline (optional)</Label>
                    <input
                      id="headline"
                      type="text"
                      placeholder="One sentence summary..."
                      value={outcomeHeadline}
                      onChange={(e) => setOutcomeHeadline(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-md border bg-background text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes" className="text-sm text-muted-foreground">Notes (optional)</Label>
                    <textarea
                      id="notes"
                      placeholder="Any notes..."
                      value={outcomeNotes}
                      onChange={(e) => setOutcomeNotes(e.target.value)}
                      rows={2}
                      className="w-full mt-1 px-3 py-2 rounded-md border bg-background text-sm resize-none"
                    />
                  </div>
                </div>

                {/* Warning for open todos */}
                {openTodosCount > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-700">
                    <p className="font-medium">⚠ Open To-Dos remaining</p>
                    <p className="text-sm mt-1">
                      You have {openTodosCount} open To-Do{openTodosCount > 1 ? 's' : ''}. 
                      Do you want to review them before ending the meeting?
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            {openTodosCount > 0 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowEndDialog(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowEndDialog(false);
                    document.getElementById("todos-sidebar")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full sm:w-auto"
                >
                  Review To-Dos
                </Button>
                <AlertDialogAction
                  onClick={() => endMutation.mutate()}
                  disabled={endMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  End Anyway
                </AlertDialogAction>
              </>
            ) : (
              <>
                <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => endMutation.mutate()}
                  disabled={endMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  End Meeting
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
