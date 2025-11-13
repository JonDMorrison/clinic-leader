import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { validateTenantAccess } from '../_shared/tenant-context.ts';

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
    
    // Validate tenant access
    const tenantContext = await validateTenantAccess(req, team_id);
    console.log(`ai-query-docs: User ${tenantContext.userId} from team ${tenantContext.teamId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch documents for the validated team using organization_id
    // Only 'approved' status is valid (uploaded PDFs/DOCX and approved documents)
    const { data: docs, error: docsError } = await supabase
      .from('docs')
      .select('*')
      .eq('status', 'approved')
      .eq('organization_id', tenantContext.teamId);

    if (docsError) {
      console.error('Error fetching docs:', docsError);
      throw docsError;
    }

    const teamDocs = docs || [];

    console.log(`Found ${teamDocs.length} approved documents for team`);

    // Build context from documents with fallback extraction for missing parsed_text
    let docsContext = "Available Documents:\n\n";

    // Limit docs and pages to control cost/perf
    const MAX_DOCS = 12;
    const MAX_PAGES = 5;

    const docsToProcess = (teamDocs || []).slice(0, MAX_DOCS);
    for (const doc of docsToProcess) {
      try {
        docsContext += `Document: ${doc.title}\n`;
        docsContext += `Type: ${doc.kind}\n`;

        let content: string = doc.body || doc.parsed_text || '';

        // Fallback: extract text when content is missing but we have a file
        if (!content && doc.storage_path) {
          const isPdf = String(doc.storage_path).toLowerCase().endsWith('.pdf');
          const isDocx = String(doc.storage_path).toLowerCase().endsWith('.docx');

          // Download from documents bucket
          const { data: fileData, error: downloadErr } = await supabase
            .storage
            .from('documents')
            .download(doc.storage_path);

          if (!downloadErr && fileData) {
            if (isPdf) {
              const pdfjsLib = await import('https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs');
              // Disable worker in Deno Edge Function environment
              pdfjsLib.GlobalWorkerOptions.workerSrc = '';
              const ab = await fileData.arrayBuffer();
              const pdf = await pdfjsLib.getDocument({ 
                data: new Uint8Array(ab),
                useWorkerFetch: false,
                isEvalSupported: false
              }).promise;

              const limit = Math.min(pdf.numPages, MAX_PAGES);
              const pageTexts: string[] = [];
              for (let p = 1; p <= limit; p++) {
                const page = await pdf.getPage(p);
                const textContent = await page.getTextContent();
                const items = (textContent.items || []) as any[];
                const pageText = items.map((it: any) => (typeof it?.str === 'string' ? it.str : '')).join(' ');
                pageTexts.push(pageText);
              }
              content = pageTexts.join('\n\n');
            } else if (isDocx) {
              const ab = await fileData.arrayBuffer();
              const mammoth = await import('https://esm.sh/mammoth@1.8.0');
              const result = await mammoth.extractRawText({ arrayBuffer: ab });
              content = result.value || '';
            }

            // Normalize whitespace
            if (content) {
              content = content.replace(/\s+/g, ' ').trim();

              // Best-effort cache back to DB for future queries (cap to 100k chars)
              try {
                if (!doc.parsed_text && content.length > 0) {
                  await supabase.from('docs').update({ parsed_text: content.slice(0, 100000) }).eq('id', doc.id);
                }
              } catch (e) {
                console.warn('ai-query-docs: failed to cache parsed_text for', doc.id, e);
              }
            }
          }
        }

        if (content) {
          const contentPreview = content.length > 2000 ? content.substring(0, 2000) + '...' : content;
          docsContext += `Content: ${contentPreview}\n`;
        }
        if (doc.filename) {
          docsContext += `File: ${doc.filename}\n`;
        }
        docsContext += '\n---\n\n';
      } catch (e) {
        console.error('ai-query-docs: error building context for doc', doc?.id, e);
      }
    }

    if (docsToProcess.length === 0) {
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
        organization_id: tenantContext.teamId,
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