import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { vto_id, label, seed_priorities } = await req.json();
    console.log('Creating revision for VTO:', vto_id, 'with label:', label);

    // Fetch current VTO
    const { data: vto, error: vtoError } = await supabaseClient
      .from('clarity_vto')
      .select('*')
      .eq('id', vto_id)
      .single();

    if (vtoError || !vto) {
      throw new Error('VTO not found');
    }

    const newVersion = vto.version_current + 1;

    // Create revision snapshot
    const { data: revision, error: revisionError } = await supabaseClient
      .from('clarity_revisions')
      .insert({
        vto_id: vto_id,
        version: newVersion,
        label: label || `Version ${newVersion}`,
        vision: vto.vision,
        traction: vto.traction,
        metrics: vto.metrics,
        created_by: user.id
      })
      .select()
      .single();

    if (revisionError) {
      console.error('Error creating revision:', revisionError);
      throw revisionError;
    }

    // Update VTO version number
    const { error: updateError } = await supabaseClient
      .from('clarity_vto')
      .update({
        version_current: newVersion,
        updated_at: new Date().toISOString()
      })
      .eq('id', vto_id);

    if (updateError) {
      console.error('Error updating version:', updateError);
      throw updateError;
    }

    // Log activity
    await supabaseClient
      .from('clarity_activity')
      .insert({
        vto_id: vto_id,
        user_id: user.id,
        action: 'revision_created',
        details: {
          version: newVersion,
          label: revision.label
        }
      });

    // Optionally seed priorities from previous quarter
    if (seed_priorities) {
      const { data: previousPriorities } = await supabaseClient
        .from('clarity_goals')
        .select('*')
        .eq('vto_id', vto_id)
        .eq('type', 'priority')
        .in('status', ['at_risk', 'off_track']);

      if (previousPriorities && previousPriorities.length > 0) {
        const carriedPriorities = previousPriorities.map(p => ({
          vto_id: vto_id,
          type: 'priority' as const,
          title: p.title,
          description: `Carried from V${vto.version_current}: ${p.description || ''}`,
          owner_id: p.owner_id,
          status: 'not_started' as const,
          weight: p.weight,
          kpi_target: p.kpi_target,
          links: p.links
        }));

        await supabaseClient
          .from('clarity_goals')
          .insert(carriedPriorities);

        console.log('Seeded', carriedPriorities.length, 'priorities');
      }
    }

    console.log('Revision created successfully:', newVersion);

    return new Response(
      JSON.stringify({
        success: true,
        revision,
        new_version: newVersion
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in clarity-revise:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
