import { supabase } from "@/integrations/supabase/client";
import { KPI_TEMPLATES, KPITemplateItem } from "./templates";

interface LoadDefaultsOptions {
  organizationId: string;
  templateKey?: string;
  includeBundles?: string[];
  includeTargets?: boolean;
  ownerUserId?: string;
  autoOwners?: boolean;
  createdBy?: string;
}

interface LoadDefaultsResult {
  success: boolean;
  createdCount: number;
  skippedNames: string[];
  batchId?: string;
  error?: string;
}

export async function loadDefaultKPIs(options: LoadDefaultsOptions): Promise<LoadDefaultsResult> {
  const {
    organizationId,
    templateKey = "clinic_standard",
    includeBundles = [],
    includeTargets = false,
    ownerUserId,
    autoOwners = true,
    createdBy
  } = options;

  try {
    // Validate organizationId
    if (!organizationId || organizationId.trim() === "") {
      return { success: false, createdCount: 0, skippedNames: [], error: "No organization ID provided" };
    }

    // Get template
    const template = KPI_TEMPLATES[templateKey];
    if (!template) {
      return { success: false, createdCount: 0, skippedNames: [], error: "Template not found" };
    }

    // Create batch record (keep for tracking purposes)
    const { data: batch, error: batchError } = await supabase
      .from("kpi_default_batches")
      .insert({
        organization_id: organizationId,
        template_key: templateKey,
        include_bundles: includeBundles,
        include_targets: includeTargets,
        created_by: createdBy
      })
      .select()
      .single();

    if (batchError || !batch) {
      return { success: false, createdCount: 0, skippedNames: [], error: batchError?.message };
    }

    // Build final KPI list
    let allItems = [...template.items];
    includeBundles.forEach(bundleKey => {
      if (template.bundles[bundleKey]) {
        allItems = [...allItems, ...template.bundles[bundleKey]];
      }
    });

    // Get existing metrics for this org (use metrics table, not kpis)
    const { data: existingMetrics } = await supabase
      .from("metrics")
      .select("name")
      .eq("organization_id", organizationId);

    const existingNames = new Set((existingMetrics || []).map(k => k.name));
    const skippedNames: string[] = [];
    const metricsToCreate: any[] = [];

    // Get users for auto-owner assignment
    let usersByRole: Record<string, string> = {};
    if (autoOwners) {
      const { data: users } = await supabase
        .from("users")
        .select("id, role")
        .eq("team_id", organizationId);
      
      if (users) {
        usersByRole = {
          billing: users.find(u => u.role === "billing")?.id || "",
          director: users.find(u => u.role === "director")?.id || "",
          manager: users.find(u => u.role === "manager")?.id || "",
          owner: users.find(u => u.role === "owner")?.id || ""
        };
      }
    }

    // Process each metric
    allItems.forEach((item, index) => {
      if (existingNames.has(item.name)) {
        skippedNames.push(item.name);
        return;
      }

      const ownerId = autoOwners 
        ? suggestOwnerByGroup(item.group, usersByRole, createdBy || "")
        : (ownerUserId || createdBy);

      // Insert into metrics table (what Scorecard.tsx actually queries)
      metricsToCreate.push({
        name: item.name,
        unit: item.unit,
        direction: item.direction,
        category: item.group,
        organization_id: organizationId,
        owner: ownerId || null,
        target: includeTargets ? item.sample_target : null,
        sync_source: "manual",
        display_priority: index
      });
    });

    // Batch insert into metrics table
    if (metricsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from("metrics")
        .insert(metricsToCreate);

      if (insertError) {
        return { 
          success: false, 
          createdCount: 0, 
          skippedNames, 
          batchId: batch.id,
          error: insertError.message 
        };
      }
    }

    return {
      success: true,
      createdCount: metricsToCreate.length,
      skippedNames,
      batchId: batch.id
    };
  } catch (error) {
    return {
      success: false,
      createdCount: 0,
      skippedNames: [],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

function suggestOwnerByGroup(
  group: string,
  usersByRole: Record<string, string>,
  fallback: string
): string {
  switch (group) {
    case "Financial":
      return usersByRole.billing || usersByRole.owner || fallback;
    case "Production":
    case "Operational":
    case "Quality":
      return usersByRole.director || usersByRole.owner || fallback;
    case "Referral":
      return usersByRole.manager || usersByRole.owner || fallback;
    default:
      return usersByRole.owner || fallback;
  }
}

export async function previewDefaultKPIs(options: LoadDefaultsOptions) {
  const {
    organizationId,
    templateKey = "clinic_standard",
    includeBundles = [],
    includeTargets = false,
    autoOwners = true
  } = options;

  const template = KPI_TEMPLATES[templateKey];
  if (!template) {
    return { items: [], existing: [], groups: {} };
  }

  // Build final KPI list
  let allItems = [...template.items];
  includeBundles.forEach(bundleKey => {
    if (template.bundles[bundleKey]) {
      allItems = [...allItems, ...template.bundles[bundleKey]];
    }
  });

  // Get existing metrics (use metrics table, not kpis)
  const { data: existingMetrics } = await supabase
    .from("metrics")
    .select("name")
    .eq("organization_id", organizationId);

  const existingNames = new Set((existingMetrics || []).map(k => k.name));

  // Get users for owner suggestions
  let usersByRole: Record<string, any> = {};
  if (autoOwners) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, role")
      .eq("team_id", organizationId);
    
    if (users) {
      usersByRole = {
        billing: users.find(u => u.role === "billing"),
        director: users.find(u => u.role === "director"),
        manager: users.find(u => u.role === "manager"),
        owner: users.find(u => u.role === "owner")
      };
    }
  }

  // Group by display group
  const groups: Record<string, any[]> = {};
  allItems.forEach(item => {
    if (!groups[item.group]) {
      groups[item.group] = [];
    }
    
    const owner = autoOwners 
      ? getSuggestedOwner(item.group, usersByRole)
      : null;

    groups[item.group].push({
      ...item,
      exists: existingNames.has(item.name),
      suggestedOwner: owner,
      target: includeTargets ? item.sample_target : null
    });
  });

  return {
    items: allItems,
    existing: Array.from(existingNames),
    groups,
    totalNew: allItems.filter(i => !existingNames.has(i.name)).length,
    totalSkipped: allItems.filter(i => existingNames.has(i.name)).length
  };
}

function getSuggestedOwner(group: string, usersByRole: Record<string, any>) {
  switch (group) {
    case "Financial":
      return usersByRole.billing || usersByRole.owner;
    case "Production":
    case "Operational":
    case "Quality":
      return usersByRole.director || usersByRole.owner;
    case "Referral":
      return usersByRole.manager || usersByRole.owner;
    default:
      return usersByRole.owner;
  }
}

export async function archiveBatch(batchId: string) {
  // Archive the batch
  await supabase
    .from("kpi_default_batches")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", batchId);

  // Set KPIs to inactive
  await supabase
    .from("kpis")
    .update({ active: false })
    .eq("default_batch_id", batchId);
}
