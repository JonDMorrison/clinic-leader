import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Jane API base URL
const JANE_API_BASE = "https://app.jane.app/api/v2";

// Helper function to format dates for Jane API
const formatDateForJane = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper function to get week end date
const getWeekEnd = (weekStart: string): string => {
  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  return formatDateForJane(endDate);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header', value: null }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { metricId, weekStart } = await req.json();
    
    if (!metricId || !weekStart) {
      console.error('Missing required parameters:', { metricId, weekStart });
      return new Response(
        JSON.stringify({ error: 'Missing metricId or weekStart', value: null }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fetch-jane-kpi] Starting sync for metric ${metricId}, week ${weekStart}`);

    // Get metric details
    const { data: metric, error: metricError } = await supabase
      .from('metrics')
      .select('id, name, organization_id, unit, category')
      .eq('id', metricId)
      .single();

    if (metricError || !metric) {
      console.error('[fetch-jane-kpi] Metric fetch error:', metricError);
      return new Response(
        JSON.stringify({ 
          error: 'Metric not found',
          value: null,
          metric_name: null,
          week_of: weekStart 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fetch-jane-kpi] Found metric: ${metric.name} (${metric.category})`);

    // Check if Jane integration exists for this organization
    const { data: janeIntegration, error: janeError } = await supabase
      .from('jane_integrations')
      .select('api_key, clinic_id, status')
      .eq('organization_id', metric.organization_id)
      .eq('status', 'connected')
      .maybeSingle();

    if (janeError || !janeIntegration) {
      console.error('[fetch-jane-kpi] Jane integration not found or not connected:', janeError);
      
      // Mark as manual required in database
      await supabase
        .from('metric_results')
        .upsert({
          metric_id: metricId,
          week_start: weekStart,
          value: null,
          source: 'manual',
          note: 'Jane App not connected - manual entry required',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'metric_id,week_start',
        });

      return new Response(
        JSON.stringify({ 
          error: 'Jane App integration not connected',
          value: null,
          metric_name: metric.name,
          week_of: weekStart,
          fallback: 'manual_required'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fetch-jane-kpi] Jane integration found for clinic ${janeIntegration.clinic_id}`);

    // Calculate week end date
    const weekEnd = getWeekEnd(weekStart);
    console.log(`[fetch-jane-kpi] Date range: ${weekStart} to ${weekEnd}`);

    // Map metric names to Jane API data
    let value: number | null = null;
    let errorMessage: string | null = null;

    try {
      const metricName = metric.name.toLowerCase();
      console.log(`[fetch-jane-kpi] Processing metric type: ${metricName}`);
      
      // 1. NEW PATIENTS
      if (metricName.includes('new patient')) {
        console.log('[fetch-jane-kpi] Fetching new patients from Jane...');
        const response = await fetch(
          `${JANE_API_BASE}/patients?created_since=${weekStart}&created_until=${weekEnd}`,
          {
            headers: {
              'Authorization': `Bearer ${janeIntegration.api_key}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[fetch-jane-kpi] Jane API error (new patients):', response.status, errorText);
          throw new Error(`Jane API returned ${response.status}`);
        }

        const patients = await response.json();
        value = Array.isArray(patients) ? patients.length : 0;
        console.log(`[fetch-jane-kpi] Found ${value} new patients`);

      // 2. TOTAL VISITS / APPOINTMENTS
      } else if (metricName.includes('visit') || metricName.includes('appointment') || metricName.includes('total patient')) {
        console.log('[fetch-jane-kpi] Fetching appointments from Jane...');
        const response = await fetch(
          `${JANE_API_BASE}/appointments?from=${weekStart}&to=${weekEnd}`,
          {
            headers: {
              'Authorization': `Bearer ${janeIntegration.api_key}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[fetch-jane-kpi] Jane API error (appointments):', response.status, errorText);
          throw new Error(`Jane API returned ${response.status}`);
        }

        const appointments = await response.json();
        // Count only completed appointments
        value = Array.isArray(appointments) 
          ? appointments.filter((apt: any) => 
              apt.status === 'completed' || apt.status === 'arrived'
            ).length 
          : 0;
        console.log(`[fetch-jane-kpi] Found ${value} completed visits`);

      // 3. REVENUE / PAYMENTS
      } else if (metricName.includes('revenue') || metricName.includes('income') || metricName.includes('payment')) {
        console.log('[fetch-jane-kpi] Fetching payments from Jane...');
        const response = await fetch(
          `${JANE_API_BASE}/payments?from=${weekStart}&to=${weekEnd}`,
          {
            headers: {
              'Authorization': `Bearer ${janeIntegration.api_key}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[fetch-jane-kpi] Jane API error (payments):', response.status, errorText);
          throw new Error(`Jane API returned ${response.status}`);
        }

        const payments = await response.json();
        // Sum up payment amounts (convert cents to dollars if needed)
        value = Array.isArray(payments)
          ? payments.reduce((sum: number, payment: any) => {
              const amount = payment.amount || payment.total || 0;
              // Jane API returns amounts in cents, convert to dollars
              return sum + (amount / 100);
            }, 0)
          : 0;
        console.log(`[fetch-jane-kpi] Total revenue: $${value}`);

      // 4. SCHEDULED PERCENTAGE
      } else if (metricName.includes('scheduled') || metricName.includes('% scheduled')) {
        console.log('[fetch-jane-kpi] Calculating scheduled percentage...');
        // This requires fetching referrals or appointments with scheduled status
        const response = await fetch(
          `${JANE_API_BASE}/appointments?from=${weekStart}&to=${weekEnd}`,
          {
            headers: {
              'Authorization': `Bearer ${janeIntegration.api_key}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[fetch-jane-kpi] Jane API error (scheduled %):', response.status, errorText);
          throw new Error(`Jane API returned ${response.status}`);
        }

        const appointments = await response.json();
        if (Array.isArray(appointments) && appointments.length > 0) {
          const scheduledCount = appointments.filter((apt: any) => 
            apt.status === 'booked' || apt.status === 'confirmed' || apt.status === 'completed'
          ).length;
          value = Math.round((scheduledCount / appointments.length) * 100);
        } else {
          value = 0;
        }
        console.log(`[fetch-jane-kpi] Scheduled percentage: ${value}%`);

      } else {
        // Unsupported metric type - mark as manual required
        console.log(`[fetch-jane-kpi] Metric "${metric.name}" not mapped to Jane API data`);
        errorMessage = 'Metric type not supported for Jane sync';
        value = null;
      }

      // Save or update the metric result
      const { error: upsertError } = await supabase
        .from('metric_results')
        .upsert({
          metric_id: metricId,
          week_start: weekStart,
          value: value,
          source: value !== null ? 'jane' : 'manual',
          note: errorMessage || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'metric_id,week_start',
        });

      if (upsertError) {
        console.error('[fetch-jane-kpi] Error upserting metric result:', upsertError);
        throw upsertError;
      }

      console.log(`[fetch-jane-kpi] ✅ Successfully synced: ${value} for metric ${metric.name}, week ${weekStart}`);

      return new Response(
        JSON.stringify({ 
          success: true,
          value: value,
          metric_name: metric.name,
          week_of: weekStart,
          source: value !== null ? 'jane' : 'manual',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (apiError) {
      console.error('[fetch-jane-kpi] Jane API error:', apiError);
      
      // Mark as manual required on API failure
      await supabase
        .from('metric_results')
        .upsert({
          metric_id: metricId,
          week_start: weekStart,
          value: null,
          source: 'manual',
          note: `Jane API error: ${String(apiError)}`,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'metric_id,week_start',
        });

      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch data from Jane App',
          value: null,
          metric_name: metric.name,
          week_of: weekStart,
          fallback: 'manual_required',
          details: String(apiError)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[fetch-jane-kpi] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: String(error),
        value: null,
        fallback: 'manual_required'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
