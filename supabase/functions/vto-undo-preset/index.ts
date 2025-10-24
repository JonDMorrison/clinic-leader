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

    const { vtoVersionId } = await req.json();

    console.log('Undoing preset for version:', vtoVersionId);

    // Get version details
    const { data: version } = await supabase
      .from('vto_versions')
      .select('*, vto!inner(organization_id)')
      .eq('id', vtoVersionId)
      .single();

    if (!version) {
      return new Response(JSON.stringify({ error: 'Version not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify it's from preset and is draft
    if (!version.originated_from_preset || version.status !== 'draft') {
      return new Response(JSON.stringify({ error: 'Can only undo preset-created draft versions' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify belongs to user's team
    if (version.vto.organization_id !== userData.team_id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete links first (due to foreign key)
    await supabase
      .from('vto_links')
      .delete()
      .eq('vto_version_id', vtoVersionId);

    // Delete the version
    const { error: deleteError } = await supabase
      .from('vto_versions')
      .delete()
      .eq('id', vtoVersionId);

    if (deleteError) {
      throw deleteError;
    }

    // Log undo event
    await supabase.from('vto_preset_events').insert({
      team_id: userData.team_id,
      user_id: user.id,
      preset_key: version.preset_key,
      action: 'undo',
    });

    console.log('Preset undone successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error undoing preset:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
