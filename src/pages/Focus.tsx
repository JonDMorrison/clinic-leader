import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRecurringIssues } from "@/hooks/useRecurringIssues";
import { getMonthlyPeriodSelection, periodKeyToStart } from "@/lib/scorecard/periodHelper";
import { metricStatus, formatMetricValue, type MetricStatus } from "@/lib/scorecard/metricStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CutoverBanner } from "@/components/scorecard/CutoverBanner";
import {
  Focus as FocusIcon,
  AlertTriangle,
  Target,
  RotateCcw,
  TrendingDown,
  Plus,
  ExternalLink,
  User,
  Calendar,
  CheckCircle2,
  CircleDashed,
} from "lucide-react";

interface FocusMetric {
  id: string;
  name: string;
  category: string;
  target: number | null;
  direction: string;
  unit: string;
  owner: string | null;
  value: number | null;
  status: MetricStatus;
}

interface FocusRock {
  id: string;
  title: string;
  owner_id: string | null;
  owner_name: string | null;
  status: string;
  gapSummary: {
    offTrack: number;
    needsData: number;
    needsTarget: number;
    needsOwner: number;
    onTrack: number;
  };
}

export default function Focus() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const organizationId = currentUser?.team_id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [periodInitialized, setPeriodInitialized] = useState(false);

  // Issue creation modal
  const [issueModal, setIssueModal] = useState<{ 
    open: boolean; 
    type: "metric" | "rock" | null;
    metricId?: string;
    rockId?: string;
    title: string;
  }>({ open: false, type: null, title: "" });
  const [issueTitle, setIssueTitle] = useState("");
  const [issueContext, setIssueContext] = useState("");

  // Fetch period selection
  const { data: periodSelection, isLoading: periodLoading } = useQuery({
    queryKey: ["monthly-period-selection", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      return getMonthlyPeriodSelection(organizationId);
    },
    enabled: !!organizationId,
  });

  // Initialize selected period
  useEffect(() => {
    if (periodInitialized || !periodSelection) return;
    setSelectedPeriod(periodSelection.selectedPeriodKey);
    setPeriodInitialized(true);
  }, [periodSelection, periodInitialized]);

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ["users", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("team_id", organizationId);
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch metrics with status for selected period
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ["focus-metrics", organizationId, selectedPeriod],
    queryFn: async () => {
      if (!organizationId || !selectedPeriod) return [];

      const periodStart = periodKeyToStart(selectedPeriod);

      // Get all active metrics
      const { data: metrics, error: metricsError } = await supabase
        .from("metrics")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true);

      if (metricsError) throw metricsError;
      if (!metrics?.length) return [];

      // Get results for selected period
      const { data: results } = await supabase
        .from("metric_results")
        .select("*")
        .in("metric_id", metrics.map(m => m.id))
        .eq("period_type", "monthly")
        .eq("period_start", periodStart);

      const resultsByMetric = (results || []).reduce((acc, r) => {
        acc[r.metric_id] = r;
        return acc;
      }, {} as Record<string, any>);

      // Build focus metrics (only those needing attention)
      const focusMetrics: FocusMetric[] = [];

      for (const metric of metrics) {
        const result = resultsByMetric[metric.id];
        const statusResult = metricStatus(
          { target: metric.target, direction: metric.direction, owner: metric.owner },
          result ? { value: result.value } : null,
          selectedPeriod
        );

        if (statusResult.status !== "on_track") {
          focusMetrics.push({
            id: metric.id,
            name: metric.name,
            category: metric.category,
            target: metric.target,
            direction: metric.direction,
            unit: metric.unit,
            owner: metric.owner,
            value: result?.value ?? null,
            status: statusResult.status,
          });
        }
      }

      // Sort: off_track first, then needs_data, needs_target, needs_owner
      const statusOrder: Record<MetricStatus, number> = {
        off_track: 0,
        needs_data: 1,
        needs_target: 2,
        needs_owner: 3,
        on_track: 4,
      };

      return focusMetrics.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]).slice(0, 10);
    },
    enabled: !!organizationId && !!selectedPeriod,
  });

  // Fetch rocks with reality gaps
  const { data: rocksData, isLoading: rocksLoading } = useQuery({
    queryKey: ["focus-rocks", organizationId, selectedPeriod],
    queryFn: async () => {
      if (!organizationId || !selectedPeriod) return [];

      // Fetch active rocks (not done)
      const { data: rocks, error: rocksError } = await supabase
        .from("rocks")
        .select("id, title, owner_id, status")
        .eq("organization_id", organizationId)
        .neq("status", "done");

      if (rocksError) throw rocksError;
      if (!rocks?.length) return [];

      const rockIds = rocks.map(r => r.id);

      // Fetch rock_metric_links
      const { data: links } = await supabase
        .from("rock_metric_links")
        .select("rock_id, metric_id")
        .in("rock_id", rockIds);

      const metricIds = [...new Set((links || []).map(l => l.metric_id))];
      if (metricIds.length === 0) return [];

      // Fetch metrics
      const { data: metrics } = await supabase
        .from("metrics")
        .select("id, target, direction, owner")
        .in("id", metricIds);

      const metricsMap = Object.fromEntries((metrics || []).map(m => [m.id, m]));

      // Fetch results for period
      const periodStart = periodKeyToStart(selectedPeriod);
      const { data: results } = await supabase
        .from("metric_results")
        .select("metric_id, value")
        .in("metric_id", metricIds)
        .eq("period_type", "monthly")
        .eq("period_start", periodStart);

      const resultsMap = Object.fromEntries((results || []).map(r => [r.metric_id, r]));

      // Fetch owner names
      const ownerIds = [...new Set(rocks.map(r => r.owner_id).filter(Boolean))];
      const { data: owners } = ownerIds.length > 0
        ? await supabase.from("users").select("id, full_name").in("id", ownerIds)
        : { data: [] };
      const ownersMap = Object.fromEntries((owners || []).map(o => [o.id, o.full_name]));

      // Group links by rock
      const linksByRock = (links || []).reduce((acc, l) => {
        if (!acc[l.rock_id]) acc[l.rock_id] = [];
        acc[l.rock_id].push(l.metric_id);
        return acc;
      }, {} as Record<string, string[]>);

      // Build focus rocks with gap summaries
      const focusRocks: FocusRock[] = [];

      for (const rock of rocks) {
        const linkedMetricIds = linksByRock[rock.id] || [];
        if (linkedMetricIds.length === 0) continue;

        const gapSummary = { offTrack: 0, needsData: 0, needsTarget: 0, needsOwner: 0, onTrack: 0 };

        for (const metricId of linkedMetricIds) {
          const metric = metricsMap[metricId];
          const result = resultsMap[metricId];
          if (!metric) continue;

          const statusResult = metricStatus(
            { target: metric.target, direction: metric.direction, owner: metric.owner },
            result ? { value: result.value } : null,
            selectedPeriod
          );

          gapSummary[statusResult.status === "off_track" ? "offTrack" :
            statusResult.status === "needs_data" ? "needsData" :
            statusResult.status === "needs_target" ? "needsTarget" :
            statusResult.status === "needs_owner" ? "needsOwner" : "onTrack"]++;
        }

        // Only include rocks with gaps
        if (gapSummary.offTrack > 0 || gapSummary.needsData > 0) {
          focusRocks.push({
            id: rock.id,
            title: rock.title,
            owner_id: rock.owner_id,
            owner_name: rock.owner_id ? ownersMap[rock.owner_id] || null : null,
            status: rock.status,
            gapSummary,
          });
        }
      }

      // Sort by off_track desc, then needs_data desc
      return focusRocks
        .sort((a, b) => {
          if (b.gapSummary.offTrack !== a.gapSummary.offTrack) return b.gapSummary.offTrack - a.gapSummary.offTrack;
          return b.gapSummary.needsData - a.gapSummary.needsData;
        })
        .slice(0, 10);
    },
    enabled: !!organizationId && !!selectedPeriod,
  });

  // Recurring issues hook
  const { data: recurringIssues, isLoading: recurringLoading } = useRecurringIssues({ organizationId });

  // Fetch next upcoming meeting (draft/scheduled)
  const { data: nextMeeting } = useQuery({
    queryKey: ["next-meeting", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data } = await supabase
        .from("meetings")
        .select("id, title, scheduled_for, status")
        .eq("organization_id", organizationId)
        .in("status", ["draft", "scheduled"])
        .gte("scheduled_for", new Date().toISOString())
        .order("scheduled_for", { ascending: true })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch existing meeting items for next meeting (for dedupe)
  const { data: existingAgendaIssueIds = [] } = useQuery({
    queryKey: ["meeting-agenda-issues", nextMeeting?.id],
    queryFn: async () => {
      if (!nextMeeting?.id) return [];
      const { data } = await supabase
        .from("meeting_items")
        .select("source_ref_id")
        .eq("meeting_id", nextMeeting.id)
        .eq("item_type", "issue")
        .eq("is_deleted", false)
        .not("source_ref_id", "is", null);
      return (data || []).map(item => item.source_ref_id);
    },
    enabled: !!nextMeeting?.id,
  });

  // Create issue mutation
  const createIssueMutation = useMutation({
    mutationFn: async ({ title, context, metricId, rockId }: { title: string; context: string; metricId?: string; rockId?: string }) => {
      const { error } = await supabase.from("issues").insert({
        title,
        context: context || null,
        priority: 2,
        organization_id: organizationId,
        metric_id: metricId || null,
        rock_id: rockId || null,
        period_key: selectedPeriod,
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Issue created" });
      setIssueModal({ open: false, type: null, title: "" });
      setIssueTitle("");
      setIssueContext("");
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Add to meeting agenda mutation
  const addToAgendaMutation = useMutation({
    mutationFn: async ({ issueId, title }: { issueId: string; title: string }) => {
      if (!nextMeeting) throw new Error("No upcoming meeting");

      // Double-check dedupe in mutation (race condition safety)
      const { data: existing } = await supabase
        .from("meeting_items")
        .select("id")
        .eq("meeting_id", nextMeeting.id)
        .eq("item_type", "issue")
        .eq("source_ref_id", issueId)
        .eq("is_deleted", false)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error("Issue already on agenda");
      }

      const { error } = await supabase.from("meeting_items").insert({
        meeting_id: nextMeeting.id,
        organization_id: organizationId,
        section: "issues",
        item_type: "issue",
        title,
        source_ref_id: issueId,
        source_ref_type: "issue",
        sort_order: 999,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Added to meeting agenda" });
      queryClient.invalidateQueries({ queryKey: ["meeting-items"] });
      queryClient.invalidateQueries({ queryKey: ["meeting-agenda-issues", nextMeeting?.id] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add", description: error.message, variant: "destructive" });
    },
  });

  const openIssueModal = (type: "metric" | "rock", id: string, name: string) => {
    const title = type === "metric" 
      ? `Off-track: ${name} (${selectedPeriod})`
      : `Rock blocked: ${name} (${selectedPeriod})`;
    setIssueTitle(title);
    setIssueContext("");
    setIssueModal({
      open: true,
      type,
      metricId: type === "metric" ? id : undefined,
      rockId: type === "rock" ? id : undefined,
      title: name,
    });
  };

  // Check if issue is already on agenda
  const isOnAgenda = (issueId: string) => existingAgendaIssueIds.includes(issueId);

  const getStatusBadge = (status: MetricStatus) => {
    switch (status) {
      case "off_track":
        return <Badge variant="destructive" className="text-xs"><TrendingDown className="w-3 h-3 mr-1" />Off Track</Badge>;
      case "needs_data":
        return <Badge variant="secondary" className="text-xs"><CircleDashed className="w-3 h-3 mr-1" />Needs Data</Badge>;
      case "needs_target":
        return <Badge variant="outline" className="text-xs"><Target className="w-3 h-3 mr-1" />Needs Target</Badge>;
      case "needs_owner":
        return <Badge variant="outline" className="text-xs"><User className="w-3 h-3 mr-1" />Needs Owner</Badge>;
      default:
        return null;
    }
  };

  const isLoading = userLoading || periodLoading || !periodInitialized;
  const dataLoading = metricsLoading || rocksLoading || recurringLoading;

  // Counts
  const offTrackCount = metricsData?.filter(m => m.status === "off_track").length || 0;
  const rocksWithGaps = rocksData?.length || 0;
  const recurringCount = recurringIssues?.length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  const availablePeriods = periodSelection?.availablePeriodKeys.map(key => ({
    key,
    label: format(new Date(key + "-01"), "MMMM yyyy"),
  })) || [];

  return (
    <div className="space-y-6">
      {/* Alignment Banner for aligned orgs */}
      <CutoverBanner variant="info" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FocusIcon className="w-6 h-6 text-primary" />
            Manager Focus
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            What needs attention this month
          </p>
        </div>

        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {availablePeriods.map(p => (
              <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quick Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{offTrackCount}</p>
                <p className="text-sm text-muted-foreground">Off-track Metrics</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-warning/10">
                <Target className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rocksWithGaps}</p>
                <p className="text-sm text-muted-foreground">Rocks with Gaps</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <RotateCcw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recurringCount}</p>
                <p className="text-sm text-muted-foreground">Recurring Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {dataLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : (
        <>
          {/* Section 1: Scorecard Attention */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Scorecard Attention
                {metricsData && metricsData.length > 0 && (
                  <Badge variant="secondary">{metricsData.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!metricsData || metricsData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-success" />
                  <p>All metrics on track for {selectedPeriod}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {metricsData.map(metric => (
                    <div key={metric.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{metric.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatMetricValue(metric.value, metric.unit)} / {metric.target !== null ? formatMetricValue(metric.target, metric.unit) : "No target"}
                          </p>
                        </div>
                        {getStatusBadge(metric.status)}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/scorecard?metric=${metric.id}`}>
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Open
                          </Link>
                        </Button>
                        {metric.status === "off_track" && (
                          <Button size="sm" variant="default" onClick={() => openIssueModal("metric", metric.id, metric.name)}>
                            <Plus className="w-3 h-3 mr-1" />
                            Issue
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Rocks Needing Intervention */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-warning" />
                Rocks Needing Intervention
                {rocksData && rocksData.length > 0 && (
                  <Badge variant="secondary">{rocksData.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!rocksData || rocksData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-success" />
                  <p>All rocks on track for {selectedPeriod}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rocksData.map(rock => (
                    <div key={rock.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{rock.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {rock.owner_name || "Unassigned"} • {rock.gapSummary.offTrack} off-track, {rock.gapSummary.needsData} needs data
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/rocks/monthly-review?month=${selectedPeriod}`}>
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Review
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openIssueModal("rock", rock.id, rock.title)}>
                          <Plus className="w-3 h-3 mr-1" />
                          Issue
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Recurring Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-primary" />
                Recurring Issues
                {recurringIssues && recurringIssues.length > 0 && (
                  <Badge variant="secondary">{recurringIssues.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!recurringIssues || recurringIssues.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-success" />
                  <p>No recurring issues detected. That's a good sign.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recurringIssues.map(issue => (
                    <div key={issue.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{issue.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Seen in {issue.meetingCount} meetings • Last: {format(new Date(issue.lastSeenAt), "MMM d")}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">{issue.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/issues?id=${issue.id}`}>
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Open
                          </Link>
                        </Button>
                        {nextMeeting ? (
                          isOnAgenda(issue.id) ? (
                            <Button size="sm" variant="outline" disabled>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Already on agenda
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => addToAgendaMutation.mutate({ issueId: issue.id, title: issue.title })}
                              disabled={addToAgendaMutation.isPending}
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              Add to Agenda
                            </Button>
                          )
                        ) : (
                          <Button size="sm" variant="outline" asChild>
                            <Link to="/meetings">
                              <Calendar className="w-3 h-3 mr-1" />
                              Create Meeting
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Issue Creation Modal */}
      <Dialog open={issueModal.open} onOpenChange={(open) => setIssueModal({ ...issueModal, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} />
            </div>
            <div>
              <Label>Context (optional)</Label>
              <Textarea value={issueContext} onChange={(e) => setIssueContext(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueModal({ open: false, type: null, title: "" })}>
              Cancel
            </Button>
            <Button 
              onClick={() => createIssueMutation.mutate({
                title: issueTitle,
                context: issueContext,
                metricId: issueModal.metricId,
                rockId: issueModal.rockId,
              })}
              disabled={!issueTitle || createIssueMutation.isPending}
            >
              Create Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
