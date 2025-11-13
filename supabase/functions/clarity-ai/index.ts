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

    // Get authenticated user from Authorization header (explicit token)
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

    const systemPrompt = getSystemPrompt(intent);
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
    const suggestions = parseSuggestions(intent, suggestion, current_value);

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

function getSystemPrompt(intent: string): string {
  const basePrompt = 'You are an expert business coach specializing in healthcare and clinic operations. You help clinics clarify their vision and improve execution using proven frameworks. Always write in calm, professional, action-oriented language suitable for clinic leaders. Keep responses concise and practical.';

  switch (intent) {
    case 'draft':
      return `${basePrompt}\n\nProvide 3 distinct variations of the requested content. Each should be approximately 20-30 words, clear, and actionable. Format as a numbered list.`;
    
    case 'tighten':
      return `${basePrompt}\n\nRewrite the given text to be clearer and more concise. Use plain language at grade 7 readability. Remove jargon. Keep the core meaning but make it punchy and memorable.`;
    
    case 'measurable':
      return `${basePrompt}\n\nTransform vague goals into measurable objectives. Include: (1) specific metric, (2) target number, (3) timeframe, (4) who's responsible. Make it SMART.`;
    
    case 'gap_scan':
      return `${basePrompt}\n\nAnalyze the 1-year plan and identify 3 missing KPIs that would validate progress. Focus on leading indicators for clinics (patient outcomes, efficiency, team health, growth).`;
    
    case 'clinic_tone':
      return `${basePrompt}\n\nRewrite in professional clinic language. Focus on patient outcomes, clinical excellence, and team collaboration. Avoid corporate buzzwords. Be warm but professional.`;
    
    default:
      return basePrompt;
  }
}

function buildUserPrompt(intent: string, context: any, field?: string, current_value?: string): string {
  const vision = context?.vision || {};
  const traction = context?.traction || {};

  switch (intent) {
    case 'draft':
      if (field === 'ten_year_target') {
        return `Create 3 distinct 10-year targets for a clinic with:\n- Core Focus: ${vision.core_focus?.purpose || 'healing and wellness'}\n- Niche: ${vision.core_focus?.niche || 'integrated care'}\n\nEach target should be inspiring, specific, and achievable.`;
      }
      if (field === 'ideal_client') {
        return `Create 3 variations describing the ideal client for this clinic. Consider their pain points, demographics, and what makes them a perfect fit. Each should be 20-30 words.`;
      }
      return `Create 3 variations for "${field}". Context: ${JSON.stringify(vision).slice(0, 200)}`;
    
    case 'tighten':
      return `Rewrite this more concisely:\n\n"${current_value}"\n\nMake it clear, memorable, and action-oriented.`;
    
    case 'measurable':
      return `Make this goal measurable:\n\n"${current_value}"\n\nProvide: metric, target, timeframe, and owner. Format as bullet points.`;
    
    case 'gap_scan':
      return `Given this 1-year plan:\n${JSON.stringify(traction.one_year_plan, null, 2)}\n\nWhat are 3 critical KPIs we're missing? Focus on clinic-specific leading indicators.`;
    
    case 'clinic_tone':
      return `Rewrite in professional clinic language:\n\n"${current_value}"\n\nFocus on patient care, clinical excellence, and team collaboration.`;
    
    default:
      return `Help with: ${intent}. Context: ${current_value}`;
  }
}

function parseSuggestions(intent: string, aiResponse: string, current_value?: string): any[] {
  // Split by numbered list (1., 2., 3.) or bullet points
  const lines = aiResponse.split(/\n+/).filter(line => line.trim());
  
  if (intent === 'draft' || intent === 'gap_scan') {
    // Return multiple variations
    const suggestions = lines
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(text => text.length > 5);

    return suggestions.map(text => ({
      text,
      rationale: intent === 'draft' ? 'AI-generated variation' : 'Suggested KPI'
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
