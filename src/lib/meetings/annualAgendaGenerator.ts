import { supabase } from "@/integrations/supabase/client";
import { MEETING_TYPES } from "./meetingTypes";

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
 * Generate Annual meeting agenda items
 */
export async function generateAnnualAgenda(
  organizationId: string,
  meetingId: string
): Promise<{ success: boolean; itemsCreated: number; error?: string }> {
  const config = MEETING_TYPES.annual;
  const itemsToInsert: MeetingItemInsert[] = [];
  const sectionCounters: Record<string, number> = {};

  const getSortOrder = (sectionKey: string): number => {
    const section = config.sections.find(s => s.key === sectionKey);
    const base = section?.sortBase || 0;
    sectionCounters[sectionKey] = (sectionCounters[sectionKey] || 0) + 1;
    return base + (sectionCounters[sectionKey] - 1) * SORT_INCREMENT;
  };

  // ===== SECTION: EXPECTATIONS =====
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "expectations",
    item_type: "text",
    title: "Expectations & Objectives",
    description: "• What must we accomplish in this meeting?\n• What decisions need to be made?\n• Park tactical items for later",
    source_ref_type: null,
    source_ref_id: null,
    sort_order: getSortOrder("expectations"),
  });

  // ===== SECTION: VTO REVIEW =====
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "vto_review",
    item_type: "text",
    title: "Vision / VTO Review",
    description: "• Review the complete V/TO document\n• Is our 10-year target still right?\n• Are our marketing strategy elements current?\n• Does our proven process still work?",
    source_ref_type: null,
    source_ref_id: null,
    sort_order: getSortOrder("vto_review"),
  });

  // Fetch VTO data to show what exists
  const { data: vto } = await supabase
    .from("clarity_vto")
    .select("vision, traction")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (vto) {
    const vision = vto.vision as any;
    itemsToInsert.push({
      organization_id: organizationId,
      meeting_id: meetingId,
      section: "vto_review",
      item_type: "text",
      title: "Current VTO Summary",
      description: `Core Focus: ${vision?.core_focus?.niche || "Not set"}\n10-Year Target: ${vision?.ten_year_target?.revenue || "Not set"}`,
      source_ref_type: null,
      source_ref_id: null,
      sort_order: getSortOrder("vto_review"),
    });
  }

  // ===== SECTION: CORE VALUES =====
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "core_values",
    item_type: "text",
    title: "Core Values Discussion",
    description: "• Are we living our core values?\n• Any values that need updating?\n• Are we hiring and firing based on values?",
    source_ref_type: null,
    source_ref_id: null,
    sort_order: getSortOrder("core_values"),
  });

  // Fetch org core values
  const { data: coreValues } = await supabase
    .from("org_core_values")
    .select("title, short_behavior")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .limit(10);

  if (coreValues && coreValues.length > 0) {
    const valuesList = coreValues.map(v => `• ${v.title}`).join("\n");
    itemsToInsert.push({
      organization_id: organizationId,
      meeting_id: meetingId,
      section: "core_values",
      item_type: "text",
      title: `Current Core Values (${coreValues.length})`,
      description: valuesList,
      source_ref_type: null,
      source_ref_id: null,
      sort_order: getSortOrder("core_values"),
    });
  }

  // ===== SECTION: PICTURES =====
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "pictures",
    item_type: "text",
    title: "1-Year and 3-Year Picture",
    description: "• Where do we want to be in 1 year? 3 years?\n• Revenue targets\n• Team size and structure\n• Key capabilities to build\n• Markets to enter or exit",
    source_ref_type: null,
    source_ref_id: null,
    sort_order: getSortOrder("pictures"),
  });

  // ===== SECTION: STRATEGIC ISSUES =====
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "strategic_issues",
    item_type: "text",
    title: "Major Strategic Issues",
    description: "• Big-picture issues only\n• Market shifts, competition, technology\n• Structural or capability gaps\n• NO weekly operational items",
    source_ref_type: null,
    source_ref_id: null,
    sort_order: getSortOrder("strategic_issues"),
  });

  // Fetch annual-horizon issues
  const { data: annualIssues } = await supabase
    .from("issues")
    .select("id, title, context")
    .eq("organization_id", organizationId)
    .eq("meeting_horizon", "annual")
    .in("status", ["open", "in_progress"])
    .order("priority", { ascending: true })
    .limit(8);

  if (annualIssues && annualIssues.length > 0) {
    for (const issue of annualIssues) {
      itemsToInsert.push({
        organization_id: organizationId,
        meeting_id: meetingId,
        section: "strategic_issues",
        item_type: "issue",
        title: `🎯 ${issue.title}`,
        description: issue.context?.substring(0, 150) || null,
        source_ref_type: "issue",
        source_ref_id: issue.id,
        sort_order: getSortOrder("strategic_issues"),
      });
    }
  } else {
    itemsToInsert.push({
      organization_id: organizationId,
      meeting_id: meetingId,
      section: "strategic_issues",
      item_type: "text",
      title: "No annual-level issues identified",
      description: "Consider: What strategic challenges should leadership be discussing?",
      source_ref_type: null,
      source_ref_id: null,
      sort_order: getSortOrder("strategic_issues"),
    });
  }

  // ===== SECTION: LEADERSHIP =====
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "leadership",
    item_type: "text",
    title: "Leadership Alignment",
    description: "• Are we aligned as a leadership team?\n• Right people in right seats?\n• Any GWC (Gets it, Wants it, Capacity) concerns?\n• Succession planning",
    source_ref_type: null,
    source_ref_id: null,
    sort_order: getSortOrder("leadership"),
  });

  // ===== SECTION: COMMITMENTS =====
  itemsToInsert.push({
    organization_id: organizationId,
    meeting_id: meetingId,
    section: "commitments",
    item_type: "text",
    title: "Commitments for the Year",
    description: "• What are we committing to as a team?\n• Document major initiatives\n• Assign executive sponsors\n• Schedule quarterly check-ins",
    source_ref_type: null,
    source_ref_id: null,
    sort_order: getSortOrder("commitments"),
  });

  // ===== INSERT ALL ITEMS =====
  const { error: insertError } = await supabase
    .from("meeting_items")
    .insert(itemsToInsert);

  if (insertError) {
    console.error("Failed to insert annual agenda items:", insertError);
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
