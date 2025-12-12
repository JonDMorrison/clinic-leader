import { supabase } from "@/integrations/supabase/client";

export interface CoreValueSummary {
  title: string;
  short_behavior?: string;
}

export interface VTOContextSummary {
  ten_year_target?: string;
  three_year_highlights?: string[];
  one_year_goals?: string[];
  current_quarter?: string;
  active_rocks?: Array<{
    title: string;
    status: string;
    owner?: string;
  }>;
  linked_kpis?: Array<{
    name: string;
    status: string;
    progress?: number;
  }>;
  vision_score?: number;
  traction_score?: number;
  at_risk_goals?: string[];
  core_values?: CoreValueSummary[];
  core_value_of_week?: CoreValueSummary;
}

/**
 * Fetches VTO context for AI Wizard
 * Returns PHI-free summary of strategic goals and progress
 */
export async function getVTOContext(teamId: string): Promise<VTOContextSummary | null> {
  try {
    // Fetch core values first (always available even without VTO)
    const { data: coreValues } = await supabase
      .from("org_core_values")
      .select("title, short_behavior")
      .eq("organization_id", teamId)
      .eq("is_active", true)
      .order("sort_order");

    // Fetch current core value of the week
    const { data: spotlight } = await supabase
      .from("core_value_spotlight")
      .select("current_core_value_id")
      .eq("organization_id", teamId)
      .maybeSingle();

    let coreValueOfWeek: CoreValueSummary | undefined;
    if (spotlight?.current_core_value_id && coreValues) {
      const matchingValue = coreValues.find(
        (cv: any) => cv.id === spotlight.current_core_value_id
      );
      if (matchingValue) {
        coreValueOfWeek = {
          title: matchingValue.title,
          short_behavior: matchingValue.short_behavior || undefined,
        };
      }
    }

    // Get active VTO
    const { data: vto } = await supabase
      .from("vto")
      .select("id")
      .eq("organization_id", teamId)
      .eq("is_active", true)
      .single();

    // Return partial context with core values even if no VTO
    if (!vto) {
      return coreValues && coreValues.length > 0
        ? {
            core_values: coreValues.map((cv: any) => ({
              title: cv.title,
              short_behavior: cv.short_behavior || undefined,
            })),
            core_value_of_week: coreValueOfWeek,
          }
        : null;
    }

    // Get latest published version (or draft if no published)
    const { data: version } = await supabase
      .from("vto_versions")
      .select("*")
      .eq("vto_id", vto.id)
      .in("status", ["published", "draft"])
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (!version) return null;

    // Get latest progress
    const { data: progress } = await supabase
      .from("vto_progress")
      .select("*")
      .eq("vto_version_id", version.id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .single();

    // Get linked KPIs
    const { data: kpiLinks } = await supabase
      .from("vto_links")
      .select("link_id, goal_key")
      .eq("vto_version_id", version.id)
      .eq("link_type", "kpi");

    const linkedKpis = [];
    if (kpiLinks && kpiLinks.length > 0) {
      const kpiIds = kpiLinks.map(l => l.link_id);
      const { data: kpis } = await supabase
        .from("kpis")
        .select("id, name, target")
        .in("id", kpiIds)
        .eq("active", true);

      if (kpis) {
        for (const kpi of kpis) {
          // Get latest reading
          const { data: reading } = await supabase
            .from("kpi_readings")
            .select("value")
            .eq("kpi_id", kpi.id)
            .order("week_start", { ascending: false })
            .limit(1)
            .single();

          const progress = kpi.target && reading 
            ? Math.min(100, Math.round((reading.value / kpi.target) * 100))
            : undefined;

          linkedKpis.push({
            name: kpi.name,
            status: progress !== undefined
              ? progress >= 100 ? "on-track" : progress >= 80 ? "at-risk" : "off-track"
              : "unknown",
            progress
          });
        }
      }
    }

    // Get linked Rocks
    const { data: rockLinks } = await supabase
      .from("vto_links")
      .select("link_id")
      .eq("vto_version_id", version.id)
      .eq("link_type", "rock");

    const activeRocks = [];
    if (rockLinks && rockLinks.length > 0) {
      const rockIds = rockLinks.map(l => l.link_id);
      const { data: rocks } = await supabase
        .from("rocks")
        .select("title, status, owner:users(full_name)")
        .in("id", rockIds);

      if (rocks) {
        activeRocks.push(...rocks.map((r: any) => ({
          title: r.title,
          status: r.status,
          owner: r.owner?.full_name
        })));
      }
    }

    // Extract highlights
    const threeYearPicture = version.three_year_picture as any;
    const oneYearPlan = version.one_year_plan as any;

    // Identify at-risk goals (from progress details)
    const atRiskGoals: string[] = [];
    if (progress?.details && typeof progress.details === 'object') {
      const details = progress.details as Record<string, any>;
      Object.entries(details).forEach(([key, value]) => {
        if (value && typeof value === 'object' && value.score < 0.7) {
          atRiskGoals.push(key);
        }
      });
    }

    return {
      ten_year_target: version.ten_year_target || undefined,
      three_year_highlights: threeYearPicture?.measurables || [],
      one_year_goals: oneYearPlan?.goals || [],
      current_quarter: version.quarter_key || undefined,
      active_rocks: activeRocks,
      linked_kpis: linkedKpis,
      vision_score: progress?.vision_score || undefined,
      traction_score: progress?.traction_score || undefined,
      at_risk_goals: atRiskGoals,
      core_values: coreValues?.map((cv: any) => ({
        title: cv.title,
        short_behavior: cv.short_behavior || undefined,
      })),
      core_value_of_week: coreValueOfWeek,
    };
  } catch (error) {
    console.error("Error fetching VTO context:", error);
    return null;
  }
}

/**
 * Format VTO context for AI prompt
 */
export function formatVTOContextForAI(context: VTOContextSummary | null, userRole: string): string {
  if (!context) return "";

  let prompt = "\n\n## Strategic Context (V/TO)\n";

  // Core Values - always inject
  if (context.core_values && context.core_values.length > 0) {
    prompt += `\n**Our Core Values**:\n`;
    context.core_values.forEach((cv, i) => {
      prompt += `${i + 1}. ${cv.title}`;
      if (cv.short_behavior) prompt += ` – ${cv.short_behavior}`;
      prompt += `\n`;
    });
  }

  if (context.core_value_of_week) {
    prompt += `\n**This Week's Focus Value**: ${context.core_value_of_week.title}\n`;
  }
  
  if (context.ten_year_target) {
    prompt += `**10-Year Target**: ${context.ten_year_target}\n`;
  }

  if (context.one_year_goals && context.one_year_goals.length > 0) {
    prompt += `**1-Year Goals**: ${context.one_year_goals.join(", ")}\n`;
  }

  if (context.current_quarter) {
    prompt += `**Current Quarter**: ${context.current_quarter}\n`;
  }

  if (context.active_rocks && context.active_rocks.length > 0) {
    prompt += `**Active Rocks**: ${context.active_rocks.map(r => `${r.title} (${r.status})`).join(", ")}\n`;
  }

  if (context.linked_kpis && context.linked_kpis.length > 0) {
    const offTrackKpis = context.linked_kpis.filter(k => k.status === "off-track");
    if (offTrackKpis.length > 0) {
      prompt += `**Off-Track KPIs**: ${offTrackKpis.map(k => k.name).join(", ")}\n`;
    }
  }

  if (context.at_risk_goals && context.at_risk_goals.length > 0) {
    prompt += `**At-Risk Goals**: ${context.at_risk_goals.length} goal(s) need attention\n`;
  }

  if (context.vision_score !== undefined && context.traction_score !== undefined) {
    prompt += `**Progress**: Vision ${context.vision_score}%, Traction ${context.traction_score}%\n`;
  }

  // Add role-specific guidance
  if (userRole === 'owner' || userRole === 'director') {
    prompt += "\nYou have access to all strategic data. Focus on high-level progress and alignment.\n";
  } else if (userRole === 'manager') {
    prompt += "\nFocus on team execution of rocks and KPIs that support strategic goals.\n";
  } else {
    prompt += "\nFocus on your assigned rocks and how they contribute to company goals.\n";
  }

  // Core values guidance for AI
  if (context.core_values && context.core_values.length > 0) {
    prompt += "\n**Important**: When providing recommendations, ensure they align with our core values. If a recommendation clearly supports a specific core value, mention it explicitly in one sentence.\n";
  }

  return prompt;
}

/**
 * Generate AI wizard chips based on VTO context
 */
export function getVTOAIChips(context: VTOContextSummary | null, userRole: string): string[] {
  if (!context) return [];

  const chips: string[] = [];

  if (userRole === 'owner' || userRole === 'director') {
    chips.push("Progress toward 1-Year Plan?");
    chips.push("What's off-track for this quarter?");
    
    if (context.at_risk_goals && context.at_risk_goals.length > 0) {
      chips.push("Which goals need attention?");
    }
    
    if (context.linked_kpis && context.linked_kpis.some(k => k.status === "off-track")) {
      chips.push("Which Rocks affect our red KPIs?");
    }
  } else if (userRole === 'manager') {
    chips.push("Team progress on quarterly rocks?");
    chips.push("Which KPIs support our V/TO goals?");
  }

  return chips;
}
