import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ALLOWED_EVENT_TYPES = [
  "AI_SANITIZATION",
  "AI_SCHEMA_FAILURE",
  "EDGE_FUNCTION_FAILURE",
  "HEALTH_CHECK_FAILURE",
  "INGESTION_MAPPING_FAILURE",
] as const;

const MAX_MESSAGE_LENGTH = 500;
const MAX_DETAIL_VALUE_LENGTH = 200;

/** Strip potentially sensitive data from details object */
function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const blocked = ["prompt", "patient", "ssn", "dob", "phone", "address", "stack_trace"];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    if (blocked.some(b => key.toLowerCase().includes(b))) continue;
    if (typeof value === "string" && value.length > MAX_DETAIL_VALUE_LENGTH) {
      sanitized[key] = value.slice(0, MAX_DETAIL_VALUE_LENGTH) + "…";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { event_type, severity, message, details, organization_id } = body;

    // Validate event type
    if (!ALLOWED_EVENT_TYPES.includes(event_type)) {
      return new Response(JSON.stringify({ error: `Invalid event_type. Allowed: ${ALLOWED_EVENT_TYPES.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate severity
    const validSeverities = ["info", "warn", "error"];
    const safeSeverity = validSeverities.includes(severity) ? severity : "warn";

    // Sanitize message
    const safeMessage = typeof message === "string"
      ? message.slice(0, MAX_MESSAGE_LENGTH)
      : "No message provided";

    // Sanitize details
    const safeDetails = typeof details === "object" && details !== null
      ? sanitizeDetails(details)
      : {};

    // Insert using service role (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { error: insertError } = await adminClient
      .from('system_regression_events')
      .insert({
        event_type,
        severity: safeSeverity,
        message: safeMessage,
        details: safeDetails,
        organization_id: organization_id || null,
        user_id: user.id,
      });

    if (insertError) {
      console.error("[log-regression-event] Insert error:", insertError.message);
      return new Response(JSON.stringify({ error: "Failed to log event" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[log-regression-event] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
