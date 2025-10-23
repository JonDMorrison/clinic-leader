import { supabase } from "@/integrations/supabase/client";

export interface TrackedKpi {
  id: string;
  organization_id: string;
  name: string;
  category: "Production" | "Financial" | "Referral" | "Operational" | "Quality";
  description: string | null;
  owner_id: string | null;
  formula: string | null;
  external_key: string | null;
  is_active: boolean;
}

export interface TrackedDimension {
  id: string;
  organization_id: string;
  type: "ProviderRole" | "ReferralSource" | "Location";
  name: string;
}

export const trackedKpisCatalog = {
  Production: [
    { name: "New Patients", description: "Count of new patient starts" },
    { name: "Total Visits", description: "Total patient visits across all providers" },
    { name: "Visits per Patient", description: "Average visits per active patient" },
    { name: "Avg Visit per Case", description: "Average total visits per completed case" },
    { name: "Provider Utilization %", description: "Percentage of available provider time used" },
    { name: "No-Show Rate %", description: "Percentage of appointments not attended" },
  ],
  Financial: [
    { name: "Charges Billed", description: "Total charges billed to insurers/patients" },
    { name: "Revenue Collected", description: "Total payments collected" },
    { name: "Collection Rate %", description: "Percentage of billed charges collected" },
    { name: "A/R 30-120 Days $", description: "Accounts receivable aged 30-120 days" },
  ],
  Referral: [
    { name: "Referrals", description: "Total referrals received" },
    { name: "Scheduled", description: "Referrals that scheduled appointments" },
    { name: "Referral Conversion %", description: "Percentage of referrals that scheduled" },
  ],
  Operational: [
    { name: "Time to Next Available", description: "Days until next available appointment" },
    { name: "Check-in to Room", description: "Average minutes from check-in to treatment room" },
  ],
  Quality: [
    { name: "Patient NPS", description: "Net Promoter Score from patient surveys" },
  ],
};

export async function seedTrackedKpisForOrg(organizationId: string) {
  const kpisToInsert: any[] = [];

  Object.entries(trackedKpisCatalog).forEach(([category, kpis]) => {
    kpis.forEach((kpi) => {
      kpisToInsert.push({
        organization_id: organizationId,
        name: kpi.name,
        category,
        description: kpi.description,
        is_active: true,
      });
    });
  });

  const { error } = await supabase
    .from("tracked_kpis")
    .insert(kpisToInsert);

  if (error) throw error;
}

export async function getTrackedKpis(organizationId: string) {
  const { data, error } = await supabase
    .from("tracked_kpis")
    .select(`
      *,
      users(full_name),
      import_mappings(id, source_system, source_label)
    `)
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("category")
    .order("name");

  if (error) throw error;
  return data as TrackedKpi[];
}
