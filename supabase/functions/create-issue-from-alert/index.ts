import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      alertId,
      metricId,
      organizationId,
      title,
      context,
      priority,
      ownerId,
    } = await req.json();

    console.log("[create-issue-from-alert] Creating issue from alert:", {
      alertId,
      metricId,
      organizationId,
      title,
      priority,
      ownerId,
    });

    // 1. Create the issue
    const { data: issue, error: issueError } = await supabase
      .from("issues")
      .insert({
        title,
        context,
        priority,
        owner_id: ownerId,
        organization_id: organizationId,
        status: "open",
      })
      .select()
      .single();

    if (issueError) {
      console.error("[create-issue-from-alert] Error creating issue:", issueError);
      throw issueError;
    }

    console.log("[create-issue-from-alert] Issue created:", issue.id);

    // 2. Find VTO links for this metric
    // Get active VTO for organization
    const { data: vto, error: vtoError } = await supabase
      .from("vto")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .single();

    if (vtoError) {
      console.log("[create-issue-from-alert] No active VTO found:", vtoError.message);
    } else {
      // Get latest version
      const { data: version } = await supabase
        .from("vto_versions")
        .select("id")
        .eq("vto_id", vto.id)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (version) {
        // Find if this metric is linked to any VTO goals
        const { data: metricLinks } = await supabase
          .from("vto_links")
          .select("goal_key, weight")
          .eq("vto_version_id", version.id)
          .eq("link_type", "kpi")
          .eq("link_id", metricId);

        // Create issue links for each VTO goal this metric is linked to
        if (metricLinks && metricLinks.length > 0) {
          const issueLinks = metricLinks.map((link) => ({
            vto_version_id: version.id,
            goal_key: link.goal_key,
            link_type: "issue",
            link_id: issue.id,
            weight: link.weight || 1,
          }));

          const { error: linkError } = await supabase
            .from("vto_links")
            .insert(issueLinks);

          if (linkError) {
            console.error("[create-issue-from-alert] Error creating VTO links:", linkError);
          } else {
            console.log(`[create-issue-from-alert] Created ${issueLinks.length} VTO links for issue`);
          }
        }
      }
    }

    // 3. Mark the alert as resolved (since we've addressed it by creating an issue)
    const { error: alertUpdateError } = await supabase
      .from("metric_alerts")
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: ownerId || null,
      })
      .eq("id", alertId);

    if (alertUpdateError) {
      console.error("[create-issue-from-alert] Error updating alert:", alertUpdateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        issueId: issue.id,
        message: "Issue created successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[create-issue-from-alert] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
