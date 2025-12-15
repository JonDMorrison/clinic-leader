import { supabase } from "@/integrations/supabase/client";

export interface DuplicateMetricInfo {
  id: string;
  name: string;
  category: string;
  unit: string;
  target: number | null;
  owner: string | null;
  import_key: string | null;
  created_at: string;
  // Usage stats
  result_count: number;
  last_result_period_key: string | null;
}

export interface DuplicateGroup {
  normalizedName: string;
  displayName: string;
  metrics: DuplicateMetricInfo[];
}

/**
 * Fetch duplicate metric groups with usage statistics
 * Only includes active metrics, grouped by normalized name
 */
export async function fetchDuplicateGroups(
  organizationId: string
): Promise<DuplicateGroup[]> {
  // Fetch active metrics for the org
  const { data: metrics, error: metricsError } = await supabase
    .from('metrics')
    .select('id, name, category, unit, target, owner, import_key, created_at')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('created_at');

  if (metricsError) throw metricsError;
  if (!metrics || metrics.length === 0) return [];

  // Group by normalized name
  const nameGroups = new Map<string, typeof metrics>();
  metrics.forEach(m => {
    const normalized = m.name.toLowerCase().trim();
    if (!nameGroups.has(normalized)) nameGroups.set(normalized, []);
    nameGroups.get(normalized)!.push(m);
  });

  // Filter to only duplicates (size >= 2)
  const duplicateMetricIds: string[] = [];
  const duplicateNames: string[] = [];
  
  nameGroups.forEach((group, name) => {
    if (group.length >= 2) {
      duplicateNames.push(name);
      group.forEach(m => duplicateMetricIds.push(m.id));
    }
  });

  if (duplicateMetricIds.length === 0) return [];

  // Fetch result counts for duplicate metrics
  const { data: resultCounts, error: countError } = await supabase
    .from('metric_results')
    .select('metric_id, period_key')
    .in('metric_id', duplicateMetricIds)
    .order('period_start', { ascending: false });

  if (countError) throw countError;

  // Aggregate counts and last period per metric
  const statsMap = new Map<string, { count: number; lastPeriod: string | null }>();
  duplicateMetricIds.forEach(id => statsMap.set(id, { count: 0, lastPeriod: null }));
  
  resultCounts?.forEach(r => {
    const stat = statsMap.get(r.metric_id);
    if (stat) {
      stat.count++;
      if (!stat.lastPeriod) stat.lastPeriod = r.period_key; // First is most recent due to order
    }
  });

  // Build duplicate groups with full info
  const groups: DuplicateGroup[] = [];
  
  duplicateNames.forEach(normalizedName => {
    const groupMetrics = nameGroups.get(normalizedName);
    if (!groupMetrics || groupMetrics.length < 2) return;

    const metricsWithStats: DuplicateMetricInfo[] = groupMetrics.map(m => {
      const stat = statsMap.get(m.id) || { count: 0, lastPeriod: null };
      return {
        ...m,
        result_count: stat.count,
        last_result_period_key: stat.lastPeriod,
      };
    });

    groups.push({
      normalizedName,
      displayName: groupMetrics[0].name,
      metrics: metricsWithStats,
    });
  });

  return groups;
}

/**
 * Check for existing links to metrics that will be archived
 */
export async function checkMetricLinks(
  metricIds: string[],
  organizationId: string
): Promise<{ rockLinks: number; vtoLinks: number }> {
  if (metricIds.length === 0) return { rockLinks: 0, vtoLinks: 0 };

  // Check rock_metric_links
  const { count: rockCount } = await supabase
    .from('rock_metric_links')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('metric_id', metricIds);

  // Check vto_links for KPI type
  const { count: vtoCount } = await supabase
    .from('vto_links')
    .select('id', { count: 'exact', head: true })
    .eq('link_type', 'kpi')
    .in('link_id', metricIds);

  return {
    rockLinks: rockCount || 0,
    vtoLinks: vtoCount || 0,
  };
}

/**
 * Archive non-canonical metrics (set is_active = false)
 * Returns count of archived metrics
 */
export async function archiveDuplicates(
  keepMetricId: string,
  allMetricIds: string[],
  organizationId: string
): Promise<number> {
  const toArchive = allMetricIds.filter(id => id !== keepMetricId);
  if (toArchive.length === 0) return 0;

  const { error } = await supabase
    .from('metrics')
    .update({ is_active: false })
    .eq('organization_id', organizationId)
    .in('id', toArchive);

  if (error) throw error;
  return toArchive.length;
}
