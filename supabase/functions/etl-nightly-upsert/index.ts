import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AppointmentData {
  date?: string;
  status?: string;
  patient_id?: string;
}

interface PatientData {
  id?: string;
  created_date?: string;
}

interface ARLineData {
  amount?: string;
  age_days?: string;
  patient_id?: string;
}

interface PaymentData {
  amount?: string;
  date?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    console.log('Starting ETL process...');

    // Get current week start (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    console.log(`Processing for week starting: ${weekStartStr}`);

    // Get all tracked KPIs with their mappings
    const { data: trackedKpis, error: trackedError } = await supabaseClient
      .from('tracked_kpis')
      .select(`
        id,
        name,
        category,
        import_mappings(source_system, source_label, transform)
      `)
      .eq('is_active', true);

    if (trackedError) throw trackedError;

    console.log(`Found ${trackedKpis?.length || 0} tracked KPIs`);

    // Process appointments -> weekly visits and no-shows
    const { data: appointments, error: apptError } = await supabaseClient
      .from('staging_appointments')
      .select('raw');

    if (apptError) throw apptError;

    console.log(`Found ${appointments?.length || 0} appointments`);

    let visits = 0;
    let noShows = 0;

    appointments?.forEach((appt) => {
      const data = appt.raw as AppointmentData;
      if (data.status === 'completed') visits++;
      if (data.status === 'no-show') noShows++;
    });

    // Find tracked KPIs for visits and no-shows
    const visitsKpi = trackedKpis?.find(k => k.name.toLowerCase().includes('visit') || k.category === 'appointments');
    const noShowsKpi = trackedKpis?.find(k => k.name.toLowerCase().includes('no-show') || k.name.toLowerCase().includes('no show'));

    // Upsert visits KPI
    if (visits > 0 && visitsKpi) {
      const { error: visitsError } = await supabaseClient
        .from('kpi_readings')
        .upsert({
          week_start: weekStartStr,
          value: visits,
          note: 'Auto-imported from staging data',
          kpi_id: visitsKpi.id,
        }, {
          onConflict: 'week_start,kpi_id',
        });

      if (visitsError) console.error('Visits upsert error:', visitsError);
      else console.log(`✓ Upserted ${visits} visits for KPI: ${visitsKpi.name}`);
    }

    // Upsert no-shows KPI
    if (noShows > 0 && noShowsKpi) {
      const { error: noShowsError } = await supabaseClient
        .from('kpi_readings')
        .upsert({
          week_start: weekStartStr,
          value: noShows,
          note: 'Auto-imported from staging data',
          kpi_id: noShowsKpi.id,
        }, {
          onConflict: 'week_start,kpi_id',
        });

      if (noShowsError) console.error('No-shows upsert error:', noShowsError);
      else console.log(`✓ Upserted ${noShows} no-shows for KPI: ${noShowsKpi.name}`);
    }

    // Upsert no-shows KPI
    if (noShows > 0) {
      const { error: noShowsError } = await supabaseClient
        .from('kpi_readings')
        .upsert({
          week_start: weekStartStr,
          value: noShows,
          note: 'Auto-imported from Jane',
          kpi_id: '00000000-0000-0000-0000-000000000002', // Placeholder
        }, {
          onConflict: 'week_start,kpi_id',
        });

      if (noShowsError) console.error('No-shows upsert error:', noShowsError);
    }

    // Process patients -> new patients count
    const { data: patients, error: patientError } = await supabaseClient
      .from('staging_patients')
      .select('raw');

    if (patientError) throw patientError;

    console.log(`Found ${patients?.length || 0} patients`);

    const newPatients = patients?.filter((p) => {
      const data = p.raw as PatientData;
      if (!data.created_date) return false;
      const createdDate = new Date(data.created_date);
      return createdDate >= weekStart;
    }).length || 0;

    // Find tracked KPI for new patients
    const newPatientsKpi = trackedKpis?.find(k => 
      k.name.toLowerCase().includes('new patient') || 
      k.category === 'patients'
    );

    if (newPatients > 0 && newPatientsKpi) {
      const { error: newPatientsError } = await supabaseClient
        .from('kpi_readings')
        .upsert({
          week_start: weekStartStr,
          value: newPatients,
          note: 'Auto-imported from staging data',
          kpi_id: newPatientsKpi.id,
        }, {
          onConflict: 'week_start,kpi_id',
        });

      if (newPatientsError) console.error('New patients upsert error:', newPatientsError);
      else console.log(`✓ Upserted ${newPatients} new patients for KPI: ${newPatientsKpi.name}`);
    }

    // Process AR aging -> buckets
    const { data: arLines, error: arError } = await supabaseClient
      .from('staging_ar_lines')
      .select('raw');

    if (arError) throw arError;

    console.log(`Found ${arLines?.length || 0} AR lines`);

    const arBuckets = {
      '30-60': 0,
      '60-90': 0,
      '90-120': 0,
      '120+': 0,
    };

    arLines?.forEach((line) => {
      const data = line.raw as ARLineData;
      const amount = parseFloat(data.amount || '0');
      const ageDays = parseInt(data.age_days || '0');

      if (ageDays >= 30 && ageDays < 60) {
        arBuckets['30-60'] += amount;
      } else if (ageDays >= 60 && ageDays < 90) {
        arBuckets['60-90'] += amount;
      } else if (ageDays >= 90 && ageDays < 120) {
        arBuckets['90-120'] += amount;
      } else if (ageDays >= 120) {
        arBuckets['120+'] += amount;
      }
    });

    // Upsert AR aging buckets
    for (const [bucket, amount] of Object.entries(arBuckets)) {
      if (amount > 0) {
        const { error: arUpsertError } = await supabaseClient
          .from('ar_aging')
          .upsert({
            week_start: weekStartStr,
            bucket: bucket as '30-60' | '60-90' | '90-120' | '120+',
            amount: amount,
          }, {
            onConflict: 'week_start,bucket',
          });

        if (arUpsertError) console.error(`AR ${bucket} upsert error:`, arUpsertError);
      }
    }

    // Process payments -> collected revenue
    const { data: payments, error: paymentError } = await supabaseClient
      .from('staging_payments')
      .select('raw');

    if (paymentError) throw paymentError;

    console.log(`Found ${payments?.length || 0} payments`);

    const revenue = payments?.reduce((sum, payment) => {
      const data = payment.raw as PaymentData;
      return sum + parseFloat(data.amount || '0');
    }, 0) || 0;

    // Find tracked KPI for revenue
    const revenueKpi = trackedKpis?.find(k => 
      k.name.toLowerCase().includes('revenue') || 
      k.name.toLowerCase().includes('collected') ||
      k.category === 'financial'
    );

    if (revenue > 0 && revenueKpi) {
      const { error: revenueError } = await supabaseClient
        .from('kpi_readings')
        .upsert({
          week_start: weekStartStr,
          value: revenue,
          note: 'Auto-imported from staging data',
          kpi_id: revenueKpi.id,
        }, {
          onConflict: 'week_start,kpi_id',
        });

      if (revenueError) console.error('Revenue upsert error:', revenueError);
      else console.log(`✓ Upserted $${revenue} revenue for KPI: ${revenueKpi.name}`);
    }

    console.log('ETL process completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        processed: {
          appointments: appointments?.length || 0,
          patients: patients?.length || 0,
          arLines: arLines?.length || 0,
          payments: payments?.length || 0,
        },
        results: {
          visits,
          noShows,
          newPatients,
          revenue,
          arBuckets,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('ETL error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
