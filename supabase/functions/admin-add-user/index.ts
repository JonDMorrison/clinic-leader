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

  let emailLowerGlobal = '';
  let passwordGlobal = '';

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

    passwordGlobal = password;

    const department_id = department ?? null;

    console.log(`Adding user ${email} to organization ${organization_id}`);

    // Normalize email for consistent matching
    const emailLower = String(email).trim().toLowerCase();
    emailLowerGlobal = emailLower;

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
      // Strategy A: minimal create first (email only), then set password
      let createdId: string | null = null;
      let createErrMsg = '';
      {
        const { data: created, error: createMinError } = await supabaseAdmin.auth.admin.createUser({
          email: emailLower,
          email_confirm: true,
          user_metadata: { full_name },
        });
        if (!createMinError && created?.user?.id) {
          createdId = created.user.id as string;
        } else if (createMinError) {
          createErrMsg = createMinError.message || 'unknown error';
        }
      }

      if (createdId) {
        // Set password after user exists
        const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(createdId, { password });
        if (pwErr) {
          console.warn('Failed to set password after create (non-fatal):', pwErr.message);
        }
        authUserId = createdId;
      } else {
        // Strategy B: full create with password (in case Strategy A yielded a transient error)
        const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: emailLower,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        });

        if (createError) {
          console.error('createUser error:', createError.message, '| earlier:', createErrMsg);
          // Fallbacks: try to locate existing user by email
          const maybeExisting = await findAuthUserByEmail(emailLower);
          if (maybeExisting) {
            console.log('User appears to exist despite create error, proceeding with existing user.');
            authUserId = maybeExisting.id;
          } else {
            // Last resort: try sending an invite to create/recover the auth user and get the ID
            const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(emailLower, {
              data: { full_name }
            } as any);
            if (!inviteErr && invited?.user?.id) {
              console.log('Invite sent, using invited user id');
              authUserId = invited.user.id as string;
            } else {
              console.error('inviteUserByEmail failed:', inviteErr?.message);
              // Final fallback: generate a sign-up link (no SMTP required) and return it to the client
              const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
                type: 'signup',
                email: emailLower,
                password,
                options: { data: { full_name } }
              } as any);
              if (!linkErr && linkData?.properties?.action_link) {
                return new Response(
                  JSON.stringify({
                    success: false,
                    pending: true,
                    signup_link: linkData.properties.action_link,
                    error: 'User not yet created. Send the sign-up link to the user to complete account creation, then run this action again to assign role/org.'
                  }),
                  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
              throw new Error(`Failed to create auth user: ${createError.message}`);
            }
          }
        } else {
          console.log(`Created auth user: ${authUser.user.id}`);
          authUserId = authUser.user.id;
        }
      }
    }

    // Sync users table safely (avoid unique(email) conflicts)
    const { data: existingProfile, error: findProfileError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', emailLower)
      .single();

    if (findProfileError && (findProfileError as any).code !== 'PGRST116') {
      console.warn('Find user by email error (non-fatal):', findProfileError.message);
    }

    if (existingProfile?.id) {
      const { error: userUpdateError } = await supabaseAdmin
        .from('users')
        .update({
          full_name,
          team_id: organization_id,
          department_id: department_id,
        })
        .eq('id', existingProfile.id);
      if (userUpdateError) {
        console.error('Failed to update user:', userUpdateError);
        throw new Error(`Failed to update user profile: ${userUpdateError.message}`);
      }
    } else {
      const { error: userInsertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authUserId,
          email: emailLower,
          full_name,
          team_id: organization_id,
          department_id: department_id,
        });
      if (userInsertError) {
        console.error('Failed to insert user:', userInsertError);
        throw new Error(`Failed to create user profile: ${userInsertError.message}`);
      }
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

    // Graceful fallback: if user creation failed, attempt to generate a signup link
    try {
      if (emailLowerGlobal) {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: 'signup',
          email: emailLowerGlobal,
          password: passwordGlobal || undefined,
          options: { data: {} }
        } as any);
        if (!linkErr && linkData?.properties?.action_link) {
          return new Response(
            JSON.stringify({
              success: false,
              pending: true,
              signup_link: linkData.properties.action_link,
              error: 'User not yet created. Share the sign-up link to complete account creation, then rerun to assign org/role.'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch (fallbackErr) {
      console.error('Fallback generateLink failed:', fallbackErr);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
