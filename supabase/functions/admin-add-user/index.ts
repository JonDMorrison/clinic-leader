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

    // Normalize email for consistent matching
    const emailLower = String(email).trim().toLowerCase();

    // Helper: find existing auth user by email across all pages
    const findAuthUserByEmail = async (targetEmail: string) => {
      let page = 1;
      const perPage = 1000;
      // Loop through pages defensively
      while (true) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (error) {
          console.warn('listUsers error (page ' + page + '):', error.message);
          break;
        }
        const found = data?.users?.find((u: any) => (u.email || '').toLowerCase() === targetEmail);
        if (found) return found;
        if (!data || !data.nextPage || data.nextPage === page) break;
        page = data.nextPage;
      }
      return null;
    };

    // Find existing user if present
    let existingUser = await findAuthUserByEmail(emailLower);
    let authUserId: string;

    if (existingUser) {
      console.log(`Auth user already exists: ${existingUser.id}`);
      authUserId = existingUser.id;
      // Attempt to update password for convenience
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });
      if (updateError) {
        console.warn('Failed to update password for existing user (non-fatal):', updateError.message);
      }
    } else {
      // Create new auth user (lowercased email)
      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: emailLower,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) {
        console.error('createUser error:', createError.message);
        // Fallback: if duplicate/DB error, try to locate the user and proceed
        const maybeExisting = await findAuthUserByEmail(emailLower);
        if (maybeExisting) {
          console.log('User appears to exist despite create error, proceeding with existing user.');
          authUserId = maybeExisting.id;
        } else {
          throw new Error(`Failed to create auth user: ${createError.message}`);
        }
      } else {
        console.log(`Created auth user: ${authUser.user.id}`);
        authUserId = authUser.user.id;
      }
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
