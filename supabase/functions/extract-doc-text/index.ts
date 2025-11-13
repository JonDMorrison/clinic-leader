import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SHA-256 hash helper
async function sha256(ab: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", ab);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

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
      await supabase.from('docs').update({
        extract_status: 'error',
        extract_error: `Download failed: ${downloadError.message}`
      }).eq('id', doc_id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to download file', details: downloadError.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compute content hash
    const ab = await fileData.arrayBuffer();
    const newHash = await sha256(ab);

    // Fetch current doc row to check if unchanged
    const { data: docRow } = await supabase
      .from('docs')
      .select('*')
      .eq('id', doc_id)
      .maybeSingle();

    // Short circuit if hash matches and parsed_text exists (no changes)
    if (docRow?.content_hash && docRow.content_hash === newHash && docRow?.parsed_text) {
      console.log('[extract-doc-text] Hash unchanged, skipping re-extraction');
      await supabase.from('docs').update({
        extract_status: 'ready',
        extract_error: null,
        extracted_at: new Date().toISOString()
      }).eq('id', doc_id);
      
      return new Response(
        JSON.stringify({ status: 'noop', reason: 'hash-unchanged', word_count: docRow.word_count }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set extracting status
    await supabase.from('docs').update({ 
      extract_status: 'extracting', 
      extract_error: null 
    }).eq('id', doc_id);

    const isPdf = storage_path.toLowerCase().endsWith('.pdf');
    const isDocx = storage_path.toLowerCase().endsWith('.docx');
    
    let extractedText = '';
    let source = '';
    let wordCount = 0;

    if (isPdf) {
      console.log('[extract-doc-text] Extracting PDF text using basic parser');
      source = 'basic-pdf-parse';

      try {
        const u8 = new Uint8Array(ab);
        const pdfString = new TextDecoder().decode(u8);
        let text = '';

        // Extract text between BT (begin text) and ET (end text) markers
        const textBlocks = pdfString.match(/BT(.*?)ET/gs);
        if (textBlocks) {
          for (const block of textBlocks) {
            // Extract text in parentheses or brackets
            const matches = block.match(/\((.*?)\)/g) || block.match(/\[(.*?)\]/g);
            if (matches) {
              for (const match of matches) {
                const cleanText = match.replace(/[()[\]]/g, '').trim();
                if (cleanText && cleanText.length > 0) {
                  text += cleanText + ' ';
                }
              }
            }
          }
        }

        // Fallback: try to extract any readable text
        if (!text || text.length < 50) {
          const readable = pdfString.match(/[a-zA-Z0-9\s.,!?-]{10,}/g);
          if (readable) {
            text = readable.join(' ');
          }
        }

        // Clean up the extracted text
        extractedText = text
          .replace(/\s+/g, ' ')
          .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters
          .trim();
        
        wordCount = extractedText ? extractedText.split(/\s+/).length : 0;
        console.log(`[extract-doc-text] Extracted ${extractedText.length} chars, ${wordCount} words`);
        
      } catch (parseError) {
        console.error('[extract-doc-text] PDF extraction failed:', parseError);
        const errorMsg = parseError instanceof Error ? parseError.message : 'Unknown error';
        
        await supabase.from('docs').update({
          extract_status: 'error',
          extract_error: `PDF extraction failed: ${errorMsg}`,
          content_hash: newHash
        }).eq('id', doc_id);
        
        return new Response(
          JSON.stringify({ error: 'PDF extraction failed', details: errorMsg }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Scan detection: if very low text yield, mark as needs_ocr
      if (!extractedText || wordCount < 50) {
        console.log(`[extract-doc-text] Low text yield (${wordCount} words), marking as needs_ocr`);
        await supabase.from('docs').update({
          extract_status: 'needs_ocr',
          extract_source: source,
          extract_error: null,
          extracted_at: new Date().toISOString(),
          content_hash: newHash,
          word_count: wordCount
        }).eq('id', doc_id);
        
        return new Response(
          JSON.stringify({ status: 'needs_ocr', wordCount, message: 'Document appears to be scanned - OCR required' }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

    } else if (isDocx) {
      console.log('[extract-doc-text] Extracting DOCX text');
      source = 'mammoth';
      
      try {
        const mammoth = await import('https://esm.sh/mammoth@1.8.0');
        const result = await mammoth.extractRawText({ arrayBuffer: ab });
        extractedText = (result.value || '').replace(/\s+/g, ' ').trim();
        wordCount = extractedText ? extractedText.split(/\s+/).length : 0;
        
        console.log(`[extract-doc-text] Extracted ${extractedText.length} chars, ${wordCount} words from DOCX`);
      } catch (parseError) {
        console.error('[extract-doc-text] DOCX extraction failed:', parseError);
        const errorMsg = parseError instanceof Error ? parseError.message : 'Unknown error';
        await supabase.from('docs').update({
          extract_status: 'error',
          extract_error: `DOCX extraction failed: ${errorMsg}`,
          content_hash: newHash
        }).eq('id', doc_id);
        
        return new Response(
          JSON.stringify({ error: 'DOCX extraction failed', details: errorMsg }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log('[extract-doc-text] Unsupported file type');
      await supabase.from('docs').update({
        extract_status: 'error',
        extract_error: 'Unsupported file type'
      }).eq('id', doc_id);
      
      return new Response(
        JSON.stringify({ error: 'Unsupported file type. Only PDF and DOCX are supported.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save successful extraction
    if (extractedText && extractedText.length > 0) {
      await supabase.from('docs').update({
        parsed_text: extractedText.slice(0, 250000), // Cap at 250k chars
        extract_status: 'ready',
        extract_source: source,
        extract_error: null,
        extracted_at: new Date().toISOString(),
        content_hash: newHash,
        word_count: wordCount
      }).eq('id', doc_id);

      console.log(`[extract-doc-text] Successfully updated doc ${doc_id} with ${wordCount} words`);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          status: 'ready',
          doc_id,
          word_count: wordCount,
          text_length: extractedText.length,
          message: 'Text extracted successfully'
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No text extracted
    await supabase.from('docs').update({
      extract_status: 'error',
      extract_error: 'No text extracted from document',
      content_hash: newHash
    }).eq('id', doc_id);

    return new Response(
      JSON.stringify({ 
        error: 'No text extracted',
        status: 'error',
        message: 'Document appears empty or unreadable'
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
