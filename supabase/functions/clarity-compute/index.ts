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

    const { vto_id } = await req.json();
    console.log('Computing metrics for VTO:', vto_id);

    // Fetch VTO
    const { data: vto, error: vtoError } = await supabaseClient
      .from('clarity_vto')
      .select('*')
      .eq('id', vto_id)
      .single();

    if (vtoError || !vto) {
      throw new Error('VTO not found');
    }

    // Calculate Vision Clarity Score (0-100)
    const visionScore = calculateVisionClarity(vto.vision);

    // Fetch goals for traction calculation
    const { data: goals, error: goalsError } = await supabaseClient
      .from('clarity_goals')
      .select('*')
      .eq('vto_id', vto_id);

    if (goalsError) {
      console.error('Error fetching goals:', goalsError);
    }

    // Calculate Traction Health Score (0-100)
    const tractionScore = calculateTractionHealth(vto.traction, goals || []);

    // Identify off-track items
    const offTrackItems = identifyOffTrackItems(goals || []);

    const metrics = {
      vision_clarity: visionScore.overall,
      traction_health: tractionScore.overall,
      last_computed: new Date().toISOString(),
      breakdown: {
        vision: visionScore.breakdown,
        traction: tractionScore.breakdown,
        off_track_items: offTrackItems
      }
    };

    // Update VTO with computed metrics
    const { error: updateError } = await supabaseClient
      .from('clarity_vto')
      .update({ metrics })
      .eq('id', vto_id);

    if (updateError) {
      console.error('Error updating metrics:', updateError);
      throw updateError;
    }

    console.log('Compute successful:', { vision: visionScore.overall, traction: tractionScore.overall });

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        gauges: {
          vision_clarity: visionScore.overall,
          traction_health: tractionScore.overall
        },
        off_track_items: offTrackItems
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in clarity-compute:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function calculateVisionClarity(vision: any): { overall: number; breakdown: any } {
  const weights = {
    core_values: 15,
    core_focus: 15,
    ten_year_target: 15,
    ideal_client: 10,
    differentiators: 10,
    proven_process: 10,
    promise: 10,
    three_year_picture: 10,
    culture: 5
  };

  const scores: any = {};
  let totalScore = 0;
  let totalWeight = 0;

  for (const [field, weight] of Object.entries(weights)) {
    const fieldScore = calculateFieldScore(vision, field);
    scores[field] = fieldScore;
    totalScore += fieldScore * weight;
    totalWeight += weight;
  }

  const overall = Math.round(totalScore / totalWeight);

  return {
    overall,
    breakdown: scores
  };
}

function calculateFieldScore(vision: any, field: string): number {
  if (!vision) return 0;

  switch (field) {
    case 'core_values':
      return Array.isArray(vision.core_values) && vision.core_values.length >= 3 ? 100 : 
             Array.isArray(vision.core_values) && vision.core_values.length > 0 ? 50 : 0;
    
    case 'core_focus':
      if (vision.core_focus?.purpose && vision.core_focus?.niche) return 100;
      if (vision.core_focus?.purpose || vision.core_focus?.niche) return 50;
      return 0;
    
    case 'ten_year_target':
      if (vision.ten_year_target && vision.ten_year_target.length > 20) return 100;
      if (vision.ten_year_target && vision.ten_year_target.length > 5) return 50;
      return 0;
    
    case 'ideal_client':
      if (vision.ideal_client && vision.ideal_client.length > 20) return 100;
      if (vision.ideal_client && vision.ideal_client.length > 5) return 50;
      return 0;
    
    case 'differentiators':
      return Array.isArray(vision.differentiators) && vision.differentiators.length >= 3 ? 100 : 
             Array.isArray(vision.differentiators) && vision.differentiators.length > 0 ? 50 : 0;
    
    case 'proven_process':
      return Array.isArray(vision.proven_process) && vision.proven_process.length >= 3 ? 100 : 
             Array.isArray(vision.proven_process) && vision.proven_process.length > 0 ? 50 : 0;
    
    case 'promise':
      if (vision.promise && vision.promise.length > 10) return 100;
      if (vision.promise && vision.promise.length > 0) return 50;
      return 0;
    
    case 'three_year_picture':
      const pic = vision.three_year_picture;
      if (pic?.revenue > 0 && pic?.profit_margin > 0 && pic?.headcount > 0) return 100;
      if (pic?.revenue > 0) return 50;
      return 0;
    
    case 'culture':
      if (vision.culture && vision.culture.length > 20) return 100;
      if (vision.culture && vision.culture.length > 5) return 50;
      return 0;
    
    default:
      return 0;
  }
}

function calculateTractionHealth(traction: any, goals: any[]): { overall: number; breakdown: any } {
  if (!goals || goals.length === 0) {
    return { overall: 0, breakdown: { message: 'No goals or priorities set' } };
  }

  const priorities = goals.filter(g => g.type === 'priority');
  const issues = goals.filter(g => g.type === 'issue');

  // Calculate priority momentum (how many are on track)
  const onTrackCount = priorities.filter(p => p.status === 'on_track' || p.status === 'completed').length;
  const priorityMomentum = priorities.length > 0 ? (onTrackCount / priorities.length) * 100 : 0;

  // Calculate issue resolution (resolved vs open)
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const issueResolution = issues.length > 0 ? (resolvedCount / issues.length) * 100 : 100;

  // Overall score (weighted average)
  const overall = Math.round((priorityMomentum * 0.7) + (issueResolution * 0.3));

  return {
    overall,
    breakdown: {
      priority_momentum: Math.round(priorityMomentum),
      issue_resolution: Math.round(issueResolution),
      total_priorities: priorities.length,
      on_track_priorities: onTrackCount,
      total_issues: issues.length,
      resolved_issues: resolvedCount
    }
  };
}

function identifyOffTrackItems(goals: any[]): any[] {
  return goals
    .filter(g => g.status === 'off_track' || g.status === 'at_risk')
    .map(g => ({
      id: g.id,
      title: g.title,
      type: g.type,
      status: g.status,
      reason: g.status === 'off_track' 
        ? 'This item is significantly behind schedule or missing key requirements'
        : 'This item is at risk due to blockers or resource constraints'
    }))
    .slice(0, 3); // Top 3 off-track items
}
