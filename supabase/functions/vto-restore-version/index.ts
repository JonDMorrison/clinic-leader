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

    const { history_id } = await req.json();

    if (!history_id) {
      throw new Error('history_id is required');
    }

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

    // Only owners/directors can restore
    if (profile.role !== 'owner' && profile.role !== 'director') {
      throw new Error('Only owners and directors can restore VTO versions');
    }

    const orgId = profile.team_id;

    // Fetch the history entry
    const { data: historyEntry, error: historyError } = await supabaseClient
      .from('vto_history')
      .select('*')
      .eq('id', history_id)
      .eq('organization_id', orgId)
      .single();

    if (historyError || !historyEntry) {
      throw new Error('History entry not found or access denied');
    }

    // Get the active VTO for this org
    const { data: activeVto } = await supabaseClient
      .from('vto')
      .select('id')
      .eq('organization_id', orgId)
      .eq('active', true)
      .single();

    if (!activeVto) {
      throw new Error('No active VTO found for this organization');
    }

    // Get the latest version number
    const { data: latestVersion } = await supabaseClient
      .from('vto_versions')
      .select('version')
      .eq('vto_id', activeVto.id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (latestVersion?.version || 0) + 1;
    const snapshot = historyEntry.vto_snapshot;

    // Create a new draft version from the snapshot
    const { data: newVersion, error: insertError } = await supabaseClient
      .from('vto_versions')
      .insert({
        vto_id: activeVto.id,
        version: nextVersion,
        status: 'draft',
        core_values: snapshot.core_values || [],
        core_focus: snapshot.core_focus || {},
        ten_year_target: snapshot.ten_year_target || '',
        three_year_picture: snapshot.three_year_picture || {},
        one_year_plan: snapshot.one_year_plan || {},
        marketing_strategy: snapshot.marketing_strategy || {},
        quarterly_rocks: snapshot.quarterly_rocks || [],
        issues: snapshot.issues || [],
        created_by: profile.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create restored version:', insertError);
      throw insertError;
    }

    // Log to vto_audit
    await supabaseClient.from('vto_audit').insert({
      vto_version_id: newVersion.id,
      user_id: profile.id,
      action: 'restore',
      meta: {
        restored_from_history_id: history_id,
        restored_from_version: historyEntry.vto_version,
      },
    });

    // Set review flags since restoring may require alignment
    await supabaseClient
      .from('teams')
      .update({
        needs_scorecard_review: true,
        needs_rocks_review: true,
      })
      .eq('id', orgId);

    console.log('VTO restored from history:', history_id, '-> new version:', newVersion.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: newVersion,
        message: 'VTO restored as a new draft. Review and publish when ready. Scorecard and Rocks alignment tools are available.',
        scorecard_snapshot: historyEntry.scorecard_snapshot,
        rocks_snapshot: historyEntry.rocks_snapshot,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in vto-restore-version:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
