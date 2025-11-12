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

    console.log(`Adding user ${email} to organization ${organization_id}`);

    // Check if auth user already exists
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
    let authUserId: string;
    let existingUser = existingAuthUsers?.users.find(u => u.email === email);

    if (existingUser) {
      console.log(`Auth user already exists: ${existingUser.id}`);
      authUserId = existingUser.id;
      
      // Update password if user exists
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUserId,
        { password }
      );
      
      if (updateError) {
        console.error('Failed to update password:', updateError);
      }
    } else {
      // Create new auth user
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
      authUserId = authUser.user.id;
    }

    // Upsert into users table (in case user exists)
    const { error: userUpsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authUserId,
        email,
        full_name,
        team_id: organization_id,
        department,
      }, {
        onConflict: 'id'
      });

    if (userUpsertError) {
      console.error('Failed to upsert user:', userUpsertError);
      throw new Error(`Failed to create user profile: ${userUpsertError.message}`);
    }

    // Upsert into user_roles table (in case role exists)
    const { error: roleUpsertError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: authUserId,
        role,
      }, {
        onConflict: 'user_id,role'
      });

    if (roleUpsertError) {
      console.error('Failed to upsert role:', roleUpsertError);
      throw new Error(`Failed to assign role: ${roleUpsertError.message}`);
    }

    // Log to audit
    await supabaseAdmin.from('audit_log').insert({
      actor_id: user.id,
      action: 'admin_add_user',
      entity: 'user',
      entity_id: authUserId,
      payload: {
        email,
        organization_id,
        role,
        full_name,
        existing_user: !!existingUser
      }
    });

    console.log(`Successfully added user ${email} with role ${role} to organization`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authUserId,
        message: existingUser 
          ? `Successfully added existing user ${email} with role ${role}` 
          : `Successfully created user ${email} with role ${role}`
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
