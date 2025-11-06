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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const masterAdminEmail = Deno.env.get('DEMO_ADMIN_EMAIL')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the requesting user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !adminUser) {
      throw new Error('Invalid user token');
    }
    
    // Verify the user is the master admin
    if (adminUser.email !== masterAdminEmail) {
      console.error(`Unauthorized impersonation attempt by ${adminUser.email}`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Only master admin can impersonate users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { targetUserId, action } = await req.json();
    
    if (action === 'exit') {
      // End impersonation - update log
      const { logId } = await req.json();
      if (logId) {
        await supabase
          .from('admin_impersonation_logs')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', logId);
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'Impersonation ended' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!targetUserId) {
      throw new Error('Target user ID is required');
    }
    
    // Get target user details
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, email, full_name, team_id')
      .eq('id', targetUserId)
      .single();
    
    if (targetError || !targetUser) {
      throw new Error('Target user not found');
    }
    
    // Create impersonation log
    const { data: logEntry, error: logError } = await supabase
      .from('admin_impersonation_logs')
      .insert({
        admin_user_id: adminUser.id,
        target_user_id: targetUserId,
        admin_email: adminUser.email,
        target_user_email: targetUser.email,
        target_organization_id: targetUser.team_id,
      })
      .select()
      .single();
    
    if (logError) {
      console.error('Failed to create impersonation log:', logError);
      throw new Error('Failed to log impersonation');
    }
    
    // Generate new session for target user using admin API
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email,
    });
    
    if (sessionError || !sessionData) {
      console.error('Failed to generate session:', sessionError);
      throw new Error('Failed to generate impersonation session');
    }
    
    console.log(`Admin ${adminUser.email} impersonating ${targetUser.email}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        sessionUrl: sessionData.properties.action_link,
        logId: logEntry.id,
        targetUser: {
          id: targetUser.id,
          email: targetUser.email,
          fullName: targetUser.full_name,
          organizationId: targetUser.team_id,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in admin-impersonate:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
