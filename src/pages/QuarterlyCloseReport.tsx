import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Printer, CheckCircle2, AlertCircle, XCircle, ArrowUp, ArrowDown, Minus, ExternalLink, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { subDays } from "date-fns";

// Quarter utilities
function getQuarterMonths(quarterKey: string): string[] {
  // quarterKey format: "2025-Q4"
  const [yearStr, qStr] = quarterKey.split("-Q");
  const year = parseInt(yearStr);
  const q = parseInt(qStr);
  
  const startMonth = (q - 1) * 3; // 0-indexed: Q1=0, Q2=3, Q3=6, Q4=9
  return [
    `${year}-${String(startMonth + 1).padStart(2, "0")}`,
    `${year}-${String(startMonth + 2).padStart(2, "0")}`,
    `${year}-${String(startMonth + 3).padStart(2, "0")}`,
  ];
}

// Only showing quarters with actual outcomes data

interface RockOutcome {
  id: string;
  rock_id: string;
  closed_quarter: string;
  disposition: string;
  outcome_status: string;
  completion_percent: number | null;
  outcome_summary: string | null;
  lessons_learned: string | null;
  blockers: string | null;
  created_issue_id: string | null;
  rock_title: string;
  rock_owner_id: string | null;
  linked_metric_ids: string[];
}

interface MetricMovement {
  metric_id: string;
  metric_name: string;
  target: number | null;
  direction: string;
  first_value: number | null;
  last_value: number | null;
  net_change: number | null;
}

