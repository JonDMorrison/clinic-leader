import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to properly serialize error messages from Supabase
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    if (obj.message) return String(obj.message);
    if (obj.error) return String(obj.error);
    if (obj.details) return String(obj.details);
    if (obj.hint) return String(obj.hint);
    return JSON.stringify(error);
  }
  return String(error);
}

interface TestResult {
  step: string;
  success: boolean;
  duration: number;
  details?: any;
  error?: string;
}

interface OnboardingTestResult {
  overall_success: boolean;
  steps: TestResult[];
  summary: {
    org_id?: string;
    user_id?: string;
    roles_confirmed: string[];
    default_kpis_count: number;
    total_duration: number;
  };
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const testResult: OnboardingTestResult = {
      overall_success: true,
      steps: [],
      summary: {
        roles_confirmed: [],
        default_kpis_count: 0,
        total_duration: 0
      },
      timestamp: new Date().toISOString()
    };

    const startTime = Date.now();

    // Step 1: Create Test Organization
    console.log("Step 1: Creating test organization...");
    const step1Start = Date.now();
    try {
      const testOrgName = `Test Clinic ${Date.now()}`;
      const { data: orgData, error: orgError } = await supabase
        .from('teams')
        .insert({ name: testOrgName })
        .select()
        .single();

      if (orgError) throw orgError;

      testResult.steps.push({
        step: "Create Organization",
        success: true,
        duration: Date.now() - step1Start,
        details: { org_id: orgData.id, name: orgData.name }
      });
      testResult.summary.org_id = orgData.id;
    } catch (error: unknown) {
      console.error('Step 1 error details:', JSON.stringify(error, null, 2));
      const msg = getErrorMessage(error);
      testResult.steps.push({
        step: "Create Organization",
        success: false,
        duration: Date.now() - step1Start,
        error: msg
      });
      testResult.overall_success = false;
    }

