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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { filePath, organizationId } = await req.json();
    
    if (!filePath || !organizationId) {
      return new Response(
        JSON.stringify({ error: 'Missing filePath or organizationId' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[doc-extract] Processing file: ${filePath}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(filePath);

    if (downloadError) {
      console.error('[doc-extract] Download error:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download file' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileType = filePath.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx';
    console.log(`[doc-extract] File type: ${fileType}`);

    let extractedText = '';

    if (fileType === 'pdf') {
      // Call existing pdf-extract function
      const pdfExtractResponse = await supabase.functions.invoke('pdf-extract', {
        body: { filePath, bucket: 'documents' }
      });

      if (pdfExtractResponse.error) {
        console.error('[doc-extract] PDF extraction error:', pdfExtractResponse.error);
        return new Response(
          JSON.stringify({ error: 'Failed to extract PDF content' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      extractedText = pdfExtractResponse.data?.text || '';
    } else if (fileType === 'docx') {
      // For DOCX files, extract using mammoth library
      const arrayBuffer = await fileData.arrayBuffer();
      
      // Import mammoth dynamically
      const mammoth = await import('https://esm.sh/mammoth@1.8.0');
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedText = result.value;
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported file type' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[doc-extract] Extracted ${extractedText.length} characters`);

    return new Response(
      JSON.stringify({ 
        text: extractedText,
        fileType,
        length: extractedText.length
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[doc-extract] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
