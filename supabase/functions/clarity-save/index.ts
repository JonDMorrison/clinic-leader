import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SaveRequest {
  vto_id?: string;
  organization_id?: string;
  vision?: any;
  traction?: any;
  action?: string;
  field?: string;
  old_value?: any;
  new_value?: any;
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

    // Get authenticated user from Authorization header
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    let user = null as any;
    let authError: any = null;

    if (token) {
      const { data, error } = await supabaseClient.auth.getUser(token);
      user = data?.user ?? null;
      authError = error ?? null;
    } else {
      authError = new Error('Missing Authorization header');
    }

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: SaveRequest = await req.json();
    console.log('Save request:', { vto_id: body.vto_id, organization_id: body.organization_id, action: body.action });

    let vtoId = body.vto_id;
    let organizationId = body.organization_id;

    // If no vto_id provided, get or create VTO for organization
    if (!vtoId && organizationId) {
      const { data: existingVto, error: fetchError } = await supabaseClient
        .from('clarity_vto')
        .select('id')
        .eq('organization_id', organizationId)
        .single();

      if (existingVto) {
        vtoId = existingVto.id;
      } else {
        // Create new VTO
        const { data: newVto, error: createError } = await supabaseClient
          .from('clarity_vto')
          .insert({
            organization_id: organizationId,
            version_current: 1,
            vision: body.vision || {},
            traction: body.traction || {},
            metrics: {
              vision_clarity: 0,
              traction_health: 0,
              last_computed: new Date().toISOString(),
              breakdown: {}
            }
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating VTO:', createError);
          throw createError;
        }

        vtoId = newVto.id;
        console.log('Created new VTO:', vtoId);
      }
    }

    if (!vtoId) {
      throw new Error('VTO ID is required');
    }

    // Update VTO with new data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (body.vision) {
      updateData.vision = body.vision;
    }

    if (body.traction) {
      updateData.traction = body.traction;
    }

    const { data: updatedVto, error: updateError } = await supabaseClient
      .from('clarity_vto')
      .update(updateData)
      .eq('id', vtoId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating VTO:', updateError);
      throw updateError;
    }

    // Log activity
    if (body.action) {
      const activityDetails: any = {
        field: body.field,
      };

      if (body.old_value !== undefined) {
        activityDetails.diff = {
          old: body.old_value,
          new: body.new_value
        };
      }

      const { error: activityError } = await supabaseClient
        .from('clarity_activity')
        .insert({
          vto_id: vtoId,
          user_id: user.id,
          action: body.action,
          details: activityDetails
        });

      if (activityError) {
        console.error('Error logging activity:', activityError);
        // Don't fail the request if activity logging fails
      }
    }

    // Calculate field completeness
    const vision = updatedVto.vision || {};
    const completeness = calculateCompleteness(vision);

    console.log('Save successful:', { vto_id: vtoId, completeness });

    return new Response(
      JSON.stringify({
        success: true,
        vto: updatedVto,
        completeness
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in clarity-save:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function calculateCompleteness(vision: any): Record<string, any> {
  const sections = {
    core_values: Array.isArray(vision.core_values) && vision.core_values.length >= 3,
    core_focus: vision.core_focus?.purpose && vision.core_focus?.niche,
    ten_year_target: vision.ten_year_target && vision.ten_year_target.length > 10,
    ideal_client: vision.ideal_client && vision.ideal_client.length > 10,
    differentiators: Array.isArray(vision.differentiators) && vision.differentiators.length >= 3,
    proven_process: Array.isArray(vision.proven_process) && vision.proven_process.length >= 3,
    promise: vision.promise && vision.promise.length > 5,
    three_year_picture: vision.three_year_picture?.revenue > 0,
    culture: vision.culture && vision.culture.length > 10
  };

  const totalSections = Object.keys(sections).length;
  const completedSections = Object.values(sections).filter(Boolean).length;
  const overallScore = Math.round((completedSections / totalSections) * 100);

  return {
    overall: overallScore,
    sections,
    completed: completedSections,
    total: totalSections
  };
}
