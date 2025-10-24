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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { vto_version_id } = await req.json();

    // Get version data
    const { data: version, error: versionError } = await supabaseClient
      .from('vto_versions')
      .select('*, vto(team_id, teams(name))')
      .eq('id', vto_version_id)
      .single();

    if (versionError) throw versionError;

    // Get progress data
    const { data: progress } = await supabaseClient
      .from('vto_progress')
      .select('*')
      .eq('vto_version_id', vto_version_id)
      .order('computed_at', { ascending: false })
      .limit(1)
      .single();

    // Generate HTML for PDF (simplified version - full implementation would use a PDF library)
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Vision/Traction Organizer</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
          h2 { color: #1e40af; margin-top: 30px; }
          .section { margin-bottom: 30px; }
          .values { display: flex; flex-wrap: wrap; gap: 10px; }
          .value-badge { background: #dbeafe; padding: 5px 15px; border-radius: 20px; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>Vision/Traction Organizer</h1>
        <p><strong>Organization:</strong> ${version.vto.teams.name}</p>
        <p><strong>Version:</strong> ${version.version} • ${version.status}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        
        ${progress ? `
          <div class="section">
            <h2>Progress Summary</h2>
            <p><strong>Vision Score:</strong> ${progress.vision_score}%</p>
            <p><strong>Traction Score:</strong> ${progress.traction_score}%</p>
          </div>
        ` : ''}

        <div class="section">
          <h2>Core Values</h2>
          <div class="values">
            ${version.core_values?.map((v: string) => `<span class="value-badge">${v}</span>`).join('') || 'Not set'}
          </div>
        </div>

        <div class="section">
          <h2>Core Focus</h2>
          <p><strong>Purpose:</strong> ${version.core_focus?.purpose || 'Not set'}</p>
          <p><strong>Niche:</strong> ${version.core_focus?.niche || 'Not set'}</p>
        </div>

        <div class="section">
          <h2>10-Year Target™</h2>
          <p>${version.ten_year_target || 'Not set'}</p>
        </div>

        <div class="section">
          <h2>3-Year Picture™</h2>
          <p><strong>Revenue:</strong> $${version.three_year_picture?.revenue?.toLocaleString() || '0'}</p>
          <p><strong>Profit:</strong> $${version.three_year_picture?.profit?.toLocaleString() || '0'}</p>
          <p><strong>Headcount:</strong> ${version.three_year_picture?.headcount || '0'}</p>
        </div>

        <div class="section">
          <h2>1-Year Plan</h2>
          <p><strong>Revenue:</strong> $${version.one_year_plan?.revenue?.toLocaleString() || '0'}</p>
          <p><strong>Profit:</strong> $${version.one_year_plan?.profit?.toLocaleString() || '0'}</p>
          <p><strong>Goals:</strong> ${version.one_year_plan?.goals?.length || 0} defined</p>
        </div>

        <div class="section">
          <h2>Quarterly Rocks (${version.quarter_key || 'Not set'})</h2>
          <p><strong>Total Rocks:</strong> ${version.quarterly_rocks?.length || 0}</p>
        </div>

        <div class="footer">
          <p>This is a PHI-light internal planning document.</p>
          <p>© ${new Date().getFullYear()} ${version.vto.teams.name}</p>
        </div>
      </body>
      </html>
    `;

    // Log audit
    const { data: userData } = await supabaseClient.auth.getUser();
    if (userData.user) {
      const { data: profile } = await supabaseClient
        .from('users')
        .select('id')
        .eq('email', userData.user.email)
        .single();

      if (profile) {
        await supabaseClient.from('vto_audit').insert({
          vto_version_id,
          user_id: profile.id,
          action: 'export',
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, html, format: 'html' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in vto-export:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
