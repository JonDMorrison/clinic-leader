import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default retention policies (days)
const DEFAULT_RETENTION = {
  staging_appointments_jane: 90,
  staging_patients_jane: 90,
  staging_payments_jane: 90,
  staging_invoices_jane: 90,
  staging_shifts_jane: 90,
  file_ingest_log: 180,
  quarantined_fields_log: 365,
  data_access_audit: 730, // 2 years for audit trails
};

// Tables that should never be auto-purged
const NON_PURGEABLE_TABLES = [
  'metric_results',
  'metrics',
  'rocks',
  'issues',
  'todos',
  'meetings',
  'users',
  'teams',
];

interface PurgeResult {
  resource_type: string;
  records_purged: number;
  oldest_record_date: string | null;
  newest_record_date: string | null;
  retention_days_applied: number;
  duration_ms: number;
  status: 'completed' | 'error';
  error_message?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body for optional org filter
    let targetOrgId: string | null = null;
    let dryRun = false;
    
    try {
      const body = await req.json();
      targetOrgId = body.organization_id || null;
      dryRun = body.dry_run || false;
    } catch {
      // No body provided, run for all orgs
    }

    console.log(`Starting scheduled data purge. Dry run: ${dryRun}, Target org: ${targetOrgId || 'all'}`);

    const results: PurgeResult[] = [];

    // Get all organizations to process
    let orgsQuery = supabase.from('teams').select('id');
    if (targetOrgId) {
      orgsQuery = orgsQuery.eq('id', targetOrgId);
    }
    
    const { data: organizations, error: orgsError } = await orgsQuery;
    
    if (orgsError) {
      throw new Error(`Failed to fetch organizations: ${orgsError.message}`);
    }

    console.log(`Processing ${organizations?.length || 0} organizations`);

    for (const org of organizations || []) {
      // Get org-specific retention policies
      const { data: policies } = await supabase
        .from('data_retention_policies')
        .select('*')
        .eq('organization_id', org.id);

      const policyMap = new Map(policies?.map(p => [p.resource_type, p]) || []);

      // Process each purgeable table
      for (const [tableName, defaultDays] of Object.entries(DEFAULT_RETENTION)) {
        const tableStartTime = Date.now();
        
        try {
          // Check if there's a custom policy
          const policy = policyMap.get(tableName);
          const retentionDays = policy?.retention_days ?? defaultDays;
          const isPurgeable = policy?.is_purgeable ?? true;

          if (!isPurgeable) {
            console.log(`Skipping ${tableName} for org ${org.id} - marked as non-purgeable`);
            continue;
          }

          // Calculate cutoff date
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
          const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

          // Get date range of records to be purged
          const { data: dateRange } = await supabase
            .from(tableName)
            .select('file_date')
            .eq('organization_id', org.id)
            .lt('file_date', cutoffDateStr)
            .order('file_date', { ascending: true })
            .limit(1);

          const { data: newestRange } = await supabase
            .from(tableName)
            .select('file_date')
            .eq('organization_id', org.id)
            .lt('file_date', cutoffDateStr)
            .order('file_date', { ascending: false })
            .limit(1);

          // Count records to purge
          const { count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id)
            .lt('file_date', cutoffDateStr);

          const recordsToPurge = count || 0;

          if (recordsToPurge === 0) {
            console.log(`No records to purge in ${tableName} for org ${org.id}`);
            continue;
          }

          console.log(`Found ${recordsToPurge} records to purge in ${tableName} for org ${org.id}`);

          let purgedCount = 0;

          if (!dryRun) {
            // Actually delete the records
            const { error: deleteError } = await supabase
              .from(tableName)
              .delete()
              .eq('organization_id', org.id)
              .lt('file_date', cutoffDateStr);

            if (deleteError) {
              throw new Error(`Delete failed: ${deleteError.message}`);
            }

            purgedCount = recordsToPurge;
          } else {
            purgedCount = 0; // Dry run - no actual deletion
          }

          const duration = Date.now() - tableStartTime;

          const result: PurgeResult = {
            resource_type: tableName,
            records_purged: dryRun ? 0 : purgedCount,
            oldest_record_date: dateRange?.[0]?.file_date || null,
            newest_record_date: newestRange?.[0]?.file_date || null,
            retention_days_applied: retentionDays,
            duration_ms: duration,
            status: 'completed',
          };

          results.push(result);

          // Log the purge event (even for dry runs, mark accordingly)
          if (!dryRun) {
            await supabase.from('data_purge_log').insert({
              organization_id: org.id,
              resource_type: tableName,
              records_purged: purgedCount,
              oldest_record_date: dateRange?.[0]?.file_date || null,
              newest_record_date: newestRange?.[0]?.file_date || null,
              retention_days_applied: retentionDays,
              purge_type: 'scheduled',
              execution_duration_ms: duration,
              status: 'completed',
            });
          }

          console.log(`Purged ${purgedCount} records from ${tableName} for org ${org.id} in ${duration}ms`);

        } catch (tableError) {
          const duration = Date.now() - tableStartTime;
          const errorMessage = tableError instanceof Error ? tableError.message : 'Unknown error';
          
          console.error(`Error purging ${tableName} for org ${org.id}: ${errorMessage}`);

          results.push({
            resource_type: tableName,
            records_purged: 0,
            oldest_record_date: null,
            newest_record_date: null,
            retention_days_applied: DEFAULT_RETENTION[tableName as keyof typeof DEFAULT_RETENTION],
            duration_ms: duration,
            status: 'error',
            error_message: errorMessage,
          });

          // Log the failed purge attempt
          if (!dryRun) {
            await supabase.from('data_purge_log').insert({
              organization_id: org.id,
              resource_type: tableName,
              records_purged: 0,
              retention_days_applied: DEFAULT_RETENTION[tableName as keyof typeof DEFAULT_RETENTION],
              purge_type: 'scheduled',
              execution_duration_ms: duration,
              status: 'error',
              error_message: errorMessage,
            });
          }
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    const totalPurged = results.reduce((sum, r) => sum + r.records_purged, 0);

    console.log(`Scheduled purge completed in ${totalDuration}ms. Total records purged: ${totalPurged}`);

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        total_duration_ms: totalDuration,
        total_records_purged: totalPurged,
        organizations_processed: organizations?.length || 0,
        results,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Scheduled purge failed:', errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        duration_ms: Date.now() - startTime,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
