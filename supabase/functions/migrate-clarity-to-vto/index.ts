import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationResult {
  success: boolean;
  organizationId: string;
  vtoId?: string;
  versionId?: string;
  error?: string;
}

interface MigrationSummary {
  totalOrgs: number;
  migrated: number;
  skipped: number;
  failed: number;
  results: MigrationResult[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: userProfile } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'admin' && userProfile?.role !== 'owner') {
      throw new Error('Only admins can run migrations');
    }

    const { organizationId, dryRun = false } = await req.json();

    console.log(`[Migration] Starting migration${dryRun ? ' (DRY RUN)' : ''}`);

    // Get all clarity_vto records for the organization
    let query = supabaseClient
      .from('clarity_vto' as any)
      .select('*');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: clarityRecords, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    console.log(`[Migration] Found ${clarityRecords?.length || 0} records to migrate`);

    const summary: MigrationSummary = {
      totalOrgs: clarityRecords?.length || 0,
      migrated: 0,
      skipped: 0,
      failed: 0,
      results: [],
    };

    if (!clarityRecords || clarityRecords.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No records to migrate',
          summary 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Migrate each record
    for (const clarityVto of clarityRecords) {
      const result: MigrationResult = {
        success: false,
        organizationId: clarityVto.organization_id,
      };

      try {
        console.log(`[Migration] Processing org: ${clarityVto.organization_id}`);

        // Check if VTO already exists for this org
        const { data: existingVto } = await supabaseClient
          .from('vto')
          .select('id')
          .eq('organization_id', clarityVto.organization_id)
          .maybeSingle();

        let vtoId = existingVto?.id;

        // Create VTO if it doesn't exist
        if (!vtoId && !dryRun) {
          const { data: newVto, error: vtoError } = await supabaseClient
            .from('vto')
            .insert({
              organization_id: clarityVto.organization_id,
              title: 'Vision/Traction Organizer',
              is_active: true,
              created_by: clarityVto.created_at ? null : user.id,
            })
            .select()
            .single();

          if (vtoError) throw vtoError;
          vtoId = newVto.id;
          console.log(`[Migration] Created VTO: ${vtoId}`);
        }

        if (!vtoId) {
          console.log(`[Migration] Would create VTO for org: ${clarityVto.organization_id}`);
          result.success = true;
          summary.skipped++;
          summary.results.push(result);
          continue;
        }

        result.vtoId = vtoId;

        // Map clarity data to vto_versions structure
        const vision = clarityVto.vision || {};
        const traction = clarityVto.traction || {};
        const metrics = clarityVto.metrics || {};

        // Build marketing_strategy from separate fields
        const marketingStrategy = {
          ideal_client: vision.ideal_client || '',
          differentiators: vision.differentiators || [],
          proven_process: vision.proven_process || '',
          guarantee: vision.promise || vision.guarantee || '', // promise → guarantee
        };

        // Build one_year_plan from traction data
        const oneYearPlan = {
          revenue: traction.one_year_revenue || null,
          profit: traction.one_year_profit || null,
          measurables: traction.one_year_measurables || [],
          goals: traction.one_year_goals || [],
        };

        // Map quarterly priorities to quarterly_rocks
        const quarterlyRocks = (traction.quarterly_priorities || []).map((priority: any) => ({
          title: priority.title || priority.name || '',
          owner_id: priority.owner_id || null,
          due: priority.due_date || null,
          status: priority.status || 'on_track',
          weight: priority.weight || 1,
        }));

        // Split issues by category if available, otherwise all go to company
        const issues = traction.issues || [];
        const issuesCompany = issues.filter((i: any) => !i.category || i.category === 'company');
        const issuesDepartment = issues.filter((i: any) => i.category === 'department');
        const issuesPersonal = issues.filter((i: any) => i.category === 'personal');

        // Create vto_versions record
        if (!dryRun) {
          const { data: version, error: versionError } = await supabaseClient
            .from('vto_versions')
            .insert({
              vto_id: vtoId,
              version: 1,
              status: metrics.vision_clarity >= 80 ? 'published' : 'draft',
              
              // Vision fields
              core_values: vision.core_values || [],
              core_focus: {
                purpose: vision.core_focus?.purpose || '',
                niche: vision.core_focus?.niche || '',
              },
              ten_year_target: vision.ten_year_target || '',
              marketing_strategy: marketingStrategy,
              three_year_picture: vision.three_year_picture || {},
              culture: vision.culture || null, // New field
              
              // Traction fields
              one_year_plan: oneYearPlan,
              quarter_key: traction.quarter_key || null,
              quarterly_rocks: quarterlyRocks,
              issues_company: issuesCompany,
              issues_department: issuesDepartment,
              issues_personal: issuesPersonal,
              
              created_by: user.id,
            })
            .select()
            .single();

          if (versionError) throw versionError;
          result.versionId = version.id;
          console.log(`[Migration] Created version: ${version.id}`);

          // Create vto_progress record
          const { error: progressError } = await supabaseClient
            .from('vto_progress')
            .insert({
              vto_version_id: version.id,
              vision_score: metrics.vision_clarity || 0,
              traction_score: metrics.traction_health || 0,
              details: metrics.breakdown || {},
              computed_at: metrics.last_computed || new Date().toISOString(),
            });

          if (progressError) throw progressError;
          console.log(`[Migration] Created progress record`);

          // Log to audit
          await supabaseClient
            .from('vto_audit')
            .insert({
              vto_version_id: version.id,
              user_id: user.id,
              action: 'create',
              meta: {
                source: 'clarity_migration',
                clarity_vto_id: clarityVto.id,
              },
            });

          console.log(`[Migration] Successfully migrated org: ${clarityVto.organization_id}`);
        } else {
          console.log(`[Migration] Would create version for VTO: ${vtoId}`);
        }

        result.success = true;
        summary.migrated++;
        summary.results.push(result);

      } catch (error) {
        console.error(`[Migration] Failed for org ${clarityVto.organization_id}:`, error);
        result.success = false;
        result.error = error instanceof Error ? error.message : String(error);
        summary.failed++;
        summary.results.push(result);
      }
    }

    console.log(`[Migration] Complete. Migrated: ${summary.migrated}, Failed: ${summary.failed}, Skipped: ${summary.skipped}`);

    return new Response(
      JSON.stringify({
        message: dryRun ? 'Dry run complete' : 'Migration complete',
        summary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Migration] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
