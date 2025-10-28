import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, team_id } = await req.json();
    console.log('Received question:', question, 'for team:', team_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all documents for the team
    // Note: docs table has owner_id, not team_id directly
    // We need to join with users to filter by team
    const { data: docs, error: docsError } = await supabase
      .from('docs')
      .select(`
        *,
        owner:owner_id(team_id)
      `)
      .eq('status', 'published');

    if (docsError) {
      console.error('Error fetching docs:', docsError);
      throw docsError;
    }

    // Filter docs by team_id from the joined owner data
    const teamDocs = docs?.filter((doc: any) => doc.owner?.team_id === team_id) || [];

    console.log(`Found ${teamDocs.length} documents for team`);

    // Build context from documents
    let docsContext = "Available Documents:\n\n";
    if (teamDocs.length > 0) {
      teamDocs.forEach((doc: any) => {
        docsContext += `Document: ${doc.title}\n`;
        docsContext += `Type: ${doc.kind}\n`;
        if (doc.body) {
          docsContext += `Content: ${doc.body.substring(0, 500)}...\n`;
        }
        docsContext += '\n---\n\n';
      });
    } else {
      docsContext += "No documents found.\n";
    }

    // Prepare AI prompt
    const systemPrompt = `You are a helpful assistant that answers questions about clinic documents, SOPs, manuals, and training materials.
    
You have access to the organization's document library. Use this information to provide accurate, helpful answers.

When answering:
- Reference specific documents when possible
- Be concise but thorough
- If you don't find relevant information, say so
- Suggest which documents the user should check for more details

Context about the documents:
${docsContext}`;

    console.log('Calling Lovable AI...');

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices[0].message.content;

    console.log('AI response generated successfully');

    // Log the interaction
    const { error: logError } = await supabase
      .from('ai_logs')
      .insert({
        type: 'docs_query',
        payload: {
          question,
          answer,
          team_id,
          doc_count: teamDocs.length
        }
      });

    if (logError) {
      console.error('Error logging AI interaction:', logError);
    }

    return new Response(
      JSON.stringify({ answer }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in ai-query-docs function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An error occurred processing your request' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});