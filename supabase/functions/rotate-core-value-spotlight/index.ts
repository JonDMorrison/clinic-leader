import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting core value spotlight rotation...");

    // Get current day of week (0 = Sunday, 1 = Monday, etc.)
    const today = new Date().getDay();

    // Find all spotlights that need rotation today
    const { data: spotlights, error: spotlightError } = await supabase
      .from("core_value_spotlight")
      .select("*, org_core_values!core_value_spotlight_current_core_value_id_fkey(id, organization_id)")
      .eq("rotates_on_weekday", today);

    if (spotlightError) {
      console.error("Error fetching spotlights:", spotlightError);
      throw spotlightError;
    }

    console.log(`Found ${spotlights?.length || 0} spotlights scheduled for rotation today`);

    let rotated = 0;
    let skipped = 0;

    for (const spotlight of spotlights || []) {
      // Check if already rotated today
      if (spotlight.last_rotated_at) {
        const lastRotated = new Date(spotlight.last_rotated_at);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        if (lastRotated >= todayStart) {
          console.log(`Spotlight ${spotlight.id} already rotated today, skipping`);
          skipped++;
          continue;
        }
      }

      // Get all active core values for this org
      const { data: values, error: valuesError } = await supabase
        .from("org_core_values")
        .select("id")
        .eq("organization_id", spotlight.organization_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (valuesError || !values || values.length === 0) {
        console.log(`No active values for org ${spotlight.organization_id}, skipping`);
        skipped++;
        continue;
      }

      // Find current index and rotate to next
      const currentIndex = values.findIndex((v) => v.id === spotlight.current_core_value_id);
      const nextIndex = (currentIndex + 1) % values.length;
      const nextValueId = values[nextIndex].id;

      // Update spotlight
      const { error: updateError } = await supabase
        .from("core_value_spotlight")
        .update({
          current_core_value_id: nextValueId,
          last_rotated_at: new Date().toISOString(),
        })
        .eq("id", spotlight.id);

      if (updateError) {
        console.error(`Error updating spotlight ${spotlight.id}:`, updateError);
        continue;
      }

      console.log(`Rotated spotlight ${spotlight.id} to value ${nextValueId}`);
      rotated++;
    }

    const result = {
      success: true,
      checked: spotlights?.length || 0,
      rotated,
      skipped,
      timestamp: new Date().toISOString(),
    };

    console.log("Rotation complete:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Rotation error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
