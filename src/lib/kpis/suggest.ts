import { supabase } from "@/integrations/supabase/client";

export interface MappingSuggestion {
  kpiName: string;
  sourceSystem: string;
  sourceLabel: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

export async function suggestMappings(organizationId: string): Promise<MappingSuggestion[]> {
  const suggestions: MappingSuggestion[] = [];

  // Check if staging tables have data
  const { data: appointments } = await supabase
    .from("staging_appointments")
    .select("id")
    .limit(1);

  const { data: patients } = await supabase
    .from("staging_patients")
    .select("id")
    .limit(1);

  const { data: payments } = await supabase
    .from("staging_payments")
    .select("id")
    .limit(1);

  const { data: arAging } = await supabase
    .from("staging_ar_lines")
    .select("id")
    .limit(1);

  const hasAppointments = (appointments?.length || 0) > 0;
  const hasPatients = (patients?.length || 0) > 0;
  const hasPayments = (payments?.length || 0) > 0;
  const hasAR = (arAging?.length || 0) > 0;

  // Production KPIs from appointments
  if (hasAppointments) {
    suggestions.push(
      {
        kpiName: "Total Visits",
        sourceSystem: "jane_appointments",
        sourceLabel: "status = 'completed'",
        confidence: "high",
        reason: "Completed appointments directly map to visits"
      },
      {
        kpiName: "No-Show Rate %",
        sourceSystem: "jane_appointments",
        sourceLabel: "(status = 'no_show') / (status = 'booked')",
        confidence: "high",
        reason: "Calculate no-show percentage from appointment statuses"
      },
      {
        kpiName: "Provider Utilization %",
        sourceSystem: "jane_appointments",
        sourceLabel: "completed / available_slots",
        confidence: "medium",
        reason: "Requires appointment capacity data"
      },
      {
        kpiName: "Cancellation Rate %",
        sourceSystem: "jane_appointments",
        sourceLabel: "(status = 'cancelled') / (status = 'booked')",
        confidence: "high",
        reason: "Calculate cancellation percentage from appointment statuses"
      }
    );
  }

  // Patient KPIs
  if (hasPatients) {
    suggestions.push({
      kpiName: "New Patients",
      sourceSystem: "jane_patients",
      sourceLabel: "count(created_at) per week",
      confidence: "high",
      reason: "Patient creation date indicates new patient"
    });
  }

  // Financial KPIs from payments
  if (hasPayments) {
    suggestions.push(
      {
        kpiName: "Revenue Collected",
        sourceSystem: "jane_payments",
        sourceLabel: "sum(amount) where posted_at in week",
        confidence: "high",
        reason: "Posted payments represent collected revenue"
      },
      {
        kpiName: "Collection Rate %",
        sourceSystem: "jane_payments",
        sourceLabel: "collected / billed",
        confidence: "medium",
        reason: "Requires both payment and billing data"
      }
    );
  }

  // A/R KPIs
  if (hasAR) {
    suggestions.push(
      {
        kpiName: "A/R 30–60 Days",
        sourceSystem: "jane_ar_aging",
        sourceLabel: "sum(amount) where bucket = '30-60'",
        confidence: "high",
        reason: "AR aging bucket matches KPI definition"
      },
      {
        kpiName: "A/R 60–90 Days",
        sourceSystem: "jane_ar_aging",
        sourceLabel: "sum(amount) where bucket = '60-90'",
        confidence: "high",
        reason: "AR aging bucket matches KPI definition"
      },
      {
        kpiName: "A/R 90+ Days",
        sourceSystem: "jane_ar_aging",
        sourceLabel: "sum(amount) where bucket = '90+'",
        confidence: "high",
        reason: "AR aging bucket matches KPI definition"
      }
    );
  }

  // Referral KPIs (if we have appointment source data)
  if (hasAppointments) {
    suggestions.push(
      {
        kpiName: "Referrals (count)",
        sourceSystem: "jane_appointments",
        sourceLabel: "count(referral_source) per week",
        confidence: "medium",
        reason: "Referral source field indicates referral volume"
      },
      {
        kpiName: "Scheduled (count)",
        sourceSystem: "jane_appointments",
        sourceLabel: "count(status = 'booked' or 'completed') where referral exists",
        confidence: "medium",
        reason: "Booked appointments from referrals"
      },
      {
        kpiName: "Referral Conversion %",
        sourceSystem: "jane_appointments",
        sourceLabel: "scheduled / referrals",
        confidence: "medium",
        reason: "Ratio of scheduled to total referrals"
      }
    );
  }

  return suggestions;
}

export function formatSuggestions(suggestions: MappingSuggestion[]) {
  const byGroup: Record<string, MappingSuggestion[]> = {};
  
  suggestions.forEach(s => {
    // Group by KPI category
    let group = "Other";
    if (s.kpiName.includes("Patient") || s.kpiName.includes("Visit")) group = "Production";
    if (s.kpiName.includes("Revenue") || s.kpiName.includes("A/R") || s.kpiName.includes("Collection")) group = "Financial";
    if (s.kpiName.includes("Referral")) group = "Referral";
    
    if (!byGroup[group]) byGroup[group] = [];
    byGroup[group].push(s);
  });
  
  return byGroup;
}