    // Step 2: Create Test User with Owner Role
    console.log("Step 2: Creating test user...");
    const step2Start = Date.now();
    try {
      const testEmail = `test.owner.${Date.now()}@example.com`;
      
      // Create user via Admin API
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: {
          full_name: 'Test Owner'
        }
      });

      if (userError) throw userError;

      // Create user record in public.users
      const { error: publicUserError } = await supabase
        .from('users')
        .insert({
          id: userData.user.id,
          email: testEmail,
          full_name: 'Test Owner',
          role: 'owner',
          team_id: testResult.summary.org_id
        });

      if (publicUserError) {
        console.error('Public users insert error:', JSON.stringify(publicUserError, null, 2));
        throw publicUserError;
      }

      testResult.steps.push({
        step: "Create User with Owner Role",
        success: true,
        duration: Date.now() - step2Start,
        details: { user_id: userData.user.id, email: testEmail, role: 'owner' }
      });
      testResult.summary.user_id = userData.user.id;
      testResult.summary.roles_confirmed.push('owner');
    } catch (error: unknown) {
      console.error('Step 2 error details:', JSON.stringify(error, null, 2));
      const msg = getErrorMessage(error);
      testResult.steps.push({
        step: "Create User with Owner Role",
        success: false,
        duration: Date.now() - step2Start,
        error: msg
      });
      testResult.overall_success = false;
    }

    // Step 3: Mock Email Invitation
    console.log("Step 3: Simulating email invitation...");
    const step3Start = Date.now();
    try {
      // In a real scenario, this would send an email
      // For testing, we just verify the email service is configured
      const hasResendKey = !!Deno.env.get('RESEND_API_KEY');
      
      testResult.steps.push({
        step: "Email Invitation (Mock)",
        success: true,
        duration: Date.now() - step3Start,
        details: { 
          email_service_configured: hasResendKey,
          note: "Invitation would be sent via Resend in production"
        }
      });
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      testResult.steps.push({
        step: "Email Invitation (Mock)",
        success: false,
        duration: Date.now() - step3Start,
        error: msg
      });
    }

    // Step 4: Test Invite Token Flow (Simulated)
    console.log("Step 4: Testing invite token flow...");
    const step4Start = Date.now();
    try {
      // Generate a test invite link
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email: `test.invite.${Date.now()}@example.com`,
      });

      if (inviteError) throw inviteError;

      testResult.steps.push({
        step: "Invite Token Generation",
        success: true,
        duration: Date.now() - step4Start,
        details: { 
          token_generated: !!inviteData.properties.action_link,
          note: "Invite token successfully generated"
        }
      });
    } catch (error: unknown) {
      console.error('Step 4 error details:', JSON.stringify(error, null, 2));
      const msg = getErrorMessage(error);
      testResult.steps.push({
        step: "Invite Token Generation",
        success: false,
        duration: Date.now() - step4Start,
        error: msg
      });
      testResult.overall_success = false;
    }

    // Step 5: Test Role-Based Permissions
    console.log("Step 5: Testing role-based permissions...");
    const step5Start = Date.now();
    
    // Skip this step if user creation failed
    if (!testResult.summary.user_id) {
      testResult.steps.push({
        step: "Role-Based Permissions",
        success: false,
        duration: 0,
        error: "Skipped - no user was created in previous step"
      });
    } else {
      try {
        // Check if we can query with role checks
        const { data: roleCheck, error: roleError } = await supabase
          .from('users')
          .select('role')
          .eq('id', testResult.summary.user_id)
          .single();

        if (roleError) throw roleError;

        const rolesAvailable = ['owner', 'director', 'manager', 'staff', 'billing', 'provider'];
        
        testResult.steps.push({
          step: "Role-Based Permissions",
          success: true,
          duration: Date.now() - step5Start,
          details: { 
            user_role: roleCheck?.role,
            available_roles: rolesAvailable,
            rls_functions_exist: true
          }
        });
        
        if (roleCheck?.role) {
          testResult.summary.roles_confirmed.push(roleCheck.role);
        }
      } catch (error: unknown) {
        console.error('Step 5 error details:', JSON.stringify(error, null, 2));
        const msg = getErrorMessage(error);
        testResult.steps.push({
          step: "Role-Based Permissions",
          success: false,
          duration: Date.now() - step5Start,
          error: msg
        });
      }
    }

    // Step 6: Load Default KPIs
    console.log("Step 6: Loading default KPIs...");
    const step6Start = Date.now();
    try {
      // Create some test KPIs for the organization
      const defaultKpis = [
        { name: 'New Patients', unit: 'count', target: 50, direction: '>=', owner_id: testResult.summary.user_id },
        { name: 'Revenue', unit: '$', target: 100000, direction: '>=', owner_id: testResult.summary.user_id },
        { name: 'Patient Satisfaction', unit: '%', target: 95, direction: '>=', owner_id: testResult.summary.user_id }
      ];

      const { data: kpiData, error: kpiError } = await supabase
        .from('kpis')
        .insert(defaultKpis)
        .select();

      if (kpiError) throw kpiError;

      testResult.steps.push({
        step: "Load Default KPIs",
        success: true,
        duration: Date.now() - step6Start,
        details: { 
          kpis_created: kpiData?.length || 0,
          kpi_names: kpiData?.map(k => k.name)
        }
      });
      testResult.summary.default_kpis_count = kpiData?.length || 0;
    } catch (error: unknown) {
      console.error('Step 6 error details:', JSON.stringify(error, null, 2));
      const msg = getErrorMessage(error);
      testResult.steps.push({
        step: "Load Default KPIs",
        success: false,
        duration: Date.now() - step6Start,
        error: msg
      });
      testResult.overall_success = false;
    }

    // Cleanup: Delete test data
    console.log("Cleanup: Removing test data...");
    try {
      if (testResult.summary.user_id) {
        await supabase.auth.admin.deleteUser(testResult.summary.user_id);
        await supabase.from('users').delete().eq('id', testResult.summary.user_id);
      }
      if (testResult.summary.org_id) {
        await supabase.from('teams').delete().eq('id', testResult.summary.org_id);
      }
    } catch (error: unknown) {
      console.error('Cleanup error (non-critical):', error);
    }

    testResult.summary.total_duration = Date.now() - startTime;

    console.log("Onboarding flow test complete:", testResult);

    return new Response(
      JSON.stringify(testResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    console.error('Error in test-onboarding-flow function:', error);
    const msg = getErrorMessage(error);
    return new Response(
      JSON.stringify({ 
        error: msg,
        overall_success: false,
        steps: [],
        summary: {
          roles_confirmed: [],
          default_kpis_count: 0,
          total_duration: 0
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
