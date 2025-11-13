import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { doc_id, storage_path } = await req.json();
    
    if (!doc_id || !storage_path) {
      return new Response(
        JSON.stringify({ error: 'doc_id and storage_path are required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[extract-doc-text] Processing doc_id: ${doc_id}, path: ${storage_path}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(storage_path);

    if (downloadError) {
      console.error('[extract-doc-text] Download error:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download file', details: downloadError.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isPdf = storage_path.toLowerCase().endsWith('.pdf');
    const isDocx = storage_path.toLowerCase().endsWith('.docx');
    
    let extractedText = '';

    if (isPdf) {
      console.log('[extract-doc-text] Extracting PDF text with Lovable AI');
      
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!lovableApiKey) {
        throw new Error('LOVABLE_API_KEY is not configured');
      }

      // Convert PDF to base64 for AI processing
      const arrayBuffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode(...bytes));
      
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Extract all text content from this PDF document. Return only the extracted text, no explanations or formatting.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:application/pdf;base64,${base64}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 4000,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('[extract-doc-text] AI API error:', aiResponse.status, errorText);
          extractedText = '';
        } else {
          const aiData = await aiResponse.json();
          extractedText = aiData.choices[0]?.message?.content || '';
          console.log(`[extract-doc-text] AI extracted ${extractedText.length} characters`);
        }
      } catch (parseError) {
        console.error('[extract-doc-text] AI extraction failed:', parseError);
        extractedText = '';
      }
      
      // Clean up whitespace
      extractedText = extractedText
        .replace(/\s+/g, ' ')
        .trim();

    } else if (isDocx) {
      console.log('[extract-doc-text] Extracting DOCX text');
      // Extract DOCX using mammoth
      const arrayBuffer = await fileData.arrayBuffer();
      const mammoth = await import('https://esm.sh/mammoth@1.8.0');
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedText = result.value;
    } else {
      console.log('[extract-doc-text] Unsupported file type');
      return new Response(
        JSON.stringify({ error: 'Unsupported file type. Only PDF and DOCX are supported.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[extract-doc-text] Extracted ${extractedText.length} characters`);

    // Update the docs table with parsed_text
    if (extractedText && extractedText.length > 0) {
      const { error: updateError } = await supabase
        .from('docs')
        .update({ parsed_text: extractedText })
        .eq('id', doc_id);

      if (updateError) {
        console.error('[extract-doc-text] Update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update document', details: updateError.message }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[extract-doc-text] Successfully updated doc ${doc_id} with ${extractedText.length} chars`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        doc_id,
        text_length: extractedText.length,
        message: extractedText.length > 0 ? 'Text extracted successfully' : 'No text extracted'
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[extract-doc-text] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
