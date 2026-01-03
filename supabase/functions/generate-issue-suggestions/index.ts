import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MetricWithResults {
  id: string;
  name: string;
  target: number | null;
  direction: string | null;
  unit: string | null;
  category: string | null;
  organization_id: string;
  owner_id: string | null;
  metric_results: { value: number | null; week_start: string; period_key: string }[];
}

interface IssueSuggestion {
  organization_id: string;
  metric_id: string;
  suggestion_type: string;
  title: string;
  context: string;
  ai_analysis: object;
  priority: number;
  weeks_off_track: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { organizationId } = await req.json().catch(() => ({}));

    // Get organizations to process
    let orgIds: string[] = [];
    if (organizationId) {
      orgIds = [organizationId];
    } else {
      // Get all active organizations
      const { data: orgs } = await supabase
        .from("teams")
        .select("id")
        .limit(100);
      orgIds = orgs?.map((o) => o.id) || [];
    }

    console.log(`Processing ${orgIds.length} organizations for issue suggestions`);

    const allSuggestions: IssueSuggestion[] = [];

    for (const orgId of orgIds) {
      console.log(`Analyzing org: ${orgId}`);

      // Fetch metrics with last 4 weeks of results
      const { data: metrics, error: metricsError } = await supabase
        .from("metrics")
        .select(`
          id, name, target, direction, unit, category, organization_id, owner_id,
          metric_results(value, week_start, period_key)
        `)
        .eq("organization_id", orgId)
        .order("week_start", { foreignTable: "metric_results", ascending: false });

      if (metricsError) {
        console.error(`Error fetching metrics for org ${orgId}:`, metricsError);
        continue;
      }

      if (!metrics || metrics.length === 0) {
        console.log(`No metrics found for org ${orgId}`);
        continue;
      }

      // Analyze each metric
      for (const metric of metrics) {
        const results = (metric.metric_results || []).slice(0, 4);
        
        // Skip if no target or not enough data
        if (metric.target === null || results.length < 2) {
          continue;
        }

        // Check for off-track weeks
        const offTrackWeeks = countConsecutiveOffTrackWeeks(
          results,
          metric.target,
          metric.direction
        );

        if (offTrackWeeks >= 2) {
          // Generate suggestion
          const suggestion = await generateSuggestion(
            metric as MetricWithResults,
            offTrackWeeks,
            results,
            lovableApiKey
          );

          if (suggestion) {
            allSuggestions.push(suggestion);
          }
        }
      }

      // Upsert suggestions for this org
      if (allSuggestions.length > 0) {
        const orgSuggestions = allSuggestions.filter(
          (s) => s.organization_id === orgId
        );

        for (const suggestion of orgSuggestions) {
          // Check if a pending suggestion already exists for this metric
          const { data: existing } = await supabase
            .from("issue_suggestions")
            .select("id")
            .eq("metric_id", suggestion.metric_id)
            .eq("status", "pending")
            .single();

          if (existing) {
            // Update existing suggestion
            await supabase
              .from("issue_suggestions")
              .update({
                weeks_off_track: suggestion.weeks_off_track,
                ai_analysis: suggestion.ai_analysis,
                priority: suggestion.priority,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id);
          } else {
            // Insert new suggestion
            await supabase.from("issue_suggestions").insert(suggestion);
          }
        }
      }

      // Expire old suggestions that are no longer relevant
      await supabase
        .from("issue_suggestions")
        .update({ status: "expired" })
        .eq("organization_id", orgId)
        .eq("status", "pending")
        .lt("expires_at", new Date().toISOString());
    }

    console.log(`Generated ${allSuggestions.length} issue suggestions`);

    return new Response(
      JSON.stringify({
        success: true,
        suggestionsCreated: allSuggestions.length,
        organizations: orgIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating issue suggestions:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function countConsecutiveOffTrackWeeks(
  results: { value: number | null; week_start: string }[],
  target: number,
  direction: string | null
): number {
  let count = 0;

  for (const result of results) {
    if (result.value === null) {
      count++; // Missing data counts as off-track
      continue;
    }

    const isOffTrack = isMetricOffTrack(result.value, target, direction);
    if (isOffTrack) {
      count++;
    } else {
      break; // Stop counting on first on-track week
    }
  }

  return count;
}

function isMetricOffTrack(
  value: number,
  target: number,
  direction: string | null
): boolean {
  const normalizedDirection = normalizeDirection(direction);

  switch (normalizedDirection) {
    case "higher_is_better":
      return value < target;
    case "lower_is_better":
      return value > target;
    case "exact":
      // Allow 5% tolerance for exact targets
      const tolerance = target * 0.05;
      return value < target - tolerance || value > target + tolerance;
    default:
      return value < target; // Default to higher is better
  }
}

function normalizeDirection(direction: string | null): string {
  if (!direction) return "higher_is_better";

  const lower = direction.toLowerCase();
  if (lower.includes("up") || lower.includes("higher") || lower.includes("increase")) {
    return "higher_is_better";
  }
  if (lower.includes("down") || lower.includes("lower") || lower.includes("decrease")) {
    return "lower_is_better";
  }
  if (lower.includes("exact") || lower.includes("equal")) {
    return "exact";
  }
  return "higher_is_better";
}

async function generateSuggestion(
  metric: MetricWithResults,
  weeksOffTrack: number,
  results: { value: number | null; week_start: string }[],
  lovableApiKey?: string
): Promise<IssueSuggestion | null> {
  try {
    const latestValue = results[0]?.value;
    const previousValue = results[1]?.value;

    // Calculate gap from target
    const gap = metric.target !== null && latestValue !== null
      ? ((latestValue - metric.target) / metric.target * 100).toFixed(1)
      : null;

    // Determine priority based on weeks off-track and gap
    let priority = 3;
    if (weeksOffTrack >= 4) priority = 5;
    else if (weeksOffTrack >= 3) priority = 4;

    // Build context
    let context = `${metric.name} has been off-track for ${weeksOffTrack} consecutive weeks.`;
    if (gap !== null) {
      const direction = metric.direction === "down" ? "above" : "below";
      context += ` Currently ${Math.abs(parseFloat(gap))}% ${direction} target.`;
    }

    // Try to get AI analysis if API key available
    let aiAnalysis: object = {
      weeksOffTrack,
      latestValue,
      previousValue,
      target: metric.target,
      gap,
      trend: calculateTrend(results),
    };

    if (lovableApiKey) {
      try {
        const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: "openai/gpt-5-nano",
            messages: [
              {
                role: "system",
                content: "You are a clinic operations analyst. Generate a brief root cause analysis and recommended action for off-track metrics. Respond in JSON format with 'rootCause' and 'recommendedAction' fields.",
              },
              {
                role: "user",
                content: `Metric: ${metric.name}
Category: ${metric.category || "General"}
Target: ${metric.target}
Current Value: ${latestValue}
Previous Value: ${previousValue}
Weeks Off Track: ${weeksOffTrack}
Direction: ${metric.direction || "higher is better"}

Analyze why this might be off-track and suggest one concrete action.`,
              },
            ],
            max_tokens: 200,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            try {
              const parsed = JSON.parse(content);
              aiAnalysis = {
                ...aiAnalysis,
                rootCause: parsed.rootCause,
                recommendedAction: parsed.recommendedAction,
              };
            } catch {
              // If not valid JSON, use as-is
              aiAnalysis = { ...aiAnalysis, rawAnalysis: content };
            }
          }
        }
      } catch (aiError) {
        console.log("AI analysis unavailable:", aiError);
      }
    }

    return {
      organization_id: metric.organization_id,
      metric_id: metric.id,
      suggestion_type: "off_track_2_weeks",
      title: `${metric.name} off-track for ${weeksOffTrack} weeks`,
      context,
      ai_analysis: aiAnalysis,
      priority,
      weeks_off_track: weeksOffTrack,
    };
  } catch (error) {
    console.error(`Error generating suggestion for metric ${metric.id}:`, error);
    return null;
  }
}

function calculateTrend(
  results: { value: number | null }[]
): "improving" | "declining" | "stable" {
  const values = results
    .map((r) => r.value)
    .filter((v): v is number => v !== null)
    .slice(0, 3);

  if (values.length < 2) return "stable";

  const diffs = [];
  for (let i = 0; i < values.length - 1; i++) {
    diffs.push(values[i] - values[i + 1]);
  }

  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;

  if (Math.abs(avgDiff) < 0.01 * Math.abs(values[0] || 1)) return "stable";
  return avgDiff > 0 ? "improving" : "declining";
}
