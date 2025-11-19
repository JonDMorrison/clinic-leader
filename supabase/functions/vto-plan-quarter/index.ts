import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Rock {
  title: string;
  owner_id?: string;
  quarter: string;
  due: string;
  status: 'on_track' | 'off_track' | 'done';
  vto_link?: {
    vto_version_id: string;
    goal_key: string;
    weight: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { rocks, quarter } = await req.json();

    if (!Array.isArray(rocks) || rocks.length === 0) {
      throw new Error('No rocks provided');
    }

    // Get user's organization
    const { data: userProfile } = await supabaseClient
      .from('users')
      .select('team_id')
      .eq('email', user.email)
      .single();

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Create rocks in database
    const rocksToInsert = rocks.map(rock => ({
      title: rock.title,
      owner_id: rock.owner_id,
      quarter: rock.quarter,
      due: rock.due,
      status: rock.status,
      organization_id: userProfile.team_id,
    }));

    const { data: createdRocks, error: rocksError } = await supabaseClient
      .from('rocks')
      .insert(rocksToInsert)
      .select();

    if (rocksError) {
      console.error('Error creating rocks:', rocksError);
      throw rocksError;
    }

    // Create VTO links for rocks that have them
    const vtoLinksToInsert = [];
    for (let i = 0; i < rocks.length; i++) {
      const rock = rocks[i];
      const createdRock = createdRocks?.[i];
      
      if (rock.vto_link && createdRock) {
        vtoLinksToInsert.push({
          vto_version_id: rock.vto_link.vto_version_id,
          link_type: 'rock',
          link_id: createdRock.id,
          goal_key: rock.vto_link.goal_key,
          weight: rock.vto_link.weight,
        });
      }
    }

    if (vtoLinksToInsert.length > 0) {
      const { error: linksError } = await supabaseClient
        .from('vto_links')
        .insert(vtoLinksToInsert);

      if (linksError) {
        console.error('Error creating VTO links:', linksError);
        // Don't throw - rocks were created successfully
      }
    }

    // Trigger VTO progress recompute if we created links
    if (vtoLinksToInsert.length > 0 && rocks[0]?.vto_link?.vto_version_id) {
      await supabaseClient.functions.invoke('vto-compute-progress', {
        body: { vto_version_id: rocks[0].vto_link.vto_version_id },
      });
    }

    // Create audit log entry
    await supabaseClient.from('audit_log').insert({
      entity: 'rocks',
      action: 'batch_create',
      actor_id: user.id,
      payload: {
        count: createdRocks?.length || 0,
        quarter,
        vto_linked: vtoLinksToInsert.length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        created: createdRocks?.length || 0,
        rocks: createdRocks,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in vto-plan-quarter:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
