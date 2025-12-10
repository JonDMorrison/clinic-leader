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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { vto_version_id, change_summary, is_manual } = await req.json();

    // Verify user
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get user profile
    const { data: profile } = await supabaseClient
      .from('users')
      .select('id, team_id, role')
      .eq('email', user.email)
      .single();

    if (!profile?.team_id) {
      throw new Error('User profile not found');
    }

    const orgId = profile.team_id;

    // Fetch the VTO version
    const { data: vtoVersion, error: vtoError } = await supabaseClient
      .from('vto_versions')
      .select('*, vto:vto_id(organization_id)')
      .eq('id', vto_version_id)
      .single();

    if (vtoError || !vtoVersion) {
      throw new Error('VTO version not found');
    }

    // Verify org ownership
    if (vtoVersion.vto?.organization_id !== orgId) {
      throw new Error('Access denied');
    }

    // Fetch current scorecard metrics
    const { data: metrics } = await supabaseClient
      .from('metrics')
      .select('id, name, category, target, direction, owner, unit, sync_source, is_favorite')
      .eq('organization_id', orgId);

    // Fetch current rocks
    const { data: rocks } = await supabaseClient
      .from('rocks')
      .select('id, title, quarter, owner_id, status, level, confidence, note')
      .eq('organization_id', orgId);

    // Compute impacted sections from VTO data
    const impactedSections: string[] = [];
    if (vtoVersion.core_values?.length) impactedSections.push('core_values');
    if (vtoVersion.core_focus?.purpose || vtoVersion.core_focus?.niche) impactedSections.push('core_focus');
    if (vtoVersion.ten_year_target) impactedSections.push('ten_year_target');
    if (vtoVersion.three_year_picture?.revenue || vtoVersion.three_year_picture?.profit) impactedSections.push('three_year_picture');
    if (vtoVersion.one_year_plan?.goals?.length) impactedSections.push('one_year_plan');
    if (vtoVersion.marketing_strategy?.ideal_customer) impactedSections.push('marketing_strategy');
    if (vtoVersion.quarterly_rocks?.length) impactedSections.push('quarterly_rocks');

    // Build VTO snapshot
    const vtoSnapshot = {
      version: vtoVersion.version,
      status: vtoVersion.status,
      core_values: vtoVersion.core_values,
      core_focus: vtoVersion.core_focus,
      ten_year_target: vtoVersion.ten_year_target,
      three_year_picture: vtoVersion.three_year_picture,
      one_year_plan: vtoVersion.one_year_plan,
      marketing_strategy: vtoVersion.marketing_strategy,
      quarterly_rocks: vtoVersion.quarterly_rocks,
      issues: vtoVersion.issues,
      published_at: vtoVersion.published_at,
      created_at: vtoVersion.created_at,
    };

    // Create the history entry
    const { data: historyEntry, error: insertError } = await supabaseClient
      .from('vto_history')
      .insert({
        organization_id: orgId,
        vto_version_id: vto_version_id,
        vto_version: vtoVersion.version,
        changed_by: profile.id,
        vto_snapshot: vtoSnapshot,
        scorecard_snapshot: metrics || [],
        rocks_snapshot: rocks || [],
        change_summary: change_summary || `VTO version ${vtoVersion.version} snapshot`,
        impacted_sections: impactedSections,
        scorecard_impact: {
          metric_count: metrics?.length || 0,
          categories: [...new Set(metrics?.map(m => m.category) || [])],
        },
        rocks_impact: {
          rock_count: rocks?.length || 0,
          statuses: [...new Set(rocks?.map(r => r.status) || [])],
        },
        is_manual: is_manual || false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create snapshot:', insertError);
      throw insertError;
    }

    // Update vto_versions with history_id
    await supabaseClient
      .from('vto_versions')
      .update({ history_id: historyEntry.id })
      .eq('id', vto_version_id);

    console.log('Snapshot created:', historyEntry.id);

    return new Response(
      JSON.stringify({ success: true, data: historyEntry }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in vto-create-snapshot:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
