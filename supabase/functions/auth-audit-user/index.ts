import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, testPassword } = await req.json();
    if (!email) {
      return new Response(
        JSON.stringify({ error: "email required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // 1) Fetch user by email
    const { data: userRes, error: getUserErr } = await supabaseAdmin.auth.admin.listUsers();
    const user = userRes?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found", email }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2) Check identities
    const identities = user.identities || [];
    const hasEmailIdentity = identities.some(i => i.provider === 'email');

    // 3) Optional password test
    let passwordTest: any = null;
    if (testPassword) {
      const supabaseAnon = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { auth: { persistSession: false } }
      );
      const { data, error } = await supabaseAnon.auth.signInWithPassword({ 
        email, 
        password: testPassword 
      });
      passwordTest = {
        ok: !!data?.user && !error,
        error: error?.message || null
      };
    }

    return new Response(
      JSON.stringify({
        env_supabase_url: Deno.env.get('SUPABASE_URL'),
        user_summary: {
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          last_sign_in_at: user.last_sign_in_at,
          created_at: user.created_at
        },
        identities: identities.map(i => ({ provider: i.provider, identity_id: i.id })),
        has_email_identity: hasEmailIdentity,
        passwordTest
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('Auth audit error:', e);
    return new Response(
      JSON.stringify({ error: e?.message || 'unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
