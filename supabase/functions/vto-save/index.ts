import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Strategic fields that trigger alignment review when changed
const STRATEGIC_FIELDS = [
  'core_values',
  'core_focus',
  'ten_year_target',
  'three_year_picture',
  'one_year_plan',
  'marketing_strategy',
];

// Deep comparison for strategic fields
function hasStrategicChanges(oldVersion: any, newVersion: any): boolean {
  if (!oldVersion) return true; // New VTO counts as strategic change
  
  for (const field of STRATEGIC_FIELDS) {
    const oldVal = oldVersion[field];
    const newVal = newVersion[field];
    
    // Compare JSON stringified versions for deep equality
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      console.log(`Strategic field changed: ${field}`);
      return true;
    }
  }
  
  return false;
}

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

    const { vto_id, version_data, action } = await req.json();

    // Verify user has permission
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

    if (!profile || (profile.role !== 'owner' && profile.role !== 'director' && profile.role !== 'manager')) {
      throw new Error('Insufficient permissions');
    }

    // Verify VTO belongs to user's team
    const { data: vto } = await supabaseClient
      .from('vto')
      .select('organization_id')
      .eq('id', vto_id)
      .single();

    if (!vto || vto.organization_id !== profile.team_id) {
      throw new Error('VTO not found or access denied');
    }

    let result;
    let strategicChanged = false;

    if (action === 'save_draft') {
      // Fetch the current published or most recent version for comparison
      const { data: currentVersion } = await supabaseClient
        .from('vto_versions')
        .select('*')
        .eq('vto_id', vto_id)
        .in('status', ['published', 'draft'])
        .order('version', { ascending: false })
        .limit(1)
        .single();

      // Check for strategic changes
      strategicChanged = hasStrategicChanges(currentVersion, version_data);

      // Create or update draft version
      const { data: existingDraft } = await supabaseClient
        .from('vto_versions')
        .select('*')
        .eq('vto_id', vto_id)
        .eq('status', 'draft')
        .single();

      if (existingDraft) {
        // Update existing draft
        const { data, error } = await supabaseClient
          .from('vto_versions')
          .update({
            ...version_data,
            created_by: profile.id,
          })
          .eq('id', existingDraft.id)
          .select()
          .single();

        if (error) throw error;
        result = data;

        // Log audit
        await supabaseClient.from('vto_audit').insert({
          vto_version_id: existingDraft.id,
          user_id: profile.id,
          action: 'edit',
          meta: { fields_updated: Object.keys(version_data) },
        });
      } else {
        // Create new draft
        const { data: latestVersion } = await supabaseClient
          .from('vto_versions')
          .select('version')
          .eq('vto_id', vto_id)
          .order('version', { ascending: false })
          .limit(1)
          .single();

        const nextVersion = (latestVersion?.version || 0) + 1;

        const { data, error } = await supabaseClient
          .from('vto_versions')
          .insert({
            vto_id,
            version: nextVersion,
            status: 'draft',
            ...version_data,
            created_by: profile.id,
          })
          .select()
          .single();

        if (error) throw error;
        result = data;

        // Log audit
        await supabaseClient.from('vto_audit').insert({
          vto_version_id: data.id,
          user_id: profile.id,
          action: 'create',
        });
      }

      // If strategic fields changed, set organization review flags
      if (strategicChanged) {
        console.log('Strategic changes detected, setting review flags for org:', profile.team_id);
        
        const { error: flagError } = await supabaseClient
          .from('teams')
          .update({
            needs_scorecard_review: true,
            needs_rocks_review: true,
          })
          .eq('id', profile.team_id);

        if (flagError) {
          console.error('Failed to set review flags:', flagError);
        }

        // Log the diff event for audit purposes
        await supabaseClient.from('vto_diff_events').insert({
          organization_id: profile.team_id,
          previous_vto_version: currentVersion || null,
          updated_vto_version: version_data,
          diff: { strategic_changed: true, fields: STRATEGIC_FIELDS.filter(f => 
            JSON.stringify(currentVersion?.[f]) !== JSON.stringify(version_data[f])
          )},
        });
      }
    } else if (action === 'publish') {
      // Publish version (only owner/director can publish)
      if (profile.role !== 'owner' && profile.role !== 'director') {
        throw new Error('Only owners and directors can publish versions');
      }

      const { data, error } = await supabaseClient
        .from('vto_versions')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', version_data.id)
        .eq('status', 'draft')
        .select()
        .single();

      if (error) throw error;
      result = data;

      // Archive previous published versions
      await supabaseClient
        .from('vto_versions')
        .update({ status: 'archived' })
        .eq('vto_id', vto_id)
        .eq('status', 'published')
        .neq('id', data.id);

      // Log audit
      await supabaseClient.from('vto_audit').insert({
        vto_version_id: data.id,
        user_id: profile.id,
        action: 'publish',
      });

      // Trigger progress computation
      const progressResponse = await supabaseClient.functions.invoke('vto-compute-progress', {
        body: { vto_version_id: data.id },
      });

      console.log('Progress computation triggered:', progressResponse);
      
      // Publishing always triggers review flags
      strategicChanged = true;
      await supabaseClient
        .from('teams')
        .update({
          needs_scorecard_review: true,
          needs_rocks_review: true,
        })
        .eq('id', profile.team_id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result,
        strategicChanged,
        needsScorecardReview: strategicChanged,
        needsRocksReview: strategicChanged,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in vto-save:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
