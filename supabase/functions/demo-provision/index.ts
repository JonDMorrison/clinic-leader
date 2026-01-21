import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { seedDemoData } from "../_shared/demo-seed.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user is whitelisted
    const DEMO_OWNER_EMAIL = Deno.env.get('DEMO_OWNER_EMAIL') || 'jonathanddmorrison@gmail.com';
    const DEMO_ADMIN_EMAIL = Deno.env.get('DEMO_ADMIN_EMAIL') || 'jon@getclear.ca';
    const whitelist = [
      DEMO_OWNER_EMAIL, 
      DEMO_ADMIN_EMAIL,
      'jonathandmorrison@gmail.com', // Additional demo user
    ];

    if (!whitelist.includes(user.email || '')) {
      return new Response(
        JSON.stringify({ error: 'Not authorized for demo provisioning' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { reset } = await req.json().catch(() => ({ reset: false }));

    // Check if already provisioned
    const { data: existing, error: existingError } = await supabaseClient
      .from('demo_provision')
      .select('*, teams!inner(id, name)')
      .eq('user_id', user.id)
      .single();

    if (existing && !reset) {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyProvisioned: true,
          organization: existing.teams,
          provisionedAt: existing.created_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If reset, delete existing demo org and provision
    if (reset && existing) {
      await supabaseClient.from('teams').delete().eq('id', existing.team_id);
      await supabaseClient.from('demo_provision').delete().eq('user_id', user.id);
    }

    console.log('Creating demo organization...');

    // 1. Create organization with onboarding already completed
    const { data: org, error: orgError } = await supabaseClient
      .from('teams')
      .insert({
        name: 'Clinic Leader Demo Practice',
        is_demo_org: true,
        onboarding_status: 'completed', // Skip onboarding for demo users
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating org:', orgError);
      throw new Error(`Failed to create organization: ${orgError.message}`);
    }

    console.log('Created org:', org.id);

    // 2. Create/update demo users
    const demoUsers = [
      { email: DEMO_OWNER_EMAIL, name: 'Demo Owner', role: 'owner' },
      { email: DEMO_ADMIN_EMAIL, name: 'Jonathan Morrison', role: 'director' },
      { email: 'jonathandmorrison@gmail.com', name: 'Jonathan Morrison', role: 'owner' },
      { email: 'director@demo.clinicleader.ca', name: 'Alex Chen', role: 'director', demo: true },
      { email: 'billing@demo.clinicleader.ca', name: 'Sam Taylor', role: 'billing', demo: true },
      { email: 'staff@demo.clinicleader.ca', name: 'Jordan Lee', role: 'staff', demo: true },
    ];

    for (const demoUser of demoUsers) {
      // Check if user exists
      const { data: existingUser } = await supabaseClient
        .from('users')
        .select('id')
        .eq('email', demoUser.email)
        .single();

      if (existingUser) {
        // Update existing user
        await supabaseClient
          .from('users')
          .update({
            team_id: org.id,
            role: demoUser.role,
            demo_user: demoUser.demo || false,
          })
          .eq('id', existingUser.id);
      } else if (demoUser.demo) {
        // Create demo-only users (not real auth users)
        await supabaseClient
          .from('users')
          .insert({
            email: demoUser.email,
            full_name: demoUser.name,
            team_id: org.id,
            role: demoUser.role,
            demo_user: true,
          });
      }
    }

    console.log('Created demo users');

    // 3. Set up Jane integration (legacy table)
    const JANE_API_KEY = Deno.env.get('JANE_SANDBOX_API_KEY') || 'demo_key';
    const JANE_CLINIC_ID = Deno.env.get('JANE_SANDBOX_CLINIC_ID') || 'demo_clinic';

    const { data: janeIntegration, error: janeError } = await supabaseClient
      .from('jane_integrations')
      .insert({
        organization_id: org.id,
        api_key: JANE_API_KEY,
        clinic_id: JANE_CLINIC_ID,
        status: 'connected',
        sync_mode: 'daily',
        sync_scope: ['appointments', 'patients', 'payments', 'metrics'],
        last_sync: new Date().toISOString(),
        next_sync: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (janeError) {
      console.error('Error creating Jane integration:', janeError);
    } else {
      console.log('Created Jane integration:', janeIntegration.id);
    }

    // 4. Set up Jane bulk analytics connector (new unified system)
    const now = new Date();
    const lastProcessed = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    const nextSync = new Date(now.getTime() + 22 * 60 * 60 * 1000); // 22 hours from now

    const { data: bulkConnector, error: bulkError } = await supabaseClient
      .from('bulk_analytics_connectors')
      .insert({
        organization_id: org.id,
        source_system: 'jane',
        connector_type: 'bulk_analytics',
        status: 'active',
        cadence: 'daily',
        delivery_method: 's3',
        delivery_mode: 'partner_managed',
        expected_schema_version: 'jane_v1',
        clinic_identifier: JANE_CLINIC_ID,
        is_sandbox: true,
        last_received_at: lastProcessed.toISOString(),
        last_processed_at: lastProcessed.toISOString(),
      })
      .select()
      .single();

    if (bulkError) {
      console.error('Error creating bulk analytics connector:', bulkError);
    } else {
      console.log('Created bulk analytics connector:', bulkConnector.id);
    }

    // 5. Seed demo data
    console.log('Seeding demo data...');
    await seedDemoData(supabaseClient, org.id);

    // 6. Record provision
    const { error: provisionError } = await supabaseClient
      .from('demo_provision')
      .insert({
        user_id: user.id,
        organization_id: org.id,
        last_seed_at: new Date().toISOString(),
      });

    if (provisionError) {
      console.error('Error recording provision:', provisionError);
    }

    // 7. Prefill onboarding session for demo users
    console.log('Creating prefilled onboarding session...');
    const demoOnboardingData = {
      // Account holder (step 0)
      first_name: 'Jonathan',
      last_name: 'Morrison',
      email: user.email,
      role: 'owner',
      phone: '+1 (604) 555-0123',
      
      // Company basics (step 1)
      company_name: 'Clinic Leader Demo Practice',
      industry: 'Multidisciplinary',
      team_size: 12,
      locations_count: 2,
      location_city: 'Vancouver',
      location_region: 'BC',
      country: 'Canada',
      timezone: 'America/Vancouver',
      currency: 'CAD',
      unit_system: 'metric',
      
      // Operational setup (step 2)
      ehr_system: 'Jane',
      integrations: ['jane', 'google_calendar'],
      primary_metrics: ['patient_visits', 'revenue', 'new_patients', 'retention_rate'],
      review_cadence: 'weekly',
      
      // Core values (step 3)
      core_values: [
        { title: 'Patient First', short_behavior: 'Every decision starts with what\'s best for our patients' },
        { title: 'Continuous Growth', short_behavior: 'We embrace learning and strive to improve daily' },
        { title: 'Team Collaboration', short_behavior: 'We succeed together through open communication' },
        { title: 'Integrity', short_behavior: 'We do what\'s right, even when no one is watching' },
        { title: 'Excellence', short_behavior: 'We deliver outstanding care and service consistently' },
      ],
      
      // EOS setup (step 4)
      eos_enabled: true,
      meeting_rhythm: 'weekly_l10',
      vision_statement: 'To be the most trusted and innovative healthcare provider in our community',
      enable_modules: ['rocks', 'scorecard', 'issues', 'meetings', 'vto'],
      
      // Branding (step 5)
      logo_url: null,
      brand_color: '#0EA5E9',
      website_url: 'https://clinicleader.app',
      default_report_email: user.email,
    };

    // Get the user's internal ID from users table
    const { data: internalUser } = await supabaseClient
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (internalUser) {
      const { error: sessionError } = await supabaseClient
        .from('onboarding_sessions')
        .upsert({
          organization_id: org.id,
          started_by: internalUser.id,
          step: 6, // Set to Review step so they can see everything prefilled
          data: demoOnboardingData,
          completed: false,
        }, {
          onConflict: 'organization_id,started_by',
        });

      if (sessionError) {
        console.error('Error creating onboarding session:', sessionError);
      } else {
        console.log('Created prefilled onboarding session');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        organization: org,
        provisioned: true,
        message: 'Demo organization created successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in demo-provision:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
