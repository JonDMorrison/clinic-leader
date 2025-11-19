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

    console.log("[rules-weekly-issue-creation] Starting proactive issue detection...");

    // Get all active organizations
    const { data: organizations, error: orgsError } = await supabase
      .from("teams")
      .select("id, name");

    if (orgsError) throw orgsError;

    let totalIssuesCreated = 0;
    const results = [];

    for (const org of organizations || []) {
      console.log(`[rules-weekly-issue-creation] Processing org: ${org.name}`);

      // Get all unresolved metric alerts for this org that are 3+ weeks old
      const threeWeeksAgo = new Date();
      threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

      const { data: persistentAlerts, error: alertsError } = await supabase
        .from("metric_alerts")
        .select(`
          id,
          metric_id,
          alert_type,
          message,
          tip,
          week_of,
          metrics (
            id,
            name,
            owner,
            organization_id
          )
        `)
        .eq("organization_id", org.id)
        .is("resolved_at", null)
        .eq("alert_type", "off_target")
        .lte("created_at", threeWeeksAgo.toISOString());

      if (alertsError) {
        console.error(`[rules-weekly-issue-creation] Error fetching alerts for ${org.name}:`, alertsError);
        continue;
      }

      if (!persistentAlerts || persistentAlerts.length === 0) {
        console.log(`[rules-weekly-issue-creation] No persistent alerts for ${org.name}`);
        continue;
      }

      // Group alerts by metric to find metrics with 3+ consecutive weeks off-target
      const metricAlertsMap = new Map<string, any[]>();
      
      for (const alert of persistentAlerts) {
        const metricId = alert.metric_id;
        if (!metricAlertsMap.has(metricId)) {
          metricAlertsMap.set(metricId, []);
        }
        metricAlertsMap.get(metricId)!.push(alert);
      }

      // Create issues for metrics with persistent problems
      for (const [metricId, alerts] of metricAlertsMap.entries()) {
        if (alerts.length < 3) continue; // Need at least 3 weeks

        const latestAlert = alerts[0];
        const metricInfo = latestAlert.metrics;

        // Check if we already created an issue for this metric recently (within last 4 weeks)
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

        const { data: existingIssues } = await supabase
          .from("issues")
          .select("id")
          .eq("organization_id", org.id)
          .ilike("title", `%${metricInfo.name}%`)
          .eq("status", "open")
          .gte("created_at", fourWeeksAgo.toISOString());

        if (existingIssues && existingIssues.length > 0) {
          console.log(`[rules-weekly-issue-creation] Issue already exists for metric ${metricInfo.name}, skipping`);
          continue;
        }

        // Create the issue
        const title = `${metricInfo.name}: Consistently off-target for ${alerts.length}+ weeks`;
        const context = `This metric has been off-target for ${alerts.length} consecutive weeks. Recent alerts:\n\n${alerts.slice(0, 3).map(a => `• Week of ${a.week_of}: ${a.message}`).join('\n')}\n\n💡 ${latestAlert.tip || 'Review processes and identify root causes.'}`;

        const { data: issue, error: issueError } = await supabase
          .from("issues")
          .insert({
            title,
            context,
            priority: 4, // Very High for persistent problems
            owner_id: metricInfo.owner || null,
            organization_id: org.id,
            status: "open",
          })
          .select()
          .single();

        if (issueError) {
          console.error(`[rules-weekly-issue-creation] Error creating issue for ${metricInfo.name}:`, issueError);
          continue;
        }

        console.log(`[rules-weekly-issue-creation] Created issue ${issue.id} for metric ${metricInfo.name}`);
        totalIssuesCreated++;

        // Link to VTO if possible
        const { data: vto } = await supabase
          .from("vto")
          .select("id")
          .eq("organization_id", org.id)
          .eq("is_active", true)
          .single();

        if (vto) {
          const { data: version } = await supabase
            .from("vto_versions")
            .select("id")
            .eq("vto_id", vto.id)
            .order("version", { ascending: false })
            .limit(1)
            .single();

          if (version) {
            const { data: metricLinks } = await supabase
              .from("vto_links")
              .select("goal_key, weight")
              .eq("vto_version_id", version.id)
              .eq("link_type", "kpi")
              .eq("link_id", metricId);

            if (metricLinks && metricLinks.length > 0) {
              const issueLinks = metricLinks.map((link) => ({
                vto_version_id: version.id,
                goal_key: link.goal_key,
                link_type: "issue",
                link_id: issue.id,
                weight: link.weight || 1,
              }));

              await supabase.from("vto_links").insert(issueLinks);
              console.log(`[rules-weekly-issue-creation] Linked issue to ${issueLinks.length} VTO goals`);
            }
          }
        }

        // Mark alerts as addressed
        const alertIds = alerts.map(a => a.id);
        await supabase
          .from("metric_alerts")
          .update({
            resolved_at: new Date().toISOString(),
            resolved_by: metricInfo.owner || null,
          })
          .in("id", alertIds);

        results.push({
          organization: org.name,
          metric: metricInfo.name,
          issueId: issue.id,
          weeksOffTarget: alerts.length,
        });
      }
    }

    console.log(`[rules-weekly-issue-creation] Completed. Created ${totalIssuesCreated} issues`);

    return new Response(
      JSON.stringify({
        success: true,
        totalIssuesCreated,
        results,
        message: `Proactive issue detection complete. Created ${totalIssuesCreated} issues.`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[rules-weekly-issue-creation] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
