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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { metricId, weekStart } = await req.json();
    
    console.log(`Fetching Jane KPI data for metric ${metricId}, week ${weekStart}`);

    // Get metric details
    const { data: metric, error: metricError } = await supabase
      .from('metrics')
      .select('*, organization_id')
      .eq('id', metricId)
      .single();

    if (metricError || !metric) {
      console.error('Metric fetch error:', metricError);
      return new Response(
        JSON.stringify({ error: 'Metric not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if Jane integration exists
    const { data: janeIntegration, error: janeError } = await supabase
      .from('jane_integrations')
      .select('*')
      .eq('organization_id', metric.organization_id)
      .eq('status', 'connected')
      .single();

    if (janeError || !janeIntegration) {
      console.error('Jane integration not found:', janeError);
      return new Response(
        JSON.stringify({ error: 'Jane App integration not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate week end date (Sunday)
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    // Map metric names to Jane API data
    let value: number | null = null;

    try {
      // Fetch data from Jane API based on metric name
      const metricName = metric.name.toLowerCase();
      
      if (metricName.includes('new patient') || metricName.includes('total patient')) {
        // Fetch new patients count
        const response = await fetch(
          `https://app.jane.app/api/v2/appointments?start_date=${weekStart}&end_date=${weekEndDate.toISOString().split('T')[0]}`,
          {
            headers: {
              'Authorization': `Bearer ${janeIntegration.api_key}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          console.error('Jane API error:', await response.text());
          throw new Error('Failed to fetch from Jane API');
        }

        const appointments = await response.json();
        // Count unique new patients (this is a simplified example)
        value = appointments.filter((apt: any) => apt.status === 'completed').length;

      } else if (metricName.includes('revenue') || metricName.includes('income')) {
        // Fetch revenue/payments
        const response = await fetch(
          `https://app.jane.app/api/v2/payments?start_date=${weekStart}&end_date=${weekEndDate.toISOString().split('T')[0]}`,
          {
            headers: {
              'Authorization': `Bearer ${janeIntegration.api_key}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          console.error('Jane API error:', await response.text());
          throw new Error('Failed to fetch from Jane API');
        }

        const payments = await response.json();
        value = payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);

      } else if (metricName.includes('visit') || metricName.includes('appointment')) {
        // Fetch total visits/appointments
        const response = await fetch(
          `https://app.jane.app/api/v2/appointments?start_date=${weekStart}&end_date=${weekEndDate.toISOString().split('T')[0]}`,
          {
            headers: {
              'Authorization': `Bearer ${janeIntegration.api_key}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          console.error('Jane API error:', await response.text());
          throw new Error('Failed to fetch from Jane API');
        }

        const appointments = await response.json();
        value = appointments.filter((apt: any) => apt.status === 'completed').length;

      } else {
        // Generic fallback - return null for unsupported metrics
        console.log(`Metric "${metric.name}" not mapped to Jane API data`);
        value = null;
      }

      // Save or update the metric result
      const { error: upsertError } = await supabase
        .from('metric_results')
        .upsert({
          metric_id: metricId,
          week_start: weekStart,
          value: value,
          source: 'jane',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'metric_id,week_start',
        });

      if (upsertError) {
        console.error('Error upserting metric result:', upsertError);
        throw upsertError;
      }

      console.log(`Successfully synced Jane data: ${value} for metric ${metricId}, week ${weekStart}`);

      return new Response(
        JSON.stringify({ 
          success: true,
          value,
          weekStart,
          metricName: metric.name,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (apiError) {
      console.error('Jane API error:', apiError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch data from Jane App', details: String(apiError) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in fetch-jane-kpi function:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
