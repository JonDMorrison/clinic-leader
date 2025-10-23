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
    // Get template
    const template = KPI_TEMPLATES[templateKey];
    if (!template) {
      return { success: false, createdCount: 0, skippedNames: [], error: "Template not found" };
    }

    // Create batch record
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

    // Get existing KPIs for this org
    const { data: existingKPIs } = await supabase
      .from("kpis")
      .select("name, owner_id")
      .eq("active", true);

    const existingNames = new Set((existingKPIs || []).map(k => k.name));
    const skippedNames: string[] = [];
    const kpisToCreate: any[] = [];

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

    // Process each KPI
    allItems.forEach((item, index) => {
      if (existingNames.has(item.name)) {
        skippedNames.push(item.name);
        return;
      }

      const ownerId = autoOwners 
        ? suggestOwnerByGroup(item.group, usersByRole, createdBy || "")
        : (ownerUserId || createdBy);

      kpisToCreate.push({
        name: item.name,
        unit: item.unit,
        direction: item.direction,
        category: item.group,
        display_group: item.group,
        display_order: index,
        owner_id: ownerId,
        target: includeTargets ? item.sample_target : null,
        default_batch_id: batch.id,
        is_computed: item.is_computed || false,
        expression: item.expression || null,
        active: true
      });
    });

    // Batch insert
    if (kpisToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from("kpis")
        .insert(kpisToCreate);

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
      createdCount: kpisToCreate.length,
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

  // Get existing KPIs
  const { data: existingKPIs } = await supabase
    .from("kpis")
    .select("name")
    .eq("active", true);

  const existingNames = new Set((existingKPIs || []).map(k => k.name));

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
