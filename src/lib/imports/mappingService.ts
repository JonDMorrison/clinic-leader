import { supabase } from "@/integrations/supabase/client";

export interface ImportMapping {
  id: string;
  organization_id: string;
  tracked_kpi_id: string;
  source_system: string;
  source_label: string;
  transform: string | null;
  created_at: string;
}

export async function registerMapping(
  organizationId: string,
  trackedKpiId: string,
  sourceSystem: string,
  sourceLabel: string,
  transform?: string
) {
  const { data, error } = await supabase
    .from("import_mappings")
    .insert({
      organization_id: organizationId,
      tracked_kpi_id: trackedKpiId,
      source_system: sourceSystem,
      source_label: sourceLabel,
      transform: transform || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listMappings(organizationId: string) {
  const { data, error } = await supabase
    .from("import_mappings")
    .select(`
      *,
      tracked_kpis(name, category)
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getMappingsForKpi(trackedKpiId: string) {
  const { data, error } = await supabase
    .from("import_mappings")
    .select("*")
    .eq("tracked_kpi_id", trackedKpiId);

  if (error) throw error;
  return data;
}

export async function removeMapping(mappingId: string) {
  const { error } = await supabase
    .from("import_mappings")
    .delete()
    .eq("id", mappingId);

  if (error) throw error;
}
