import { supabase } from "@/integrations/supabase/client";
import { MONTHLY_OPERATING_RHYTHM_SOP } from "./sops/monthlyOperatingRhythm";

// Convert SOP sections to markdown body
function sopToMarkdown(sop: typeof MONTHLY_OPERATING_RHYTHM_SOP): string {
  const lines: string[] = [`# ${sop.title}`, ""];
  
  for (const section of sop.sections) {
    lines.push(`## ${section.heading}`, "");
    
    if (section.body) {
      lines.push(section.body, "");
    }
    
    if (section.items) {
      for (const item of section.items) {
        lines.push(`- ${item}`);
      }
      lines.push("");
    }
  }
  
  return lines.join("\n");
}

const DEFAULT_SOPS = [
  {
    slug: MONTHLY_OPERATING_RHYTHM_SOP.slug,
    title: MONTHLY_OPERATING_RHYTHM_SOP.title,
    body: sopToMarkdown(MONTHLY_OPERATING_RHYTHM_SOP),
    kind: "SOP" as const,
    requires_ack: MONTHLY_OPERATING_RHYTHM_SOP.requiresAck,
  },
];

/**
 * Seeds default SOPs for an organization if they don't already exist.
 * Called lazily when user visits the Docs page.
 */
export async function seedDefaultSopsForOrg(organizationId: string, ownerId: string): Promise<void> {
  if (!organizationId || !ownerId) return;

  try {
    // Check which default SOPs already exist for this org
    const { data: existingDocs } = await supabase
      .from("docs")
      .select("title")
      .eq("organization_id", organizationId)
      .in("title", DEFAULT_SOPS.map(s => s.title));

    const existingTitles = new Set(existingDocs?.map(d => d.title) || []);
    
    // Filter to SOPs that need to be created
    const sopsToCreate = DEFAULT_SOPS.filter(sop => !existingTitles.has(sop.title));
    
    if (sopsToCreate.length === 0) return;

    // Insert missing default SOPs
    const { error } = await supabase
      .from("docs")
      .insert(
        sopsToCreate.map(sop => ({
          organization_id: organizationId,
          owner_id: ownerId,
          title: sop.title,
          body: sop.body,
          kind: sop.kind,
          requires_ack: sop.requires_ack,
          status: "approved" as const,
          version: 1,
        }))
      );

    if (error) {
      console.error("Error seeding default SOPs:", error);
    }
  } catch (err) {
    console.error("Failed to seed default SOPs:", err);
  }
}
