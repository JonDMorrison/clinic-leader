import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Paginated fetch helper — works around Supabase's 1000-row default limit.
 * Fetches all matching rows by requesting pages of PAGE_SIZE until exhausted.
 */
const PAGE_SIZE = 1000;

async function fetchAllRows<T = Record<string, unknown>>(
  query: ReturnType<ReturnType<typeof createClient>["from"]>["select"] extends (...args: any) => infer R ? R : never,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await (query as any).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Paginated fetch error: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break; // last page
    from += PAGE_SIZE;
  }
  return all;
}

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

interface BreakdownEntry {
  dimension_type: "clinician" | "location" | "discipline";
  dimension_id: string;
  dimension_label: string;
  value: number;
  import_key: string;
  period_type: "weekly" | "monthly" | "ytd";
  period_key: string;
  period_start: string;
  period_end: string;
}

// Metrics that support breakdowns (all three dimension types)
const BREAKDOWN_METRICS = {
  jane_total_visits: ["clinician", "location", "discipline"],
  jane_total_invoiced: ["clinician", "location", "discipline"],
  jane_total_collected: ["clinician", "location", "discipline"],
};

// Label fallback helpers
function getClinicianFallbackLabel(guid: string): string {
  return `Clinician • ${guid.slice(-6)}`;
}

