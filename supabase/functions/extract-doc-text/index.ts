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
      console.log('[extract-doc-text] Extracting PDF text with basic extraction');
      
      try {
        // Simple text extraction - look for text between BT and ET operators
        const arrayBuffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const text = new TextDecoder('latin1').decode(bytes);
        
        // Extract text content between BT (Begin Text) and ET (End Text) operators
        const textBlocks: string[] = [];
        const btPattern = /BT\s+(.*?)\s+ET/gs;
        let match;
        
        while ((match = btPattern.exec(text)) !== null) {
          const block = match[1];
          // Extract strings between parentheses or angle brackets
          const stringPattern = /\(((?:[^()\\]|\\.)*)\)|<([0-9A-Fa-f]+)>/g;
          let strMatch;
          
          while ((strMatch = stringPattern.exec(block)) !== null) {
            if (strMatch[1]) {
              // Parentheses string - decode escape sequences
              let str = strMatch[1]
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r')
                .replace(/\\t/g, '\t')
                .replace(/\\b/g, '\b')
                .replace(/\\f/g, '\f')
                .replace(/\\(.)/g, '$1');
              textBlocks.push(str);
            } else if (strMatch[2]) {
              // Hex string - convert to text
              const hexStr = strMatch[2];
              let decoded = '';
              for (let i = 0; i < hexStr.length; i += 2) {
                const code = parseInt(hexStr.substr(i, 2), 16);
                if (code >= 32 && code <= 126) {
                  decoded += String.fromCharCode(code);
                }
              }
              if (decoded) textBlocks.push(decoded);
            }
          }
        }
        
        extractedText = textBlocks.join(' ');
        console.log(`[extract-doc-text] Extracted ${extractedText.length} characters from PDF`);
      } catch (parseError) {
        console.error('[extract-doc-text] PDF extraction failed:', parseError);
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
