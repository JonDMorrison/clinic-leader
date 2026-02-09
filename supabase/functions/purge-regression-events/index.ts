import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RETENTION_DAYS = 180;
const BATCH_SIZE = 1000;
const MAX_ROWS_PER_RUN = 10000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    let totalDeleted = 0;
    let batches = 0;

    while (totalDeleted < MAX_ROWS_PER_RUN) {
      // Find batch of old IDs
      const { data: rows, error: selectError } = await adminClient
        .from('system_regression_events')
        .select('id')
        .lt('created_at', cutoffISO)
        .limit(BATCH_SIZE);

      if (selectError) {
        throw new Error(`Select failed: ${selectError.message}`);
      }

      if (!rows || rows.length === 0) break;

      const ids = rows.map((r: { id: string }) => r.id);
      const { error: deleteError } = await adminClient
        .from('system_regression_events')
        .delete()
        .in('id', ids);

      if (deleteError) {
        throw new Error(`Delete failed: ${deleteError.message}`);
      }

      totalDeleted += ids.length;
      batches++;

      // If we got fewer than BATCH_SIZE, we're done
      if (rows.length < BATCH_SIZE) break;
    }

    const duration_ms = Date.now() - start;

    return new Response(JSON.stringify({
      deleted_count: totalDeleted,
      cutoff_date: cutoffISO,
      batches,
      duration_ms,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[purge-regression-events] Error:", msg);

    // Log failure to regression events
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const adminClient = createClient(supabaseUrl, serviceKey);
      await adminClient.from('system_regression_events').insert({
        event_type: 'EDGE_FUNCTION_FAILURE',
        severity: 'error',
        message: `purge-regression-events failed: ${msg.slice(0, 200)}`,
        details: { function_name: 'purge-regression-events' },
      });
    } catch { /* silent */ }

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
