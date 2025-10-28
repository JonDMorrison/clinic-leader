import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { teamId, immediate } = await req.json();

    // Get integration config
    const { data: integration, error: integrationError } = await supabase
      .from('jane_integrations')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'connected')
      .single();

    if (integrationError || !integration) {
      throw new Error('No active Jane integration found');
    }

    // Create sync log
    const { data: syncLog, error: logError } = await supabase
      .from('jane_sync_logs')
      .insert({
        integration_id: integration.id,
        sync_type: immediate ? 'manual' : 'scheduled',
        status: 'running',
      })
      .select()
      .single();

    if (logError) throw logError;

    let totalRecords = 0;

    try {
      // Calculate date range (last 7 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      // Sync appointments if enabled
      if (integration.sync_scope.includes('appointments')) {
        const appointmentsResponse = await fetch(
          `https://app.jane.app/api/v2/appointments?start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}`,
          {
            headers: {
              "Authorization": `Bearer ${integration.api_key}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (appointmentsResponse.ok) {
          const appointments = await appointmentsResponse.json();
          totalRecords += appointments.length;
          
          console.log(`Synced ${appointments.length} appointments`);
          
          // Calculate and store aggregated metrics
          const weekStart = new Date(startDate);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
          
          // Find or create KPIs for appointment metrics
          const { data: visitKpi } = await supabase
            .from('kpis')
            .select('id')
            .eq('name', 'Total Visits')
            .limit(1)
            .single();
          
          if (visitKpi && appointments.length > 0) {
            // Upsert KPI reading for total visits
            await supabase
              .from('kpi_readings')
              .upsert({
                kpi_id: visitKpi.id,
                week_start: formatDate(weekStart),
                value: appointments.length,
                note: 'Auto-synced from Jane App'
              }, {
                onConflict: 'kpi_id,week_start'
              });
          }
        }
      }

      // Sync payments if enabled
      if (integration.sync_scope.includes('payments')) {
        const paymentsResponse = await fetch(
          `https://app.jane.app/api/v2/payments?start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}`,
          {
            headers: {
              "Authorization": `Bearer ${integration.api_key}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (paymentsResponse.ok) {
          const payments = await paymentsResponse.json();
          totalRecords += payments.length;
          
          console.log(`Synced ${payments.length} payments`);
          
          // Calculate and store payment metrics
          const weekStart = new Date(startDate);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          
          const totalRevenue = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
          
          // Find or create revenue KPI
          const { data: revenueKpi } = await supabase
            .from('kpis')
            .select('id')
            .eq('name', 'Total Revenue')
            .limit(1)
            .single();
          
          if (revenueKpi && totalRevenue > 0) {
            // Upsert KPI reading for revenue
            await supabase
              .from('kpi_readings')
              .upsert({
                kpi_id: revenueKpi.id,
                week_start: formatDate(weekStart),
                value: totalRevenue,
                note: 'Auto-synced from Jane App'
              }, {
                onConflict: 'kpi_id,week_start'
              });
          }
        }
      }

      // Update integration last sync
      await supabase
        .from('jane_integrations')
        .update({
          last_sync: new Date().toISOString(),
          next_sync: integration.sync_mode === 'daily' 
            ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            : null,
        })
        .eq('id', integration.id);

      // Update sync log
      await supabase
        .from('jane_sync_logs')
        .update({
          status: 'completed',
          records_synced: totalRecords,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id);

      return new Response(
        JSON.stringify({ success: true, records: totalRecords }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (syncError) {
      // Update sync log with error
      const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown error';
      await supabase
        .from('jane_sync_logs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id);

      throw syncError;
    }

  } catch (error) {
    console.error("Jane sync error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
