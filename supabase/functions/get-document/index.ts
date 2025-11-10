import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path');
    const mode = url.searchParams.get('mode') || 'view';

    // Validate input
    if (!path) {
      console.error('[get-document] Missing path parameter');
      return new Response('Missing path', { status: 400, headers: corsHeaders });
    }

    // Validate mode
    if (!['view', 'download'].includes(mode)) {
      console.error('[get-document] Invalid mode:', mode);
      return new Response('Invalid mode. Must be "view" or "download"', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log(`[get-document] Serving document: ${path}, mode: ${mode}`);

    // Create Supabase client with service role key for storage access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create a signed URL (valid for 60 seconds)
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, 60);

    if (error || !data?.signedUrl) {
      console.error('[get-document] Error creating signed URL:', error);
      return new Response('Document not found or access denied', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    console.log('[get-document] Successfully created signed URL, fetching file...');

    // Fetch the file from the signed URL
    const fileRes = await fetch(data.signedUrl);

    if (!fileRes.ok) {
      console.error('[get-document] Error fetching file via signed URL:', fileRes.status);
      return new Response('Failed to fetch file', {
        status: 502,
        headers: corsHeaders
      });
    }

    // Stream the file bytes
    const buf = await fileRes.arrayBuffer();
    
    // Derive filename from path
    const fileName = path.split('/').pop() || 'document';
    const contentType = fileRes.headers.get('Content-Type') || 'application/pdf';
    const contentLength = fileRes.headers.get('Content-Length');

    const disposition = mode === 'download' 
      ? `attachment; filename="${fileName}"` 
      : `inline; filename="${fileName}"`;

    console.log(`[get-document] Returning ${buf.byteLength} bytes, CT: ${contentType}, disposition: ${disposition}`);

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': contentType,
      'Content-Disposition': disposition,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
    
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }

    // Return pure binary response - NO redirects, NO HTML
    return new Response(buf, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[get-document] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(errorMessage, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
