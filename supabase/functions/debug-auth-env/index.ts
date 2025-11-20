import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      edge_SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
      edge_SUPABASE_ANON_KEY_PREFIX: Deno.env.get('SUPABASE_ANON_KEY')?.substring(0, 20) + '...',
      edge_has_service_role: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      deno_version: Deno.version.deno
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
