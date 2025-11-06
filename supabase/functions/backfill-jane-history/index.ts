import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to add random jitter for retry delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const jitter = (baseMs: number) => baseMs + Math.random() * 1000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { organizationId, weekStarts } = await req.json();
    
    if (!organizationId || !weekStarts || !Array.isArray(weekStarts)) {
      return new Response(
        JSON.stringify({ error: 'Missing organizationId or weekStarts array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[backfill-jane-history] Starting backfill for org ${organizationId}, ${weekStarts.length} weeks`);

    // Get all Jane-synced metrics for this organization
    const { data: metrics, error: metricsError } = await supabase
      .from('metrics')
      .select('id, name, sync_source')
      .eq('organization_id', organizationId)
      .eq('sync_source', 'jane');

    if (metricsError) {
      console.error('[backfill-jane-history] Error fetching metrics:', metricsError);
      throw metricsError;
    }

    if (!metrics || metrics.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No Jane-synced metrics found',
          inserted: 0,
          skipped: 0,
          errors: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[backfill-jane-history] Found ${metrics.length} Jane-synced metrics`);

    // Check existing results to skip duplicates (where source != 'jane')
    const { data: existingResults } = await supabase
      .from('metric_results')
      .select('metric_id, week_start, source')
      .in('metric_id', metrics.map(m => m.id))
      .in('week_start', weekStarts);

    const existingNonJane = new Set(
      existingResults
        ?.filter(r => r.source !== 'jane')
        .map(r => `${r.metric_id}:${r.week_start}`) || []
    );

    console.log(`[backfill-jane-history] Skipping ${existingNonJane.size} existing non-Jane entries`);

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    // Batch process: iterate through each metric and week
    for (const metric of metrics) {
      for (const weekStart of weekStarts) {
        const key = `${metric.id}:${weekStart}`;
        
        // Skip if already exists with non-Jane source
        if (existingNonJane.has(key)) {
          skipped++;
          continue;
        }

        try {
          // Call fetch-jane-kpi with retry on 429
          let attempt = 0;
          let success = false;
          
          while (attempt < 2 && !success) {
            const response = await supabase.functions.invoke('fetch-jane-kpi', {
              body: { metricId: metric.id, weekStart },
              headers: { Authorization: authHeader }
            });

            if (response.error) {
              const errorMsg = String(response.error);
              if (errorMsg.includes('429') && attempt === 0) {
                // Retry with jitter on rate limit
                console.log(`[backfill-jane-history] Rate limited, retrying ${metric.name} for ${weekStart}...`);
                await sleep(jitter(2000));
                attempt++;
                continue;
              } else {
                console.error(`[backfill-jane-history] Error fetching ${metric.name} for ${weekStart}:`, response.error);
                errors++;
                break;
              }
            }

            // Success
            const data = response.data;
            if (data?.value !== null && data?.value !== undefined) {
              inserted++;
              console.log(`[backfill-jane-history] ✓ ${metric.name} ${weekStart}: ${data.value}`);
            } else {
              skipped++;
            }
            success = true;
          }

          // Small delay between requests to avoid overwhelming the API
          await sleep(100);

        } catch (error) {
          console.error(`[backfill-jane-history] Exception for ${metric.name} ${weekStart}:`, error);
          errors++;
        }
      }
    }

    console.log(`[backfill-jane-history] Complete - Inserted: ${inserted}, Skipped: ${skipped}, Errors: ${errors}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        inserted,
        skipped,
        errors,
        totalMetrics: metrics.length,
        totalWeeks: weekStarts.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[backfill-jane-history] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: String(error),
        inserted: 0,
        skipped: 0,
        errors: 0
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
