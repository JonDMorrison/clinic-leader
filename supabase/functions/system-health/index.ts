import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VERSION = "3.1.0";
const LATENCY_THRESHOLD_MS = 2000;
const RETENTION_STALE_HOURS = 48;

interface ServiceCheck {
  status: "healthy" | "degraded" | "down";
  latency_ms?: number;
  error?: string;
  reason?: "failed" | "slow";
}

interface HealthResponse {
  overall_status: "healthy" | "degraded" | "down";
  degraded_services: string[];
  checks: Record<string, ServiceCheck>;
  last_successful_checks: Record<string, string>;
  version: string;
  timestamp: string;
}

async function checkDatabase(supabase: any): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const { error } = await supabase.from('teams').select('id').limit(1);
    const latency = Date.now() - start;
    if (error) {
      return { status: "down", latency_ms: latency, error: error.message, reason: "failed" };
    }
    if (latency > LATENCY_THRESHOLD_MS) {
      return { status: "degraded", latency_ms: latency, reason: "slow" };
    }
    return { status: "healthy", latency_ms: latency };
  } catch (e) {
    return { status: "down", latency_ms: Date.now() - start, error: e instanceof Error ? e.message : String(e), reason: "failed" };
  }
}

async function checkEdgeFunction(
  supabaseUrl: string,
  serviceKey: string,
  funcName: string
): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/${funcName}`,
      {
        method: 'OPTIONS',
        headers: { 'Authorization': `Bearer ${serviceKey}` },
      }
    );
    const latency = Date.now() - start;
    if (response.status >= 500) {
      return { status: "down", latency_ms: latency, error: `HTTP ${response.status}`, reason: "failed" };
    }
    if (latency > LATENCY_THRESHOLD_MS) {
      return { status: "degraded", latency_ms: latency, reason: "slow" };
    }
    return { status: "healthy", latency_ms: latency };
  } catch (e) {
    return { status: "down", latency_ms: Date.now() - start, error: e instanceof Error ? e.message : String(e), reason: "failed" };
  }
}

async function checkEnvVars(): Promise<ServiceCheck> {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(v => !Deno.env.get(v));
  if (missing.length > 0) {
    return { status: "down", error: `Missing: ${missing.join(', ')}`, reason: "failed" };
  }
  return { status: "healthy" };
}

async function checkRetentionStaleness(supabase: any): Promise<ServiceCheck> {
  try {
    const { data, error } = await supabase
      .from('system_regression_events')
      .select('created_at')
      .eq('event_type', 'MAINTENANCE_PURGE_SUCCESS')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      return { status: "degraded", error: error.message, reason: "failed" };
    }

    if (!data || data.length === 0) {
      return { status: "degraded", error: "No purge run recorded", reason: "failed" };
    }

    const lastPurge = new Date(data[0].created_at);
    const hoursSince = (Date.now() - lastPurge.getTime()) / (1000 * 60 * 60);
    if (hoursSince > RETENTION_STALE_HOURS) {
      return { status: "degraded", error: `Last purge ${Math.round(hoursSince)}h ago`, reason: "slow" };
    }

    return { status: "healthy" };
  } catch (e) {
    return { status: "degraded", error: e instanceof Error ? e.message : String(e), reason: "failed" };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const [envCheck, dbCheck, retentionCheck, ...fnChecks] = await Promise.all([
      checkEnvVars(),
      checkDatabase(supabase),
      checkRetentionStaleness(supabase),
      checkEdgeFunction(supabaseUrl, serviceKey, 'ai-query-docs'),
      checkEdgeFunction(supabaseUrl, serviceKey, 'jane-sync'),
      checkEdgeFunction(supabaseUrl, serviceKey, 'ai-intervention-insight'),
    ]);

    const functionNames = ['ai-query-docs', 'jane-sync', 'ai-intervention-insight'];

    const checks: Record<string, ServiceCheck> = {
      environment: envCheck,
      database: dbCheck,
      regression_retention: retentionCheck,
    };
    functionNames.forEach((name, i) => {
      checks[name] = fnChecks[i];
    });

    const degraded_services: string[] = [];
    const last_successful_checks: Record<string, string> = {};
    const now = new Date().toISOString();

    let criticalFailCount = 0;
    for (const [name, check] of Object.entries(checks)) {
      if (check.status === "healthy") {
        last_successful_checks[name] = now;
      } else {
        degraded_services.push(name);
        if (check.status === "down") criticalFailCount++;
      }
    }

    // Overall: down if DB fails OR 2+ critical services fail
    let overall_status: "healthy" | "degraded" | "down" = "healthy";
    if (checks.database.status === "down" || checks.environment.status !== "healthy" || criticalFailCount >= 2) {
      overall_status = "down";
    } else if (degraded_services.length > 0) {
      overall_status = "degraded";
    }

    const result: HealthResponse = {
      overall_status,
      degraded_services,
      checks,
      last_successful_checks,
      version: VERSION,
      timestamp: now,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        overall_status: "down",
        degraded_services: ["system-health"],
        checks: {},
        last_successful_checks: {},
        version: VERSION,
        timestamp: new Date().toISOString(),
        error: msg,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
