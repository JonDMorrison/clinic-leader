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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role, team_id')
      .eq('email', user.email)
      .single();

    if (!userData || !['owner', 'director', 'manager'].includes(userData.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { vtoId, presetKey, presetData, autoLink, keepCurrentDraft } = await req.json();

    console.log('Applying preset:', { vtoId, presetKey, autoLink, keepCurrentDraft });

    // Verify VTO belongs to user's team
    const { data: vto } = await supabase
      .from('vto')
      .select('organization_id')
      .eq('id', vtoId)
      .single();

    if (!vto || vto.organization_id !== userData.team_id) {
      return new Response(JSON.stringify({ error: 'VTO not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get current max version
    const { data: versions } = await supabase
      .from('vto_versions')
      .select('version')
      .eq('vto_id', vtoId)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = versions && versions.length > 0 ? versions[0].version + 1 : 1;

    // Archive old draft if not keeping it
    if (!keepCurrentDraft) {
      await supabase
        .from('vto_versions')
        .update({ status: 'archived' })
        .eq('vto_id', vtoId)
        .eq('status', 'draft');
    }

    // Create new draft version from preset
    const { data: newVersion, error: versionError } = await supabase
      .from('vto_versions')
      .insert({
        vto_id: vtoId,
        version: nextVersion,
        status: 'draft',
        preset_key: presetKey,
        originated_from_preset: true,
        core_values: presetData.vision.core_values,
        core_focus: presetData.vision.core_focus,
        ten_year_target: presetData.vision.ten_year_target,
        marketing_strategy: presetData.vision.marketing_strategy,
        three_year_picture: presetData.vision.three_year_picture,
        one_year_plan: presetData.traction.one_year_plan,
        quarter_key: presetData.traction.quarter_key,
        quarterly_rocks: presetData.traction.quarterly_rocks,
        issues_company: presetData.traction.issues_company,
        issues_department: presetData.traction.issues_department,
        issues_personal: presetData.traction.issues_personal,
        created_by: user.id,
      })
      .select()
      .single();

    if (versionError) {
      console.error('Error creating version:', versionError);
      throw versionError;
    }

    console.log('Created new version:', newVersion.id);

    // Auto-link if requested
    let linksCreated = 0;
    if (autoLink) {
      // Fetch available entities
      const { data: kpis } = await supabase
        .from('kpis')
        .select('id, name')
        .eq('active', true);

      const { data: rocks } = await supabase
        .from('rocks')
        .select('id, title')
        .order('created_at', { ascending: false });

      const { data: docs } = await supabase
        .from('docs')
        .select('id, title')
        .eq('status', 'published');

      // Simple text matching for goals
      const goals = [
        ...presetData.traction.one_year_plan.goals.map((g: string) => ({ text: g, key: 'one_year_plan.goal' })),
        ...presetData.traction.quarterly_rocks.map((r: any) => ({ text: r.title, key: 'quarterly_rock' })),
      ];

      for (const goal of goals) {
        const goalLower = goal.text.toLowerCase();
        
        // Match KPIs
        const matchedKpi = kpis?.find((k: any) => 
          goalLower.includes(k.name.toLowerCase()) || 
          k.name.toLowerCase().includes(goalLower)
        );
        
        if (matchedKpi) {
          await supabase.from('vto_links').insert({
            vto_version_id: newVersion.id,
            link_type: 'kpi',
            link_id: matchedKpi.id,
            goal_key: goal.key,
            weight: 1.0,
          });
          linksCreated++;
        }

        // Match Rocks
        const matchedRock = rocks?.find((r: any) => 
          goalLower.includes(r.title.toLowerCase()) || 
          r.title.toLowerCase().includes(goalLower)
        );
        
        if (matchedRock) {
          await supabase.from('vto_links').insert({
            vto_version_id: newVersion.id,
            link_type: 'rock',
            link_id: matchedRock.id,
            goal_key: goal.key,
            weight: 1.0,
          });
          linksCreated++;
        }

        // Match Docs
        const matchedDoc = docs?.find((d: any) => 
          goalLower.includes(d.title.toLowerCase()) || 
          d.title.toLowerCase().includes(goalLower)
        );
        
        if (matchedDoc) {
          await supabase.from('vto_links').insert({
            vto_version_id: newVersion.id,
            link_type: 'doc',
            link_id: matchedDoc.id,
            goal_key: goal.key,
            weight: 1.0,
          });
          linksCreated++;
        }
      }
    }

    // Log preset event
    await supabase.from('vto_preset_events').insert({
      team_id: userData.team_id,
      user_id: user.id,
      preset_key: presetKey,
      action: 'apply',
    });

    console.log(`Preset applied successfully. Created ${linksCreated} links.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        versionId: newVersion.id,
        linksCreated 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error applying preset:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
