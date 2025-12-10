import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

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
      console.error('clarity-ai auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { intent, context, field, current_value } = await req.json();
    console.log('AI Coach request:', { intent, field });

    const systemPrompt = getSystemPrompt(intent, context);
    const userPrompt = buildUserPrompt(intent, context, field, current_value);

    // Call Lovable AI
    const aiResponse = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'AI rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const suggestion = aiData.choices[0].message.content;

    // Parse suggestions based on intent
    const suggestions = parseSuggestions(intent, suggestion, current_value, field);

    console.log('AI Coach generated', suggestions.length, 'suggestions');

    return new Response(
      JSON.stringify({
        success: true,
        suggestions,
        confidence: 0.85
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in clarity-ai:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function getSystemPrompt(intent: string, context?: any): string {
  // Build rich context from VTO data
  const vtoContext = buildVtoContext(context);
  
  const basePrompt = `You are an expert EOS (Entrepreneurial Operating System) business coach specializing in healthcare clinics. You help clinic leadership teams clarify their vision, strengthen traction, and execute with precision.

${vtoContext}

Always write in calm, professional, action-oriented language suitable for clinic leaders. Keep responses concise and practical. Focus on patient outcomes, clinical excellence, and team collaboration.`;

  switch (intent) {
    case 'draft':
      return `${basePrompt}\n\nProvide 3 distinct variations of the requested content. Each should be clear, actionable, and aligned with the clinic's core values. Format as a numbered list.`;
    
    case 'tighten':
      return `${basePrompt}\n\nRewrite the given text to be clearer and more concise. Use plain language at grade 7 readability. Remove jargon. Keep the core meaning but make it punchy and memorable.`;
    
    case 'measurable':
      return `${basePrompt}\n\nTransform vague goals into measurable objectives. Include: (1) specific metric, (2) target number, (3) timeframe, (4) who's responsible. Make it SMART.`;
    
    case 'suggest_rocks':
      return `${basePrompt}\n\nYou are helping break down annual goals into quarterly rocks. Create 2-3 specific, achievable quarterly priorities (rocks) that directly support the 1-year goal. Each rock should be concrete, measurable, and completable in a single quarter.`;
    
    case 'gap_scan':
      return `${basePrompt}\n\nAnalyze the 1-year plan and identify 3 missing KPIs that would validate progress. Focus on leading indicators for clinics (patient outcomes, efficiency, team health, growth).`;
    
    case 'clinic_tone':
    case 'refine_healthcare':
      return `${basePrompt}\n\nRewrite in professional healthcare clinic language. Focus on patient outcomes, clinical excellence, and team collaboration. Avoid corporate buzzwords. Be warm but professional. Ensure compliance-friendly language.`;
    
    case 'generate_template':
      return `${basePrompt}\n\nGenerate structured template content for the requested VTO section. Follow EOS best practices. For proven processes, create 5-7 clear steps. For values, suggest 3-5 actionable core values. For goals, ensure they're SMART.`;
    
    case 'rewrite_with_values':
      return `${basePrompt}\n\nRewrite the content to strongly reflect and embody the clinic's core values. Each sentence should demonstrate alignment with at least one core value without being preachy.`;
    
    case 'suggest_kpis':
      return `${basePrompt}\n\nSuggest 3-5 measurable KPIs for healthcare clinic operations. Focus on: patient volume, revenue cycle, clinical outcomes, team productivity, and patient satisfaction. Each KPI should have a clear target range.`;
    
    case 'suggest_hiring':
      return `${basePrompt}\n\nBased on the expansion plans and 1-year goals, suggest hiring priorities with role titles, key responsibilities, and timing. Focus on roles that directly support clinic growth.`;
    
    case 'suggest_sop':
      return `${basePrompt}\n\nDraft a standard operating procedure outline for the specified clinic process. Include: purpose, scope, responsible parties, step-by-step instructions, and quality checks.`;
    
    case 'resolve_issue':
      return `${basePrompt}\n\nHelp resolve the described business issue using EOS IDS (Identify, Discuss, Solve) methodology. Provide: root cause analysis, 2-3 solution options, recommended next steps, and who should own the resolution.`;
    
    default:
      return basePrompt;
  }
}

function buildVtoContext(context?: any): string {
  if (!context) return '';
  
  const parts: string[] = [];
  
  // Core values
  if (context.core_values?.length) {
    const values = Array.isArray(context.core_values) 
      ? (typeof context.core_values[0] === 'string' 
          ? context.core_values 
          : context.core_values.map((v: any) => v.label))
      : [];
    if (values.length) {
      parts.push(`CORE VALUES: ${values.join(', ')}`);
    }
  }
  
  // Core focus
  if (context.core_focus) {
    parts.push(`PURPOSE: ${context.core_focus.purpose || 'Not defined'}`);
    parts.push(`NICHE: ${context.core_focus.niche || 'Not defined'}`);
  }
  
  // 10-year target
  if (context.ten_year_target) {
    parts.push(`10-YEAR TARGET: ${context.ten_year_target}`);
  }
  
  // Long range targets
  if (context.long_range_targets?.length) {
    context.long_range_targets.forEach((t: any) => {
      parts.push(`${t.horizon.toUpperCase()} TARGET: ${t.target_description || ''} Revenue: $${t.revenue_target || 'TBD'}`);
    });
  }
  
  // 3-year expansion items
  if (context.three_year_picture?.expansion_items?.length) {
    parts.push(`EXPANSION PLANS: ${context.three_year_picture.expansion_items.map((e: any) => e.title).join(', ')}`);
  }
  
  // Current rocks
  if (context.quarterly_rocks?.length) {
    parts.push(`CURRENT ROCKS: ${context.quarterly_rocks.map((r: any) => r.title).slice(0, 5).join(', ')}`);
  }
  
  // Active issues
  if (context.issues?.length) {
    parts.push(`ACTIVE ISSUES: ${context.issues.map((i: any) => i.title).slice(0, 3).join(', ')}`);
  }
  
  // Strategic KPIs
  if (context.strategic_kpis?.length) {
    parts.push(`STRATEGIC KPIS: ${context.strategic_kpis.map((k: any) => k.label_snapshot).join(', ')}`);
  }
  
  if (parts.length === 0) return '';
  
  return `CLINIC CONTEXT:\n${parts.join('\n')}\n`;
}

function buildUserPrompt(intent: string, context: any, field?: string, current_value?: string): string {
  const vision = context?.vision || context || {};
  const traction = context?.traction || {};

  switch (intent) {
    case 'draft':
      if (field === 'core_focus') {
        return `Generate a core focus for a healthcare clinic. Return exactly 2 lines:
Line 1: A one-sentence purpose statement (why the clinic exists)
Line 2: A one-sentence niche statement (what the clinic specializes in)

Do not include labels like "Purpose:" or "Niche:" - just the two sentences, one per line.`;
      }
      if (field === 'core_values') {
        return `Generate 3-5 core values for a healthcare clinic. Return ONLY the values as a comma-separated list. Each value should be 1-2 words maximum (e.g., "Integrity, Excellence, Compassion, Innovation, Care"). Do not include numbers, explanations, or descriptions - just the values separated by commas.`;
      }
      if (field === 'ten_year_target') {
        return `Create 3 distinct 10-year targets for a clinic with:\n- Core Focus: ${vision.core_focus?.purpose || 'healing and wellness'}\n- Niche: ${vision.core_focus?.niche || 'integrated care'}\n\nEach target should be inspiring, specific, and achievable.`;
      }
      if (field === 'ideal_client') {
        return `Create 3 variations describing the ideal client for this clinic. Consider their pain points, demographics, and what makes them a perfect fit. Each should be 20-30 words.`;
      }
      if (field === 'proven_process') {
        return `Create a 5-7 step proven process for a healthcare clinic patient journey. Each step should be 2-4 words. Return as a numbered list.`;
      }
      if (field === 'promise' || field === 'guarantee') {
        return `Create 3 variations of a patient promise/guarantee for this clinic. Each should be compelling, specific, and demonstrate commitment to patient outcomes. 15-25 words each.`;
      }
      if (field === 'taglines') {
        return `Generate 3 taglines for this healthcare clinic. Each should be memorable, 4-8 words, and capture the clinic's essence. Return one per line.`;
      }
      return `Create 3 variations for "${field}". Context: ${JSON.stringify(vision).slice(0, 200)}`;
    
    case 'tighten':
      return `Rewrite this more concisely:\n\n"${current_value}"\n\nMake it clear, memorable, and action-oriented.`;
    
    case 'measurable':
      return `Make this goal measurable:\n\n"${current_value}"\n\nProvide: metric, target, timeframe, and owner. Format as bullet points.`;
    
    case 'suggest_rocks':
      const goal = context.goal || '';
      const quarter = context.quarter || 'this quarter';
      const allGoals = context.oneYearGoals || [];
      
      return `I need to create quarterly rocks for ${quarter} to support this 1-year goal:

"${goal}"

Context - All 1-Year Goals:
${allGoals.map((g: string, i: number) => `${i + 1}. ${g}`).join('\n')}

Create 2-3 specific quarterly rocks (90-day priorities) that directly advance this goal. Each rock should be:
- Concrete and actionable (starts with a verb)
- Achievable in a single quarter
- Measurable (has clear completion criteria)
- Focused on a single outcome

Return ONLY the rock titles as a simple list, one per line. Be concise - each title should be under 60 characters.`;
    
    case 'gap_scan':
      return `Given this 1-year plan:\n${JSON.stringify(traction.one_year_plan, null, 2)}\n\nWhat are 3 critical KPIs we're missing? Focus on clinic-specific leading indicators.`;
    
    case 'clinic_tone':
    case 'refine_healthcare':
      return `Rewrite in professional healthcare clinic language:\n\n"${current_value}"\n\nFocus on patient care, clinical excellence, and team collaboration.`;
    
    case 'generate_template':
      if (field === 'proven_process') {
        return `Generate a proven process template for a healthcare clinic. Create 5-7 steps that represent the typical patient journey from first contact to ongoing care. Return as a numbered list with brief descriptions.`;
      }
      if (field === 'expansion_items') {
        return `Suggest 3 expansion initiatives for a growing healthcare clinic. Include mix of: new locations, service lines, partnerships, or staffing. Format each with title and brief description.`;
      }
      return `Generate template content for "${field}" in a healthcare clinic VTO.`;
    
    case 'rewrite_with_values':
      const values = context.core_values?.join(', ') || 'excellence, integrity, compassion';
      return `Rewrite this content to strongly reflect these core values: ${values}\n\nOriginal:\n"${current_value}"`;
    
    case 'suggest_kpis':
      return `Suggest 5 measurable KPIs for a healthcare clinic based on this VTO context:\n${JSON.stringify(context).slice(0, 500)}\n\nFor each KPI provide: name, target value, and frequency of measurement.`;
    
    case 'suggest_hiring':
      return `Based on this expansion plan and goals:\n${JSON.stringify(context).slice(0, 500)}\n\nSuggest 3 priority hires with role titles, key responsibilities, and recommended timing.`;
    
    case 'resolve_issue':
      return `Help resolve this business issue using EOS IDS methodology:\n\nIssue: "${current_value}"\n\nProvide:\n1. Root cause analysis\n2. 2-3 solution options\n3. Recommended action\n4. Who should own it`;
    
    default:
      return `Help with: ${intent}. Context: ${current_value}`;
  }
}

function parseSuggestions(intent: string, aiResponse: string, current_value?: string, field?: string): any[] {
  // Special handling for comma-separated core values
  if (intent === 'draft' && field === 'core_values') {
    const cleanedResponse = aiResponse
      .replace(/^\d+\.\s*/gm, '')
      .replace(/^[-*]\s*/gm, '')
      .trim();
    return [cleanedResponse];
  }

  // For taglines, split by newlines
  if (intent === 'draft' && field === 'taglines') {
    const lines = aiResponse.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(l => l.replace(/^[\d•\-*]+[.)]\s*/, '').trim())
      .filter(l => l.length > 3 && l.length < 100);
    return lines.slice(0, 3).map(text => ({ text }));
  }

  // For suggest_rocks, parse as simple list
  if (intent === 'suggest_rocks') {
    const lines = aiResponse.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(l => l.replace(/^[\d•\-*]+[.)]\s*/, '').trim())
      .filter(l => l.length > 5 && l.length < 200);
    
    return lines.slice(0, 3);
  }

  // For proven process template
  if (intent === 'generate_template' && field === 'proven_process') {
    const lines = aiResponse.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(l => l.replace(/^[\d•\-*]+[.)]\s*/, '').trim())
      .filter(l => l.length > 3);
    
    return lines.slice(0, 7).map((title, i) => ({
      id: crypto.randomUUID(),
      title: title.split(':')[0].trim(),
      description: title.includes(':') ? title.split(':').slice(1).join(':').trim() : '',
      order: i,
    }));
  }

  // Split by numbered list (1., 2., 3.) or bullet points
  const lines = aiResponse.split(/\n+/).filter(line => line.trim());
  
  if (intent === 'draft' || intent === 'gap_scan' || intent === 'suggest_kpis') {
    // Return multiple variations
    const suggestions = lines
      .filter(line => /^\d+\./.test(line.trim()) || line.trim().length > 10)
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(text => text.length > 5);

    return suggestions.map(text => ({
      text,
      rationale: intent === 'draft' ? 'AI-generated variation' : 'AI suggestion'
    }));
  }

  // For tighten, measurable, clinic_tone - return single suggestion with diff
  const text = lines.join(' ').trim();
  
  return [{
    text,
    diff: current_value ? generateDiff(current_value, text) : undefined,
    rationale: 'AI-improved version'
  }];
}

function generateDiff(oldText: string, newText: string): { added: string[]; removed: string[] } {
  const oldWords = oldText.split(/\s+/);
  const newWords = newText.split(/\s+/);
  
  const added = newWords.filter(word => !oldWords.includes(word));
  const removed = oldWords.filter(word => !newWords.includes(word));
  
  return { added, removed };
}
