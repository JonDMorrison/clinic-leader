import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RollupRequest {
  organization_id: string;
  period_start?: string; // YYYY-MM-DD, defaults to start of current week
  period_type?: "weekly" | "monthly";
}

interface RollupResult {
  metric_name: string;
  import_key: string;
  value: number;
  period_key: string;
  period_start: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RollupRequest = await req.json();
    const { organization_id, period_type = "weekly" } = body;

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[jane-kpi-rollup] Starting rollup for org: ${organization_id}, period: ${period_type}`);

    // Calculate period boundaries
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;
    let periodKey: string;

    if (period_type === "monthly") {
      // Start of current month
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    } else {
      // Start of current week (Monday)
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday = 1
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() + diff);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
      periodKey = periodStart.toISOString().slice(0, 10);
    }

    const periodStartStr = periodStart.toISOString().slice(0, 10);
    const periodEndStr = periodEnd.toISOString().slice(0, 10);

    console.log(`[jane-kpi-rollup] Period: ${periodStartStr} to ${periodEndStr}, key: ${periodKey}`);

    // Rollup results array
    const rollups: RollupResult[] = [];

    // ========================================
    // KPI 1: Total Visits (non-cancelled appointments)
    // ========================================
    const { data: visitsData, error: visitsError } = await supabase
      .from("staging_appointments_jane")
      .select("id", { count: "exact" })
      .eq("organization_id", organization_id)
      .gte("start_at", periodStartStr)
      .lte("start_at", periodEndStr)
      .is("cancelled_at", null);

    if (!visitsError && visitsData) {
      const totalVisits = visitsData.length;
      rollups.push({
        metric_name: "Total Visits",
        import_key: "jane_total_visits",
        value: totalVisits,
        period_key: periodKey,
        period_start: periodStartStr,
      });
      console.log(`[jane-kpi-rollup] Total Visits: ${totalVisits}`);
    }

    // ========================================
    // KPI 2: New Patient Visits (first_visit = true)
    // ========================================
    const { data: newPatientsData, error: newPatientsError } = await supabase
      .from("staging_appointments_jane")
      .select("id", { count: "exact" })
      .eq("organization_id", organization_id)
      .gte("start_at", periodStartStr)
      .lte("start_at", periodEndStr)
      .is("cancelled_at", null)
      .eq("first_visit", true);

    if (!newPatientsError && newPatientsData) {
      const newPatientVisits = newPatientsData.length;
      rollups.push({
        metric_name: "New Patient Visits",
        import_key: "jane_new_patient_visits",
        value: newPatientVisits,
        period_key: periodKey,
        period_start: periodStartStr,
      });
      console.log(`[jane-kpi-rollup] New Patient Visits: ${newPatientVisits}`);
    }

    // ========================================
    // KPI 3: Cancelled Appointments
    // ========================================
    const { data: cancelledData, error: cancelledError } = await supabase
      .from("staging_appointments_jane")
      .select("id", { count: "exact" })
      .eq("organization_id", organization_id)
      .gte("start_at", periodStartStr)
      .lte("start_at", periodEndStr)
      .not("cancelled_at", "is", null);

    if (!cancelledError && cancelledData) {
      const cancelledAppointments = cancelledData.length;
      rollups.push({
        metric_name: "Cancelled Appointments",
        import_key: "jane_cancelled_appointments",
        value: cancelledAppointments,
        period_key: periodKey,
        period_start: periodStartStr,
      });
      console.log(`[jane-kpi-rollup] Cancelled Appointments: ${cancelledAppointments}`);
    }

    // ========================================
    // KPI 4: No Shows
    // ========================================
    const { data: noShowsData, error: noShowsError } = await supabase
      .from("staging_appointments_jane")
      .select("id", { count: "exact" })
      .eq("organization_id", organization_id)
      .gte("start_at", periodStartStr)
      .lte("start_at", periodEndStr)
      .not("no_show_at", "is", null);

    if (!noShowsError && noShowsData) {
      const noShows = noShowsData.length;
      rollups.push({
        metric_name: "No Shows",
        import_key: "jane_no_shows",
        value: noShows,
        period_key: periodKey,
        period_start: periodStartStr,
      });
      console.log(`[jane-kpi-rollup] No Shows: ${noShows}`);
    }

    // ========================================
    // KPI 5: Total Collected Revenue (sum of payments)
    // ========================================
    const { data: paymentsData, error: paymentsError } = await supabase
      .from("staging_payments_jane")
      .select("amount")
      .eq("organization_id", organization_id)
      .gte("received_at", periodStartStr)
      .lte("received_at", periodEndStr);

    if (!paymentsError && paymentsData) {
      const totalCollected = paymentsData.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      rollups.push({
        metric_name: "Total Collected Revenue",
        import_key: "jane_total_collected",
        value: Math.round(totalCollected * 100) / 100,
        period_key: periodKey,
        period_start: periodStartStr,
      });
      console.log(`[jane-kpi-rollup] Total Collected Revenue: ${totalCollected}`);
    }

    // ========================================
    // KPI 6: Total Invoiced (sum of invoice subtotals)
    // ========================================
    const { data: invoicesData, error: invoicesError } = await supabase
      .from("staging_invoices_jane")
      .select("subtotal")
      .eq("organization_id", organization_id)
      .gte("invoiced_at", periodStartStr)
      .lte("invoiced_at", periodEndStr);

    if (!invoicesError && invoicesData) {
      const totalInvoiced = invoicesData.reduce((sum, i) => sum + (Number(i.subtotal) || 0), 0);
      rollups.push({
        metric_name: "Total Invoiced",
        import_key: "jane_total_invoiced",
        value: Math.round(totalInvoiced * 100) / 100,
        period_key: periodKey,
        period_start: periodStartStr,
      });
      console.log(`[jane-kpi-rollup] Total Invoiced: ${totalInvoiced}`);
    }

    // ========================================
    // KPI 7: Average Revenue Per Visit
    // ========================================
    const totalVisitsCount = rollups.find(r => r.import_key === "jane_total_visits")?.value || 0;
    const totalCollectedAmount = rollups.find(r => r.import_key === "jane_total_collected")?.value || 0;
    
    if (totalVisitsCount > 0) {
      const avgRevenuePerVisit = totalCollectedAmount / totalVisitsCount;
      rollups.push({
        metric_name: "Average Revenue Per Visit",
        import_key: "jane_avg_revenue_per_visit",
        value: Math.round(avgRevenuePerVisit * 100) / 100,
        period_key: periodKey,
        period_start: periodStartStr,
      });
      console.log(`[jane-kpi-rollup] Average Revenue Per Visit: ${avgRevenuePerVisit}`);
    }

    // ========================================
    // Upsert rollup results into metric_results
    // ========================================
    let upsertedCount = 0;
    let upsertErrors: string[] = [];

    for (const rollup of rollups) {
      // Find or create metric by import_key
      const { data: existingMetric } = await supabase
        .from("metrics")
        .select("id")
        .eq("organization_id", organization_id)
        .eq("import_key", rollup.import_key)
        .maybeSingle();

      let metricId = existingMetric?.id;

      // Auto-create metric if it doesn't exist
      if (!metricId) {
        const metricDefaults = getMetricDefaults(rollup.import_key);
        const { data: newMetric, error: createError } = await supabase
          .from("metrics")
          .insert({
            organization_id: organization_id,
            name: rollup.metric_name,
            import_key: rollup.import_key,
            category: metricDefaults.category,
            unit: metricDefaults.unit,
            direction: metricDefaults.direction,
            sync_source: "jane",
            cadence: period_type,
            is_active: true,
          })
          .select("id")
          .single();

        if (createError) {
          console.error(`[jane-kpi-rollup] Failed to create metric ${rollup.import_key}: ${createError.message}`);
          upsertErrors.push(`Failed to create metric: ${rollup.import_key}`);
          continue;
        }
        metricId = newMetric.id;
        console.log(`[jane-kpi-rollup] Created new metric: ${rollup.metric_name} (${metricId})`);
      }

      // Upsert metric_result
      const weekStart = periodStartStr;
      const { error: resultError } = await supabase
        .from("metric_results")
        .upsert({
          metric_id: metricId,
          week_start: weekStart,
          period_start: weekStart,
          period_type: period_type,
          period_key: rollup.period_key,
          value: rollup.value,
          source: "jane_pipe",
          raw_row: { rollup_type: rollup.import_key, computed_at: new Date().toISOString() },
        }, { onConflict: "metric_id,period_key" });

      if (resultError) {
        console.error(`[jane-kpi-rollup] Failed to upsert result for ${rollup.import_key}: ${resultError.message}`);
        upsertErrors.push(`Failed to upsert result: ${rollup.import_key}`);
      } else {
        upsertedCount++;
      }
    }

    console.log(`[jane-kpi-rollup] Rollup complete. Upserted ${upsertedCount}/${rollups.length} metrics.`);

    return new Response(
      JSON.stringify({
        success: upsertErrors.length === 0,
        organization_id,
        period_type,
        period_key: periodKey,
        period_start: periodStartStr,
        period_end: periodEndStr,
        metrics_processed: rollups.length,
        metrics_upserted: upsertedCount,
        rollups: rollups.map(r => ({ name: r.metric_name, value: r.value })),
        errors: upsertErrors,
      }),
      { 
        status: upsertErrors.length > 0 ? 207 : 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error(`[jane-kpi-rollup] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Default values for auto-created metrics
function getMetricDefaults(importKey: string): { category: string; unit: string; direction: string } {
  const defaults: Record<string, { category: string; unit: string; direction: string }> = {
    jane_total_visits: { category: "Operations", unit: "visits", direction: "up" },
    jane_new_patient_visits: { category: "Growth", unit: "visits", direction: "up" },
    jane_cancelled_appointments: { category: "Operations", unit: "appointments", direction: "down" },
    jane_no_shows: { category: "Operations", unit: "appointments", direction: "down" },
    jane_total_collected: { category: "Revenue", unit: "$", direction: "up" },
    jane_total_invoiced: { category: "Revenue", unit: "$", direction: "up" },
    jane_avg_revenue_per_visit: { category: "Revenue", unit: "$", direction: "up" },
  };
  return defaults[importKey] || { category: "Operations", unit: "#", direction: "up" };
}
