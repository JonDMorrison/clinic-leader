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
      console.log('[extract-doc-text] Extracting PDF text with OCR using PDF.js + Lovable AI Vision');
      
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!lovableApiKey) {
        throw new Error('LOVABLE_API_KEY is not configured');
      }

      try {
        // Import PDF.js and canvas library
        const pdfjsLib = await import('https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs');
        const { createCanvas } = await import('https://deno.land/x/canvas@v1.4.1/mod.ts');
        
        // Load PDF
        const arrayBuffer = await fileData.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        
        console.log(`[extract-doc-text] PDF has ${pdf.numPages} pages, processing first 5 for OCR`);
        
        const maxPagesToProcess = Math.min(pdf.numPages, 5); // Limit to 5 pages for cost/performance
        const pageTexts: string[] = [];
        
        // Process each page
        for (let pageNum = 1; pageNum <= maxPagesToProcess; pageNum++) {
          console.log(`[extract-doc-text] OCR processing page ${pageNum}/${maxPagesToProcess}`);
          
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 });
          
          // Create canvas
          const canvas = createCanvas(viewport.width, viewport.height);
          const context = canvas.getContext('2d');
          
          // Render page to canvas
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          // Convert canvas to PNG base64
          const pngData = canvas.toBuffer('image/png');
          const base64Image = btoa(String.fromCharCode(...new Uint8Array(pngData)));
          
          // Send to Lovable AI for OCR
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
                      text: 'Extract all text from this image using OCR. Return only the extracted text, no explanations.'
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:image/png;base64,${base64Image}`
                      }
                    }
                  ]
                }
              ],
              max_tokens: 2000,
            }),
          });
          
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const pageText = aiData.choices[0]?.message?.content || '';
            pageTexts.push(pageText);
            console.log(`[extract-doc-text] Page ${pageNum}: extracted ${pageText.length} chars`);
          } else {
            const errorText = await aiResponse.text();
            console.error(`[extract-doc-text] OCR failed for page ${pageNum}:`, aiResponse.status, errorText);
          }
        }
        
        extractedText = pageTexts.join('\n\n');
        console.log(`[extract-doc-text] Total extracted: ${extractedText.length} characters from ${maxPagesToProcess} pages`);
        
      } catch (parseError) {
        console.error('[extract-doc-text] OCR extraction failed:', parseError);
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
