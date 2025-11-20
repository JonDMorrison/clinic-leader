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
    const { email, newPassword } = await req.json();
    if (!email || !newPassword) {
      return new Response(
        JSON.stringify({ error: "email and newPassword required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Find user
    const { data: userRes } = await supabaseAdmin.auth.admin.listUsers();
    const user = userRes?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[admin-fix-password] Found user ${user.id} (${user.email})`);

    // Check identities
    const identities = user.identities || [];
    const hasEmailIdentity = identities.some(i => i.provider === 'email');

    if (!hasEmailIdentity) {
      console.log('[admin-fix-password] No email identity found');
      return new Response(
        JSON.stringify({
          ok: false,
          reason: "no_email_identity",
          message: "User has no email/password identity. Ask them to sign in (OAuth) and visit /account/set-password to attach an email identity, then retry."
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Confirm email if needed
    if (!user.email_confirmed_at) {
      console.log('[admin-fix-password] Confirming email...');
      await supabaseAdmin.auth.admin.updateUserById(user.id, { email_confirm: true });
    }

    // Update password
    console.log('[admin-fix-password] Updating password...');
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, { 
      password: newPassword 
    });

    if (updateErr) {
      console.error('[admin-fix-password] Password update failed:', updateErr);
      return new Response(
        JSON.stringify({ ok: false, error: updateErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[admin-fix-password] Password updated, testing sign-in...');

    // Verify by sign-in test
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: testData, error: testErr } = await supabaseAnon.auth.signInWithPassword({ 
      email, 
      password: newPassword 
    });

    const success = !!testData?.user && !testErr;
    console.log(`[admin-fix-password] Sign-in test result: ${success ? 'SUCCESS' : 'FAILED'}`);
    if (testErr) {
      console.error('[admin-fix-password] Sign-in test error:', testErr);
    }

    return new Response(
      JSON.stringify({
        ok: success,
        signInError: testErr?.message || null,
        userId: user.id,
        email: user.email
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('[admin-fix-password] Unexpected error:', e);
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || 'unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
