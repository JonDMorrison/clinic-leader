import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

/**
 * RECURRING ISSUE DEFINITION (STRICT):
 * An issue is recurring if ALL are true:
 * - Same issue.id (not title similarity)
 * - Linked to 2+ distinct meetings (via meeting_items)
 * - Appeared in a meeting within last 90 days
 * - Status is not 'solved'
 * 
 * This is a factual, no-AI, no-fuzzy-matching approach.
 */

export interface RecurringIssue {
  id: string;
  title: string;
  status: string;
  priority: number;
  meetingCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  rockId: string | null;
  rockTitle: string | null;
}

interface UseRecurringIssuesOptions {
  organizationId: string | null | undefined;
  enabled?: boolean;
}

export function useRecurringIssues({ organizationId, enabled = true }: UseRecurringIssuesOptions) {
  const ninetyDaysAgo = subDays(new Date(), 90).toISOString();

  return useQuery({
    queryKey: ["recurring-issues-strict", organizationId],
    queryFn: async (): Promise<RecurringIssue[]> => {
      if (!organizationId) return [];

      // Step 1: Get meeting_items that are issues with strict filtering
      // - item_type = 'issue' (strict type filter)
      // - source_ref_type = 'issue' (reference type)
      // - source_ref_id NOT NULL (must reference an actual issue)
      // - meeting_id NOT NULL (must be linked to a meeting)
      // - is_deleted = false
      // - meeting status not cancelled
      const { data: meetingItems, error: itemsError } = await supabase
        .from("meeting_items")
        .select(`
          id,
          source_ref_id,
          meeting_id,
          created_at,
          meetings!inner(id, scheduled_for, status)
        `)
        .eq("organization_id", organizationId)
        .eq("item_type", "issue")
        .eq("source_ref_type", "issue")
        .eq("is_deleted", false)
        .not("source_ref_id", "is", null)
        .not("meeting_id", "is", null)
        .gte("created_at", ninetyDaysAgo);

      if (itemsError) throw itemsError;
      if (!meetingItems || meetingItems.length === 0) return [];

      // Step 2: Filter out cancelled meetings and group by issue_id
      const issueToMeetings = new Map<string, { meetings: Set<string>; dates: string[] }>();
      
      for (const item of meetingItems) {
        // Skip if meeting is cancelled
        const meeting = item.meetings as { id: string; scheduled_for: string; status: string } | null;
        if (!meeting || meeting.status === 'cancelled') continue;
        
        const issueId = item.source_ref_id;
        const meetingId = item.meeting_id;
        const date = item.created_at;

        // Null safety - skip if any required field is missing
        if (!issueId || !meetingId || !date) continue;

        if (!issueToMeetings.has(issueId)) {
          issueToMeetings.set(issueId, { meetings: new Set(), dates: [] });
        }
        
        const data = issueToMeetings.get(issueId)!;
        data.meetings.add(meetingId);
        data.dates.push(date);
      }

      // Step 3: Filter for issues appearing in 2+ meetings
      const recurringIssueIds = Array.from(issueToMeetings.entries())
        .filter(([_, data]) => data.meetings.size >= 2)
        .map(([issueId]) => issueId);

      if (recurringIssueIds.length === 0) return [];

      // Step 4: Fetch issue details (only non-solved, org-scoped issues)
      // This also handles orphan meeting_items - if issue doesn't exist, it won't be returned
      const { data: issues, error: issuesError } = await supabase
        .from("issues")
        .select("id, title, status, priority, rock_id")
        .eq("organization_id", organizationId)
        .in("id", recurringIssueIds)
        .neq("status", "solved");

      if (issuesError) throw issuesError;
      if (!issues || issues.length === 0) return [];

      // Step 5: Fetch linked rock titles if any (single query, no N+1)
      const rockIds = issues.filter(i => i.rock_id).map(i => i.rock_id as string);
      const rocksMap = new Map<string, string>();
      
      if (rockIds.length > 0) {
        const { data: rocks } = await supabase
          .from("rocks")
          .select("id, title")
          .in("id", rockIds);
        
        for (const rock of rocks || []) {
          rocksMap.set(rock.id, rock.title);
        }
      }

      // Step 6: Build result - only for issues that actually exist (handles orphans)
      const result: RecurringIssue[] = [];
      
      for (const issue of issues) {
        const data = issueToMeetings.get(issue.id);
        // Skip if no meeting data (shouldn't happen but safety check)
        if (!data || data.dates.length === 0) continue;
        
        const sortedDates = [...data.dates].sort();
        
        result.push({
          id: issue.id,
          title: issue.title,
          status: issue.status,
          priority: issue.priority,
          meetingCount: data.meetings.size,
          firstSeenAt: sortedDates[0],
          lastSeenAt: sortedDates[sortedDates.length - 1],
          rockId: issue.rock_id,
          rockTitle: issue.rock_id ? rocksMap.get(issue.rock_id) || null : null,
        });
      }

      // Sort by meeting count desc, then priority asc, and limit to top 5
      return result
        .sort((a, b) => {
          if (b.meetingCount !== a.meetingCount) return b.meetingCount - a.meetingCount;
          return a.priority - b.priority;
        })
        .slice(0, 5);
    },
    enabled: enabled && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Check if a specific issue is recurring (for live meeting badge)
 */
export function useIsIssueRecurring(issueId: string | null | undefined, organizationId: string | null | undefined) {
  const { data: recurringIssues } = useRecurringIssues({ organizationId });
  
  if (!issueId || !recurringIssues) return { isRecurring: false, meetingCount: 0 };
  
  const found = recurringIssues.find(i => i.id === issueId);
  return {
    isRecurring: !!found,
    meetingCount: found?.meetingCount || 0,
  };
}
