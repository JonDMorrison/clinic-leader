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
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: path' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate mode
    if (!['view', 'download'].includes(mode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid mode. Must be "view" or "download"' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[get-document] Serving document: ${path}, mode: ${mode}`);

    // Create Supabase client with service role key for storage access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create a signed URL (valid for 60 seconds)
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, 60, {
        download: mode === 'download'
      });

    if (error || !data?.signedUrl) {
      console.error('[get-document] Error creating signed URL:', error);
      return new Response(
        JSON.stringify({ error: 'Document not found or access denied' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[get-document] Successfully created signed URL');

    // Stream the file from the signed URL back through this first-party endpoint
    const signedUrl = data.signedUrl;
    const fileResp = await fetch(signedUrl);

    if (!fileResp.ok || !fileResp.body) {
      console.error('[get-document] Error fetching file via signed URL:', fileResp.status, await fileResp.text().catch(() => ''));
      return new Response(
        JSON.stringify({ error: 'Document fetch failed' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Derive filename from path
    const filename = path.split('/').pop() || 'document';
    const contentType = fileResp.headers.get('Content-Type') || 'application/octet-stream';
    const contentLength = fileResp.headers.get('Content-Length') || undefined;
    const disposition = mode === 'download' ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`;

    const headers: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': contentType,
      'Content-Disposition': disposition,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
    };
    if (contentLength) headers['Content-Length'] = contentLength;

    return new Response(fileResp.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('[get-document] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
