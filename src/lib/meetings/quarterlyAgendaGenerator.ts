import { supabase } from "@/integrations/supabase/client";
import { MEETING_TYPES } from "./meetingTypes";
import { format, subMonths } from "date-fns";

interface MeetingItemInsert {
  organization_id: string;
  meeting_id: string;
  section: string;
  item_type: string;
  title: string;
  description: string | null;
  source_ref_type: string | null;
  source_ref_id: string | null;
  sort_order: number;
}

const SORT_INCREMENT = 10;

/**
 * Generate Quarterly meeting agenda items
 */
export async function generateQuarterlyAgenda(
  organizationId: string,
  meetingId: string
): Promise<{ success: boolean; itemsCreated: number; error?: string }> {
  const config = MEETING_TYPES.quarterly;
  const itemsToInsert: MeetingItemInsert[] = [];
  const sectionCounters: Record<string, number> = {};

  const getSortOrder = (sectionKey: string): number => {
    const section = config.sections.find(s => s.key === sectionKey);
    const base = section?.sortBase || 0;
    sectionCounters[sectionKey] = (sectionCounters[sectionKey] || 0) + 1;
    return base + (sectionCounters[sectionKey] - 1) * SORT_INCREMENT;
  };

  // ===== SECTION: CHECK-IN =====
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "checkin",
    item_type: "text",
    title: "Check-in & Expectations",
    description: "• What do we need to accomplish today?\n• Any personal or business news?\n• Set the tone for strategic thinking",
    source_ref_type: null,
    source_ref_id: null,
    sort_order: getSortOrder("checkin"),
  });

  // ===== SECTION: PREVIOUS ROCKS =====
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "prev_rocks",
    item_type: "text",
    title: "Previous Quarter Rocks Review",
    description: "• Review each Rock: Done, Not Done, or Dropped?\n• What did we learn?\n• Any rocks to carry forward?",
    source_ref_type: null,
    source_ref_id: null,
    sort_order: getSortOrder("prev_rocks"),
  });

  // Fetch previous quarter rocks (done or not)
  const { data: prevRocks } = await supabase
    .from("rocks")
    .select("id, title, status, owner_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(15);

  if (prevRocks && prevRocks.length > 0) {
    for (const rock of prevRocks) {
      const statusEmoji = rock.status === "done" ? "✅" : rock.status === "off_track" ? "⚠️" : "🔄";
      itemsToInsert.push({
        organization_id: organizationId,
        meeting_id: meetingId,
        section: "prev_rocks",
        item_type: "rock",
        title: `${statusEmoji} ${rock.title}`,
        description: `Status: ${rock.status?.replace("_", " ").toUpperCase() || "Unknown"}`,
        source_ref_type: "rock",
        source_ref_id: rock.id,
        sort_order: getSortOrder("prev_rocks"),
      });
    }
  }

  // ===== SECTION: SCORECARD TRENDS =====
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "scorecard_trends",
    item_type: "text",
    title: "Scorecard Trends (Quarterly View)",
    description: "• Look at the last 13 weeks of data\n• Identify patterns, not single-week anomalies\n• Which metrics consistently miss? Which are improving?",
    source_ref_type: null,
    source_ref_id: null,
    sort_order: getSortOrder("scorecard_trends"),
  });

  // Fetch metrics with trend data
  const { data: metrics } = await supabase
    .from("metrics")
    .select("id, name, target, direction")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .limit(20);

  if (metrics && metrics.length > 0) {
    itemsToInsert.push({
      organization_id: organizationId,
      meeting_id: meetingId,
      section: "scorecard_trends",
      item_type: "text",
      title: `${metrics.length} active metrics to review`,
      description: "Focus on patterns over the quarter, not individual weeks.",
      source_ref_type: null,
      source_ref_id: null,
      sort_order: getSortOrder("scorecard_trends"),
    });
  }

  // ===== SECTION: RECURRING ISSUES =====
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "recurring_issues",
    item_type: "text",
    title: "Recurring Issues",
    description: "• Issues that appeared 3+ times in L10 meetings\n• Address root causes, not symptoms\n• Consider escalating to annual if structural",
    source_ref_type: null,
    source_ref_id: null,
    sort_order: getSortOrder("recurring_issues"),
  });

  // Fetch issues with recurrence_count >= 3 or quarterly horizon
  const { data: recurringIssues } = await supabase
    .from("issues")
    .select("id, title, context, recurrence_count, meeting_horizon")
    .eq("organization_id", organizationId)
    .in("status", ["open", "in_progress"])
    .or("recurrence_count.gte.3,meeting_horizon.eq.quarterly")
    .order("recurrence_count", { ascending: false })
    .limit(10);

  if (recurringIssues && recurringIssues.length > 0) {
    for (const issue of recurringIssues) {
      const badge = issue.recurrence_count >= 3 ? `🔁 (${issue.recurrence_count}x)` : "📋";
      itemsToInsert.push({
        organization_id: organizationId,
        meeting_id: meetingId,
        section: "recurring_issues",
        item_type: "issue",
        title: `${badge} ${issue.title}`,
        description: issue.context?.substring(0, 150) || null,
        source_ref_type: "issue",
        source_ref_id: issue.id,
        sort_order: getSortOrder("recurring_issues"),
      });
    }
  } else {
    itemsToInsert.push({
      organization_id: organizationId,
      meeting_id: meetingId,
      section: "recurring_issues",
      item_type: "text",
      title: "No recurring issues identified",
      description: "L10 meetings are handling issues effectively.",
      source_ref_type: null,
      source_ref_id: null,
      sort_order: getSortOrder("recurring_issues"),
    });
  }

  // ===== SECTION: NEXT ROCKS =====
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "next_rocks",
    item_type: "text",
    title: "Set Next Quarter Rocks",
    description: "• Define 3-7 company Rocks\n• Each Rock needs an owner\n• Each Rock needs a measurable outcome\n• Rocks should be achievable in 90 days",
    source_ref_type: null,
    source_ref_id: null,
    sort_order: getSortOrder("next_rocks"),
  });

  // ===== SECTION: PRIORITY ISSUES =====
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "priority_issues",
    item_type: "text",
    title: "Priority Issues Only",
    description: "• Strategic issues that affect the quarter\n• No weekly operational items\n• Focus on capacity, patterns, and priorities",
    source_ref_type: null,
    source_ref_id: null,
    sort_order: getSortOrder("priority_issues"),
  });

  // ===== SECTION: CASCADE =====
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "cascade",
    item_type: "text",
    title: "Close & Cascade",
    description: "• Who communicates what to whom?\n• How do we ensure alignment flows to all teams?\n• Schedule next quarterly meeting",
    source_ref_type: null,
    source_ref_id: null,
    sort_order: getSortOrder("cascade"),
  });

  // ===== INSERT ALL ITEMS =====
  const { error: insertError } = await supabase
    .from("meeting_items")
    .insert(itemsToInsert);

  if (insertError) {
    console.error("Failed to insert quarterly agenda items:", insertError);
    return { success: false, itemsCreated: 0, error: insertError.message };
  }

  // Mark agenda as generated
  await supabase
    .from("meetings")
    .update({ agenda_generated: true })
    .eq("id", meetingId)
    .eq("organization_id", organizationId);

  return { success: true, itemsCreated: itemsToInsert.length };
}
