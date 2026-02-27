import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getLatestCompletedWeek, getPriorWeek } from "../_shared/week-boundaries.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Rates above this % are flagged as anomalous (e.g. 150 = 150%). */
const COLLECTION_RATE_ANOMALY_THRESHOLD = 150;

// ── Types ──

interface Insight {
  clinic_guid: string;
  organization_id: string;
  insight_key: string;
  title: string;
  summary: string;
  severity: "info" | "warning" | "critical" | "positive";
  value_primary: number | null;
  value_secondary: number | null;
  money_impact: number | null;
  data_json: Record<string, unknown>;
  period_start: string;
  period_end: string;
  run_id: string;
  computed_at: string;
}

// ── Computation helpers (pure, deterministic) ──

function computeInsights(
  currentAppts: any[],
  priorAppts: any[],
  currentPayments: any[],
  priorPayments: any[],
  currentInvoices: any[],
  currentShifts: any[],
  clinicGuid: string,
  organizationId: string,
  periodStart: string,
  periodEnd: string,
  runId: string,
  computedAt: string,
): Insight[] {
  const insights: Insight[] = [];
  const base = { clinic_guid: clinicGuid, organization_id: organizationId, period_start: periodStart, period_end: periodEnd, run_id: runId, computed_at: computedAt };

  const cwTotal = currentAppts.length;
  const pwTotal = priorAppts.length;

  /** Clamp a percentage to [0, 100] */
  const clamp = (v: number) => Math.min(100, Math.max(0, v));

  // 1: Cancellation Rate Trend
  const cwCancelled = currentAppts.filter(a => a.cancelled_at).length;
  const pwCancelled = priorAppts.filter(a => a.cancelled_at).length;
  const cwCancelRate = cwTotal > 0 ? clamp((cwCancelled / cwTotal) * 100) : 0;
  const pwCancelRate = pwTotal > 0 ? clamp((pwCancelled / pwTotal) * 100) : 0;
  const cancelDelta = cwCancelRate - pwCancelRate;

  if (cwTotal > 0) {
    const avgPrice = currentAppts.reduce((s, a) => s + (Number(a.price) || 0), 0) / cwTotal;
    insights.push({
      ...base,
      insight_key: "cancellation_rate_trend",
      title: cancelDelta > 5 ? "Cancellation Rate Spike" : cancelDelta < -5 ? "Cancellation Rate Improving" : "Cancellation Rate Stable",
      summary: `${cwCancelRate.toFixed(1)}% (${cwCancelled}/${cwTotal}) vs prior ${pwCancelRate.toFixed(1)}% (${pwCancelled}/${pwTotal}).`,
      severity: cancelDelta > 10 ? "critical" : cancelDelta > 5 ? "warning" : cancelDelta < -5 ? "positive" : "info",
      value_primary: Math.round(cwCancelRate * 10) / 10,
      value_secondary: Math.round(pwCancelRate * 10) / 10,
      money_impact: cwCancelled > 0 ? Math.round(cwCancelled * avgPrice) : null,
      data_json: { cw_cancelled: cwCancelled, cw_total: cwTotal, pw_cancelled: pwCancelled, pw_total: pwTotal, delta_pct: Math.round(cancelDelta * 10) / 10 },
    });
  }

  // 2: No-Show Rate
  const cwNoShows = currentAppts.filter(a => a.no_show_at).length;
  const pwNoShows = priorAppts.filter(a => a.no_show_at).length;
  const cwNoShowRate = cwTotal > 0 ? clamp((cwNoShows / cwTotal) * 100) : 0;
  const pwNoShowRate = pwTotal > 0 ? clamp((pwNoShows / pwTotal) * 100) : 0;

  if (cwTotal > 0) {
    insights.push({
      ...base,
      insight_key: "no_show_rate_trend",
      title: cwNoShowRate > 10 ? "High No-Show Rate" : "No-Show Rate",
      summary: `${cwNoShows} no-shows (${cwNoShowRate.toFixed(1)}%) vs prior ${pwNoShows} (${pwNoShowRate.toFixed(1)}%).`,
      severity: cwNoShowRate > 15 ? "critical" : cwNoShowRate > 10 ? "warning" : "info",
      value_primary: Math.round(cwNoShowRate * 10) / 10,
      value_secondary: Math.round(pwNoShowRate * 10) / 10,
      money_impact: null,
      data_json: { cw_no_shows: cwNoShows, pw_no_shows: pwNoShows },
    });
  }

  // 3: Revenue Collected WoW
  const cwRevenue = currentPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const pwRevenue = priorPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const revDelta = pwRevenue > 0 ? ((cwRevenue - pwRevenue) / pwRevenue) * 100 : 0;

  if (cwRevenue > 0 || pwRevenue > 0) {
    insights.push({
      ...base,
      insight_key: "revenue_collected_trend",
      title: revDelta < -15 ? "Revenue Drop" : revDelta > 15 ? "Revenue Growth" : "Revenue Collected",
      summary: `$${cwRevenue.toFixed(0)} collected vs prior $${pwRevenue.toFixed(0)} (${revDelta >= 0 ? "+" : ""}${revDelta.toFixed(1)}%).`,
      severity: revDelta < -20 ? "critical" : revDelta < -10 ? "warning" : revDelta > 10 ? "positive" : "info",
      value_primary: Math.round(cwRevenue),
      value_secondary: Math.round(pwRevenue),
      money_impact: Math.round(cwRevenue - pwRevenue),
      data_json: { delta_pct: Math.round(revDelta * 10) / 10 },
    });
  }

  // 4: New Patient Volume
  const cwNewPatients = currentAppts.filter(a => a.first_visit === true && !a.cancelled_at && !a.no_show_at).length;
  const pwNewPatients = priorAppts.filter(a => a.first_visit === true && !a.cancelled_at && !a.no_show_at).length;

  insights.push({
    ...base,
    insight_key: "new_patient_volume",
    title: cwNewPatients === 0 ? "No New Patients" : "New Patient Volume",
    summary: `${cwNewPatients} new patients vs prior ${pwNewPatients}.`,
    severity: cwNewPatients === 0 && pwNewPatients > 0 ? "warning" : cwNewPatients > pwNewPatients ? "positive" : "info",
    value_primary: cwNewPatients,
    value_secondary: pwNewPatients,
    money_impact: null,
    data_json: {},
  });

  // 5: Collection Gap
  //
  // DEFINITION (Option A — cash-basis collection rate):
  //   collection_rate = (payments_collected_in_period / invoices_subtotal_in_period) × 100
  //
  // Numerator:  Sum of staging_payments_jane.amount   for the current week
  // Denominator: Sum of staging_invoices_jane.subtotal for the current week
  //
  // Why Option A over Option B (invoices.amount_paid / invoices.subtotal):
  //   - Option A reflects actual cash received vs. billed work, which is the
  //     operationally relevant signal for clinic owners ("did we collect?").
  //   - Option B would only reflect the invoice-level paid status, which can
  //     lag behind actual payment receipt and double-count partial payments.
  //
  // Limitation: Payments and invoices are matched by time period, NOT by invoice.
  //   A payment received this week may settle an invoice from a prior week,
  //   causing the rate to exceed 100%. This is expected and acceptable — rates
   //   above 100% indicate catch-up collection, not an error. Rates above
   //   COLLECTION_RATE_ANOMALY_THRESHOLD are flagged as anomalous.
  //
  const cwInvoiced = currentInvoices.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
  // NOTE: Do NOT clamp here — rate can legitimately exceed 100% due to timing
  const rawCollectionRate = cwInvoiced > 0 ? (cwRevenue / cwInvoiced) * 100 : 100;
  const collectionRate = Math.max(0, Math.round(rawCollectionRate * 10) / 10);
  const gap = Math.max(0, cwInvoiced - cwRevenue);

  if (cwInvoiced > 0) {
    // Sanity check: rate above threshold indicates data anomaly
    const isAnomalous = collectionRate > COLLECTION_RATE_ANOMALY_THRESHOLD;
    const baseSeverity = collectionRate < 50 ? "critical" : collectionRate < 70 ? "warning" : collectionRate > 100 ? "positive" : "info";
    const severity = isAnomalous ? "warning" : baseSeverity;

    // ── Title by severity band ──
    // critical (<50%):  "Low Collection Rate (Cash Basis)"
    // warning  (<70%):  "Collection Rate Below Target (Cash Basis)"
    // warning  (>COLLECTION_RATE_ANOMALY_THRESHOLD): "Collection Rate Anomaly (Cash Basis)"
    // positive (>100%): "Strong Collection Rate (Cash Basis)"
    // info:             "Collection Rate (Cash Basis)"
    const title = isAnomalous
      ? "Collection Rate Anomaly (Cash Basis)"
      : collectionRate < 50
        ? "Low Collection Rate (Cash Basis)"
        : collectionRate < 70
          ? "Collection Rate Below Target (Cash Basis)"
          : collectionRate > 100
            ? "Strong Collection Rate (Cash Basis)"
            : "Collection Rate (Cash Basis)";

    // ── Summary templates ──
    // Base: "Payments received this week ÷ invoices issued this week = X%."
    // >100%: append catch-up note
    // >COLLECTION_RATE_ANOMALY_THRESHOLD: anomaly note
    // <70%:  append cash shortfall
    let summary: string;
    if (isAnomalous) {
      summary = `Payments received this week ÷ invoices issued this week = ${collectionRate.toFixed(0)}%. Rate exceeds ${COLLECTION_RATE_ANOMALY_THRESHOLD}% — likely includes catch-up payments from prior invoices or a bulk settlement. ($${cwRevenue.toFixed(0)} collected / $${cwInvoiced.toFixed(0)} invoiced.)`;
    } else if (collectionRate > 100) {
      summary = `Payments received this week ÷ invoices issued this week = ${collectionRate.toFixed(0)}%. Includes catch-up payments from prior invoices. ($${cwRevenue.toFixed(0)} collected / $${cwInvoiced.toFixed(0)} invoiced.)`;
    } else if (collectionRate < 70) {
      summary = `Payments received this week ÷ invoices issued this week = ${collectionRate.toFixed(0)}%. Cash shortfall vs this week's invoicing: $${gap.toFixed(0)}. ($${cwRevenue.toFixed(0)} collected / $${cwInvoiced.toFixed(0)} invoiced.)`;
    } else {
      summary = `Payments received this week ÷ invoices issued this week = ${collectionRate.toFixed(0)}%. ($${cwRevenue.toFixed(0)} collected / $${cwInvoiced.toFixed(0)} invoiced.)`;
    }

    insights.push({
      ...base,
      insight_key: "collection_gap",
      title,
      summary,
      severity,
      value_primary: Math.round(collectionRate),
      value_secondary: null,
      // money_impact = cash shortfall vs this week's invoicing (0 when rate ≥ 100%)
      money_impact: Math.round(gap),
      data_json: { invoiced: Math.round(cwInvoiced), collected: Math.round(cwRevenue), anomalous: isAnomalous },
    });
  }

  // 6: Provider Utilization
  const shiftHours = currentShifts.reduce((sum, s) => {
    return sum + (new Date(s.end_at).getTime() - new Date(s.start_at).getTime()) / 3600000;
  }, 0);
  const apptHours = currentAppts.filter(a => !a.cancelled_at && !a.no_show_at).reduce((sum, a) => {
    return sum + (new Date(a.end_at).getTime() - new Date(a.start_at).getTime()) / 3600000;
  }, 0);
  const utilization = shiftHours > 0 ? clamp((apptHours / shiftHours) * 100) : 0;

  if (shiftHours > 0) {
    insights.push({
      ...base,
      insight_key: "provider_utilization",
      title: utilization < 60 ? "Low Provider Utilization" : "Provider Utilization",
      summary: `${apptHours.toFixed(0)}h booked of ${shiftHours.toFixed(0)}h available (${utilization.toFixed(0)}%).`,
      severity: utilization < 50 ? "critical" : utilization < 65 ? "warning" : utilization > 85 ? "positive" : "info",
      value_primary: Math.round(utilization),
      value_secondary: null,
      money_impact: null,
      data_json: { appt_hours: Math.round(apptHours), shift_hours: Math.round(shiftHours) },
    });
  }

  return insights;
}

