import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Triggers VTO progress computation
 * Called when Rocks, KPIs, or Issues change that are linked to VTO goals
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { teamId, triggerType } = await req.json();

    console.log('VTO compute triggered:', { teamId, triggerType });

    // Get active VTO for team
    const { data: vto } = await supabase
      .from('vto')
      .select('id')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .single();

    if (!vto) {
      console.log('No active VTO found for team');
      return new Response(
        JSON.stringify({ message: 'No active VTO' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get latest version
    const { data: version } = await supabase
      .from('vto_versions')
      .select('id')
      .eq('vto_id', vto.id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (!version) {
      console.log('No VTO version found');
      return new Response(
        JSON.stringify({ message: 'No VTO version' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger compute progress function
    const { data, error } = await supabase.functions.invoke('vto-compute-progress', {
      body: { vto_version_id: version.id }
    });

    if (error) {
      console.error('Error computing progress:', error);
      throw error;
    }

    console.log('VTO progress computed successfully');

    return new Response(
      JSON.stringify({ success: true, progress: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error triggering VTO compute:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
