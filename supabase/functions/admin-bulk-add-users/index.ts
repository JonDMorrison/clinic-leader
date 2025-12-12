import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserToAdd {
  email: string;
  full_name: string;
  role: string;
  department_id: string;
  password: string;
}

interface UserResult {
  email: string;
  full_name: string;
  success: boolean;
  error?: string;
  user_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { users, organization_id } = await req.json() as { 
      users: UserToAdd[]; 
      organization_id: string;
    };

    if (!users || !Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ error: "No users provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "Organization ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${users.length} users for organization ${organization_id}`);

    const results: UserResult[] = [];

    for (const user of users) {
      const result: UserResult = {
        email: user.email,
        full_name: user.full_name,
        success: false
      };

      try {
        // Check if user already exists
        const { data: existingUsers } = await supabase
          .from("users")
          .select("id, email")
          .eq("email", user.email)
          .limit(1);

        if (existingUsers && existingUsers.length > 0) {
          result.error = "User already exists";
          results.push(result);
          console.log(`Skipping ${user.email} - already exists`);
          continue;
        }

        // Create auth user with password
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: user.full_name
          }
        });

        if (authError) {
          result.error = authError.message;
          results.push(result);
          console.error(`Failed to create auth user ${user.email}:`, authError.message);
          continue;
        }

        const authUserId = authData.user.id;
        result.user_id = authUserId;

        // Create user profile in users table
        const { error: profileError } = await supabase
          .from("users")
          .insert({
            id: authUserId,
            email: user.email,
            full_name: user.full_name,
            team_id: organization_id,
            role: user.role
          });

        if (profileError) {
          result.error = `Profile creation failed: ${profileError.message}`;
          results.push(result);
          console.error(`Failed to create profile for ${user.email}:`, profileError.message);
          continue;
        }

        // Add role to user_roles table
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authUserId,
            role: user.role
          });

        if (roleError) {
          console.warn(`Role assignment warning for ${user.email}:`, roleError.message);
          // Continue anyway, profile is created
        }

        // Link to department
        if (user.department_id) {
          const { error: deptError } = await supabase
            .from("user_departments")
            .insert({
              user_id: authUserId,
              department_id: user.department_id
            });

          if (deptError) {
            console.warn(`Department assignment warning for ${user.email}:`, deptError.message);
            // Continue anyway
          }
        }

        result.success = true;
        results.push(result);
        console.log(`Successfully created user: ${user.email}`);

      } catch (err) {
        result.error = err instanceof Error ? err.message : "Unknown error";
        results.push(result);
        console.error(`Error processing ${user.email}:`, err);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Completed: ${successCount} succeeded, ${failureCount} failed`);

    // Log to audit
    await supabase.from("audit_log").insert({
      action: "bulk_user_creation",
      entity: "users",
      payload: {
        organization_id,
        total: users.length,
        success: successCount,
        failed: failureCount,
        results: results.map(r => ({ email: r.email, success: r.success, error: r.error }))
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        total: users.length,
        created: successCount,
        failed: failureCount,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Bulk user creation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
