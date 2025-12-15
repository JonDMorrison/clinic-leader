import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, RotateCcw, Mountain, Plus, ExternalLink, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { subDays } from "date-fns";

interface MeetingPrepInsightsProps {
  meetingId: string;
  organizationId: string;
}

interface RecurringIssue {
  id: string;
  title: string;
  status: string;
  priority: number;
  meetingCount: number;
}

interface RecurringRockBlocker {
  rockId: string;
  rockTitle: string;
  issueCount: number;
  rockStatus: string;
}

interface UnresolvedIssue {
  id: string;
  title: string;
  status: string;
  priority: number;
}

export function MeetingPrepInsights({ meetingId, organizationId }: MeetingPrepInsightsProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const ninetyDaysAgo = subDays(new Date(), 90).toISOString().split("T")[0];

  // Fetch existing meeting items to check for duplicates
  const { data: existingItems } = useQuery({
    queryKey: ["meeting-items-for-insights", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_items")
        .select("id, source_ref_id, source_ref_type, title")
        .eq("meeting_id", meetingId)
        .eq("organization_id", organizationId)
        .eq("is_deleted", false);
      if (error) throw error;
      return data || [];
    },
    enabled: !!meetingId && !!organizationId,
  });

  // Fetch recurring issues (issues linked to 2+ meetings in last 90 days, still open)
  const { data: recurringIssues, isLoading: issuesLoading } = useQuery({
    queryKey: ["recurring-issues", organizationId],
    queryFn: async () => {
      // Get all open issues with meeting_id set in last 90 days
      const { data: issues, error } = await supabase
        .from("issues")
        .select("id, title, status, priority, meeting_id, created_at")
        .eq("organization_id", organizationId)
        .not("meeting_id", "is", null)
        .in("status", ["open", "in_progress"])
        .gte("created_at", ninetyDaysAgo);

      if (error) throw error;
      if (!issues || issues.length === 0) return [];

      // Group by issue id and count distinct meetings
      const issueMap = new Map<string, { issue: typeof issues[0]; meetings: Set<string> }>();
      
      for (const issue of issues) {
        if (!issueMap.has(issue.id)) {
          issueMap.set(issue.id, { issue, meetings: new Set() });
        }
        if (issue.meeting_id) {
          issueMap.get(issue.id)!.meetings.add(issue.meeting_id);
        }
      }

      // Filter for issues seen in 2+ meetings
      const recurring: RecurringIssue[] = [];
      for (const [id, data] of issueMap) {
        if (data.meetings.size >= 2) {
          recurring.push({
            id,
            title: data.issue.title,
            status: data.issue.status,
            priority: data.issue.priority,
            meetingCount: data.meetings.size,
          });
        }
      }

      // Sort by meeting count desc, then priority asc
      return recurring.sort((a, b) => {
        if (b.meetingCount !== a.meetingCount) return b.meetingCount - a.meetingCount;
        return a.priority - b.priority;
      }).slice(0, 5);
    },
    enabled: !!organizationId,
  });

  // Fetch recurring rock blockers (rocks with 2+ meeting-linked issues in last 90 days)
  const { data: recurringBlockers, isLoading: blockersLoading } = useQuery({
    queryKey: ["recurring-rock-blockers", organizationId],
    queryFn: async () => {
      // Get issues with rock_id and meeting_id set in last 90 days
      const { data: issues, error } = await supabase
        .from("issues")
        .select("id, rock_id, meeting_id")
        .eq("organization_id", organizationId)
        .not("rock_id", "is", null)
        .not("meeting_id", "is", null)
        .gte("created_at", ninetyDaysAgo);

      if (error) throw error;
      if (!issues || issues.length === 0) return [];

      // Count issues per rock
      const rockIssueCount = new Map<string, number>();
      for (const issue of issues) {
        if (issue.rock_id) {
          rockIssueCount.set(issue.rock_id, (rockIssueCount.get(issue.rock_id) || 0) + 1);
        }
      }

      // Filter for rocks with 2+ issues
      const blockerRockIds = Array.from(rockIssueCount.entries())
        .filter(([_, count]) => count >= 2)
        .map(([rockId]) => rockId);

      if (blockerRockIds.length === 0) return [];

      // Fetch rock details
      const { data: rocks, error: rocksError } = await supabase
        .from("rocks")
        .select("id, title, status")
        .in("id", blockerRockIds);

      if (rocksError) throw rocksError;

      const blockers: RecurringRockBlocker[] = (rocks || []).map(rock => ({
        rockId: rock.id,
        rockTitle: rock.title,
        issueCount: rockIssueCount.get(rock.id) || 0,
        rockStatus: rock.status,
      })).sort((a, b) => b.issueCount - a.issueCount).slice(0, 5);

      return blockers;
    },
    enabled: !!organizationId,
  });

  // Fetch unresolved issues from last completed meeting
  const { data: unresolvedFromLast, isLoading: unresolvedLoading } = useQuery({
    queryKey: ["unresolved-from-last-meeting", organizationId, meetingId],
    queryFn: async () => {
      // Get last completed meeting (not the current one)
      const { data: lastMeeting, error: meetingError } = await supabase
        .from("meetings")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("status", "completed")
        .neq("id", meetingId)
        .order("scheduled_for", { ascending: false })
        .limit(1)
        .single();

      if (meetingError || !lastMeeting) return [];

      // Get open issues from that meeting
      const { data: issues, error } = await supabase
        .from("issues")
        .select("id, title, status, priority")
        .eq("meeting_id", lastMeeting.id)
        .eq("organization_id", organizationId)
        .in("status", ["open", "in_progress"]);

      if (error) throw error;

      return (issues || []).slice(0, 5).map(i => ({
        id: i.id,
        title: i.title,
        status: i.status,
        priority: i.priority,
      })) as UnresolvedIssue[];
    },
    enabled: !!organizationId && !!meetingId,
  });

  // Add to agenda mutation
  const addToAgendaMutation = useMutation({
    mutationFn: async ({ type, refId, refType, title }: { type: "issue" | "rock"; refId: string; refType: string; title: string }) => {
      // Check if already on agenda
      const existing = existingItems?.find(
        item => item.source_ref_id === refId && item.source_ref_type === refType
      );
      if (existing) {
        throw new Error("Already on agenda");
      }

      const section = type === "issue" ? "issues" : "rocks";
      const itemType = type === "issue" ? "issue" : "rock";

      const { error } = await supabase
        .from("meeting_items")
        .insert({
          meeting_id: meetingId,
          organization_id: organizationId,
          section,
          item_type: itemType,
          title,
          source_ref_id: refId,
          source_ref_type: refType,
          sort_order: 999,
        });

      if (error) throw error;
      return refId;
    },
    onSuccess: (refId) => {
      setAddedItems(prev => new Set(prev).add(refId));
      queryClient.invalidateQueries({ queryKey: ["meeting-items", meetingId] });
      queryClient.invalidateQueries({ queryKey: ["meeting-items-for-insights", meetingId] });
      toast({ title: "Added to agenda" });
    },
    onError: (error: Error) => {
      if (error.message === "Already on agenda") {
        toast({ title: "Already on agenda", variant: "default" });
      } else {
        toast({ title: "Failed to add", variant: "destructive" });
      }
    },
  });

  const isOnAgenda = (refId: string, refType: string) => {
    return existingItems?.some(item => item.source_ref_id === refId && item.source_ref_type === refType) || addedItems.has(refId);
  };

  const isLoading = issuesLoading || blockersLoading || unresolvedLoading;
  const hasData = (recurringIssues?.length || 0) > 0 || (recurringBlockers?.length || 0) > 0 || (unresolvedFromLast?.length || 0) > 0;

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="py-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            Prep Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <p className="text-sm text-muted-foreground">Loading insights...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="py-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          Prep Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 space-y-4">
        {!hasData ? (
          <p className="text-sm text-muted-foreground">
            No recurring patterns detected. That's a good sign.
          </p>
        ) : (
          <>
            {/* Recurring Issues */}
            {(recurringIssues?.length || 0) > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <RotateCcw className="w-3 h-3" />
                  Recurring Issues
                </h4>
                <div className="space-y-2">
                  {recurringIssues?.map(issue => (
                    <div key={issue.id} className="flex items-center justify-between p-2 rounded bg-card text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{issue.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Seen in {issue.meetingCount} meetings · {issue.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => navigate(`/issues?highlight=${issue.id}`)}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                        {isOnAgenda(issue.id, "issue") ? (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            On agenda
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => addToAgendaMutation.mutate({
                              type: "issue",
                              refId: issue.id,
                              refType: "issue",
                              title: issue.title,
                            })}
                            disabled={addToAgendaMutation.isPending}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recurring Rock Blockers */}
            {(recurringBlockers?.length || 0) > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Mountain className="w-3 h-3" />
                  Recurring Rock Blockers
                </h4>
                <div className="space-y-2">
                  {recurringBlockers?.map(blocker => (
                    <div key={blocker.rockId} className="flex items-center justify-between p-2 rounded bg-card text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{blocker.rockTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {blocker.issueCount} meeting-linked issues in 90 days
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => navigate(`/rocks?highlight=${blocker.rockId}`)}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                        {isOnAgenda(blocker.rockId, "rock") ? (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            On agenda
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => addToAgendaMutation.mutate({
                              type: "rock",
                              refId: blocker.rockId,
                              refType: "rock",
                              title: blocker.rockTitle,
                            })}
                            disabled={addToAgendaMutation.isPending}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unresolved from Last Meeting */}
            {(unresolvedFromLast?.length || 0) > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <RotateCcw className="w-3 h-3" />
                  Unresolved from Last Meeting
                </h4>
                <div className="space-y-2">
                  {unresolvedFromLast?.map(issue => (
                    <div key={issue.id} className="flex items-center justify-between p-2 rounded bg-card text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{issue.title}</p>
                        <p className="text-xs text-muted-foreground">{issue.status}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => navigate(`/issues?highlight=${issue.id}`)}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                        {isOnAgenda(issue.id, "issue") ? (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            On agenda
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => addToAgendaMutation.mutate({
                              type: "issue",
                              refId: issue.id,
                              refType: "issue",
                              title: issue.title,
                            })}
                            disabled={addToAgendaMutation.isPending}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