function getLocationFallbackLabel(guid: string): string {
  return `Location • ${guid.slice(-6)}`;
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

    // YTD period (Jan 1 to now)
    const ytdStart = new Date(now.getFullYear(), 0, 1);
    const ytdStartStr = ytdStart.toISOString().slice(0, 10);
    const ytdEndStr = now.toISOString().slice(0, 10);
    const ytdKey = `${now.getFullYear()}-YTD`;

    console.log(`[jane-kpi-rollup] Period: ${periodStartStr} to ${periodEndStr}, key: ${periodKey}`);
    console.log(`[jane-kpi-rollup] YTD: ${ytdStartStr} to ${ytdEndStr}`);

    const rollups: RollupResult[] = [];
    const breakdowns: BreakdownEntry[] = [];

    // ========================================
    // ORGANIZATION-LEVEL METRICS
    // ========================================

    // Fetch all appointments for the period (paginated to avoid 1000-row limit)
    let allAppointments: any[] = [];
    try {
      allAppointments = await fetchAllRows(
        supabase.from("staging_appointments_jane")
          .select("id, staff_member_guid, staff_member_name, cancelled_at, no_show_at, arrived_at, first_visit, discipline_name, location_name")
          .eq("organization_id", organization_id)
          .gte("start_at", periodStartStr)
          .lte("start_at", periodEndStr)
      );
    } catch (e) {
      console.error(`[jane-kpi-rollup] Failed to fetch appointments: ${(e as Error).message}`);
    }

    // Fetch YTD appointments (paginated — critical for orgs with >1000 appts/year)
    let ytdAppointments: any[] = [];
    try {
      ytdAppointments = await fetchAllRows(
        supabase.from("staging_appointments_jane")
          .select("id, staff_member_guid, staff_member_name, cancelled_at, no_show_at, arrived_at, first_visit, discipline_name, location_name")
          .eq("organization_id", organization_id)
          .gte("start_at", ytdStartStr)
          .lte("start_at", ytdEndStr)
      );
    } catch (e) {
      console.error(`[jane-kpi-rollup] Failed to fetch YTD appointments: ${(e as Error).message}`);
    }

    const appointments = allAppointments || [];
    const nonCancelled = appointments.filter(a => !a.cancelled_at);
    const cancelled = appointments.filter(a => a.cancelled_at);
    const noShows = appointments.filter(a => a.no_show_at);
    const newPatients = nonCancelled.filter(a => a.first_visit);
    const arrivedCount = nonCancelled.filter(a => a.arrived_at).length;

    const ytdNonCancelled = (ytdAppointments || []).filter(a => !a.cancelled_at);

    // ========================================
    // BUILD LABEL LOOKUP MAPS
    // ========================================
    
    // Staff label map: staff_guid → staff_name (from appointments)
    const staffLabelMap = new Map<string, string>();
    for (const appt of [...appointments, ...(ytdAppointments || [])]) {
      if (appt.staff_member_guid && appt.staff_member_name) {
        staffLabelMap.set(appt.staff_member_guid, appt.staff_member_name);
      }
    }
    console.log(`[jane-kpi-rollup] Built staff label map with ${staffLabelMap.size} entries`);
    
    // Staff → Discipline map: infer primary discipline from appointment frequency
    // This allows us to break down revenue by discipline even though invoices don't have discipline_name
    const staffDisciplineCounts = new Map<string, Map<string, number>>();
    for (const appt of [...appointments, ...(ytdAppointments || [])]) {
      if (appt.staff_member_guid && appt.discipline_name) {
        if (!staffDisciplineCounts.has(appt.staff_member_guid)) {
          staffDisciplineCounts.set(appt.staff_member_guid, new Map());
        }
        const counts = staffDisciplineCounts.get(appt.staff_member_guid)!;
        counts.set(appt.discipline_name, (counts.get(appt.discipline_name) || 0) + 1);
      }
    }
    
    // Pick the most frequent discipline for each staff member
    const staffToDiscipline = new Map<string, string>();
    for (const [staffGuid, disciplineCounts] of staffDisciplineCounts) {
      let maxCount = 0;
      let primaryDiscipline = "";
      for (const [discipline, count] of disciplineCounts) {
        if (count > maxCount) {
          maxCount = count;
          primaryDiscipline = discipline;
        }
      }
      if (primaryDiscipline) {
        staffToDiscipline.set(staffGuid, primaryDiscipline);
      }
    }
    console.log(`[jane-kpi-rollup] Built staff→discipline map with ${staffToDiscipline.size} entries`);
    
    // Staff → Location map: infer primary location from appointment frequency
    const staffLocationCounts = new Map<string, Map<string, number>>();
    for (const appt of [...appointments, ...(ytdAppointments || [])]) {
      if (appt.staff_member_guid && appt.location_name) {
        if (!staffLocationCounts.has(appt.staff_member_guid)) {
          staffLocationCounts.set(appt.staff_member_guid, new Map());
        }
        const counts = staffLocationCounts.get(appt.staff_member_guid)!;
        counts.set(appt.location_name, (counts.get(appt.location_name) || 0) + 1);
      }
    }
    
    // Pick the most frequent location for each staff member
    const staffToLocation = new Map<string, string>();
    for (const [staffGuid, locationCounts] of staffLocationCounts) {
      let maxCount = 0;
      let primaryLocation = "";
      for (const [location, count] of locationCounts) {
        if (count > maxCount) {
          maxCount = count;
          primaryLocation = location;
        }
      }
      if (primaryLocation) {
        staffToLocation.set(staffGuid, primaryLocation);
      }
    }
    console.log(`[jane-kpi-rollup] Built staff→location map with ${staffToLocation.size} entries`);

    // Location label map: try to build from appointments location_name
    // Since appointments use location_name as the ID (no location_guid), we'll query
    // a reference for location_guid → location_name by looking at invoice/payment patterns
    // For demo data, we'll fetch distinct location info and build a mapping
    const { data: locationRefData } = await supabase
      .from("staging_invoices_jane")
      .select("location_guid")
      .eq("organization_id", organization_id)
      .limit(100);
    
    // Get unique location_guids and try to resolve names from known patterns
    const locationLabelMap = new Map<string, string>();
    const uniqueLocationGuids = new Set((locationRefData || []).map(l => l.location_guid).filter(Boolean));
    
    // Try to match location_guids to appointment location_names by looking at co-occurrence
    // For each appointment location_name, check if invoices for same staff have a location_guid
    const { data: invoiceLocationMatch } = await supabase
      .from("staging_invoices_jane")
      .select("location_guid, staff_member_guid")
      .eq("organization_id", organization_id)
      .limit(500);
    
    // Build staff → location_guid map from invoices
    const staffToLocationGuid = new Map<string, string>();
    for (const inv of invoiceLocationMatch || []) {
      if (inv.staff_member_guid && inv.location_guid) {
        staffToLocationGuid.set(inv.staff_member_guid, inv.location_guid);
      }
    }
    
    // Now match location_guid to location_name through staff linkage
    for (const appt of [...appointments, ...(ytdAppointments || [])]) {
      if (appt.staff_member_guid && appt.location_name) {
        const locationGuid = staffToLocationGuid.get(appt.staff_member_guid);
        if (locationGuid && !locationLabelMap.has(locationGuid)) {
          locationLabelMap.set(locationGuid, appt.location_name);
        }
      }
    }
    
    // Also add any location_names directly (for appointments-based breakdowns)
    for (const appt of [...appointments, ...(ytdAppointments || [])]) {
      if (appt.location_name) {
        locationLabelMap.set(appt.location_name, appt.location_name);
      }
    }
    
    console.log(`[jane-kpi-rollup] Built location label map with ${locationLabelMap.size} entries`);

    // Helper to get location label with fallback
    const getLocationLabel = (locationId: string): string => {
      return locationLabelMap.get(locationId) || getLocationFallbackLabel(locationId);
    };

    // Helper to get staff label with fallback
    const getStaffLabel = (staffGuid: string): string => {
      return staffLabelMap.get(staffGuid) || getClinicianFallbackLabel(staffGuid);
    };

    // KPI 1: Total Visits
    rollups.push({
      metric_name: "Total Visits",
      import_key: "jane_total_visits",
      value: nonCancelled.length,
      period_key: periodKey,
      period_start: periodStartStr,
    });
    console.log(`[jane-kpi-rollup] Total Visits: ${nonCancelled.length}`);

    // ========================================
    // BREAKDOWNS: Total Visits
    // ========================================
    
    // Helper to compute visits breakdowns
    const computeVisitsBreakdowns = (
      appointmentList: typeof nonCancelled,
      pType: "weekly" | "monthly" | "ytd",
      pKey: string,
      pStart: string,
      pEnd: string
    ) => {
      // By Clinician
      const visitsByClinician = new Map<string, { count: number; label: string }>();
      for (const appt of appointmentList) {
        if (appt.staff_member_guid) {
          const existing = visitsByClinician.get(appt.staff_member_guid);
          if (existing) {
            existing.count++;
          } else {
            visitsByClinician.set(appt.staff_member_guid, {
              count: 1,
              label: appt.staff_member_name || getStaffLabel(appt.staff_member_guid),
            });
          }
        }
      }
      for (const [id, data] of visitsByClinician) {
        breakdowns.push({
          dimension_type: "clinician",
          dimension_id: id,
          dimension_label: data.label,
          value: data.count,
          import_key: "jane_total_visits",
          period_type: pType,
          period_key: pKey,
          period_start: pStart,
          period_end: pEnd,
        });
      }

      // By Location
      const visitsByLocation = new Map<string, { count: number; label: string }>();
      for (const appt of appointmentList) {
        const locationId = appt.location_name || "unknown";
        if (locationId !== "unknown") {
          const existing = visitsByLocation.get(locationId);
          if (existing) {
            existing.count++;
          } else {
            visitsByLocation.set(locationId, {
              count: 1,
              label: locationId,
            });
          }
        }
      }
      for (const [id, data] of visitsByLocation) {
        breakdowns.push({
          dimension_type: "location",
          dimension_id: id,
          dimension_label: data.label,
          value: data.count,
          import_key: "jane_total_visits",
          period_type: pType,
          period_key: pKey,
          period_start: pStart,
          period_end: pEnd,
        });
      }

      // By Discipline (normalize dimension_id to snake_case for uniqueness)
      const visitsByDiscipline = new Map<string, { count: number; label: string }>();
      for (const appt of appointmentList) {
        if (appt.discipline_name) {
          const disciplineId = appt.discipline_name.toLowerCase().replace(/\s+/g, '_');
          const existing = visitsByDiscipline.get(disciplineId);
          if (existing) {
            existing.count++;
          } else {
            visitsByDiscipline.set(disciplineId, {
              count: 1,
              label: appt.discipline_name,
            });
          }
        }
      }
      for (const [disciplineId, data] of visitsByDiscipline) {
        breakdowns.push({
          dimension_type: "discipline",
          dimension_id: disciplineId,
          dimension_label: data.label,
          value: data.count,
          import_key: "jane_total_visits",
          period_type: pType,
          period_key: pKey,
          period_start: pStart,
          period_end: pEnd,
        });
      }

      return { clinicians: visitsByClinician.size, locations: visitsByLocation.size, disciplines: visitsByDiscipline.size };
    };

    // Compute breakdowns for current period
    const currentVisitsBreakdowns = computeVisitsBreakdowns(nonCancelled, period_type, periodKey, periodStartStr, periodEndStr);
    console.log(`[jane-kpi-rollup] Total Visits breakdowns (${period_type}): ${currentVisitsBreakdowns.clinicians} clinicians, ${currentVisitsBreakdowns.locations} locations, ${currentVisitsBreakdowns.disciplines} disciplines`);

    // Compute YTD breakdowns
    const ytdVisitsBreakdowns = computeVisitsBreakdowns(ytdNonCancelled, "ytd", ytdKey, ytdStartStr, ytdEndStr);
    console.log(`[jane-kpi-rollup] Total Visits breakdowns (YTD): ${ytdVisitsBreakdowns.clinicians} clinicians, ${ytdVisitsBreakdowns.locations} locations, ${ytdVisitsBreakdowns.disciplines} disciplines`);

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

    // Fetch payments for revenue metrics (paginated to avoid 1000-row limit)
    let payments: any[] = [];
    try {
      payments = await fetchAllRows(
        supabase.from("staging_payments_jane")
          .select("amount, location_guid, staff_member_guid, staff_member_name")
          .eq("organization_id", organization_id)
          .gte("received_at", periodStartStr)
          .lte("received_at", periodEndStr)
      );
    } catch (e) {
      console.error(`[jane-kpi-rollup] Failed to fetch payments: ${(e as Error).message}`);
    }

    // Fetch YTD payments (paginated)
    let ytdPayments: any[] = [];
    try {
      ytdPayments = await fetchAllRows(
        supabase.from("staging_payments_jane")
          .select("amount, location_guid, staff_member_guid, staff_member_name")
          .eq("organization_id", organization_id)
          .gte("received_at", ytdStartStr)
          .lte("received_at", ytdEndStr)
      );
    } catch (e) {
      console.error(`[jane-kpi-rollup] Failed to fetch YTD payments: ${(e as Error).message}`);
    }
    const totalCollected = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // KPI 7: Total Collected Revenue
    rollups.push({
      metric_name: "Total Collected Revenue",
      import_key: "jane_total_collected",
      value: Math.round(totalCollected * 100) / 100,
      period_key: periodKey,
      period_start: periodStartStr,
    });
    console.log(`[jane-kpi-rollup] Total Collected Revenue: ${totalCollected}`);

    // ========================================
    // BREAKDOWNS: Total Collected (by clinician, location, discipline)
    // ========================================
    const computeCollectedBreakdowns = (
      paymentList: typeof payments,
      pType: "weekly" | "monthly" | "ytd",
      pKey: string,
      pStart: string,
      pEnd: string
    ) => {
      // By Clinician
      const collectedByClinician = new Map<string, { amount: number; label: string }>();
      for (const payment of paymentList) {
        if (payment.staff_member_guid) {
          const amount = Number(payment.amount) || 0;
          const existing = collectedByClinician.get(payment.staff_member_guid);
          if (existing) {
            existing.amount += amount;
          } else {
            collectedByClinician.set(payment.staff_member_guid, {
              amount,
              label: payment.staff_member_name || getStaffLabel(payment.staff_member_guid),
            });
          }
        }
      }
      for (const [id, data] of collectedByClinician) {
        breakdowns.push({
          dimension_type: "clinician",
          dimension_id: id,
          dimension_label: data.label,
          value: Math.round(data.amount * 100) / 100,
          import_key: "jane_total_collected",
          period_type: pType,
          period_key: pKey,
          period_start: pStart,
          period_end: pEnd,
        });
      }

      // By Location
      const collectedByLocation = new Map<string, { amount: number; label: string }>();
      for (const payment of paymentList) {
        // Try location_guid first, fall back to staff's primary location
        let locationId = payment.location_guid;
        let locationLabel = locationId ? getLocationLabel(locationId) : null;
        
        if (!locationId && payment.staff_member_guid) {
          const inferredLocation = staffToLocation.get(payment.staff_member_guid);
          if (inferredLocation) {
            locationId = inferredLocation.toLowerCase().replace(/\s+/g, '_');
            locationLabel = inferredLocation;
          }
        }
        
        if (locationId && locationId !== "unknown") {
          const amount = Number(payment.amount) || 0;
          const existing = collectedByLocation.get(locationId);
          if (existing) {
            existing.amount += amount;
          } else {
            collectedByLocation.set(locationId, {
              amount,
              label: locationLabel || getLocationLabel(locationId),
            });
          }
        }
      }
      for (const [id, data] of collectedByLocation) {
        breakdowns.push({
          dimension_type: "location",
          dimension_id: id,
          dimension_label: data.label,
          value: Math.round(data.amount * 100) / 100,
          import_key: "jane_total_collected",
          period_type: pType,
          period_key: pKey,
          period_start: pStart,
          period_end: pEnd,
        });
      }

      // By Discipline (inferred from staff's primary discipline)
      const collectedByDiscipline = new Map<string, { amount: number; label: string }>();
      for (const payment of paymentList) {
        if (payment.staff_member_guid) {
          const discipline = staffToDiscipline.get(payment.staff_member_guid);
          if (discipline) {
            const disciplineId = discipline.toLowerCase().replace(/\s+/g, '_');
            const amount = Number(payment.amount) || 0;
            const existing = collectedByDiscipline.get(disciplineId);
            if (existing) {
              existing.amount += amount;
            } else {
              collectedByDiscipline.set(disciplineId, {
                amount,
                label: discipline,
              });
            }
          }
        }
      }
      for (const [id, data] of collectedByDiscipline) {
        breakdowns.push({
          dimension_type: "discipline",
          dimension_id: id,
          dimension_label: data.label,
          value: Math.round(data.amount * 100) / 100,
          import_key: "jane_total_collected",
          period_type: pType,
          period_key: pKey,
          period_start: pStart,
          period_end: pEnd,
        });
      }

      return { clinicians: collectedByClinician.size, locations: collectedByLocation.size, disciplines: collectedByDiscipline.size };
    };

    const currentCollectedBreakdowns = computeCollectedBreakdowns(payments, period_type, periodKey, periodStartStr, periodEndStr);
    console.log(`[jane-kpi-rollup] Total Collected breakdowns (${period_type}): ${currentCollectedBreakdowns.clinicians} clinicians, ${currentCollectedBreakdowns.locations} locations, ${currentCollectedBreakdowns.disciplines} disciplines`);

    const ytdCollectedBreakdowns = computeCollectedBreakdowns(ytdPayments, "ytd", ytdKey, ytdStartStr, ytdEndStr);
    console.log(`[jane-kpi-rollup] Total Collected breakdowns (YTD): ${ytdCollectedBreakdowns.clinicians} clinicians, ${ytdCollectedBreakdowns.locations} locations, ${ytdCollectedBreakdowns.disciplines} disciplines`);

    // Fetch invoices for invoiced revenue and per-provider breakdown (no location_name in invoices table)
    // Fetch invoices (paginated to avoid 1000-row limit)
    let invoices: any[] = [];
    try {
      invoices = await fetchAllRows(
        supabase.from("staging_invoices_jane")
          .select("subtotal, amount_paid, staff_member_guid, staff_member_name, location_guid")
          .eq("organization_id", organization_id)
          .gte("invoiced_at", periodStartStr)
          .lte("invoiced_at", periodEndStr)
      );
    } catch (e) {
      console.error(`[jane-kpi-rollup] Failed to fetch invoices: ${(e as Error).message}`);
    }

    // Fetch YTD invoices (paginated)
    let ytdInvoices: any[] = [];
    try {
      ytdInvoices = await fetchAllRows(
        supabase.from("staging_invoices_jane")
          .select("subtotal, amount_paid, staff_member_guid, staff_member_name, location_guid")
          .eq("organization_id", organization_id)
          .gte("invoiced_at", ytdStartStr)
          .lte("invoiced_at", ytdEndStr)
      );
    } catch (e) {
      console.error(`[jane-kpi-rollup] Failed to fetch YTD invoices: ${(e as Error).message}`);
    }
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

    // ========================================
    // BREAKDOWNS: Total Invoiced
    // ========================================
    const computeInvoicedBreakdowns = (
      invoiceList: typeof invoices,
      pType: "weekly" | "monthly" | "ytd",
      pKey: string,
      pStart: string,
      pEnd: string
    ) => {
      // By Clinician
      const invoicedByClinician = new Map<string, { amount: number; label: string }>();
      for (const inv of invoiceList) {
        if (inv.staff_member_guid) {
          const existing = invoicedByClinician.get(inv.staff_member_guid);
          const amount = Number(inv.subtotal) || 0;
          if (existing) {
            existing.amount += amount;
          } else {
            invoicedByClinician.set(inv.staff_member_guid, {
              amount,
              label: inv.staff_member_name || getStaffLabel(inv.staff_member_guid),
            });
          }
        }
      }
      for (const [id, data] of invoicedByClinician) {
        breakdowns.push({
          dimension_type: "clinician",
          dimension_id: id,
          dimension_label: data.label,
          value: Math.round(data.amount * 100) / 100,
          import_key: "jane_total_invoiced",
          period_type: pType,
          period_key: pKey,
          period_start: pStart,
          period_end: pEnd,
        });
      }

      // By Location (inferred from staff primary location if location_guid missing)
      const invoicedByLocation = new Map<string, { amount: number; label: string }>();
      for (const inv of invoiceList) {
        // Try location_guid first, fall back to staff's primary location
        let locationId = inv.location_guid;
        let locationLabel = locationId ? getLocationLabel(locationId) : null;
        
        if (!locationId && inv.staff_member_guid) {
          const inferredLocation = staffToLocation.get(inv.staff_member_guid);
          if (inferredLocation) {
            locationId = inferredLocation.toLowerCase().replace(/\s+/g, '_');
            locationLabel = inferredLocation;
          }
        }
        
        if (locationId && locationId !== "unknown") {
          const amount = Number(inv.subtotal) || 0;
          const existing = invoicedByLocation.get(locationId);
          if (existing) {
            existing.amount += amount;
          } else {
            invoicedByLocation.set(locationId, {
              amount,
              label: locationLabel || getLocationLabel(locationId),
            });
          }
        }
      }
      for (const [id, data] of invoicedByLocation) {
        breakdowns.push({
          dimension_type: "location",
          dimension_id: id,
          dimension_label: data.label,
          value: Math.round(data.amount * 100) / 100,
          import_key: "jane_total_invoiced",
          period_type: pType,
          period_key: pKey,
          period_start: pStart,
          period_end: pEnd,
        });
      }

      // By Discipline (inferred from staff's primary discipline)
      const invoicedByDiscipline = new Map<string, { amount: number; label: string }>();
      for (const inv of invoiceList) {
        if (inv.staff_member_guid) {
          const discipline = staffToDiscipline.get(inv.staff_member_guid);
          if (discipline) {
            const disciplineId = discipline.toLowerCase().replace(/\s+/g, '_');
            const amount = Number(inv.subtotal) || 0;
            const existing = invoicedByDiscipline.get(disciplineId);
            if (existing) {
              existing.amount += amount;
            } else {
              invoicedByDiscipline.set(disciplineId, {
                amount,
                label: discipline,
              });
            }
          }
        }
      }
      for (const [id, data] of invoicedByDiscipline) {
        breakdowns.push({
          dimension_type: "discipline",
          dimension_id: id,
          dimension_label: data.label,
          value: Math.round(data.amount * 100) / 100,
          import_key: "jane_total_invoiced",
          period_type: pType,
          period_key: pKey,
          period_start: pStart,
          period_end: pEnd,
        });
      }

      return { clinicians: invoicedByClinician.size, locations: invoicedByLocation.size, disciplines: invoicedByDiscipline.size };
    };

    const currentInvoicedBreakdowns = computeInvoicedBreakdowns(invoices, period_type, periodKey, periodStartStr, periodEndStr);
    console.log(`[jane-kpi-rollup] Total Invoiced breakdowns (${period_type}): ${currentInvoicedBreakdowns.clinicians} clinicians, ${currentInvoicedBreakdowns.locations} locations`);

    const ytdInvoicedBreakdowns = computeInvoicedBreakdowns(ytdInvoices, "ytd", ytdKey, ytdStartStr, ytdEndStr);
    console.log(`[jane-kpi-rollup] Total Invoiced breakdowns (YTD): ${ytdInvoicedBreakdowns.clinicians} clinicians, ${ytdInvoicedBreakdowns.locations} locations`);

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
    const metricIdCache = new Map<string, string>(); // import_key -> metric_id

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

      // Cache metric ID for breakdown upserts
      metricIdCache.set(rollup.import_key, metricId);

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

    // ========================================
    // UPSERT BREAKDOWNS (using import_key)
    // ========================================
    let breakdownUpsertCount = 0;

    for (const breakdown of breakdowns) {
      const { error: breakdownError } = await supabase
        .from("metric_breakdowns")
        .upsert({
          organization_id,
          import_key: breakdown.import_key,
          period_type: breakdown.period_type,
          period_key: breakdown.period_key,
          period_start: breakdown.period_start,
          period_end: breakdown.period_end,
          dimension_type: breakdown.dimension_type,
          dimension_id: breakdown.dimension_id,
          dimension_label: breakdown.dimension_label,
          value: breakdown.value,
          source: "jane_pipe",
        }, { 
          onConflict: "organization_id,import_key,period_type,period_key,dimension_type,dimension_id",
          ignoreDuplicates: false 
        });

      if (breakdownError) {
        console.error(`[jane-kpi-rollup] Failed to upsert breakdown: ${breakdownError.message}`);
        upsertErrors.push(`Failed to upsert breakdown: ${breakdown.import_key}/${breakdown.dimension_type}/${breakdown.dimension_id}`);
      } else {
        breakdownUpsertCount++;
      }
    }

    console.log(`[jane-kpi-rollup] Rollup complete. Upserted ${upsertedCount}/${rollups.length} metrics, ${breakdownUpsertCount}/${breakdowns.length} breakdowns, created ${createdProviders.length} new providers.`);

    return new Response(
      JSON.stringify({
        success: upsertErrors.length === 0,
        organization_id,
        period_type,
        period_key: periodKey,
        period_start: periodStartStr,
        period_end: periodEndStr,
        ytd_key: ytdKey,
        metrics_processed: rollups.length,
        metrics_upserted: upsertedCount,
        breakdowns_processed: breakdowns.length,
        breakdowns_upserted: breakdownUpsertCount,
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
