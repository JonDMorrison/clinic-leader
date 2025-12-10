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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organization_id } = await req.json();
    
    if (!organization_id) {
      throw new Error('organization_id is required');
    }

    console.log('Generating scorecard from VTO for org:', organization_id);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch active VTO with latest version
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
      .single();

    if (vtoError) {
      console.error('VTO query error:', vtoError);
      throw new Error('No active V/TO found. Please create your V/TO first.');
    }
    
    if (!vto || !vto.vto_versions || vto.vto_versions.length === 0) {
      throw new Error('No V/TO version found. Please create your V/TO first.');
    }

    // Sort versions to get the latest
    const versions = (vto.vto_versions as any[]).sort((a, b) => (b.version || 0) - (a.version || 0));
    const version = versions[0];
    const threeYearPicture = version.three_year_picture || {};
    const oneYearPlan = version.one_year_plan || {};
    const quarterlyRocks = version.quarterly_rocks || [];
    const coreFocus = version.core_focus || {};
    const marketingStrategy = version.marketing_strategy || {};

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
      throw new Error('No goals found in V/TO. Please add goals to your Vision/Traction sections first.');
    }

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
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to continue.');
      }
      throw new Error('AI service temporarily unavailable');
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData));

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('Invalid AI response format');
    }

    const suggestedMetrics: { metrics: SuggestedMetric[] } = JSON.parse(toolCall.function.arguments);

    console.log(`AI suggested ${suggestedMetrics.metrics.length} metrics`);

    return new Response(
      JSON.stringify({
        success: true,
        vtoVersionId: version.id,
        goals,
        suggestedMetrics: suggestedMetrics.metrics,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating scorecard from VTO:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
