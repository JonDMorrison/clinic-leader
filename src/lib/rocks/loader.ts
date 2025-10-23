import { supabase } from "@/integrations/supabase/client";
import { ROCK_TEMPLATES, RockTemplateItem, getCurrentQuarter, getEndOfQuarter } from "./templates";

interface LoadDefaultRocksOptions {
  organizationId: string;
  templateKey?: string;
  includeBundles?: string[];
  ownerStrategy?: "auto" | "me" | "manual";
  ownerMap?: {
    companyOwnerId?: string;
    teamOwnerId?: string;
    individualOwnerId?: string;
  };
  quarter?: string;
  createdBy?: string;
}

interface LoadDefaultRocksResult {
  success: boolean;
  createdCount: number;
  skippedTitles: string[];
  batchId?: string;
  error?: string;
}

export async function loadDefaultRocks(options: LoadDefaultRocksOptions): Promise<LoadDefaultRocksResult> {
  const {
    organizationId,
    templateKey = "clinic_eos_default",
    includeBundles = [],
    ownerStrategy = "auto",
    ownerMap = {},
    quarter,
    createdBy
  } = options;

  try {
    // Get template
    const template = ROCK_TEMPLATES[templateKey];
    if (!template) {
      return { success: false, createdCount: 0, skippedTitles: [], error: "Template not found" };
    }

    // Create batch record
    const { data: batch, error: batchError } = await supabase
      .from("rock_default_batches")
      .insert({
        organization_id: organizationId,
        template_key: templateKey,
        include_bundles: includeBundles,
        created_by: createdBy
      })
      .select()
      .single();

    if (batchError || !batch) {
      return { success: false, createdCount: 0, skippedTitles: [], error: batchError?.message };
    }

    // Build final Rock list
    let allItems = [...template.items];
    includeBundles.forEach(bundleKey => {
      if (template.bundles[bundleKey]) {
        allItems = [...allItems, ...template.bundles[bundleKey]];
      }
    });

    // Get existing Rocks for this org
    const { data: existingRocks } = await supabase
      .from("rocks")
      .select("title, level");

    const existingKeys = new Set(
      (existingRocks || []).map(r => `${r.level}:${r.title}`)
    );
    const skippedTitles: string[] = [];
    const rocksToCreate: any[] = [];

    // Get users for auto-owner assignment
    let usersByRole: Record<string, string> = {};
    if (ownerStrategy === "auto") {
      const { data: users } = await supabase
        .from("users")
        .select("id, role");
      
      if (users) {
        usersByRole = {
          owner: users.find(u => u.role === "owner")?.id || "",
          director: users.find(u => u.role === "director")?.id || "",
          manager: users.find(u => u.role === "manager")?.id || ""
        };
      }
    }

    const currentQuarter = quarter || getCurrentQuarter();
    const dueDate = getEndOfQuarter(currentQuarter);

    // Process each Rock
    allItems.forEach((item, index) => {
      const key = `${item.level}:${item.title}`;
      if (existingKeys.has(key)) {
        skippedTitles.push(item.title);
        return;
      }

      const ownerId = pickOwner(item.level, ownerStrategy, usersByRole, ownerMap, createdBy || "");

      rocksToCreate.push({
        title: item.title,
        level: item.level,
        owner_id: ownerId,
        quarter: currentQuarter,
        status: "on_track",
        confidence: 3,
        due_date: dueDate.toISOString().split('T')[0],
        display_group: item.group,
        display_order: index,
        default_batch_id: batch.id,
        note: item.note || null
      });
    });

    // Batch insert
    if (rocksToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from("rocks")
        .insert(rocksToCreate);

      if (insertError) {
        return { 
          success: false, 
          createdCount: 0, 
          skippedTitles, 
          batchId: batch.id,
          error: insertError.message 
        };
      }
    }

    return {
      success: true,
      createdCount: rocksToCreate.length,
      skippedTitles,
      batchId: batch.id
    };
  } catch (error) {
    return {
      success: false,
      createdCount: 0,
      skippedTitles: [],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

function pickOwner(
  level: string,
  strategy: string,
  usersByRole: Record<string, string>,
  ownerMap: any,
  fallback: string
): string {
  if (strategy === "me") {
    return fallback;
  }

  if (strategy === "manual") {
    if (level === "company") return ownerMap.companyOwnerId || fallback;
    if (level === "team") return ownerMap.teamOwnerId || fallback;
    if (level === "individual") return ownerMap.individualOwnerId || fallback;
  }

  // Auto strategy
  if (level === "company") {
    return usersByRole.owner || usersByRole.director || fallback;
  }
  if (level === "team") {
    return usersByRole.manager || usersByRole.director || fallback;
  }
  if (level === "individual") {
    return fallback;
  }

  return fallback;
}

export async function previewDefaultRocks(options: LoadDefaultRocksOptions) {
  const {
    organizationId,
    templateKey = "clinic_eos_default",
    includeBundles = [],
    ownerStrategy = "auto",
    quarter
  } = options;

  const template = ROCK_TEMPLATES[templateKey];
  if (!template) {
    return { items: [], existing: [], groups: {}, quarter: "" };
  }

  // Build final Rock list
  let allItems = [...template.items];
  includeBundles.forEach(bundleKey => {
    if (template.bundles[bundleKey]) {
      allItems = [...allItems, ...template.bundles[bundleKey]];
    }
  });

  // Get existing Rocks
  const { data: existingRocks } = await supabase
    .from("rocks")
    .select("title, level");

  const existingKeys = new Set(
    (existingRocks || []).map(r => `${r.level}:${r.title}`)
  );

  // Get users for owner suggestions
  let usersByRole: Record<string, any> = {};
  if (ownerStrategy === "auto") {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, role");
    
    if (users) {
      usersByRole = {
        owner: users.find(u => u.role === "owner"),
        director: users.find(u => u.role === "director"),
        manager: users.find(u => u.role === "manager")
      };
    }
  }

  // Group by display group
  const groups: Record<string, any[]> = {};
  allItems.forEach(item => {
    if (!groups[item.group]) {
      groups[item.group] = [];
    }
    
    const owner = ownerStrategy === "auto" 
      ? getSuggestedOwner(item.level, usersByRole)
      : null;

    const key = `${item.level}:${item.title}`;
    groups[item.group].push({
      ...item,
      exists: existingKeys.has(key),
      suggestedOwner: owner
    });
  });

  const currentQuarter = quarter || getCurrentQuarter();

  return {
    items: allItems,
    existing: Array.from(existingKeys),
    groups,
    quarter: currentQuarter,
    totalNew: allItems.filter(i => !existingKeys.has(`${i.level}:${i.title}`)).length,
    totalSkipped: allItems.filter(i => existingKeys.has(`${i.level}:${i.title}`)).length
  };
}

function getSuggestedOwner(level: string, usersByRole: Record<string, any>) {
  if (level === "company") {
    return usersByRole.owner || usersByRole.director;
  }
  if (level === "team") {
    return usersByRole.manager || usersByRole.director;
  }
  return null; // Individual rocks - owner needs to be set explicitly
}

export async function archiveBatch(batchId: string) {
  // Archive the batch
  await supabase
    .from("rock_default_batches")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", batchId);

  // Delete Rocks (since we don't have an archived status)
  await supabase
    .from("rocks")
    .delete()
    .eq("default_batch_id", batchId);
}

export async function restoreBatch(batchId: string) {
  // Note: Restore would require storing the deleted rocks somewhere
  // For now, this is a placeholder - teams should re-run the loader instead
  await supabase
    .from("rock_default_batches")
    .update({ archived_at: null })
    .eq("id", batchId);
}
