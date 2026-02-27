import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Insight {
  clinic_guid: string;
  insight_key: string;
  title: string;
  summary: string;
  severity: "info" | "warning" | "critical" | "positive";
  value_primary: number | null;
  value_secondary: number | null;
  money_impact: number | null;
  data_json: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { organization_id } = await req.json();
    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve the clinic_guid (account_guid) for this org
    const { data: connector } = await supabase
      .from("bulk_analytics_connectors")
      .select("locked_account_guid")
      .eq("organization_id", organization_id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    const clinicGuid = connector?.locked_account_guid ?? organization_id;

    console.log(`[generate-clinic-insights] Starting for org=${organization_id}, clinic=${clinicGuid}`);

    // ── Date boundaries ──
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() + diff);
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    // ── Fetch staging data for current & previous week ──
    const [apptRes, payRes, invRes, shiftRes] = await Promise.all([
      supabase
        .from("staging_appointments_jane")
        .select("start_at, end_at, cancelled_at, no_show_at, first_visit, price, staff_member_guid, patient_guid")
        .eq("organization_id", organization_id)
        .gte("start_at", fmt(lastWeekStart))
        .lte("start_at", fmt(now)),
      supabase
        .from("staging_payments_jane")
        .select("amount, received_at, payment_type, payer_type")
        .eq("organization_id", organization_id)
        .gte("received_at", fmt(lastWeekStart))
        .lte("received_at", fmt(now)),
      supabase
        .from("staging_invoices_jane")
        .select("subtotal, amount_paid, invoiced_at, staff_member_guid")
        .eq("organization_id", organization_id)
        .gte("invoiced_at", fmt(lastWeekStart))
        .lte("invoiced_at", fmt(now)),
      supabase
        .from("staging_shifts_jane")
        .select("start_at, end_at, staff_member_guid")
        .eq("organization_id", organization_id)
        .gte("start_at", fmt(lastWeekStart))
        .lte("start_at", fmt(now)),
    ]);

    const appointments = apptRes.data ?? [];
    const payments = payRes.data ?? [];
    const invoices = invRes.data ?? [];
    const shifts = shiftRes.data ?? [];

    // ── Split into this-week vs last-week ──
    const twStr = fmt(thisWeekStart);
    const thisWeekAppts = appointments.filter((a) => a.start_at >= twStr);
    const lastWeekAppts = appointments.filter((a) => a.start_at < twStr);
    const thisWeekPayments = payments.filter((p) => p.received_at && p.received_at >= twStr);
    const lastWeekPayments = payments.filter((p) => p.received_at && p.received_at < twStr);

    const insights: Insight[] = [];

    // ═══════════════════════════════════════════
    // INSIGHT 1: Cancellation Rate Trend
    // ═══════════════════════════════════════════
    const twCancelled = thisWeekAppts.filter((a) => a.cancelled_at).length;
    const twTotal = thisWeekAppts.length;
    const lwCancelled = lastWeekAppts.filter((a) => a.cancelled_at).length;
    const lwTotal = lastWeekAppts.length;

    const twCancelRate = twTotal > 0 ? (twCancelled / twTotal) * 100 : 0;
    const lwCancelRate = lwTotal > 0 ? (lwCancelled / lwTotal) * 100 : 0;
    const cancelDelta = twCancelRate - lwCancelRate;

    if (twTotal > 0) {
      insights.push({
        clinic_guid: clinicGuid,
        insight_key: "cancellation_rate_trend",
        title: cancelDelta > 5
          ? "Cancellation Rate Spike"
          : cancelDelta < -5
            ? "Cancellation Rate Improving"
            : "Cancellation Rate Stable",
        summary: `This week: ${twCancelRate.toFixed(1)}% (${twCancelled}/${twTotal}). Last week: ${lwCancelRate.toFixed(1)}% (${lwCancelled}/${lwTotal}).`,
        severity: cancelDelta > 10 ? "critical" : cancelDelta > 5 ? "warning" : cancelDelta < -5 ? "positive" : "info",
        value_primary: Math.round(twCancelRate * 10) / 10,
        value_secondary: Math.round(lwCancelRate * 10) / 10,
        money_impact: twCancelled > 0 ? Math.round(twCancelled * (thisWeekAppts.reduce((s, a) => s + (Number(a.price) || 0), 0) / twTotal)) : null,
        data_json: { tw_cancelled: twCancelled, tw_total: twTotal, lw_cancelled: lwCancelled, lw_total: lwTotal, delta_pct: Math.round(cancelDelta * 10) / 10 },
      });
    }

    // ═══════════════════════════════════════════
    // INSIGHT 2: No-Show Rate
    // ═══════════════════════════════════════════
    const twNoShows = thisWeekAppts.filter((a) => a.no_show_at).length;
    const lwNoShows = lastWeekAppts.filter((a) => a.no_show_at).length;
    const twNoShowRate = twTotal > 0 ? (twNoShows / twTotal) * 100 : 0;
    const lwNoShowRate = lwTotal > 0 ? (lwNoShows / lwTotal) * 100 : 0;

    if (twTotal > 0) {
      insights.push({
        clinic_guid: clinicGuid,
        insight_key: "no_show_rate_trend",
        title: twNoShowRate > 10 ? "High No-Show Rate" : "No-Show Rate",
        summary: `${twNoShows} no-shows this week (${twNoShowRate.toFixed(1)}%), vs ${lwNoShows} last week (${lwNoShowRate.toFixed(1)}%).`,
        severity: twNoShowRate > 15 ? "critical" : twNoShowRate > 10 ? "warning" : "info",
        value_primary: Math.round(twNoShowRate * 10) / 10,
        value_secondary: Math.round(lwNoShowRate * 10) / 10,
        money_impact: null,
        data_json: { tw_no_shows: twNoShows, lw_no_shows: lwNoShows },
      });
    }

    // ═══════════════════════════════════════════
    // INSIGHT 3: Revenue Collected WoW
    // ═══════════════════════════════════════════
    const twRevenue = thisWeekPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const lwRevenue = lastWeekPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const revDelta = lwRevenue > 0 ? ((twRevenue - lwRevenue) / lwRevenue) * 100 : 0;

    if (twRevenue > 0 || lwRevenue > 0) {
      insights.push({
        clinic_guid: clinicGuid,
        insight_key: "revenue_collected_trend",
        title: revDelta < -15 ? "Revenue Drop" : revDelta > 15 ? "Revenue Growth" : "Revenue Collected",
        summary: `$${twRevenue.toFixed(0)} collected this week vs $${lwRevenue.toFixed(0)} last week (${revDelta >= 0 ? "+" : ""}${revDelta.toFixed(1)}%).`,
        severity: revDelta < -20 ? "critical" : revDelta < -10 ? "warning" : revDelta > 10 ? "positive" : "info",
        value_primary: Math.round(twRevenue),
        value_secondary: Math.round(lwRevenue),
        money_impact: Math.round(twRevenue - lwRevenue),
        data_json: { delta_pct: Math.round(revDelta * 10) / 10 },
      });
    }

    // ═══════════════════════════════════════════
    // INSIGHT 4: New Patient Volume
    // ═══════════════════════════════════════════
    const twNewPatients = thisWeekAppts.filter((a) => a.first_visit === true).length;
    const lwNewPatients = lastWeekAppts.filter((a) => a.first_visit === true).length;

    insights.push({
      clinic_guid: clinicGuid,
      insight_key: "new_patient_volume",
      title: twNewPatients === 0 ? "No New Patients" : "New Patient Volume",
      summary: `${twNewPatients} new patients this week vs ${lwNewPatients} last week.`,
      severity: twNewPatients === 0 && lwNewPatients > 0 ? "warning" : twNewPatients > lwNewPatients ? "positive" : "info",
      value_primary: twNewPatients,
      value_secondary: lwNewPatients,
      money_impact: null,
      data_json: {},
    });

    // ═══════════════════════════════════════════
    // INSIGHT 5: Invoiced vs Collected Gap
    // ═══════════════════════════════════════════
    const twInvoiced = invoices.filter((i) => i.invoiced_at && i.invoiced_at >= twStr).reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
    const twCollected = twRevenue;
    const collectionRate = twInvoiced > 0 ? (twCollected / twInvoiced) * 100 : 100;
    const gap = twInvoiced - twCollected;

    if (twInvoiced > 0) {
      insights.push({
        clinic_guid: clinicGuid,
        insight_key: "collection_gap",
        title: collectionRate < 70 ? "Large Collection Gap" : "Collection Rate",
        summary: `$${twInvoiced.toFixed(0)} invoiced, $${twCollected.toFixed(0)} collected (${collectionRate.toFixed(0)}% rate). Gap: $${gap.toFixed(0)}.`,
        severity: collectionRate < 50 ? "critical" : collectionRate < 70 ? "warning" : "info",
        value_primary: Math.round(collectionRate),
        value_secondary: null,
        money_impact: Math.round(gap),
        data_json: { invoiced: Math.round(twInvoiced), collected: Math.round(twCollected) },
      });
    }

    // ═══════════════════════════════════════════
    // INSIGHT 6: Provider Utilization
    // ═══════════════════════════════════════════
    const twShifts = shifts.filter((s) => s.start_at && s.start_at >= twStr);
    const totalShiftHours = twShifts.reduce((sum, s) => {
      const start = new Date(s.start_at);
      const end = new Date(s.end_at);
      return sum + (end.getTime() - start.getTime()) / 3600000;
    }, 0);
    const totalApptHours = thisWeekAppts.filter((a) => !a.cancelled_at && !a.no_show_at).reduce((sum, a) => {
      const start = new Date(a.start_at);
      const end = new Date(a.end_at);
      return sum + (end.getTime() - start.getTime()) / 3600000;
    }, 0);
    const utilization = totalShiftHours > 0 ? (totalApptHours / totalShiftHours) * 100 : 0;

    if (totalShiftHours > 0) {
      insights.push({
        clinic_guid: clinicGuid,
        insight_key: "provider_utilization",
        title: utilization < 60 ? "Low Provider Utilization" : "Provider Utilization",
        summary: `${totalApptHours.toFixed(0)}h booked of ${totalShiftHours.toFixed(0)}h available (${utilization.toFixed(0)}%).`,
        severity: utilization < 50 ? "critical" : utilization < 65 ? "warning" : utilization > 85 ? "positive" : "info",
        value_primary: Math.round(utilization),
        value_secondary: null,
        money_impact: null,
        data_json: { appt_hours: Math.round(totalApptHours), shift_hours: Math.round(totalShiftHours) },
      });
    }

    // ── Upsert all insights ──
    console.log(`[generate-clinic-insights] Upserting ${insights.length} insights`);

    for (const insight of insights) {
      const { error } = await supabase
        .from("clinic_insights")
        .upsert(insight, { onConflict: "clinic_guid,insight_key" });

      if (error) {
        console.error(`[generate-clinic-insights] Upsert failed for ${insight.insight_key}:`, error.message);
      }
    }

    console.log(`[generate-clinic-insights] Done. ${insights.length} insights written.`);

    return new Response(
      JSON.stringify({ success: true, insights_count: insights.length, insights: insights.map((i) => ({ key: i.insight_key, severity: i.severity, title: i.title })) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-clinic-insights] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
