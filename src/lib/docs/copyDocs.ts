import { supabase } from "@/integrations/supabase/client";

export async function copyDocsFromDemo(targetTeamId: string) {
  // Find the demo team
  const { data: demoTeam, error: demoError } = await supabase
    .from('teams')
    .select('id')
    .eq('is_demo_org', true)
    .single();

  if (demoError) throw demoError;
  if (!demoTeam) throw new Error("Demo organization not found");

  // Call edge function to copy docs
  const { data, error } = await supabase.functions.invoke('copy-docs', {
    body: {
      sourceTeamId: demoTeam.id,
      targetTeamId: targetTeamId,
    }
  });

  if (error) throw error;
  return data;
}
