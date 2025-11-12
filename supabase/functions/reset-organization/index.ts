import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userRecord || !['owner', 'director'].includes(userRecord.role)) {
      throw new Error("Admin access required");
    }

    const { organization_id, delete_org = false } = await req.json();

    if (!organization_id) {
      throw new Error("organization_id is required");
    }

    console.log(`[reset-organization] Starting reset for org: ${organization_id}, delete_org: ${delete_org}`);

    const deletionSummary: Record<string, number> = {};

    // Delete in correct order to respect foreign key constraints
    // Start with leaf tables (those that reference others but aren't referenced)

    // Acknowledgements
    const { data: acks, error: acksErr } = await supabase
      .from('acknowledgements')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!acksErr && acks) deletionSummary.acknowledgements = acks.length;

    // Help events
    const { data: helpEvents, error: helpEventsErr } = await supabase
      .from('help_events')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!helpEventsErr && helpEvents) deletionSummary.help_events = helpEvents.length;

    // Help dismissed
    const { data: helpDismissed, error: helpDismissedErr } = await supabase
      .from('help_dismissed')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!helpDismissedErr && helpDismissed) deletionSummary.help_dismissed = helpDismissed.length;

    // AI logs
    const { data: aiLogs, error: aiLogsErr } = await supabase
      .from('ai_logs')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!aiLogsErr && aiLogs) deletionSummary.ai_logs = aiLogs.length;

    // AI usage
    const { data: aiUsage, error: aiUsageErr } = await supabase
      .from('ai_usage')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!aiUsageErr && aiUsage) deletionSummary.ai_usage = aiUsage.length;

    // AI insights
    const { data: aiInsights, error: aiInsightsErr } = await supabase
      .from('ai_insights')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!aiInsightsErr && aiInsights) deletionSummary.ai_insights = aiInsights.length;

    // AI agendas
    const { data: aiAgendas, error: aiAgendasErr } = await supabase
      .from('ai_agendas')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!aiAgendasErr && aiAgendas) deletionSummary.ai_agendas = aiAgendas.length;

    // Metric comments
    const { data: metricComments, error: metricCommentsErr } = await supabase
      .from('metric_comments')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!metricCommentsErr && metricComments) deletionSummary.metric_comments = metricComments.length;

    // Metric alerts
    const { data: metricAlerts, error: metricAlertsErr } = await supabase
      .from('metric_alerts')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!metricAlertsErr && metricAlerts) deletionSummary.metric_alerts = metricAlerts.length;

    // Metric milestones
    const { data: metricMilestones, error: metricMilestonesErr } = await supabase
      .from('metric_milestones')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!metricMilestonesErr && metricMilestones) deletionSummary.metric_milestones = metricMilestones.length;

    // Get metric IDs for this org
    const { data: metrics } = await supabase
      .from('metrics')
      .select('id')
      .eq('organization_id', organization_id);

    if (metrics && metrics.length > 0) {
      const metricIds = metrics.map(m => m.id);

      // Metric results audit (references metric_results)
      const { data: metricResultsAuditData } = await supabase
        .from('metric_results_audit')
        .select('id, metric_result_id')
        .in('metric_result_id', 
          (await supabase.from('metric_results').select('id').in('metric_id', metricIds)).data?.map(r => r.id) || []
        );
      
      if (metricResultsAuditData && metricResultsAuditData.length > 0) {
        const { data: deletedAudit } = await supabase
          .from('metric_results_audit')
          .delete()
          .in('id', metricResultsAuditData.map(a => a.id))
          .select('id');
        if (deletedAudit) deletionSummary.metric_results_audit = deletedAudit.length;
      }

      // Metric results
      const { data: metricResults, error: metricResultsErr } = await supabase
        .from('metric_results')
        .delete()
        .in('metric_id', metricIds)
        .select('id');
      if (!metricResultsErr && metricResults) deletionSummary.metric_results = metricResults.length;
    }

    // Metric goal achievements
    const { data: metricGoals } = await supabase
      .from('metric_goals')
      .select('id')
      .eq('organization_id', organization_id);

    if (metricGoals && metricGoals.length > 0) {
      const goalIds = metricGoals.map(g => g.id);
      const { data: goalAchievements, error: goalAchievementsErr } = await supabase
        .from('metric_goal_achievements')
        .delete()
        .in('goal_id', goalIds)
        .select('id');
      if (!goalAchievementsErr && goalAchievements) deletionSummary.metric_goal_achievements = goalAchievements.length;
    }

    // Metric goals
    const { data: metricGoalsDeleted, error: metricGoalsErr } = await supabase
      .from('metric_goals')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!metricGoalsErr && metricGoalsDeleted) deletionSummary.metric_goals = metricGoalsDeleted.length;

    // Metrics
    const { data: metricsDeleted, error: metricsErr } = await supabase
      .from('metrics')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!metricsErr && metricsDeleted) deletionSummary.metrics = metricsDeleted.length;

    // Import mappings
    const { data: importMappings, error: importMappingsErr } = await supabase
      .from('import_mappings')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!importMappingsErr && importMappings) deletionSummary.import_mappings = importMappings.length;

    // KPI default batches
    const { data: kpiDefaultBatches, error: kpiDefaultBatchesErr } = await supabase
      .from('kpi_default_batches')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!kpiDefaultBatchesErr && kpiDefaultBatches) deletionSummary.kpi_default_batches = kpiDefaultBatches.length;

    // Get users for this org
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('team_id', organization_id);

    if (users && users.length > 0) {
      const userIds = users.map(u => u.id);

      // User roles
      const { data: userRoles, error: userRolesErr } = await supabase
        .from('user_roles')
        .delete()
        .in('user_id', userIds)
        .select('user_id');
      if (!userRolesErr && userRoles) deletionSummary.user_roles = userRoles.length;

      // User tour status
      const { data: userTourStatus, error: userTourStatusErr } = await supabase
        .from('user_tour_status')
        .delete()
        .eq('organization_id', organization_id)
        .select('id');
      if (!userTourStatusErr && userTourStatus) deletionSummary.user_tour_status = userTourStatus.length;

      // Get KPIs owned by these users
      const { data: kpis } = await supabase
        .from('kpis')
        .select('id')
        .in('owner_id', userIds);

      if (kpis && kpis.length > 0) {
        const kpiIds = kpis.map(k => k.id);
        
        // KPI readings
        const { data: kpiReadings, error: kpiReadingsErr } = await supabase
          .from('kpi_readings')
          .delete()
          .in('kpi_id', kpiIds)
          .select('id');
        if (!kpiReadingsErr && kpiReadings) deletionSummary.kpi_readings = kpiReadings.length;
      }

      // KPIs
      const { data: kpisDeleted, error: kpisErr } = await supabase
        .from('kpis')
        .delete()
        .in('owner_id', userIds)
        .select('id');
      if (!kpisErr && kpisDeleted) deletionSummary.kpis = kpisDeleted.length;
    }

    // Jane sync logs (references jane_integrations)
    const { data: janeIntegrations } = await supabase
      .from('jane_integrations')
      .select('id')
      .eq('organization_id', organization_id);

    if (janeIntegrations && janeIntegrations.length > 0) {
      const integrationIds = janeIntegrations.map(i => i.id);
      const { data: janeSyncLogs, error: janeSyncLogsErr } = await supabase
        .from('jane_sync_logs')
        .delete()
        .in('integration_id', integrationIds)
        .select('id');
      if (!janeSyncLogsErr && janeSyncLogs) deletionSummary.jane_sync_logs = janeSyncLogs.length;
    }

    // Jane integrations
    const { data: janeIntegrationsDeleted, error: janeIntegrationsErr } = await supabase
      .from('jane_integrations')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!janeIntegrationsErr && janeIntegrationsDeleted) deletionSummary.jane_integrations = janeIntegrationsDeleted.length;

    // Meeting notes (references meetings)
    const { data: meetings } = await supabase
      .from('meetings')
      .select('id')
      .eq('organization_id', organization_id);

    if (meetings && meetings.length > 0) {
      const meetingIds = meetings.map(m => m.id);
      const { data: meetingNotes, error: meetingNotesErr } = await supabase
        .from('meeting_notes')
        .delete()
        .in('meeting_id', meetingIds)
        .select('id');
      if (!meetingNotesErr && meetingNotes) deletionSummary.meeting_notes = meetingNotes.length;
    }

    // Meetings
    const { data: meetingsDeleted, error: meetingsErr } = await supabase
      .from('meetings')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!meetingsErr && meetingsDeleted) deletionSummary.meetings = meetingsDeleted.length;

    // Issues
    const { data: issues, error: issuesErr } = await supabase
      .from('issues')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!issuesErr && issues) deletionSummary.issues = issues.length;

    // Docs
    const { data: docs, error: docsErr } = await supabase
      .from('docs')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!docsErr && docs) deletionSummary.docs = docs.length;

    // Playbooks
    const { data: playbooks, error: playbooksErr } = await supabase
      .from('playbooks')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!playbooksErr && playbooks) deletionSummary.playbooks = playbooks.length;

    // Departments
    const { data: departments, error: departmentsErr } = await supabase
      .from('departments')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!departmentsErr && departments) deletionSummary.departments = departments.length;

    // Branding
    const { data: branding, error: brandingErr } = await supabase
      .from('branding')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!brandingErr && branding) deletionSummary.branding = branding.length;

    // Licenses
    const { data: licenses, error: licensesErr } = await supabase
      .from('licenses')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!licensesErr && licenses) deletionSummary.licenses = licenses.length;

    // Onboarding sessions
    const { data: onboardingSessions, error: onboardingSessionsErr } = await supabase
      .from('onboarding_sessions')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!onboardingSessionsErr && onboardingSessions) deletionSummary.onboarding_sessions = onboardingSessions.length;

    // Org core values
    const { data: orgCoreValues, error: orgCoreValuesErr } = await supabase
      .from('org_core_values')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!orgCoreValuesErr && orgCoreValues) deletionSummary.org_core_values = orgCoreValues.length;

    // Demo provision
    const { data: demoProvision, error: demoProvisionErr } = await supabase
      .from('demo_provision')
      .delete()
      .eq('organization_id', organization_id)
      .select('id');
    if (!demoProvisionErr && demoProvision) deletionSummary.demo_provision = demoProvision.length;

    // Delete users (must be after all user-related data)
    if (users && users.length > 0) {
      const { data: usersDeleted, error: usersErr } = await supabase
        .from('users')
        .delete()
        .eq('team_id', organization_id)
        .select('id');
      if (!usersErr && usersDeleted) deletionSummary.users = usersDeleted.length;
    }

    // Delete the organization itself if requested
    if (delete_org) {
      const { error: orgErr } = await supabase
        .from('teams')
        .delete()
        .eq('id', organization_id);
      
      if (!orgErr) {
        deletionSummary.organization = 1;
      }
    }

    // Create audit log entry
    await supabase.from('audit_log').insert({
      actor_id: user.id,
      entity: 'organization',
      entity_id: organization_id,
      action: delete_org ? 'delete' : 'reset',
      payload: {
        deleted_records: deletionSummary,
        delete_org,
        timestamp: new Date().toISOString(),
      }
    });

    console.log(`[reset-organization] Completed reset for org: ${organization_id}`);
    console.log('Deletion summary:', deletionSummary);

    return new Response(
      JSON.stringify({
        success: true,
        message: delete_org ? 'Organization deleted successfully' : 'Organization reset successfully',
        summary: deletionSummary,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('[reset-organization] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to reset organization'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
