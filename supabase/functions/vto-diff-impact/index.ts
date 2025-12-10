import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImpactResult {
  changed_sections: string[];
  impact_score: number;
  scorecard_impact: boolean;
  rocks_impact: boolean;
  reasoning: string;
  section_details: {
    section: string;
    change_type: string;
    description: string;
  }[];
}

// Extract normalized values from VTO for comparison
function normalizeVTO(vto: any): Record<string, any> {
  if (!vto) return {};
  
  return {
    core_values: Array.isArray(vto.core_values) ? vto.core_values : [],
    core_focus: vto.core_focus || {},
    ten_year_target: vto.ten_year_target || "",
    marketing_strategy: vto.marketing_strategy || {},
    three_year_picture: vto.three_year_picture || {},
    one_year_plan: vto.one_year_plan || {},
    quarterly_rocks: vto.quarterly_rocks || [],
  };
}

// Calculate structural changes
function calculateStructuralChanges(oldVTO: any, newVTO: any): { section: string; change_type: string; description: string }[] {
  const changes: { section: string; change_type: string; description: string }[] = [];
  
  // Core Values
  const oldValues = oldVTO.core_values || [];
  const newValues = newVTO.core_values || [];
  if (JSON.stringify(oldValues) !== JSON.stringify(newValues)) {
    const added = newValues.filter((v: string) => !oldValues.includes(v));
    const removed = oldValues.filter((v: string) => !newValues.includes(v));
    if (added.length > 0 || removed.length > 0) {
      changes.push({
        section: "core_values",
        change_type: "modified",
        description: `${added.length} added, ${removed.length} removed`,
      });
    }
  }
  
  // Core Focus
  const oldFocus = oldVTO.core_focus || {};
  const newFocus = newVTO.core_focus || {};
  if (JSON.stringify(oldFocus) !== JSON.stringify(newFocus)) {
    const focusChanges: string[] = [];
    if (oldFocus.purpose !== newFocus.purpose) focusChanges.push("purpose");
    if (oldFocus.niche !== newFocus.niche) focusChanges.push("niche");
    if (focusChanges.length > 0) {
      changes.push({
        section: "core_focus",
        change_type: "modified",
        description: `Changed: ${focusChanges.join(", ")}`,
      });
    }
  }
  
  // 10 Year Target
  if (oldVTO.ten_year_target !== newVTO.ten_year_target) {
    changes.push({
      section: "ten_year_target",
      change_type: "modified",
      description: "Target vision updated",
    });
  }
  
  // Marketing Strategy
  const oldMarketing = oldVTO.marketing_strategy || {};
  const newMarketing = newVTO.marketing_strategy || {};
  if (JSON.stringify(oldMarketing) !== JSON.stringify(newMarketing)) {
    const marketingChanges: string[] = [];
    if (oldMarketing.ideal_client !== newMarketing.ideal_client) marketingChanges.push("ideal client");
    if (JSON.stringify(oldMarketing.differentiators) !== JSON.stringify(newMarketing.differentiators)) marketingChanges.push("differentiators");
    if (JSON.stringify(oldMarketing.uniques) !== JSON.stringify(newMarketing.uniques)) marketingChanges.push("uniques");
    if (JSON.stringify(oldMarketing.proven_process) !== JSON.stringify(newMarketing.proven_process)) marketingChanges.push("proven process");
    if (oldMarketing.guarantee !== newMarketing.guarantee) marketingChanges.push("guarantee");
    if (marketingChanges.length > 0) {
      changes.push({
        section: "marketing_strategy",
        change_type: "modified",
        description: `Changed: ${marketingChanges.join(", ")}`,
      });
    }
  }
  
  // 3 Year Picture
  const old3Year = oldVTO.three_year_picture || {};
  const new3Year = newVTO.three_year_picture || {};
  if (JSON.stringify(old3Year) !== JSON.stringify(new3Year)) {
    const threeYearChanges: string[] = [];
    if (old3Year.revenue !== new3Year.revenue) {
      const diff = (new3Year.revenue || 0) - (old3Year.revenue || 0);
      threeYearChanges.push(`revenue ${diff >= 0 ? "+" : ""}${formatCurrency(diff)}`);
    }
    if (old3Year.profit !== new3Year.profit) {
      threeYearChanges.push("profit target");
    }
    if (JSON.stringify(old3Year.measurables) !== JSON.stringify(new3Year.measurables)) {
      const oldMeasurables = old3Year.measurables || [];
      const newMeasurables = new3Year.measurables || [];
      threeYearChanges.push(`${newMeasurables.length - oldMeasurables.length} measurables`);
    }
    if (JSON.stringify(old3Year.expansion_items) !== JSON.stringify(new3Year.expansion_items)) {
      threeYearChanges.push("expansion items");
    }
    if (threeYearChanges.length > 0) {
      changes.push({
        section: "three_year_picture",
        change_type: "modified",
        description: threeYearChanges.join(", "),
      });
    }
  }
  
  // 1 Year Plan
  const old1Year = oldVTO.one_year_plan || {};
  const new1Year = newVTO.one_year_plan || {};
  if (JSON.stringify(old1Year) !== JSON.stringify(new1Year)) {
    const oneYearChanges: string[] = [];
    if (old1Year.revenue !== new1Year.revenue) oneYearChanges.push("revenue");
    if (old1Year.profit !== new1Year.profit) oneYearChanges.push("profit");
    if (JSON.stringify(old1Year.goals) !== JSON.stringify(new1Year.goals)) {
      const oldGoals = old1Year.goals || [];
      const newGoals = new1Year.goals || [];
      oneYearChanges.push(`${Math.abs(newGoals.length - oldGoals.length)} initiatives`);
    }
    if (oneYearChanges.length > 0) {
      changes.push({
        section: "one_year_plan",
        change_type: "modified",
        description: oneYearChanges.join(", "),
      });
    }
  }
  
  // Quarterly Rocks
  const oldRocks = oldVTO.quarterly_rocks || [];
  const newRocks = newVTO.quarterly_rocks || [];
  if (JSON.stringify(oldRocks) !== JSON.stringify(newRocks)) {
    changes.push({
      section: "quarterly_rocks",
      change_type: "modified",
      description: `${newRocks.length} rocks (was ${oldRocks.length})`,
    });
  }
  
  return changes;
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

// Calculate impact score based on changes
function calculateImpactScore(changes: { section: string; change_type: string; description: string }[]): number {
  const sectionWeights: Record<string, number> = {
    core_values: 0.15,
    core_focus: 0.20,
    ten_year_target: 0.10,
    marketing_strategy: 0.20,
    three_year_picture: 0.15,
    one_year_plan: 0.15,
    quarterly_rocks: 0.05,
  };
  
  let score = 0;
  for (const change of changes) {
    score += sectionWeights[change.section] || 0.05;
  }
  
  // Normalize to 0-1 range
  return Math.min(score, 1.0);
}

// Determine which tools need review based on impact
function determineImpacts(changes: { section: string }[], impactScore: number): { scorecard: boolean; rocks: boolean } {
  // Sections that primarily affect scorecard
  const scorecardSections = ["three_year_picture", "one_year_plan", "marketing_strategy"];
  // Sections that primarily affect rocks
  const rocksSections = ["one_year_plan", "quarterly_rocks", "core_focus"];
  
  const changedSectionNames = changes.map(c => c.section);
  
  // Check section-based impacts
  const hasScorcardSectionChange = changedSectionNames.some(s => scorecardSections.includes(s));
  const hasRocksSectionChange = changedSectionNames.some(s => rocksSections.includes(s));
  
  // Apply threshold logic
  if (impactScore < 0.15) {
    return { scorecard: false, rocks: false };
  } else if (impactScore < 0.45) {
    return { scorecard: hasScorcardSectionChange, rocks: true };
  } else if (impactScore < 0.7) {
    return { scorecard: true, rocks: true };
  } else {
    // High impact - full review recommended
    return { scorecard: true, rocks: true };
  }
}

// Generate reasoning text
function generateReasoning(changes: { section: string; description: string }[], impactScore: number): string {
  if (changes.length === 0) {
    return "No significant changes detected.";
  }
  
  const summaries: string[] = [];
  for (const change of changes.slice(0, 3)) {
    summaries.push(`${formatSectionName(change.section)} (${change.description})`);
  }
  
  let reasoning = summaries.join(", ");
  if (changes.length > 3) {
    reasoning += `, and ${changes.length - 3} other section(s)`;
  }
  
  if (impactScore >= 0.7) {
    reasoning += ". Full review recommended due to significant strategic changes.";
  } else if (impactScore >= 0.45) {
    reasoning += ". Review both scorecard and rocks for alignment.";
  } else if (impactScore >= 0.15) {
    reasoning += ". Minor adjustments may be needed.";
  }
  
  return reasoning;
}

function formatSectionName(section: string): string {
  const names: Record<string, string> = {
    core_values: "Core Values",
    core_focus: "Core Focus",
    ten_year_target: "10-Year Target",
    marketing_strategy: "Marketing Strategy",
    three_year_picture: "3-Year Picture",
    one_year_plan: "1-Year Plan",
    quarterly_rocks: "Quarterly Rocks",
  };
  return names[section] || section;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile and org
    const { data: profile } = await supabase
      .from("users")
      .select("id, team_id")
      .eq("email", user.email)
      .single();

    if (!profile?.team_id) {
      return new Response(JSON.stringify({ error: "User not assigned to organization" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.team_id;

    // Fetch active VTO
    const { data: vto } = await supabase
      .from("vto")
      .select("id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .maybeSingle();

    if (!vto) {
      return new Response(JSON.stringify({ error: "NO_ACTIVE_VTO", message: "No active V/TO found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch last two versions for comparison
    const { data: versions } = await supabase
      .from("vto_versions")
      .select("*")
      .eq("vto_id", vto.id)
      .order("version", { ascending: false })
      .limit(2);

    if (!versions || versions.length === 0) {
      return new Response(JSON.stringify({ error: "No VTO versions found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newVersion = normalizeVTO(versions[0]);
    const oldVersion = versions.length > 1 ? normalizeVTO(versions[1]) : {};

    // Calculate structural changes
    const structuralChanges = calculateStructuralChanges(oldVersion, newVersion);
    
    // Calculate impact score
    const impactScore = calculateImpactScore(structuralChanges);
    
    // Determine which tools need review
    const impacts = determineImpacts(structuralChanges, impactScore);
    
    // Generate reasoning
    const reasoning = generateReasoning(structuralChanges, impactScore);

    const result: ImpactResult = {
      changed_sections: structuralChanges.map(c => c.section),
      impact_score: Math.round(impactScore * 100) / 100,
      scorecard_impact: impacts.scorecard,
      rocks_impact: impacts.rocks,
      reasoning,
      section_details: structuralChanges,
    };

    // Update organization with impact result and flags
    const updateData: any = {
      vto_last_impact_result: result,
    };
    
    if (impacts.scorecard) {
      updateData.needs_scorecard_review = true;
    }
    if (impacts.rocks) {
      updateData.needs_rocks_review = true;
    }

    if (impacts.scorecard || impacts.rocks) {
      await supabase
        .from("teams")
        .update(updateData)
        .eq("id", orgId);
    }

    console.log("VTO Impact Analysis:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in vto-diff-impact:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});