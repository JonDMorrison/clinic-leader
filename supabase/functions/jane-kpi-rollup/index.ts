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
  owner?: string; // Provider name for per-provider metrics
}

interface StaffMember {
  staff_member_guid: string;
  staff_member_name: string;
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
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    } else {
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
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

    const rollups: RollupResult[] = [];

    // ========================================
    // ORGANIZATION-LEVEL METRICS
    // ========================================

    // Fetch all appointments for the period
    const { data: allAppointments, error: apptError } = await supabase
      .from("staging_appointments_jane")
      .select("id, staff_member_guid, staff_member_name, cancelled_at, no_show_at, arrived_at, first_visit")
      .eq("organization_id", organization_id)
      .gte("start_at", periodStartStr)
      .lte("start_at", periodEndStr);

    if (apptError) {
      console.error(`[jane-kpi-rollup] Failed to fetch appointments: ${apptError.message}`);
    }

    const appointments = allAppointments || [];
    const nonCancelled = appointments.filter(a => !a.cancelled_at);
    const cancelled = appointments.filter(a => a.cancelled_at);
    const noShows = appointments.filter(a => a.no_show_at);
    const newPatients = nonCancelled.filter(a => a.first_visit);
    const arrivedCount = nonCancelled.filter(a => a.arrived_at).length;

    // KPI 1: Total Visits
    rollups.push({
      metric_name: "Total Visits",
      import_key: "jane_total_visits",
      value: nonCancelled.length,
      period_key: periodKey,
      period_start: periodStartStr,
    });
    console.log(`[jane-kpi-rollup] Total Visits: ${nonCancelled.length}`);

    // KPI 2: New Patient Visits
    rollups.push({
      metric_name: "New Patient Visits",
      import_key: "jane_new_patient_visits",
      value: newPatients.length,
      period_key: periodKey,
      period_start: periodStartStr,
    });
    console.log(`[jane-kpi-rollup] New Patient Visits: ${newPatients.length}`);

    // KPI 3: Cancelled Appointments
    rollups.push({
      metric_name: "Cancelled Appointments",
      import_key: "jane_cancelled_appointments",
      value: cancelled.length,
      period_key: periodKey,
      period_start: periodStartStr,
    });
    console.log(`[jane-kpi-rollup] Cancelled Appointments: ${cancelled.length}`);

    // KPI 4: No Shows
    rollups.push({
      metric_name: "No Shows",
      import_key: "jane_no_shows",
      value: noShows.length,
      period_key: periodKey,
      period_start: periodStartStr,
    });
    console.log(`[jane-kpi-rollup] No Shows: ${noShows.length}`);

    // KPI 5: Show Rate %
    const totalBooked = appointments.length;
    const showRate = totalBooked > 0 ? Math.round((arrivedCount / totalBooked) * 10000) / 100 : 0;
    rollups.push({
      metric_name: "Show Rate %",
      import_key: "jane_show_rate",
      value: showRate,
      period_key: periodKey,
      period_start: periodStartStr,
    });
    console.log(`[jane-kpi-rollup] Show Rate: ${showRate}%`);

    // KPI 6: Cancellation Rate %
    const cancellationRate = totalBooked > 0 ? Math.round((cancelled.length / totalBooked) * 10000) / 100 : 0;
    rollups.push({
      metric_name: "Cancellation Rate %",
      import_key: "jane_cancellation_rate",
      value: cancellationRate,
      period_key: periodKey,
      period_start: periodStartStr,
    });
    console.log(`[jane-kpi-rollup] Cancellation Rate: ${cancellationRate}%`);

    // Fetch payments for revenue metrics
    const { data: paymentsData, error: paymentsError } = await supabase
      .from("staging_payments_jane")
      .select("amount")
      .eq("organization_id", organization_id)
      .gte("received_at", periodStartStr)
      .lte("received_at", periodEndStr);

    const totalCollected = (paymentsData || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // KPI 7: Total Collected Revenue
    rollups.push({
      metric_name: "Total Collected Revenue",
      import_key: "jane_total_collected",
      value: Math.round(totalCollected * 100) / 100,
      period_key: periodKey,
      period_start: periodStartStr,
    });
    console.log(`[jane-kpi-rollup] Total Collected Revenue: ${totalCollected}`);

    // Fetch invoices for invoiced revenue and per-provider breakdown
    const { data: invoicesData, error: invoicesError } = await supabase
      .from("staging_invoices_jane")
      .select("subtotal, amount_paid, staff_member_guid, staff_member_name")
      .eq("organization_id", organization_id)
      .gte("invoiced_at", periodStartStr)
      .lte("invoiced_at", periodEndStr);

    const invoices = invoicesData || [];
    const totalInvoiced = invoices.reduce((sum, i) => sum + (Number(i.subtotal) || 0), 0);

    // KPI 8: Total Invoiced
    rollups.push({
      metric_name: "Total Invoiced",
      import_key: "jane_total_invoiced",
      value: Math.round(totalInvoiced * 100) / 100,
      period_key: periodKey,
      period_start: periodStartStr,
    });
    console.log(`[jane-kpi-rollup] Total Invoiced: ${totalInvoiced}`);

    // KPI 9: Average Revenue Per Visit
    const avgRevenuePerVisit = nonCancelled.length > 0 ? totalCollected / nonCancelled.length : 0;
    rollups.push({
      metric_name: "Average Revenue Per Visit",
      import_key: "jane_avg_revenue_per_visit",
      value: Math.round(avgRevenuePerVisit * 100) / 100,
      period_key: periodKey,
      period_start: periodStartStr,
    });
    console.log(`[jane-kpi-rollup] Average Revenue Per Visit: ${avgRevenuePerVisit}`);

    // ========================================
    // PER-PROVIDER METRICS
    // ========================================

    // Collect unique staff members from appointments and invoices
    const staffMap = new Map<string, string>();
    
    for (const appt of appointments) {
      if (appt.staff_member_guid && appt.staff_member_name) {
        staffMap.set(appt.staff_member_guid, appt.staff_member_name);
      }
    }
    for (const inv of invoices) {
      if (inv.staff_member_guid && inv.staff_member_name) {
        staffMap.set(inv.staff_member_guid, inv.staff_member_name);
      }
    }

    const uniqueStaff: StaffMember[] = Array.from(staffMap.entries()).map(([guid, name]) => ({
      staff_member_guid: guid,
      staff_member_name: name,
    }));

    console.log(`[jane-kpi-rollup] Found ${uniqueStaff.length} unique staff members`);

    // Auto-create provider users
    const createdProviders: string[] = [];
    for (const staff of uniqueStaff) {
      if (!staff.staff_member_name || staff.staff_member_name.trim() === "") continue;

      // Check if user exists with this jane_staff_member_guid
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("jane_staff_member_guid", staff.staff_member_guid)
        .maybeSingle();

      if (!existingUser) {
        // Create new provider user
        const { data: newUser, error: createUserError } = await supabase
          .from("users")
          .insert({
            email: `provider-${staff.staff_member_guid.slice(0, 8)}@jane-sync.local`,
            full_name: staff.staff_member_name,
            role: "provider",
            team_id: organization_id,
            jane_staff_member_guid: staff.staff_member_guid,
          })
          .select("id")
          .single();

        if (createUserError) {
          console.error(`[jane-kpi-rollup] Failed to create user for ${staff.staff_member_name}: ${createUserError.message}`);
        } else if (newUser) {
          createdProviders.push(staff.staff_member_name);
          console.log(`[jane-kpi-rollup] Created provider user: ${staff.staff_member_name} (${newUser.id})`);
          
          // Create user_roles entry
          await supabase.from("user_roles").insert({
            user_id: newUser.id,
            role: "provider",
          });
        }
      }
    }

    // Generate per-provider metrics
    for (const staff of uniqueStaff) {
      if (!staff.staff_member_name || staff.staff_member_name.trim() === "") continue;

      const providerName = staff.staff_member_name;
      const staffGuid = staff.staff_member_guid;

      // Provider Visits
      const providerAppointments = nonCancelled.filter(a => a.staff_member_guid === staffGuid);
      rollups.push({
        metric_name: `Visits (${providerName})`,
        import_key: `jane_visits_${staffGuid}`,
        value: providerAppointments.length,
        period_key: periodKey,
        period_start: periodStartStr,
        owner: providerName,
      });

      // Provider New Patients
      const providerNewPatients = providerAppointments.filter(a => a.first_visit);
      rollups.push({
        metric_name: `New Patients (${providerName})`,
        import_key: `jane_new_patients_${staffGuid}`,
        value: providerNewPatients.length,
        period_key: periodKey,
        period_start: periodStartStr,
        owner: providerName,
      });

      // Provider No Shows
      const providerNoShows = appointments.filter(a => a.staff_member_guid === staffGuid && a.no_show_at);
      rollups.push({
        metric_name: `No Shows (${providerName})`,
        import_key: `jane_no_shows_${staffGuid}`,
        value: providerNoShows.length,
        period_key: periodKey,
        period_start: periodStartStr,
        owner: providerName,
      });

      // Provider Cancellations
      const providerCancellations = cancelled.filter(a => a.staff_member_guid === staffGuid);
      rollups.push({
        metric_name: `Cancellations (${providerName})`,
        import_key: `jane_cancellations_${staffGuid}`,
        value: providerCancellations.length,
        period_key: periodKey,
        period_start: periodStartStr,
        owner: providerName,
      });

      // Provider Revenue Invoiced
      const providerInvoices = invoices.filter(i => i.staff_member_guid === staffGuid);
      const providerInvoiced = providerInvoices.reduce((sum, i) => sum + (Number(i.subtotal) || 0), 0);
      rollups.push({
        metric_name: `Revenue Invoiced (${providerName})`,
        import_key: `jane_invoiced_${staffGuid}`,
        value: Math.round(providerInvoiced * 100) / 100,
        period_key: periodKey,
        period_start: periodStartStr,
        owner: providerName,
      });

      // Provider Revenue Collected (from invoices amount_paid)
      const providerCollected = providerInvoices.reduce((sum, i) => sum + (Number(i.amount_paid) || 0), 0);
      rollups.push({
        metric_name: `Revenue Collected (${providerName})`,
        import_key: `jane_collected_${staffGuid}`,
        value: Math.round(providerCollected * 100) / 100,
        period_key: periodKey,
        period_start: periodStartStr,
        owner: providerName,
      });

      console.log(`[jane-kpi-rollup] Provider ${providerName}: ${providerAppointments.length} visits, $${providerInvoiced} invoiced`);
    }

    // ========================================
    // UPSERT ALL METRICS
    // ========================================
    let upsertedCount = 0;
    const upsertErrors: string[] = [];

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
            owner: rollup.owner || null,
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
      // Uses unique constraint: idx_metric_results_period_unique (metric_id, period_type, period_start)
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
        }, { onConflict: "metric_id,period_type,period_start" });

      if (resultError) {
        console.error(`[jane-kpi-rollup] Failed to upsert result for ${rollup.import_key}: ${resultError.message}`);
        upsertErrors.push(`Failed to upsert result: ${rollup.import_key}`);
      } else {
        upsertedCount++;
      }
    }

    console.log(`[jane-kpi-rollup] Rollup complete. Upserted ${upsertedCount}/${rollups.length} metrics, created ${createdProviders.length} new providers.`);

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
        providers_found: uniqueStaff.length,
        providers_created: createdProviders,
        rollups: rollups.map(r => ({ name: r.metric_name, value: r.value, owner: r.owner })),
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
  // Organization-level metrics
  const orgDefaults: Record<string, { category: string; unit: string; direction: string }> = {
    jane_total_visits: { category: "Operations", unit: "visits", direction: "up" },
    jane_new_patient_visits: { category: "Growth", unit: "visits", direction: "up" },
    jane_cancelled_appointments: { category: "Operations", unit: "appointments", direction: "down" },
    jane_no_shows: { category: "Operations", unit: "appointments", direction: "down" },
    jane_show_rate: { category: "Operations", unit: "%", direction: "up" },
    jane_cancellation_rate: { category: "Operations", unit: "%", direction: "down" },
    jane_total_collected: { category: "Revenue", unit: "$", direction: "up" },
    jane_total_invoiced: { category: "Revenue", unit: "$", direction: "up" },
    jane_avg_revenue_per_visit: { category: "Revenue", unit: "$", direction: "up" },
  };

  if (orgDefaults[importKey]) {
    return orgDefaults[importKey];
  }

  // Per-provider metrics (pattern matching)
  if (importKey.startsWith("jane_visits_")) {
    return { category: "Provider - Operations", unit: "visits", direction: "up" };
  }
  if (importKey.startsWith("jane_new_patients_")) {
    return { category: "Provider - Growth", unit: "patients", direction: "up" };
  }
  if (importKey.startsWith("jane_no_shows_")) {
    return { category: "Provider - Operations", unit: "appointments", direction: "down" };
  }
  if (importKey.startsWith("jane_cancellations_")) {
    return { category: "Provider - Operations", unit: "appointments", direction: "down" };
  }
  if (importKey.startsWith("jane_invoiced_")) {
    return { category: "Provider - Revenue", unit: "$", direction: "up" };
  }
  if (importKey.startsWith("jane_collected_")) {
    return { category: "Provider - Revenue", unit: "$", direction: "up" };
  }

  return { category: "Operations", unit: "#", direction: "up" };
}
