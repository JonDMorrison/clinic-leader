import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetricWithHistory {
  id: string;
  name: string;
  category: string;
  unit: string;
  target: number | null;
  direction: string;
  owner: string | null;
  owner_id: string | null;
  owner_name: string | null;
  values: { week_start: string; value: number | null }[];
  status: 'on_track' | 'at_risk' | 'off_track';
  trend: 'improving' | 'stable' | 'declining';
  current_value: number | null;
}

interface SuggestedRock {
  title: string;
  description: string;
  owner_id: string | null;
  owner_name: string | null;
  linked_metric_ids: string[];
  quarter: string;
  rationale: string;
  status: 'not_started';
  priority: 'high' | 'medium' | 'low';
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

// Get current quarter string
function getCurrentQuarter(): string {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${quarter} ${year}`;
}

// Calculate metric status based on target and direction
function calculateMetricStatus(
  currentValue: number | null, 
  target: number | null, 
  direction: string
): 'on_track' | 'at_risk' | 'off_track' {
  if (currentValue === null || target === null) return 'at_risk';
  
  const percentDiff = ((currentValue - target) / target) * 100;
  
  if (direction === 'up') {
    if (percentDiff >= 0) return 'on_track';
    if (percentDiff >= -15) return 'at_risk';
    return 'off_track';
  } else {
    // direction is 'down' - lower is better
    if (percentDiff <= 0) return 'on_track';
    if (percentDiff <= 15) return 'at_risk';
    return 'off_track';
  }
}

// Calculate trend from historical values
function calculateTrend(values: { value: number | null }[], direction: string): 'improving' | 'stable' | 'declining' {
  const validValues = values
    .filter(v => v.value !== null)
    .map(v => v.value as number);
  
  if (validValues.length < 3) return 'stable';
  
  // Compare last 4 weeks average to previous 4 weeks
  const recent = validValues.slice(0, 4);
  const previous = validValues.slice(4, 8);
  
  if (recent.length < 2 || previous.length < 2) return 'stable';
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
  
  const change = ((recentAvg - previousAvg) / Math.abs(previousAvg || 1)) * 100;
  
  if (direction === 'up') {
    if (change > 5) return 'improving';
    if (change < -5) return 'declining';
  } else {
    if (change < -5) return 'improving';
    if (change > 5) return 'declining';
  }
  
  return 'stable';
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

    console.log('[ai-generate-rocks-from-scorecard] Starting for org:', organization_id);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch metrics for this organization
    const { data: metrics, error: metricsError } = await supabase
      .from('metrics')
      .select('id, name, category, unit, target, direction, owner')
      .eq('organization_id', organization_id);

    if (metricsError) {
      console.error('[METRICS_QUERY_FAILED]', metricsError);
      return errorResponse(500, 'METRICS_QUERY_FAILED', 'Could not load scorecard metrics.');
    }

    if (!metrics || metrics.length === 0) {
      return errorResponse(400, 'NO_METRICS', 'No scorecard metrics found. Please set up your scorecard first.');
    }

    // Fetch users in this organization (for owner assignment and validation)
    const { data: orgUsers, error: usersError } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('team_id', organization_id);

    if (usersError) {
      console.error('[USERS_QUERY_FAILED]', usersError);
    }

    const userMap = new Map((orgUsers || []).map(u => [u.id, u.full_name]));
    const userList = orgUsers || [];

    // Fetch 12 weeks of metric values
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    const startDate = twelveWeeksAgo.toISOString().split('T')[0];

    const { data: metricResults, error: resultsError } = await supabase
      .from('metric_results')
      .select('metric_id, week_start, value')
      .in('metric_id', metrics.map(m => m.id))
      .gte('week_start', startDate)
      .order('week_start', { ascending: false });

    if (resultsError) {
      console.error('[RESULTS_QUERY_FAILED]', resultsError);
    }

    // Group results by metric
    const resultsByMetric = new Map<string, { week_start: string; value: number | null }[]>();
    (metricResults || []).forEach(r => {
      if (!resultsByMetric.has(r.metric_id)) {
        resultsByMetric.set(r.metric_id, []);
      }
      resultsByMetric.get(r.metric_id)!.push({ week_start: r.week_start, value: r.value });
    });

    // Fetch organization name and VTO values if available
    const { data: orgData } = await supabase
      .from('teams')
      .select('name')
      .eq('id', organization_id)
      .single();

    const { data: vtoData } = await supabase
      .from('vto')
      .select(`
        vto_versions(core_values, core_focus)
      `)
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const orgName = orgData?.name || 'Clinic';
    let coreValues: string[] = [];
    let coreFocus = '';
    
    if (vtoData?.vto_versions && Array.isArray(vtoData.vto_versions) && vtoData.vto_versions.length > 0) {
      const version = vtoData.vto_versions[0];
      coreValues = version.core_values || [];
      coreFocus = version.core_focus?.niche || '';
    }

    // Build enriched metrics with status and trend
    const enrichedMetrics: MetricWithHistory[] = metrics.map(m => {
      const values = resultsByMetric.get(m.id) || [];
      const currentValue = values.length > 0 ? values[0].value : null;
      const status = calculateMetricStatus(currentValue, m.target, m.direction);
      const trend = calculateTrend(values, m.direction);
      
      return {
        id: m.id,
        name: m.name,
        category: m.category,
        unit: m.unit,
        target: m.target,
        direction: m.direction,
        owner: m.owner,
        owner_id: null, // Owner is stored as name, not ID
        owner_name: m.owner,
        values: values.slice(0, 12),
        status,
        trend,
        current_value: currentValue,
      };
    });

    // Sort: off-track first, then at-risk, then by strategic importance
    enrichedMetrics.sort((a, b) => {
      const statusOrder = { off_track: 0, at_risk: 1, on_track: 2 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      
      // Then by declining trend
      if (a.trend === 'declining' && b.trend !== 'declining') return -1;
      if (b.trend === 'declining' && a.trend !== 'declining') return 1;
      
      // Then by strategic category
      const categoryOrder: Record<string, number> = { Revenue: 0, Patients: 1, Clinical: 2, Marketing: 3, Operations: 4 };
      return (categoryOrder[a.category] ?? 5) - (categoryOrder[b.category] ?? 5);
    });

    console.log(`[ai-generate-rocks-from-scorecard] Enriched ${enrichedMetrics.length} metrics, calling AI...`);

    // Build AI prompt
    const systemPrompt = `You are an EOS (Entrepreneurial Operating System) expert specializing in healthcare clinic operations.
Your task is to analyze scorecard metrics and suggest Quarterly Rocks (90-day priorities) that will help the clinic improve performance.

CRITICAL MULTI-TENANCY RULE: You must ONLY suggest owners from the provided user list. Never reference data from other organizations.

EOS Rock Guidelines:
- Rocks are 90-day priorities, NOT multi-quarter projects
- Each Rock should be SMART: Specific, Measurable, Achievable, Relevant, Time-bound
- Suggest 3-7 Rocks based on clinic size and needs
- Focus on actionable improvements, not vague goals
- Every Rock MUST have a single owner
- Link Rocks to the metrics they will impact

Rock Categories by Metric Status:
1. OFF-TRACK metrics → Create URGENT improvement Rocks
2. AT-RISK metrics → Create STABILIZATION Rocks  
3. DECLINING TREND metrics → Create PREVENTION Rocks
4. Metrics without owners → Create ACCOUNTABILITY Rocks
5. Missing common metrics → Create OPERATIONAL MATURITY Rocks

Healthcare Clinic Common Rocks:
- Patient experience improvements
- Revenue cycle optimization
- Staff training and development
- Marketing and referral growth
- Operational efficiency
- Clinical quality metrics
- Technology implementation
- Process documentation

Return ONLY valid JSON. Never include PHI or patient-specific information.`;

    const userPrompt = `Analyze this clinic's scorecard and suggest 3-7 Quarterly Rocks for ${getCurrentQuarter()}:

Organization: ${orgName}
${coreFocus ? `Core Focus: ${coreFocus}` : ''}
${coreValues.length > 0 ? `Core Values: ${coreValues.join(', ')}` : ''}

AVAILABLE TEAM MEMBERS (you must only assign Rocks to these users):
${userList.map(u => `- ${u.full_name} (ID: ${u.id})`).join('\n')}

SCORECARD METRICS:
${enrichedMetrics.map(m => `
- ${m.name} (${m.category})
  Status: ${m.status.toUpperCase()}
  Trend: ${m.trend}
  Current: ${m.current_value ?? 'No data'} | Target: ${m.target ?? 'Not set'}
  Direction: ${m.direction === 'up' ? 'Higher is better' : 'Lower is better'}
  Owner: ${m.owner_name || 'Unassigned'}
  Metric ID: ${m.id}
`).join('')}

Return a JSON array with this structure:
{
  "rocks": [
    {
      "title": "Clear, action-oriented Rock title (max 60 chars)",
      "description": "Specific actions and expected outcome",
      "owner_id": "User ID from the list above, or null if unassigned",
      "owner_name": "User name for display",
      "linked_metric_ids": ["metric_id_1", "metric_id_2"],
      "quarter": "${getCurrentQuarter()}",
      "rationale": "Why this Rock matters based on the metric analysis",
      "status": "not_started",
      "priority": "high|medium|low"
    }
  ]
}`;

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
              name: 'suggest_rocks',
              description: 'Suggest quarterly rocks based on scorecard analysis',
              parameters: {
                type: 'object',
                properties: {
                  rocks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string' },
                        description: { type: 'string' },
                        owner_id: { type: 'string', nullable: true },
                        owner_name: { type: 'string', nullable: true },
                        linked_metric_ids: { type: 'array', items: { type: 'string' } },
                        quarter: { type: 'string' },
                        rationale: { type: 'string' },
                        status: { type: 'string', enum: ['not_started'] },
                        priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                      },
                      required: ['title', 'description', 'quarter', 'rationale', 'status', 'priority']
                    }
                  }
                },
                required: ['rocks']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_rocks' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[AI_API_ERROR] Status:', aiResponse.status, 'Body:', errorText);
      
      if (aiResponse.status === 429) {
        return errorResponse(500, 'AI_RATE_LIMITED', 'Rate limit exceeded. Please try again in a moment.');
      }
      if (aiResponse.status === 402) {
        return errorResponse(500, 'AI_CREDITS_EXHAUSTED', 'AI credits exhausted. Please add credits to continue.');
      }
      return errorResponse(500, 'AI_OR_UNKNOWN_ERROR', 'Could not generate rock suggestions. Please try again.');
    }

    const aiData = await aiResponse.json();
    console.log('[ai-generate-rocks-from-scorecard] AI response received');

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('[AI_INVALID_FORMAT] No tool call in response:', JSON.stringify(aiData));
      return errorResponse(500, 'AI_OR_UNKNOWN_ERROR', 'Could not generate rock suggestions. Please try again.');
    }

    let suggestedRocks: { rocks: SuggestedRock[] };
    try {
      suggestedRocks = JSON.parse(toolCall.function.arguments);
    } catch (parseErr) {
      console.error('[AI_PARSE_ERROR] Failed to parse AI response:', parseErr);
      return errorResponse(500, 'AI_OR_UNKNOWN_ERROR', 'Could not generate rock suggestions. Please try again.');
    }

    // Validate and clean owner_ids - ensure they belong to this org
    const validUserIds = new Set(userList.map(u => u.id));
    const cleanedRocks = suggestedRocks.rocks.map(rock => {
      // Validate owner_id is from this organization
      if (rock.owner_id && !validUserIds.has(rock.owner_id)) {
        console.warn(`[OWNER_VALIDATION] Invalid owner_id ${rock.owner_id}, setting to null`);
        rock.owner_id = null;
        rock.owner_name = null;
      }
      
      // Validate linked_metric_ids are from this organization's metrics
      const validMetricIds = new Set(metrics.map(m => m.id));
      rock.linked_metric_ids = (rock.linked_metric_ids || []).filter(id => validMetricIds.has(id));
      
      return rock;
    });

    console.log(`[ai-generate-rocks-from-scorecard] Success! AI suggested ${cleanedRocks.length} rocks`);

    return successResponse({
      quarter: getCurrentQuarter(),
      metrics: enrichedMetrics,
      suggestedRocks: cleanedRocks,
      users: userList,
    });

  } catch (error: any) {
    console.error('[AI_OR_UNKNOWN_ERROR] Unexpected error:', error);
    return errorResponse(
      500, 
      'AI_OR_UNKNOWN_ERROR', 
      'Could not generate rock suggestions. Please try again.'
    );
  }
});
