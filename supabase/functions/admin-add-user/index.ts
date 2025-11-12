import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || !['owner', 'director'].includes(roleData.role)) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { email, password, organization_id, role, full_name, department } = await req.json();

    if (!email || !password || !organization_id || !role || !full_name) {
      throw new Error('Missing required fields');
    }

    console.log(`Creating user ${email} for organization ${organization_id}`);

    // Create auth user
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      }
    });

    if (createError) {
      throw new Error(`Failed to create auth user: ${createError.message}`);
    }

    console.log(`Created auth user: ${authUser.user.id}`);

    // Insert into users table
    const { error: userInsertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        email,
        full_name,
        team_id: organization_id,
        department,
      });

    if (userInsertError) {
      console.error('Failed to insert user:', userInsertError);
      throw new Error(`Failed to create user profile: ${userInsertError.message}`);
    }

    // Insert into user_roles table
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        role,
      });

    if (roleInsertError) {
      console.error('Failed to insert role:', roleInsertError);
      throw new Error(`Failed to assign role: ${roleInsertError.message}`);
    }

    // Log to audit
    await supabaseAdmin.from('audit_log').insert({
      actor_id: user.id,
      action: 'admin_add_user',
      entity: 'user',
      entity_id: authUser.user.id,
      payload: {
        email,
        organization_id,
        role,
        full_name,
      }
    });

    console.log(`Successfully created user ${email} with role ${role}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authUser.user.id,
        message: `Successfully created user ${email} with role ${role}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
