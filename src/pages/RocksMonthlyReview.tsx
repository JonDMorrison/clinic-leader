import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getAvailablePeriods } from "@/lib/scorecard/periodHelper";
import { metricStatus, MetricStatus } from "@/lib/scorecard/metricStatus";
import { format } from "date-fns";
import { 
  Target, 
  ChevronDown, 
  ChevronRight, 
  ExternalLink, 
  AlertTriangle,
  CircleAlert,
  CircleDashed,
  CheckCircle2,
  Plus,
  User,
  Link2,
  FileUp
} from "lucide-react";
import { Link } from "react-router-dom";

interface RockWithMetrics {
  id: string;
  title: string;
  owner_id: string | null;
  owner_name: string | null;
  confidence: number | null;
  status: string;
  quarter: string;
  due_date: string | null;
  linkedMetrics: {
    metric_id: string;
    metric_name: string;
    target: number | null;
    direction: string | null;
    owner: string | null;
    unit: string;
    value: number | null;
    status: MetricStatus;
  }[];
  gapSummary: {
    offTrack: number;
    needsData: number;
    needsTarget: number;
    needsOwner: number;
    onTrack: number;
  };
}

export default function RocksMonthlyReview() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const organizationId = currentUser?.team_id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Period selection - start with empty, will be set after data load
  const availablePeriods = useMemo(() => getAvailablePeriods(), []);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [periodInitialized, setPeriodInitialized] = useState(false);
  
  // Filters
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active"); // active = not done
  const [onlyLinkedKPIs, setOnlyLinkedKPIs] = useState(false);
  
  // Expanded rocks
  const [expandedRocks, setExpandedRocks] = useState<Set<string>>(new Set());
  
  // Issue creation modal
  const [issueModal, setIssueModal] = useState<{ open: boolean; rock: RockWithMetrics | null }>({ open: false, rock: null });
  const [issueTitle, setIssueTitle] = useState("");
  const [issueContext, setIssueContext] = useState("");
  const [issuePriority, setIssuePriority] = useState("2");

  // Fetch periods with data to determine smart default
  const { data: periodsWithData = [] } = useQuery({
    queryKey: ["periods-with-data", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      // Get distinct period_keys that have data for this org's monthly metrics
      const { data: results, error } = await supabase
        .from("metric_results")
        .select("period_key, metrics!inner(organization_id)")
        .eq("metrics.organization_id", organizationId)
        .eq("period_type", "monthly");
      
      if (error) throw error;
      
      // Extract unique period keys
      const uniqueKeys = [...new Set((results || []).map(r => r.period_key))];
      return uniqueKeys;
    },
    enabled: !!organizationId,
  });

  // Set default period once we have data
  useEffect(() => {
    if (periodInitialized || availablePeriods.length === 0) return;
    
    // Find latest period that has data
    const periodWithData = availablePeriods.find(p => periodsWithData.includes(p.key));
    
    if (periodWithData) {
      setSelectedPeriod(periodWithData.key);
    } else {
      // Fallback to current month or first available
      const currentMonth = format(new Date(), "yyyy-MM");
      const currentMonthPeriod = availablePeriods.find(p => p.key === currentMonth);
      setSelectedPeriod(currentMonthPeriod?.key || availablePeriods[0]?.key || "");
    }
    setPeriodInitialized(true);
  }, [availablePeriods, periodsWithData, periodInitialized]);

  // Fetch users for owner filter and issue assignment
  const { data: users = [] } = useQuery({
    queryKey: ["users", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("team_id", organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch rocks with linked metrics and results for selected period
  const { data: rocksWithMetrics = [], isLoading: rocksLoading } = useQuery({
    queryKey: ["rocks-monthly-review", organizationId, selectedPeriod],
    queryFn: async () => {
      if (!organizationId || !selectedPeriod) return [];

      // 1. Fetch rocks
      const { data: rocks, error: rocksError } = await supabase
        .from("rocks")
        .select("id, title, owner_id, confidence, status, quarter, due_date")
        .eq("organization_id", organizationId);
      if (rocksError) throw rocksError;

      if (!rocks || rocks.length === 0) return [];

      const rockIds = rocks.map(r => r.id);

      // 2. Fetch rock_metric_links
      const { data: links, error: linksError } = await supabase
        .from("rock_metric_links")
        .select("rock_id, metric_id")
        .in("rock_id", rockIds);
      if (linksError) throw linksError;

      const metricIds = [...new Set((links || []).map(l => l.metric_id))];

      // 3. Fetch metrics
      let metricsMap: Record<string, any> = {};
      if (metricIds.length > 0) {
        const { data: metrics, error: metricsError } = await supabase
          .from("metrics")
          .select("id, name, target, direction, owner, unit")
          .in("id", metricIds);
        if (metricsError) throw metricsError;
        metricsMap = Object.fromEntries((metrics || []).map(m => [m.id, m]));
      }

      // 4. Fetch metric_results for selected period
      let resultsMap: Record<string, any> = {};
      if (metricIds.length > 0) {
        const { data: results, error: resultsError } = await supabase
          .from("metric_results")
          .select("metric_id, value")
          .in("metric_id", metricIds)
          .eq("period_key", selectedPeriod);
        if (resultsError) throw resultsError;
        resultsMap = Object.fromEntries((results || []).map(r => [r.metric_id, r]));
      }

      // 5. Fetch owner names
      const ownerIds = [...new Set(rocks.map(r => r.owner_id).filter(Boolean))];
      let ownersMap: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from("users")
          .select("id, full_name")
          .in("id", ownerIds);
        ownersMap = Object.fromEntries((owners || []).map(o => [o.id, o.full_name]));
      }

      // 6. Build rock objects with linked metrics and gap summaries
      const linksByRock = (links || []).reduce((acc, l) => {
        if (!acc[l.rock_id]) acc[l.rock_id] = [];
        acc[l.rock_id].push(l.metric_id);
        return acc;
      }, {} as Record<string, string[]>);

      return rocks.map(rock => {
        const linkedMetricIds = linksByRock[rock.id] || [];
        const linkedMetrics = linkedMetricIds.map(metricId => {
          const metric = metricsMap[metricId];
          const result = resultsMap[metricId];
          if (!metric) return null;

          const statusResult = metricStatus(
            { target: metric.target, direction: metric.direction, owner: metric.owner },
            result ? { value: result.value } : null,
            selectedPeriod
          );

          return {
            metric_id: metricId,
            metric_name: metric.name,
            target: metric.target,
            direction: metric.direction,
            owner: metric.owner,
            unit: metric.unit,
            value: result?.value ?? null,
            status: statusResult.status,
          };
        }).filter(Boolean) as RockWithMetrics["linkedMetrics"];

        const gapSummary = {
          offTrack: linkedMetrics.filter(m => m.status === "off_track").length,
          needsData: linkedMetrics.filter(m => m.status === "needs_data").length,
          needsTarget: linkedMetrics.filter(m => m.status === "needs_target").length,
          needsOwner: linkedMetrics.filter(m => m.status === "needs_owner").length,
          onTrack: linkedMetrics.filter(m => m.status === "on_track").length,
        };

        return {
          id: rock.id,
          title: rock.title,
          owner_id: rock.owner_id,
          owner_name: rock.owner_id ? ownersMap[rock.owner_id] || null : null,
          confidence: rock.confidence,
          status: rock.status,
          quarter: rock.quarter,
          due_date: rock.due_date,
          linkedMetrics,
          gapSummary,
        } as RockWithMetrics;
      });
    },
    enabled: !!organizationId && !!selectedPeriod,
  });

  // Filter rocks
  const filteredRocks = useMemo(() => {
    return rocksWithMetrics.filter(rock => {
      // Status filter
      if (statusFilter === "active" && rock.status === "done") return false;
      if (statusFilter === "on_track" && rock.status !== "on_track") return false;
      if (statusFilter === "off_track" && rock.status !== "off_track") return false;
      if (statusFilter === "done" && rock.status !== "done") return false;

      // Owner filter
      if (ownerFilter !== "all" && rock.owner_id !== ownerFilter) return false;

      // Only linked KPIs toggle
      if (onlyLinkedKPIs && rock.linkedMetrics.length === 0) return false;

      return true;
    });
  }, [rocksWithMetrics, statusFilter, ownerFilter, onlyLinkedKPIs]);

  // Toggle rock expansion
  const toggleRockExpanded = (rockId: string) => {
    setExpandedRocks(prev => {
      const next = new Set(prev);
      if (next.has(rockId)) {
        next.delete(rockId);
      } else {
        next.add(rockId);
      }
      return next;
    });
  };

  // Create issue mutation
  const createIssueMutation = useMutation({
    mutationFn: async ({ title, context, priority, rockId }: { title: string; context: string; priority: number; rockId: string }) => {
      const { error } = await supabase.from("issues").insert({
        title,
        context: context || null,
        priority,
        organization_id: organizationId,
        rock_id: rockId,
        period_key: selectedPeriod,
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Issue created", description: "Issue has been created and linked to the rock." });
      setIssueModal({ open: false, rock: null });
      setIssueTitle("");
      setIssueContext("");
      setIssuePriority("2");
      queryClient.invalidateQueries({ queryKey: ["rocks-monthly-review"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Open issue modal
  const openIssueModal = (rock: RockWithMetrics) => {
    const title = `Rock blocked: ${rock.title} (${selectedPeriod})`;
    const contextLines = [
      `Owner: ${rock.owner_name || "Unassigned"}`,
      `Confidence: ${rock.confidence ?? "Not set"}%`,
      `Reality Gap: ${rock.gapSummary.offTrack} off-track, ${rock.gapSummary.needsData} needs data`,
    ];
    setIssueTitle(title);
    setIssueContext(contextLines.join("\n"));
    setIssueModal({ open: true, rock });
  };

  const handleCreateIssue = () => {
    if (!issueModal.rock) return;
    createIssueMutation.mutate({
      title: issueTitle,
      context: issueContext,
      priority: parseInt(issuePriority),
      rockId: issueModal.rock.id,
    });
  };

  // Status badge helper
  const getStatusBadge = (status: MetricStatus) => {
    switch (status) {
      case "off_track":
        return <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Off Track</Badge>;
      case "needs_data":
        return <Badge variant="outline" className="text-xs"><CircleDashed className="w-3 h-3 mr-1" />Needs Data</Badge>;
      case "needs_target":
        return <Badge variant="outline" className="text-xs"><CircleAlert className="w-3 h-3 mr-1" />Needs Target</Badge>;
      case "needs_owner":
        return <Badge variant="outline" className="text-xs"><User className="w-3 h-3 mr-1" />Needs Owner</Badge>;
      case "on_track":
        return <Badge variant="default" className="text-xs bg-success/20 text-success border-success/30"><CheckCircle2 className="w-3 h-3 mr-1" />On Track</Badge>;
      default:
        return null;
    }
  };

  // Check for empty state conditions
  const hasNoRocks = rocksWithMetrics.length === 0;
  const hasRocksButNoLinkedKPIs = rocksWithMetrics.length > 0 && rocksWithMetrics.every(r => r.linkedMetrics.length === 0);
  const hasLinkedKPIsButNoData = rocksWithMetrics.length > 0 && 
    rocksWithMetrics.some(r => r.linkedMetrics.length > 0) && 
    rocksWithMetrics.every(r => r.linkedMetrics.every(m => m.value === null));

  if (userLoading || rocksLoading || !periodInitialized) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Monthly Rock Review</h1>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Month picker */}
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {availablePeriods.map(p => (
                <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Owner filter */}
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_track">On Track</SelectItem>
              <SelectItem value="off_track">Off Track</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          {/* Only linked KPIs toggle */}
          <div className="flex items-center gap-2">
            <Switch id="only-linked" checked={onlyLinkedKPIs} onCheckedChange={setOnlyLinkedKPIs} />
            <Label htmlFor="only-linked" className="text-sm text-muted-foreground">Only with KPIs</Label>
          </div>
        </div>
      </div>

      {/* Empty States */}
      {hasNoRocks ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Rocks yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Rocks are quarterly priorities. Link KPIs to each Rock to measure reality monthly.
            </p>
            <Button asChild>
              <Link to="/rocks">
                <Plus className="w-4 h-4 mr-2" />
                Create a Rock
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : hasRocksButNoLinkedKPIs ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Link2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No KPIs linked to Rocks yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Open a Rock and link KPIs (Scorecard metrics) to it. Once linked, this page shows Reality Gaps by month.
            </p>
            <Button asChild variant="outline">
              <Link to="/rocks">
                <Target className="w-4 h-4 mr-2" />
                Go to Rocks
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : hasLinkedKPIsButNoData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No scorecard data found for {selectedPeriod ? format(new Date(selectedPeriod + "-01"), "MMMM yyyy") : "this month"}</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Import your monthly KPI data to see Reality Gaps, or try selecting a different month.
            </p>
            <div className="flex justify-center gap-3">
              <Button asChild>
                <Link to="/imports/monthly-report">
                  <FileUp className="w-4 h-4 mr-2" />
                  Go to Monthly Import
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredRocks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No rocks match the current filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRocks.map(rock => (
            <Card key={rock.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{rock.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                      {rock.owner_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{rock.owner_name}</span>}
                      {rock.confidence !== null && <span>Confidence: {rock.confidence}%</span>}
                      <Badge variant="outline" className="text-xs">{rock.quarter}</Badge>
                      <Badge variant="secondary" className="text-xs capitalize">{rock.status.replace("_", " ")}</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/rocks?highlight=${rock.id}`}><ExternalLink className="w-4 h-4 mr-1" />Open</Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openIssueModal(rock)}>
                      <Plus className="w-4 h-4 mr-1" />Issue
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Reality Gap Summary */}
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="text-sm font-medium">{rock.linkedMetrics.length} linked KPIs</span>
                  {rock.linkedMetrics.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No KPIs linked</span>
                  ) : (
                    <>
                      {rock.gapSummary.offTrack > 0 && (
                        <Badge variant="destructive" className="text-xs">{rock.gapSummary.offTrack} off-track</Badge>
                      )}
                      {rock.gapSummary.needsData > 0 && (
                        <Badge variant="outline" className="text-xs">{rock.gapSummary.needsData} needs data</Badge>
                      )}
                      {rock.gapSummary.needsTarget > 0 && (
                        <Badge variant="outline" className="text-xs">{rock.gapSummary.needsTarget} needs target</Badge>
                      )}
                      {rock.gapSummary.needsOwner > 0 && (
                        <Badge variant="outline" className="text-xs">{rock.gapSummary.needsOwner} needs owner</Badge>
                      )}
                      {rock.gapSummary.onTrack > 0 && (
                        <Badge className="text-xs bg-success/20 text-success border-success/30">{rock.gapSummary.onTrack} on-track</Badge>
                      )}
                    </>
                  )}
                </div>

                {/* Expandable linked KPIs */}
                {rock.linkedMetrics.length > 0 && (
                  <Collapsible open={expandedRocks.has(rock.id)} onOpenChange={() => toggleRockExpanded(rock.id)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="px-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                        {expandedRocks.has(rock.id) ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                        View linked KPIs
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <div className="border rounded-lg divide-y">
                        {rock.linkedMetrics.map(metric => (
                          <div key={metric.metric_id} className="flex items-center justify-between p-3 text-sm">
                            <div className="flex-1">
                              <span className="font-medium">{metric.metric_name}</span>
                              {metric.owner && <span className="text-muted-foreground ml-2">({metric.owner})</span>}
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-muted-foreground">
                                {metric.value !== null ? metric.value.toLocaleString() : "—"} / {metric.target !== null ? metric.target.toLocaleString() : "—"} {metric.unit}
                              </span>
                              {getStatusBadge(metric.status)}
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/scorecard/off-track?metric=${metric.metric_id}`}>
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Issue Modal */}
      <Dialog open={issueModal.open} onOpenChange={(open) => !open && setIssueModal({ open: false, rock: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Issue from Rock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={issueTitle} onChange={e => setIssueTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Context</Label>
              <Textarea value={issueContext} onChange={e => setIssueContext(e.target.value)} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={issuePriority} onValueChange={setIssuePriority}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueModal({ open: false, rock: null })}>Cancel</Button>
            <Button onClick={handleCreateIssue} disabled={createIssueMutation.isPending}>
              {createIssueMutation.isPending ? "Creating..." : "Create Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
