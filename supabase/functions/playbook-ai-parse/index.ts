import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CATEGORIES = ['HR', 'Front Desk', 'Clinical', 'Billing', 'Compliance', 'Safety', 'Equipment', 'Other'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, filename } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Truncate text to first 4000 characters to avoid token limits
    const truncatedText = text.slice(0, 4000);

    console.log('Parsing playbook with AI, text length:', truncatedText.length);

    const systemPrompt = `You are an AI assistant that analyzes playbook/SOP documents and extracts metadata.
Given a document text, extract:
1. A concise title (under 60 chars)
2. A 200-character summary
3. A category from: ${CATEGORIES.join(', ')}
4. If the document contains step-by-step instructions, extract them as a JSON array of steps with order and text

Respond ONLY with valid JSON in this exact format:
{
  "title": "string",
  "summary": "string (max 200 chars)",
  "category": "one of the predefined categories",
  "steps": [{"order": 1, "text": "step description", "note": "optional note"}] or []
}`;

    const userPrompt = `Filename: ${filename || 'unknown'}\n\nDocument text:\n${truncatedText}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response:', content);

    // Parse the JSON response
    let parsed;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      parsed = JSON.parse(jsonString);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      // Return fallback
      return new Response(
        JSON.stringify({
          title: filename?.replace(/\.pdf$/i, '') || 'Untitled Playbook',
          summary: text.slice(0, 200).trim() + '...',
          category: 'Other',
          steps: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and clean the response
    const result = {
      title: (parsed.title || filename?.replace(/\.pdf$/i, '') || 'Untitled Playbook').slice(0, 100),
      summary: (parsed.summary || '').slice(0, 200),
      category: CATEGORIES.includes(parsed.category) ? parsed.category : 'Other',
      steps: Array.isArray(parsed.steps) ? parsed.steps : []
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in playbook-ai-parse:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to parse playbook' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