// ── Main handler ──

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

    const runId = crypto.randomUUID();
    const computedAt = new Date().toISOString();

    // Resolve clinic_guid
    const { data: connector } = await supabase
      .from("bulk_analytics_connectors")
      .select("locked_account_guid")
      .eq("organization_id", organization_id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    const clinicGuid = connector?.locked_account_guid ?? organization_id;

    // Calculate deterministic week boundaries in America/Los_Angeles
    const now = new Date();
    const cw = getLatestCompletedWeek(now);   // most recent completed Mon–Sun
    const pw = getPriorWeek(cw.weekStart);  // the week before that

    console.log(`[generate-clinic-insights] run_id=${runId} org=${organization_id} clinic=${clinicGuid}`);
    console.log(`[generate-clinic-insights] current_week=${cw.weekStart}..${cw.weekEnd}, prior_week=${pw.weekStart}..${pw.weekEnd}`);

    // Fetch data for both weeks in parallel (explicit limit to avoid 1000-row default)
    const SAFE_LIMIT = 10000;
    const fetchWeek = (start: string, end: string) => Promise.all([
      supabase.from("staging_appointments_jane")
        .select("start_at, end_at, cancelled_at, no_show_at, first_visit, price, staff_member_guid, patient_guid")
        .eq("organization_id", organization_id)
        .gte("start_at", start).lte("start_at", end + "T23:59:59")
        .limit(SAFE_LIMIT),
      supabase.from("staging_payments_jane")
        .select("amount, received_at, payment_type, payer_type")
        .eq("organization_id", organization_id)
        .gte("received_at", start).lte("received_at", end + "T23:59:59")
        .limit(SAFE_LIMIT),
      supabase.from("staging_invoices_jane")
        .select("subtotal, amount_paid, invoiced_at, staff_member_guid")
        .eq("organization_id", organization_id)
        .gte("invoiced_at", start).lte("invoiced_at", end + "T23:59:59")
        .limit(SAFE_LIMIT),
      supabase.from("staging_shifts_jane")
        .select("start_at, end_at, staff_member_guid")
        .eq("organization_id", organization_id)
        .gte("start_at", start).lte("start_at", end + "T23:59:59")
        .limit(SAFE_LIMIT),
    ]);

    const [cwData, pwData] = await Promise.all([
      fetchWeek(cw.weekStart, cw.weekEnd),
      fetchWeek(pw.weekStart, pw.weekEnd),
    ]);

    const [cwAppts, cwPayments, cwInvoices, cwShifts] = cwData.map(r => r.data ?? []);
    const [pwAppts, pwPayments] = pwData.map(r => r.data ?? []);

    // Compute deterministic insights
    const insights = computeInsights(
      cwAppts, pwAppts, cwPayments, pwPayments, cwInvoices, cwShifts,
      clinicGuid, organization_id, cw.weekStart, cw.weekEnd, runId, computedAt,
    );

    // Upsert (keyed on clinic_guid + insight_key + period_start)
    console.log(`[generate-clinic-insights] Upserting ${insights.length} insights for period ${cw.weekStart}`);

    for (const insight of insights) {
      const { error } = await supabase
        .from("clinic_insights")
        .upsert(insight, { onConflict: "clinic_guid,insight_key,period_start" });
      if (error) {
        console.error(`[generate-clinic-insights] Upsert failed for ${insight.insight_key}:`, error.message);
      }
    }

    console.log(`[generate-clinic-insights] Done. run_id=${runId}, ${insights.length} insights.`);

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        computed_at: computedAt,
        period: { start: cw.weekStart, end: cw.weekEnd },
        prior_period: { start: pw.weekStart, end: pw.weekEnd },
        insights_count: insights.length,
        insights: insights.map(i => ({ key: i.insight_key, severity: i.severity, title: i.title })),
      }),
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