export default function QuarterlyCloseReport() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const organizationId = currentUser?.team_id;
  const [selectedQuarter, setSelectedQuarter] = useState<string>("");

  // Fetch quarters that have rock_outcomes data
  const { data: quartersWithData } = useQuery({
    queryKey: ["quarters-with-outcomes", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("rock_outcomes")
        .select("closed_quarter")
        .eq("organization_id", organizationId);
      return [...new Set(data?.map((r) => r.closed_quarter) || [])];
    },
    enabled: !!organizationId,
  });

  // Set default quarter to most recent with data (only from quarters that have outcomes)
  useEffect(() => {
    if (!selectedQuarter && quartersWithData?.length) {
      const sorted = [...quartersWithData].sort().reverse();
      setSelectedQuarter(sorted[0]);
    }
    // If no quarters have data, leave selectedQuarter empty to show empty state
  }, [quartersWithData, selectedQuarter]);

  // Fetch rock outcomes for selected quarter
  const { data: rockOutcomes, isLoading: outcomesLoading } = useQuery({
    queryKey: ["rock-outcomes", organizationId, selectedQuarter],
    queryFn: async () => {
      if (!organizationId || !selectedQuarter) return [];
      const { data } = await supabase
        .from("rock_outcomes")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("closed_quarter", selectedQuarter)
        .order("closed_at", { ascending: false });
      return (data || []) as RockOutcome[];
    },
    enabled: !!organizationId && !!selectedQuarter,
  });

  // Fetch users for owner names
  const { data: users } = useQuery({
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

  // Get all linked metric IDs from rock outcomes
  const linkedMetricIds = [
    ...new Set(
      (rockOutcomes || []).flatMap((ro) => ro.linked_metric_ids || [])
    ),
  ];

  // Fetch KPI movement data
  const quarterMonths = selectedQuarter ? getQuarterMonths(selectedQuarter) : [];
  const { data: kpiMovement, isLoading: kpiLoading } = useQuery({
    queryKey: ["kpi-movement", organizationId, selectedQuarter, linkedMetricIds],
    queryFn: async (): Promise<MetricMovement[]> => {
      if (!organizationId || linkedMetricIds.length === 0 || quarterMonths.length === 0) {
        return [];
      }

      // Fetch only active metrics that are linked
      const { data: metrics } = await supabase
        .from("metrics")
        .select("id, name, target, direction")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .in("id", linkedMetricIds);

      if (!metrics?.length) return [];

      // Fetch metric results for the quarter months
      const { data: results } = await supabase
        .from("metric_results")
        .select("metric_id, period_key, value")
        .in("metric_id", linkedMetricIds)
        .in("period_key", quarterMonths)
        .eq("period_type", "monthly");

      const resultsByMetric: Record<string, Record<string, number | null>> = {};
      (results || []).forEach((r) => {
        if (!resultsByMetric[r.metric_id]) {
          resultsByMetric[r.metric_id] = {};
        }
        resultsByMetric[r.metric_id][r.period_key] = r.value;
      });

      return metrics.map((m) => {
        const metricResults = resultsByMetric[m.id] || {};
        const firstValue = metricResults[quarterMonths[0]] ?? null;
        const lastValue = metricResults[quarterMonths[2]] ?? null;
        const netChange =
          firstValue !== null && lastValue !== null
            ? lastValue - firstValue
            : null;

        return {
          metric_id: m.id,
          metric_name: m.name,
          target: m.target,
          direction: m.direction,
          first_value: firstValue,
          last_value: lastValue,
          net_change: netChange,
        };
      });
    },
    enabled: !!organizationId && linkedMetricIds.length > 0 && quarterMonths.length > 0,
  });

  // Fetch recurring blockers - rocks with most issues in quarter
  const { data: rockIssues } = useQuery({
    queryKey: ["rock-issues", organizationId, selectedQuarter],
    queryFn: async () => {
      if (!organizationId || quarterMonths.length === 0) return [];
      const { data } = await supabase
        .from("issues")
        .select("id, title, rock_id, rocks(title)")
        .eq("organization_id", organizationId)
        .not("rock_id", "is", null)
        .in("period_key", quarterMonths);
      return data || [];
    },
    enabled: !!organizationId && quarterMonths.length > 0,
  });

  // Fetch metric issues for quarter
  const { data: metricIssues } = useQuery({
    queryKey: ["metric-issues", organizationId, selectedQuarter],
    queryFn: async () => {
      if (!organizationId || quarterMonths.length === 0) return [];
      const { data } = await supabase
        .from("issues")
        .select("id, title, metric_id, metrics(name)")
        .eq("organization_id", organizationId)
        .not("metric_id", "is", null)
        .in("period_key", quarterMonths);
      return data || [];
    },
    enabled: !!organizationId && quarterMonths.length > 0,
  });

  // Fetch recurring issues for the quarter (issues appearing in 2+ meetings)
  interface QuarterlyRecurringIssue {
    id: string;
    title: string;
    status: string;
    meetingCount: number;
    rockId: string | null;
    rockTitle: string | null;
  }
  
  const { data: recurringIssuesQuarter } = useQuery({
    queryKey: ["recurring-issues-quarter", organizationId, selectedQuarter],
    queryFn: async (): Promise<QuarterlyRecurringIssue[]> => {
      if (!organizationId || quarterMonths.length === 0) return [];
      
      // Get quarter date range for filtering
      const quarterStart = `${quarterMonths[0]}-01`;
      const quarterEnd = `${quarterMonths[2]}-31`;
      
      // Get meeting_items for issues in this quarter
      const { data: meetingItems, error: itemsError } = await supabase
        .from("meeting_items")
        .select(`
          id,
          source_ref_id,
          meeting_id,
          created_at
        `)
        .eq("organization_id", organizationId)
        .eq("source_ref_type", "issue")
        .eq("is_deleted", false)
        .not("source_ref_id", "is", null)
        .gte("created_at", quarterStart)
        .lte("created_at", quarterEnd);

      if (itemsError || !meetingItems?.length) return [];

      // Group by issue_id and count distinct meetings
      const issueToMeetings = new Map<string, Set<string>>();
      for (const item of meetingItems) {
        const issueId = item.source_ref_id as string;
        if (!issueToMeetings.has(issueId)) {
          issueToMeetings.set(issueId, new Set());
        }
        issueToMeetings.get(issueId)!.add(item.meeting_id);
      }

      // Filter for issues in 2+ meetings
      const recurringIds = Array.from(issueToMeetings.entries())
        .filter(([_, meetings]) => meetings.size >= 2)
        .map(([issueId]) => issueId);

      if (recurringIds.length === 0) return [];

      // Fetch issue details
      const { data: issues } = await supabase
        .from("issues")
        .select("id, title, status, rock_id")
        .eq("organization_id", organizationId)
        .in("id", recurringIds);

      if (!issues?.length) return [];

      // Fetch rock titles if any
      const rockIds = issues.filter(i => i.rock_id).map(i => i.rock_id as string);
      let rocksMap = new Map<string, string>();
      if (rockIds.length > 0) {
        const { data: rocks } = await supabase.from("rocks").select("id, title").in("id", rockIds);
        for (const rock of rocks || []) {
          rocksMap.set(rock.id, rock.title);
        }
      }

      return issues.map(issue => ({
        id: issue.id,
        title: issue.title,
        status: issue.status,
        meetingCount: issueToMeetings.get(issue.id)?.size || 0,
        rockId: issue.rock_id,
        rockTitle: issue.rock_id ? rocksMap.get(issue.rock_id) || null : null,
      })).sort((a, b) => b.meetingCount - a.meetingCount).slice(0, 5);
    },
    enabled: !!organizationId && quarterMonths.length > 0,
  });

  // Aggregate rock issues
  const rockIssuesCounts = (rockIssues || []).reduce((acc, issue) => {
    const rockId = issue.rock_id;
    if (!rockId) return acc;
    if (!acc[rockId]) {
      acc[rockId] = { count: 0, title: (issue.rocks as any)?.title || "Unknown Rock" };
    }
    acc[rockId].count++;
    return acc;
  }, {} as Record<string, { count: number; title: string }>);

  const topRockBlockers = Object.entries(rockIssuesCounts)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Aggregate metric issues
  const metricIssuesCounts = (metricIssues || []).reduce((acc, issue) => {
    const metricId = issue.metric_id;
    if (!metricId) return acc;
    if (!acc[metricId]) {
      acc[metricId] = { count: 0, name: (issue.metrics as any)?.name || "Unknown Metric" };
    }
    acc[metricId].count++;
    return acc;
  }, {} as Record<string, { count: number; name: string }>);

  const topMetricBlockers = Object.entries(metricIssuesCounts)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Outcome counts
  const achievedCount = (rockOutcomes || []).filter((r) => r.outcome_status === "achieved").length;
  const partialCount = (rockOutcomes || []).filter((r) => r.outcome_status === "partial").length;
  const missedCount = (rockOutcomes || []).filter((r) => r.outcome_status === "missed").length;
  const totalClosed = (rockOutcomes || []).length;

  const getUserName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const u = users?.find((u) => u.id === userId);
    return u?.full_name || "Unknown";
  };

  const handlePrint = () => {
    window.print();
  };

  if (userLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Empty state when no quarters have outcomes
  const hasNoOutcomes = quartersWithData !== undefined && quartersWithData.length === 0;

  if (hasNoOutcomes) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Quarterly Close Report</h1>
        <p className="text-muted-foreground mb-6">Review rock outcomes, KPI movement, and blockers</p>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No quarterly outcomes yet. Close out a quarter to generate this report.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sort quarters with data for dropdown (descending)
  const sortedQuartersWithData = [...(quartersWithData || [])].sort().reverse();

  return (
    <div className="p-6 max-w-5xl mx-auto print:p-2 print:max-w-none">
      {/* Header - hidden on print */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Quarterly Close Report</h1>
          <p className="text-muted-foreground">
            Review rock outcomes, KPI movement, and blockers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Select quarter" />
            </SelectTrigger>
            <SelectContent>
              {sortedQuartersWithData.map((q) => (
                <SelectItem key={q} value={q}>
                  {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold">Quarterly Close Report: {selectedQuarter}</h1>
        <p className="text-sm text-muted-foreground">
          Months: {quarterMonths.join(", ")}
        </p>
      </div>

      {/* Rock Outcomes Summary */}
      <Card className="mb-6 print:shadow-none print:border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Rock Outcomes Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {outcomesLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : totalClosed === 0 ? (
            <p className="text-muted-foreground">No rock outcomes recorded for {selectedQuarter}.</p>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{totalClosed}</div>
                  <div className="text-xs text-muted-foreground">Total Closed</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{achievedCount}</div>
                  <div className="text-xs text-muted-foreground">Achieved</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{partialCount}</div>
                  <div className="text-xs text-muted-foreground">Partial</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{missedCount}</div>
                  <div className="text-xs text-muted-foreground">Missed</div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rock</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Disposition</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead className="print:hidden">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rockOutcomes?.map((ro) => (
                    <TableRow key={ro.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {ro.rock_title}
                      </TableCell>
                      <TableCell>{getUserName(ro.rock_owner_id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {ro.disposition.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {ro.outcome_status === "achieved" && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {ro.outcome_status === "partial" && (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                          {ro.outcome_status === "missed" && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="capitalize text-sm">{ro.outcome_status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {ro.completion_percent !== null ? `${ro.completion_percent}%` : "-"}
                      </TableCell>
                      <TableCell className="print:hidden max-w-[200px]">
                        {ro.blockers && (
                          <div className="text-xs text-red-600 truncate">
                            Blocker: {ro.blockers}
                          </div>
                        )}
                        {ro.lessons_learned && (
                          <div className="text-xs text-blue-600 truncate">
                            Lesson: {ro.lessons_learned}
                          </div>
                        )}
                        {ro.created_issue_id && (
                          <Link
                            to={`/issues`}
                            className="text-xs text-primary underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> Issue created
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* KPI Movement */}
      <Card className="mb-6 print:shadow-none print:border print:break-inside-avoid">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">KPI Movement (Linked Metrics)</CardTitle>
        </CardHeader>
        <CardContent>
          {kpiLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !kpiMovement?.length ? (
            <p className="text-muted-foreground">No linked metrics found for rocks in {selectedQuarter}.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">{quarterMonths[0]}</TableHead>
                  <TableHead className="text-right">{quarterMonths[2]}</TableHead>
                  <TableHead className="text-right">Net Change</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead>Direction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpiMovement.map((kpi) => (
                  <TableRow key={kpi.metric_id}>
                    <TableCell className="font-medium">{kpi.metric_name}</TableCell>
                    <TableCell className="text-right">
                      {kpi.first_value !== null ? kpi.first_value.toLocaleString() : (
                        <span className="text-muted-foreground text-xs italic">missing data</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {kpi.last_value !== null ? kpi.last_value.toLocaleString() : (
                        <span className="text-muted-foreground text-xs italic">missing data</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {kpi.first_value !== null && kpi.last_value !== null && kpi.net_change !== null ? (
                        <div className="flex items-center justify-end gap-1">
                          {kpi.net_change > 0 && <ArrowUp className="h-3 w-3 text-green-500" />}
                          {kpi.net_change < 0 && <ArrowDown className="h-3 w-3 text-red-500" />}
                          {kpi.net_change === 0 && <Minus className="h-3 w-3 text-muted-foreground" />}
                          <span className={kpi.net_change > 0 ? "text-green-600" : kpi.net_change < 0 ? "text-red-600" : ""}>
                            {kpi.net_change > 0 ? "+" : ""}{kpi.net_change.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">missing data</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {kpi.target !== null ? kpi.target.toLocaleString() : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {kpi.direction}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recurring Issues This Quarter */}
      <Card className="mb-6 print:shadow-none print:border print:break-inside-avoid">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Recurring Issues This Quarter
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!recurringIssuesQuarter?.length ? (
            <p className="text-muted-foreground">No recurring issues this quarter.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue</TableHead>
                  <TableHead>Meetings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked Rock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurringIssuesQuarter.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {issue.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {issue.meetingCount} meetings
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {issue.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">
                      {issue.rockTitle || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recurring Blockers */}
      <Card className="print:shadow-none print:border print:break-inside-avoid">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recurring Blockers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2 text-sm text-muted-foreground">Top Rocks with Issues</h4>
              {topRockBlockers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rock issues in {selectedQuarter}.</p>
              ) : (
                <ul className="space-y-2">
                  {topRockBlockers.map((rb) => (
                    <li key={rb.id} className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[200px]">{rb.title}</span>
                      <Badge variant="secondary">{rb.count} issues</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="font-medium mb-2 text-sm text-muted-foreground">Top Metrics with Issues</h4>
              {topMetricBlockers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No metric issues in {selectedQuarter}.</p>
              ) : (
                <ul className="space-y-2">
                  {topMetricBlockers.map((mb) => (
                    <li key={mb.id} className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[200px]">{mb.name}</span>
                      <Badge variant="secondary">{mb.count} issues</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
