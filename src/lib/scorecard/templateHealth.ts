import { supabase } from "@/integrations/supabase/client";

export interface TemplateHealthMetrics {
  total_active_metrics: number;
  missing_import_keys_count: number;
  duplicate_import_keys_count: number;
  duplicate_metric_names_count: number;
  missing_owner_count: number;
  missing_target_count: number;
  isReady: boolean;
}

export interface MetricWithHealth {
  id: string;
  name: string;
  category: string;
  unit: string;
  target: number | null;
  owner: string | null;
  is_active: boolean;
  direction: string;
  import_key: string | null;
  aliases: string[] | null;
  // Health status
  isMissingKey: boolean;
  isDuplicateKey: boolean;
  isDuplicateName: boolean;
}

/**
 * Compute template health metrics for an organization
 * All queries are explicitly org-scoped
 */
export async function computeTemplateHealth(
  organizationId: string
): Promise<{ health: TemplateHealthMetrics; metrics: MetricWithHealth[] }> {
  const { data: rawMetrics, error } = await supabase
    .from('metrics')
    .select('id, name, category, unit, target, is_active, owner, direction, import_key, aliases')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;

  const activeMetrics = rawMetrics || [];

  // Count missing import keys
  const missingImportKeys = activeMetrics.filter(
    m => !m.import_key || m.import_key.trim() === ''
  );

  // Count duplicate import keys
  const keyCountMap = new Map<string, string[]>();
  activeMetrics.forEach(m => {
    if (m.import_key && m.import_key.trim()) {
      const key = m.import_key.toLowerCase().trim();
      if (!keyCountMap.has(key)) keyCountMap.set(key, []);
      keyCountMap.get(key)!.push(m.id);
    }
  });
  const duplicateKeyIds = new Set<string>();
  keyCountMap.forEach((ids) => {
    if (ids.length > 1) {
      ids.forEach(id => duplicateKeyIds.add(id));
    }
  });

  // Count duplicate metric names
  const nameCountMap = new Map<string, string[]>();
  activeMetrics.forEach(m => {
    const name = m.name.toLowerCase().trim();
    if (!nameCountMap.has(name)) nameCountMap.set(name, []);
    nameCountMap.get(name)!.push(m.id);
  });
  const duplicateNameIds = new Set<string>();
  let duplicateNameGroups = 0;
  nameCountMap.forEach((ids) => {
    if (ids.length > 1) {
      duplicateNameGroups++;
      ids.forEach(id => duplicateNameIds.add(id));
    }
  });

  // Missing owners and targets
  const missingOwners = activeMetrics.filter(m => !m.owner || m.owner.trim() === '');
  const missingTargets = activeMetrics.filter(m => m.target === null);

  // Build enriched metrics with health status
  const metricsWithHealth: MetricWithHealth[] = activeMetrics.map(m => ({
    ...m,
    isMissingKey: !m.import_key || m.import_key.trim() === '',
    isDuplicateKey: duplicateKeyIds.has(m.id),
    isDuplicateName: duplicateNameIds.has(m.id),
  }));

  const health: TemplateHealthMetrics = {
    total_active_metrics: activeMetrics.length,
    missing_import_keys_count: missingImportKeys.length,
    duplicate_import_keys_count: duplicateKeyIds.size,
    duplicate_metric_names_count: duplicateNameGroups,
    missing_owner_count: missingOwners.length,
    missing_target_count: missingTargets.length,
    isReady: missingImportKeys.length === 0 && duplicateKeyIds.size === 0,
  };

  return { health, metrics: metricsWithHealth };
}

/**
 * Generate import_key from metric name
 */
export function generateImportKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50);
}

/**
 * Validate that an import key is unique within the organization
 */
export function validateImportKeyUnique(
  key: string,
  metricId: string,
  allMetrics: MetricWithHealth[]
): boolean {
  if (!key || !key.trim()) return false;
  const normalizedKey = key.toLowerCase().trim();
  
  return !allMetrics.some(
    m => m.id !== metricId && 
         m.import_key && 
         m.import_key.toLowerCase().trim() === normalizedKey
  );
}
