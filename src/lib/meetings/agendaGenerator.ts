import { supabase } from "@/integrations/supabase/client";
import { getMonthlyPeriodSelection } from "@/lib/scorecard/periodHelper";
import { metricStatus, MetricStatus } from "@/lib/scorecard/metricStatus";
import { format } from "date-fns";

export interface AgendaGenerationResult {
  success: boolean;
  itemsCreated: number;
  periodKey: string;
  error?: string;
}

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

/**
 * Generate L10 agenda items for a meeting draft
 * Only runs if agenda_generated=false AND no visible meeting_items exist
 */
export async function generateL10Agenda(
  organizationId: string,
  meetingId: string
): Promise<AgendaGenerationResult> {
  // Get period selection for this org
  const periodSelection = await getMonthlyPeriodSelection(organizationId);
  const periodKey = periodSelection.selectedPeriodKey;
  const periodLabel = periodSelection.periodLabel;

  const itemsToInsert: MeetingItemInsert[] = [];
  let sortOrder = 0;

  // ===== SECTION: SCORECARD =====
  
  // Text intro item
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "scorecard",
    item_type: "text",
    title: `Scorecard — Review the numbers (${periodKey})`,
    description: `• Confirm the month: ${periodLabel}\n• Review Off-track metrics\n• Review metrics missing data\n• Decide: which metrics require an Issue today?`,
    source_ref_type: null,
    source_ref_id: null,
    sort_order: sortOrder++,
  });

  // Fetch metrics and their results for off-track detection
  const { data: metrics } = await supabase
    .from("metrics")
    .select("id, name, target, direction, owner, unit")
    .eq("organization_id", organizationId)
    .eq("is_active", true);

  const { data: metricResults } = await supabase
    .from("metric_results")
    .select("metric_id, value, period_key")
    .in("metric_id", (metrics || []).map(m => m.id))
    .eq("period_key", periodKey)
    .eq("period_type", "monthly");

  const resultsByMetric = (metricResults || []).reduce((acc, r) => {
    acc[r.metric_id] = r;
    return acc;
  }, {} as Record<string, typeof metricResults[0]>);

  // Find off-track metrics
  const offTrackMetrics: typeof metrics = [];
  for (const metric of metrics || []) {
    const result = resultsByMetric[metric.id];
    const status = metricStatus(metric, result, periodKey);
    if (status.status === "off_track") {
      offTrackMetrics.push(metric);
    }
  }

  if (offTrackMetrics.length > 0) {
    // Add linked metric items (max 10)
    for (const metric of offTrackMetrics.slice(0, 10)) {
      const result = resultsByMetric[metric.id];
      const value = result?.value ?? "N/A";
      const target = metric.target ?? "N/A";
      itemsToInsert.push({
        organization_id: organizationId,
        meeting_id: meetingId,
        section: "scorecard",
        item_type: "metric",
        title: `Metric: ${metric.name}`,
        description: `Value: ${value} | Target: ${target} | Status: OFF_TRACK`,
        source_ref_type: "metric",
        source_ref_id: metric.id,
        sort_order: sortOrder++,
      });
    }
  } else {
    itemsToInsert.push({
      organization_id: organizationId,
      meeting_id: meetingId,
      section: "scorecard",
      item_type: "text",
      title: "Scorecard — No off-track metrics detected",
      description: "Still confirm missing data and missing targets/owners.",
      source_ref_type: null,
      source_ref_id: null,
      sort_order: sortOrder++,
    });
  }

  // ===== SECTION: ROCKS =====
  sortOrder = 0;
  
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "rocks",
    item_type: "text",
    title: "Rocks — Review quarterly priorities",
    description: `• Each owner gives a 30-second update\n• If blocked, convert to an Issue\n• Reassign or add help if needed`,
    source_ref_type: null,
    source_ref_id: null,
    sort_order: sortOrder++,
  });

  // Fetch active rocks (not Done) - cast to avoid deep type instantiation
  type RockRow = { id: string; title: string; owner_id: string | null; confidence: number | null; status: string };
  const rocksQueryBuilder: any = supabase.from("rocks");
  const { data: rocksRaw } = await rocksQueryBuilder
    .select("id, title, owner_id, confidence, status")
    .eq("organization_id", organizationId)
    .not("status", "eq", "done")
    .eq("is_active", true)
    .limit(12);
  const rocks: RockRow[] = rocksRaw || [];

  // Get user names for owners
  const ownerIds: string[] = [];
  for (const rock of rocks) {
    if (rock.owner_id && !ownerIds.includes(rock.owner_id)) {
      ownerIds.push(rock.owner_id);
    }
  }
  
  let users: { id: string; full_name: string | null }[] = [];
  if (ownerIds.length > 0) {
    const usersQuery = await supabase.from("users").select("id, full_name").in("id", ownerIds);
    users = usersQuery.data || [];
  }

  const userMap = (users || []).reduce((acc, u) => {
    acc[u.id] = u.full_name;
    return acc;
  }, {} as Record<string, string>);

  // Get linked metrics for reality gap calculation
  const { data: rockMetricLinks } = await supabase
    .from("rock_metric_links")
    .select("rock_id, metric_id")
    .eq("organization_id", organizationId)
    .in("rock_id", (rocks || []).map(r => r.id));

  const rockMetricsMap = (rockMetricLinks || []).reduce((acc, link) => {
    if (!acc[link.rock_id]) acc[link.rock_id] = [];
    acc[link.rock_id].push(link.metric_id);
    return acc;
  }, {} as Record<string, string[]>);

  if ((rocks || []).length > 0) {
    for (const rock of rocks!) {
      const ownerName = rock.owner_id ? userMap[rock.owner_id] || "Unknown" : "Unassigned";
      const confidence = rock.confidence ?? 50;
      
      // Calculate reality gap for linked metrics
      const linkedMetricIds = rockMetricsMap[rock.id] || [];
      let offTrackCount = 0;
      let needsDataCount = 0;
      
      for (const metricId of linkedMetricIds) {
        const metric = (metrics || []).find(m => m.id === metricId);
        if (metric) {
          const result = resultsByMetric[metricId];
          const status = metricStatus(metric, result, periodKey);
          if (status.status === "off_track") offTrackCount++;
          if (status.status === "needs_data") needsDataCount++;
        }
      }

      itemsToInsert.push({
        organization_id: organizationId,
        meeting_id: meetingId,
        section: "rocks",
        item_type: "rock",
        title: `Rock: ${rock.title}`,
        description: `Owner: ${ownerName}\nConfidence: ${confidence}%\nReality Gap: ${offTrackCount} off-track, ${needsDataCount} needs data (${periodKey})`,
        source_ref_type: "rock",
        source_ref_id: rock.id,
        sort_order: sortOrder++,
      });
    }
  } else {
    itemsToInsert.push({
      organization_id: organizationId,
      meeting_id: meetingId,
      section: "rocks",
      item_type: "text",
      title: "No active Rocks",
      description: "Create Rocks after reviewing the Scorecard.",
      source_ref_type: null,
      source_ref_id: null,
      sort_order: sortOrder++,
    });
  }

  // ===== SECTION: ISSUES =====
  sortOrder = 0;
  
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "issues",
    item_type: "text",
    title: "IDS — Solve the most important issues",
    description: `• Pick the top 1–3 issues\n• Discuss root cause\n• Decide next actions and owners`,
    source_ref_type: null,
    source_ref_id: null,
    sort_order: sortOrder++,
  });

  // Fetch open issues with priority
  const { data: allIssues } = await supabase
    .from("issues")
    .select("id, title, context, priority, metric_id, period_key, created_at")
    .eq("organization_id", organizationId)
    .in("status", ["open", "in_progress"])
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);

  // Prioritize: issues linked to off-track metrics > priority 1 > recent
  const offTrackMetricIds = new Set(offTrackMetrics.map(m => m.id));
  const scoredIssues = (allIssues || []).map(issue => {
    let score = 0;
    // Linked to off-track metric for selected period
    if (issue.metric_id && offTrackMetricIds.has(issue.metric_id) && issue.period_key === periodKey) {
      score += 100;
    }
    // High priority
    if (issue.priority === 1) score += 50;
    if (issue.priority === 2) score += 25;
    return { ...issue, score };
  });

  scoredIssues.sort((a, b) => b.score - a.score);
  const topIssues = scoredIssues.slice(0, 8);

  if (topIssues.length > 0) {
    for (const issue of topIssues) {
      const contextTruncated = issue.context
        ? issue.context.length > 150
          ? issue.context.substring(0, 147) + "..."
          : issue.context
        : null;
      
      itemsToInsert.push({
        organization_id: organizationId,
        meeting_id: meetingId,
        section: "issues",
        item_type: "issue",
        title: `Issue: ${issue.title}`,
        description: contextTruncated,
        source_ref_type: "issue",
        source_ref_id: issue.id,
        sort_order: sortOrder++,
      });
    }
  } else {
    itemsToInsert.push({
      organization_id: organizationId,
      meeting_id: meetingId,
      section: "issues",
      item_type: "text",
      title: "No open Issues",
      description: "Create Issues from Scorecard or Rocks during this meeting.",
      source_ref_type: null,
      source_ref_id: null,
      sort_order: sortOrder++,
    });
  }

  // ===== SECTION: TODO =====
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "todo",
    item_type: "text",
    title: "To-Dos — Capture action items",
    description: "Add any decisions and who owns them.",
    source_ref_type: null,
    source_ref_id: null,
    sort_order: 0,
  });

  // ===== SECTION: SEGUE =====
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "segue",
    item_type: "text",
    title: "Segue",
    description: "Quick wins and good news.",
    source_ref_type: null,
    source_ref_id: null,
    sort_order: 0,
  });

  // ===== SECTION: CONCLUSION =====
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "conclusion",
    item_type: "text",
    title: "Conclusion",
    description: `• Recap decisions\n• Confirm To-Dos and owners\n• Confirm next meeting date`,
    source_ref_type: null,
    source_ref_id: null,
    sort_order: 0,
  });

  // ===== INSERT ALL ITEMS =====
  const { error: insertError } = await supabase
    .from("meeting_items")
    .insert(itemsToInsert);

  if (insertError) {
    console.error("Failed to insert agenda items:", insertError);
    return {
      success: false,
      itemsCreated: 0,
      periodKey,
      error: insertError.message,
    };
  }

  // Mark agenda as generated
  const { error: updateError } = await supabase
    .from("meetings")
    .update({ agenda_generated: true })
    .eq("id", meetingId)
    .eq("organization_id", organizationId);

  if (updateError) {
    console.error("Failed to mark agenda_generated:", updateError);
  }

  return {
    success: true,
    itemsCreated: itemsToInsert.length,
    periodKey,
  };
}

/**
 * Check if agenda should be generated for a meeting
 */
export async function shouldGenerateAgenda(
  meeting: { id: string; status: string; agenda_generated?: boolean },
  organizationId: string
): Promise<boolean> {
  // Only for draft or scheduled meetings
  if (meeting.status !== "draft" && meeting.status !== "scheduled") {
    return false;
  }

  // Already generated
  if (meeting.agenda_generated === true) {
    return false;
  }

  // Check if any visible items exist
  const { count } = await supabase
    .from("meeting_items")
    .select("id", { count: "exact", head: true })
    .eq("meeting_id", meeting.id)
    .eq("organization_id", organizationId)
    .eq("is_deleted", false);

  return count === 0;
}
