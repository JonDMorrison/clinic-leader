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
    const { organization_id } = await req.json();
    
    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: 'organization_id is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[bulk-extract-docs] Starting bulk extraction for org: ${organization_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query docs that need extraction
    const { data: docs, error: fetchError } = await supabase
      .from('docs')
      .select('id, title, storage_path, mime_type, extract_status')
      .eq('organization_id', organization_id)
      .not('storage_path', 'is', null)
      .or('extract_status.is.null,extract_status.in.(pending,queued,error,needs_ocr)')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('[bulk-extract-docs] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch documents', details: fetchError.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!docs || docs.length === 0) {
      console.log('[bulk-extract-docs] No documents need extraction');
      return new Response(
        JSON.stringify({ 
          success: true,
          queued: 0,
          message: 'No documents need extraction'
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter to allowed types (PDF, DOCX)
    const allowedDocs = docs.filter(doc => {
      const path = doc.storage_path?.toLowerCase() || '';
      return path.endsWith('.pdf') || path.endsWith('.docx');
    });

    console.log(`[bulk-extract-docs] Found ${allowedDocs.length} documents to process (${docs.length} total)`);

    const results = {
      queued: allowedDocs.length,
      processed: 0,
      ready: 0,
      needs_ocr: 0,
      errors: 0
    };

    // Process in batches of 5
    const BATCH_SIZE = 5;
    for (let i = 0; i < allowedDocs.length; i += BATCH_SIZE) {
      const batch = allowedDocs.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (doc) => {
        try {
          console.log(`[bulk-extract-docs] Processing doc ${doc.id}: ${doc.title}`);
          
          const { data, error } = await supabase.functions.invoke('extract-doc-text', {
            body: { doc_id: doc.id, storage_path: doc.storage_path }
          });

          results.processed++;

          if (error) {
            console.error(`[bulk-extract-docs] Error processing ${doc.id}:`, error);
            results.errors++;
          } else if (data?.status === 'ready') {
            results.ready++;
          } else if (data?.status === 'needs_ocr') {
            results.needs_ocr++;
          } else if (data?.status === 'noop') {
            results.ready++; // Already extracted, count as ready
          } else if (data?.error || data?.status === 'error') {
            results.errors++;
          }
        } catch (err) {
          console.error(`[bulk-extract-docs] Exception processing ${doc.id}:`, err);
          results.errors++;
          results.processed++;
        }
      }));
    }

    console.log('[bulk-extract-docs] Bulk extraction complete:', results);

    return new Response(
      JSON.stringify({ 
        success: true,
        ...results,
        message: `Processed ${results.processed} documents: ${results.ready} ready, ${results.needs_ocr} need OCR, ${results.errors} errors`
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[bulk-extract-docs] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
