import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VTOGoal {
  key: string;
  title: string;
  category: 'ten_year' | 'three_year' | 'one_year' | 'rock';
  revenue?: number;
}

interface SuggestedMetric {
  name: string;
  category: string;
  unit: string;
  target: number | null;
  direction: 'up' | 'down';
  linkedGoalKey: string;
  rationale: string;
}

// Standard error response format
interface ErrorResponse {
  code: string;
  message: string;
}

function errorResponse(status: number, code: string, message: string) {
  console.error(`[${code}] ${message}`);
  return new Response(
    JSON.stringify({ 
      data: null,
      error: { code, message } 
    }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function successResponse(data: any) {
  return new Response(
    JSON.stringify({ data, error: null }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organization_id } = await req.json();
    
    if (!organization_id) {
      return errorResponse(400, 'MISSING_ORG_ID', 'Organization ID is required.');
    }

    console.log('[ai-generate-scorecard-from-vto] Starting for org:', organization_id);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if organization is in aligned mode
    const { data: orgSettings, error: orgError } = await supabase
      .from('teams')
      .select('scorecard_mode')
      .eq('id', organization_id)
      .single();

    if (orgError) {
      console.warn('[ORG_SETTINGS_WARN] Could not fetch org settings:', orgError);
    }

    const isAlignedMode = orgSettings?.scorecard_mode === 'aligned';
    console.log('[ai-generate-scorecard-from-vto] Aligned mode:', isAlignedMode);

    // Fetch active VTO with versions
    const { data: vto, error: vtoError } = await supabase
      .from('vto')
      .select(`
        id,
        vto_versions(
          id,
          version,
          ten_year_target,
          three_year_picture,
          one_year_plan,
          quarterly_rocks,
          core_focus,
          marketing_strategy
        )
      `)
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    // Distinguish between query error and no data
    if (vtoError) {
      console.error('[VTO_QUERY_FAILED] Supabase query error:', vtoError);
      return errorResponse(
        500, 
        'VTO_QUERY_FAILED', 
        'We could not load your Vision Planner due to a server error.'
      );
    }
    
    if (!vto) {
      console.log('[NO_ACTIVE_VTO] No active VTO found for org:', organization_id);
      return errorResponse(
        400, 
        'NO_ACTIVE_VTO', 
        'No active Vision Planner was found for this organization.'
      );
    }

    if (!vto.vto_versions || vto.vto_versions.length === 0) {
      console.log('[NO_VTO_VERSION] VTO exists but has no versions for org:', organization_id);
      return errorResponse(
        400, 
        'NO_ACTIVE_VTO', 
        'No active Vision Planner was found for this organization.'
      );
    }

    // Sort versions to get the latest
    const versions = (vto.vto_versions as any[]).sort((a, b) => (b.version || 0) - (a.version || 0));
    const version = versions[0];
    const threeYearPicture = version.three_year_picture || {};
    const oneYearPlan = version.one_year_plan || {};
    const quarterlyRocks = version.quarterly_rocks || [];
    const coreFocus = version.core_focus || {};
    const marketingStrategy = version.marketing_strategy || {};

    console.log('[ai-generate-scorecard-from-vto] Found VTO version:', version.id);

    // Extract goals from VTO
    const goals: VTOGoal[] = [];

    // 10-Year Target
    if (version.ten_year_target) {
      goals.push({
        key: 'ten_year_target',
        title: version.ten_year_target,
        category: 'ten_year',
      });
    }

    // 3-Year Picture
    if (threeYearPicture.revenue) {
      goals.push({
        key: 'three_year_picture.revenue',
        title: `$${threeYearPicture.revenue.toLocaleString()} Annual Revenue`,
        category: 'three_year',
        revenue: threeYearPicture.revenue,
      });
    }

    // 3-Year Expansion Items
    if (threeYearPicture.expansion_items?.length) {
      threeYearPicture.expansion_items.forEach((item: any, idx: number) => {
        if (item?.title) {
          goals.push({
            key: `three_year_picture.expansion_items[${idx}]`,
            title: item.title,
            category: 'three_year',
          });
        }
      });
    }

    // 1-Year Goals
    if (oneYearPlan.goals?.length) {
      oneYearPlan.goals.forEach((goal: any, idx: number) => {
        const title = typeof goal === 'string' ? goal : goal?.title;
        if (title) {
          goals.push({
            key: `one_year_plan.goals[${idx}]`,
            title,
            category: 'one_year',
          });
        }
      });
    }

    // Quarterly Rocks
    if (quarterlyRocks.length) {
      quarterlyRocks.forEach((rock: any, idx: number) => {
        if (rock?.title) {
          goals.push({
            key: `quarterly_rocks[${idx}]`,
            title: rock.title,
            category: 'rock',
          });
        }
      });
    }

    if (goals.length === 0) {
      console.log('[NO_GOALS] VTO exists but has no goals for org:', organization_id);
      return errorResponse(
        400, 
        'NO_ACTIVE_VTO', 
        'Your Vision Planner has no goals defined. Please add goals to your Vision/Traction sections first.'
      );
    }

    console.log(`[ai-generate-scorecard-from-vto] Found ${goals.length} goals, calling AI...`);

    // Build AI prompt
    const systemPrompt = `You are a business metrics expert specializing in healthcare clinics using EOS (Entrepreneurial Operating System).
Your task is to suggest KPIs/metrics that should be tracked on a weekly scorecard based on strategic V/TO goals.

For each goal, suggest 1-3 relevant, measurable KPIs that would indicate progress toward that goal.

Guidelines:
- Focus on leading indicators, not just lagging indicators
- Metrics should be measurable weekly
- Healthcare clinic metrics often include: New Patients, Patient Visits, Revenue, Collections, Cancellation Rate, No-Show Rate, Reactivations, Referrals, AR Days, etc.
- Be specific with targets based on the goal (e.g., if goal is $5M revenue, suggest weekly revenue target of ~$96K)
- Use appropriate units: number, currency ($), percentage (%), days

Return a JSON array of suggested metrics.`;

    const userPrompt = `Based on these V/TO goals, suggest KPIs for a weekly scorecard:

${goals.map(g => `- [${g.category}] ${g.title}`).join('\n')}

${coreFocus.niche ? `\nClinic Focus: ${coreFocus.niche}` : ''}
${marketingStrategy.ideal_client ? `\nIdeal Client: ${marketingStrategy.ideal_client}` : ''}

Return a JSON array with this structure:
[
  {
    "name": "Metric Name",
    "category": "Revenue|Patients|Clinical|Marketing|Operations",
    "unit": "$" or "#" or "%",
    "target": 10000 (weekly target, null if unknown),
    "direction": "up" or "down",
    "linkedGoalKey": "the goal_key this supports",
    "rationale": "Brief explanation of why this metric matters for the goal"
  }
]`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_metrics',
              description: 'Suggest metrics for the scorecard based on VTO goals',
              parameters: {
                type: 'object',
                properties: {
                  metrics: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        category: { type: 'string', enum: ['Revenue', 'Patients', 'Clinical', 'Marketing', 'Operations'] },
                        unit: { type: 'string' },
                        target: { type: 'number', nullable: true },
                        direction: { type: 'string', enum: ['up', 'down'] },
                        linkedGoalKey: { type: 'string' },
                        rationale: { type: 'string' }
                      },
                      required: ['name', 'category', 'unit', 'direction', 'linkedGoalKey', 'rationale']
                    }
                  }
                },
                required: ['metrics']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_metrics' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[AI_API_ERROR] Status:', aiResponse.status, 'Body:', errorText);
      
      if (aiResponse.status === 429) {
        return errorResponse(500, 'AI_OR_UNKNOWN_ERROR', 'Rate limit exceeded. Please try again in a moment.');
      }
      if (aiResponse.status === 402) {
        return errorResponse(500, 'AI_OR_UNKNOWN_ERROR', 'AI credits exhausted. Please add credits to continue.');
      }
      return errorResponse(500, 'AI_OR_UNKNOWN_ERROR', 'We ran into a problem generating scorecard suggestions. Please try again.');
    }

    const aiData = await aiResponse.json();
    console.log('[ai-generate-scorecard-from-vto] AI response received');

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('[AI_INVALID_FORMAT] No tool call in response:', JSON.stringify(aiData));
      return errorResponse(500, 'AI_OR_UNKNOWN_ERROR', 'We ran into a problem generating scorecard suggestions. Please try again.');
    }

    let suggestedMetrics: { metrics: SuggestedMetric[] };
    try {
      suggestedMetrics = JSON.parse(toolCall.function.arguments);
    } catch (parseErr) {
      console.error('[AI_PARSE_ERROR] Failed to parse AI response:', parseErr);
      return errorResponse(500, 'AI_OR_UNKNOWN_ERROR', 'We ran into a problem generating scorecard suggestions. Please try again.');
    }

    // If aligned mode, fetch existing metrics and return for mapping instead of creation
    if (isAlignedMode) {
      const { data: existingMetrics } = await supabase
        .from('metrics')
        .select('id, name, category, unit, target, direction, cadence')
        .eq('organization_id', organization_id)
        .order('name');

      console.log(`[ai-generate-scorecard-from-vto] Aligned mode - returning ${existingMetrics?.length || 0} existing metrics for mapping`);

      return successResponse({
        mode: 'aligned',
        message: 'This organization uses an aligned metric template. AI will suggest mappings to existing metrics only.',
        vtoVersionId: version.id,
        goals,
        existingMetrics: existingMetrics || [],
        suggestedMetrics: [], // No AI-generated metrics in aligned mode
      });
    }

    console.log(`[ai-generate-scorecard-from-vto] Success! AI suggested ${suggestedMetrics.metrics.length} metrics`);

    return successResponse({
      mode: 'flexible',
      vtoVersionId: version.id,
      goals,
      suggestedMetrics: suggestedMetrics.metrics,
    });

  } catch (error: any) {
    console.error('[AI_OR_UNKNOWN_ERROR] Unexpected error:', error);
    return errorResponse(
      500, 
      'AI_OR_UNKNOWN_ERROR', 
      'We ran into a problem generating scorecard suggestions. Please try again.'
    );
  }
});
