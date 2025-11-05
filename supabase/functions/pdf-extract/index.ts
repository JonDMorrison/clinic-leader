import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_path, organization_id } = await req.json();
    
    if (!file_path || !organization_id) {
      return new Response(
        JSON.stringify({ error: 'file_path and organization_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Downloading PDF from storage:', file_path);

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('playbooks')
      .download(file_path);

    if (downloadError) {
      console.error('Error downloading file:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download PDF', details: downloadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    console.log('PDF downloaded, size:', uint8Array.length, 'bytes');

    // Simple text extraction - look for text between stream markers
    // This is a basic implementation that works for simple PDFs
    let text = '';
    const pdfString = new TextDecoder().decode(uint8Array);
    
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
    text = text
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters
      .trim();

    console.log('Extracted text length:', text.length, 'characters');

    if (!text || text.length < 20) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to extract text from PDF',
          text: '',
          message: 'PDF may be image-based or encrypted. Manual text entry required.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in pdf-extract:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
