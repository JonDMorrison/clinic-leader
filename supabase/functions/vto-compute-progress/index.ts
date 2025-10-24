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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for system operations
    );

    const { vto_version_id } = await req.json();

    // Get version data
    const { data: version, error: versionError } = await supabaseClient
      .from('vto_versions')
      .select('*')
      .eq('id', vto_version_id)
      .single();

    if (versionError) throw versionError;

    // Calculate vision score (% of fields filled)
    const visionChecks = [
      version.core_values?.length >= 3,
      version.core_focus?.purpose?.length > 0,
      version.core_focus?.niche?.length > 0,
      version.ten_year_target?.length > 0,
      version.marketing_strategy?.ideal_client?.length > 0,
      version.marketing_strategy?.differentiators?.length >= 3,
      version.marketing_strategy?.proven_process?.length > 0,
      version.marketing_strategy?.guarantee?.length > 0,
      version.three_year_picture?.measurables?.length >= 3,
      (version.three_year_picture?.revenue ?? 0) > 0,
    ];

    const visionScore = Math.round((visionChecks.filter(Boolean).length / visionChecks.length) * 100);

    // Get links for traction calculation
    const { data: links, error: linksError } = await supabaseClient
      .from('vto_links')
      .select('*')
      .eq('vto_version_id', vto_version_id);

    if (linksError) throw linksError;

    // Fetch linked items (KPIs, Rocks, Issues)
    const linkedItems = new Map();
    const details: Record<string, any> = {};

    for (const link of links || []) {
      let item = null;

      if (link.link_type === 'kpi') {
        const { data: kpi } = await supabaseClient
          .from('kpis')
          .select('id, name, target, direction, kpi_readings(value, week_start)')
          .eq('id', link.link_id)
          .single();

        if (kpi && kpi.kpi_readings?.[0]) {
          const reading = kpi.kpi_readings[0];
          item = {
            type: 'kpi',
            id: kpi.id,
            value: reading.value,
            target: kpi.target,
            direction: kpi.direction,
          };
        }
      } else if (link.link_type === 'rock') {
        const { data: rock } = await supabaseClient
          .from('rocks')
          .select('id, title, status')
          .eq('id', link.link_id)
          .single();

        if (rock) {
          item = {
            type: 'rock',
            id: rock.id,
            status: rock.status,
          };
        }
      } else if (link.link_type === 'issue') {
        const { data: issue } = await supabaseClient
          .from('issues')
          .select('id, title, status')
          .eq('id', link.link_id)
          .single();

        if (issue) {
          item = {
            type: 'issue',
            id: issue.id,
            status: issue.status,
          };
        }
      }

      if (item) {
        linkedItems.set(link.link_id, item);

        // Calculate item progress
        let progress = 0;
        if (item.type === 'rock') {
          progress = item.status === 'on_track' ? 1.0 : item.status === 'at_risk' ? 0.5 : 0;
        } else if (item.type === 'kpi' && item.value && item.target) {
          const ratio = item.value / item.target;
          progress = item.direction === 'down' 
            ? Math.max(0, Math.min(1, 2 - ratio))
            : Math.max(0, Math.min(1, ratio));
        } else if (item.type === 'issue') {
          progress = item.status === 'resolved' ? 0.2 : 0;
        }

        // Add to details
        if (!details[link.goal_key]) {
          details[link.goal_key] = {
            progress: 0,
            weight: 0,
            linked_items: [],
          };
        }

        details[link.goal_key].progress += progress * link.weight;
        details[link.goal_key].weight += link.weight;
        details[link.goal_key].linked_items.push({
          type: item.type,
          id: item.id,
          contribution: Math.round(progress * link.weight * 100) / 100,
        });
      }
    }

    // Calculate average traction score
    let totalProgress = 0;
    let totalWeight = 0;

    for (const goalKey in details) {
      if (details[goalKey].weight > 0) {
        details[goalKey].progress = Math.round((details[goalKey].progress / details[goalKey].weight) * 100);
        totalProgress += details[goalKey].progress * details[goalKey].weight;
        totalWeight += details[goalKey].weight;
      }
    }

    const tractionScore = totalWeight > 0 ? Math.round(totalProgress / totalWeight) : 0;

    // Save progress snapshot
    const { data: progress, error: progressError } = await supabaseClient
      .from('vto_progress')
      .insert({
        vto_version_id,
        vision_score: visionScore,
        traction_score: tractionScore,
        details,
      })
      .select()
      .single();

    if (progressError) throw progressError;

    console.log('VTO progress computed:', { visionScore, tractionScore, goalCount: Object.keys(details).length });

    return new Response(
      JSON.stringify({ success: true, progress }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in vto-compute-progress:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
