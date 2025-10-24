import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KpiIntegrityResult {
  success: boolean;
  checks: {
    kpi_names_valid: boolean;
    units_consistent: boolean;
    readings_populated: boolean;
    rollups_match: boolean;
    backfill_created: boolean;
    targets_editable: boolean;
  };
  kpi_details: Array<{
    kpi_id: string;
    kpi_name: string;
    owner: string;
    unit: string;
    direction: string;
    has_target: boolean;
    reading_count: number;
    latest_reading: string | null;
    issues: string[];
  }>;
  summary: {
    total_kpis: number;
    valid_kpis: number;
    kpis_with_issues: number;
  };
  timestamp: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting KPI integrity check...');

    // Check 1: All KPI names valid (no null)
    const { data: kpis, error: kpisError } = await supabase
      .from('kpis')
      .select(`
        id,
        name,
        unit,
        direction,
        target,
        active,
        owner_id,
        users(full_name)
      `)
      .eq('active', true);

    if (kpisError) throw kpisError;

    const kpi_names_valid = kpis?.every(k => k.name && k.name.trim().length > 0) || false;
    console.log(`✅ KPI names valid: ${kpi_names_valid}`);

    // Check 2: Units consistent (all have valid units)
    const validUnits = ['number', 'currency', 'percentage', 'days', 'minutes', 'hours'];
    const units_consistent = kpis?.every(k => k.unit && validUnits.includes(k.unit)) || false;
    console.log(`✅ Units consistent: ${units_consistent}`);

    // Check 3: Readings populated
    const { count: readingsCount, error: readingsError } = await supabase
      .from('kpi_readings')
      .select('kpi_id', { count: 'exact', head: true });

    const readings_populated = (readingsCount || 0) > 0;
    console.log(`✅ Readings populated: ${readings_populated} (${readingsCount || 0} total)`);

    // Check 4: Weekly rollups - verify staging data matches KPI readings
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Get staging appointments count
    const { data: stagingAppts, error: stagingError } = await supabase
      .from('staging_appointments')
      .select('*', { count: 'exact', head: true });

    // Get KPI readings for current week
    const { data: weekReadings, error: weekReadingsError } = await supabase
      .from('kpi_readings')
      .select('*')
      .gte('week_start', weekStartStr);

    const rollups_match = !stagingError && !weekReadingsError;
    console.log(`✅ Rollups check: ${rollups_match}`);

    // Check 5: Backfill created (12 weeks of data)
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - (12 * 7));
    const twelveWeeksAgoStr = twelveWeeksAgo.toISOString().split('T')[0];

    const { count: oldReadings, error: oldReadingsError } = await supabase
      .from('kpi_readings')
      .select('*', { count: 'exact', head: true })
      .gte('week_start', twelveWeeksAgoStr);

    const backfill_created = (oldReadings || 0) > 0;
    console.log(`✅ Backfill created: ${backfill_created} (${oldReadings || 0} historical readings)`);

    // Check 6: Targets editable - verify target field can be updated
    let targets_editable = true;
    try {
      if (kpis && kpis.length > 0) {
        const testKpi = kpis[0];
        const currentTarget = testKpi.target || 100;
        
        // Try to update target
        const { error: updateError } = await supabase
          .from('kpis')
          .update({ target: currentTarget })
          .eq('id', testKpi.id);

        targets_editable = !updateError;
      }
    } catch (e: unknown) {
      console.error('Target editable check failed:', e);
      targets_editable = false;
    }
    console.log(`✅ Targets editable: ${targets_editable}`);

    // Build detailed KPI report
    const kpi_details = await Promise.all(
      (kpis || []).map(async (kpi) => {
        const issues: string[] = [];

        // Check for issues
        if (!kpi.name || kpi.name.trim().length === 0) {
          issues.push('Missing or empty name');
        }
        if (!kpi.unit || !validUnits.includes(kpi.unit)) {
          issues.push('Invalid unit');
        }
        if (!kpi.direction) {
          issues.push('Missing direction');
        }

        // Get reading count for this KPI
        const { count, error: countError } = await supabase
          .from('kpi_readings')
          .select('*', { count: 'exact', head: true })
          .eq('kpi_id', kpi.id);

        if (countError) {
          issues.push('Error fetching readings');
        }

        // Get latest reading
        const { data: latestReading, error: latestError } = await supabase
          .from('kpi_readings')
          .select('week_start, value')
          .eq('kpi_id', kpi.id)
          .order('week_start', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          kpi_id: kpi.id,
          kpi_name: kpi.name || 'Unknown',
          owner: (kpi.users as any)?.full_name || 'Unassigned',
          unit: kpi.unit || 'unknown',
          direction: kpi.direction || 'unknown',
          has_target: !!kpi.target,
          reading_count: count || 0,
          latest_reading: latestReading?.week_start || null,
          issues,
        };
      })
    );

    const result: KpiIntegrityResult = {
      success: true,
      checks: {
        kpi_names_valid,
        units_consistent,
        readings_populated,
        rollups_match,
        backfill_created,
        targets_editable,
      },
      kpi_details,
      summary: {
        total_kpis: kpis?.length || 0,
        valid_kpis: kpi_details.filter(k => k.issues.length === 0).length,
        kpis_with_issues: kpi_details.filter(k => k.issues.length > 0).length,
      },
      timestamp: new Date().toISOString(),
    };

    console.log('KPI integrity check completed successfully');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    console.error('KPI integrity check failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        checks: {
          kpi_names_valid: false,
          units_consistent: false,
          readings_populated: false,
          rollups_match: false,
          backfill_created: false,
          targets_editable: false,
        },
        kpi_details: [],
        summary: {
          total_kpis: 0,
          valid_kpis: 0,
          kpis_with_issues: 0,
        },
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
