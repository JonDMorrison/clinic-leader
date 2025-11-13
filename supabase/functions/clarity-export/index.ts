import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { vto_id, format = 'html', include_history = false } = await req.json();
    console.log('Exporting VTO:', vto_id, 'format:', format);

    // Fetch VTO
    const { data: vto, error: vtoError } = await supabaseClient
      .from('clarity_vto')
      .select('*')
      .eq('id', vto_id)
      .single();

    if (vtoError || !vto) {
      throw new Error('VTO not found');
    }

    // Fetch organization
    const { data: org } = await supabaseClient
      .from('teams')
      .select('name')
      .eq('id', vto.organization_id)
      .single();

    // Fetch goals
    const { data: goals } = await supabaseClient
      .from('clarity_goals')
      .select('*')
      .eq('vto_id', vto_id)
      .order('type')
      .order('created_at');

    // Fetch revisions if requested
    let revisions = [];
    if (include_history) {
      const { data: revData } = await supabaseClient
        .from('clarity_revisions')
        .select('*')
        .eq('vto_id', vto_id)
        .order('version', { ascending: false })
        .limit(10);
      revisions = revData || [];
    }

    const html = generateHTML(vto, org?.name || 'Organization', goals || [], revisions);

    if (format === 'html') {
      return new Response(html, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="clarity-builder-${vto_id}.html"`
        },
      });
    }

    // For PDF, return HTML with print styles (client can use browser print)
    return new Response(
      JSON.stringify({
        success: true,
        html,
        message: 'Use browser print to save as PDF'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in clarity-export:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateHTML(vto: any, orgName: string, goals: any[], revisions: any[]): string {
  const vision = vto.vision || {};
  const traction = vto.traction || {};
  const metrics = vto.metrics || {};

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${orgName} - Clinic Clarity Builder</title>
  <style>
    @media print {
      @page { margin: 1cm; }
      body { margin: 0; }
      .no-print { display: none; }
      .page-break { page-break-before: always; }
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #fff;
    }
    
    h1 { color: #1a1a1a; border-bottom: 3px solid #4F46E5; padding-bottom: 0.5rem; }
    h2 { color: #4F46E5; margin-top: 2rem; border-bottom: 2px solid #E0E7FF; padding-bottom: 0.3rem; }
    h3 { color: #6366F1; margin-top: 1.5rem; }
    
    .header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .metrics {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin: 1.5rem 0;
      padding: 1.5rem;
      background: #F9FAFB;
      border-radius: 8px;
    }
    
    .metric {
      text-align: center;
      padding: 1rem;
      background: white;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .metric-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #4F46E5;
    }
    
    .metric-label {
      font-size: 0.875rem;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .section {
      margin: 1.5rem 0;
      padding: 1.5rem;
      background: #F9FAFB;
      border-left: 4px solid #4F46E5;
      border-radius: 4px;
    }
    
    .chip {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      margin: 0.25rem;
      background: #E0E7FF;
      color: #4F46E5;
      border-radius: 9999px;
      font-size: 0.875rem;
    }
    
    .goal-item {
      padding: 1rem;
      margin: 0.5rem 0;
      background: white;
      border-left: 3px solid #10B981;
      border-radius: 4px;
    }
    
    .goal-item.at-risk { border-color: #F59E0B; }
    .goal-item.off-track { border-color: #EF4444; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #E5E7EB;
    }
    
    th {
      background: #F3F4F6;
      font-weight: 600;
      color: #4B5563;
    }
    
    .version-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      background: #4F46E5;
      color: white;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${orgName}</h1>
    <p style="font-size: 1.5rem; color: #6366F1;">Clinic Clarity Builder</p>
    <p style="color: #6B7280;">Version ${vto.version_current} • ${new Date(vto.updated_at).toLocaleDateString()}</p>
  </div>

  <div class="metrics">
    <div class="metric">
      <div class="metric-value">${metrics.vision_clarity || 0}%</div>
      <div class="metric-label">Vision Clarity</div>
    </div>
    <div class="metric">
      <div class="metric-value">${metrics.traction_health || 0}%</div>
      <div class="metric-label">Traction Health</div>
    </div>
  </div>

  <div class="page-break"></div>

  <h2>Vision</h2>

  <div class="section">
    <h3>Core Values</h3>
    ${vision.core_values?.map((v: string) => `<span class="chip">${v}</span>`).join('') || '<p>Not set</p>'}
  </div>

  <div class="section">
    <h3>Core Focus</h3>
    <p><strong>Purpose:</strong> ${vision.core_focus?.purpose || 'Not set'}</p>
    <p><strong>Niche:</strong> ${vision.core_focus?.niche || 'Not set'}</p>
  </div>

  <div class="section">
    <h3>10-Year Target</h3>
    <p>${vision.ten_year_target || 'Not set'}</p>
  </div>

  <div class="section">
    <h3>Ideal Client</h3>
    <p>${vision.ideal_client || 'Not set'}</p>
  </div>

  <div class="section">
    <h3>Differentiators</h3>
    <ul>
      ${vision.differentiators?.map((d: string) => `<li>${d}</li>`).join('') || '<li>Not set</li>'}
    </ul>
  </div>

  <div class="section">
    <h3>Proven Process</h3>
    <ol>
      ${vision.proven_process?.map((p: string) => `<li>${p}</li>`).join('') || '<li>Not set</li>'}
    </ol>
  </div>

  <div class="section">
    <h3>Promise/Guarantee</h3>
    <p>${vision.promise || 'Not set'}</p>
  </div>

  <div class="section">
    <h3>3-Year Picture</h3>
    <p><strong>Revenue:</strong> $${vision.three_year_picture?.revenue?.toLocaleString() || '0'}</p>
    <p><strong>Profit Margin:</strong> ${vision.three_year_picture?.profit_margin || 0}%</p>
    <p><strong>Headcount:</strong> ${vision.three_year_picture?.headcount || 0}</p>
    <p><strong>Descriptors:</strong> ${vision.three_year_picture?.descriptors?.join(', ') || 'Not set'}</p>
  </div>

  <div class="section">
    <h3>Culture Statement</h3>
    <p>${vision.culture || 'Not set'}</p>
  </div>

  <div class="page-break"></div>

  <h2>Traction</h2>

  <div class="section">
    <h3>1-Year Plan Targets</h3>
    <p><strong>Revenue:</strong> $${traction.one_year_plan?.targets?.revenue?.toLocaleString() || '0'}</p>
    <p><strong>Profit Margin:</strong> ${traction.one_year_plan?.targets?.profit_margin || 0}%</p>
  </div>

  <h3>Goals & Priorities</h3>
  ${goals.filter((g: any) => g.type !== 'issue').map((g: any) => `
    <div class="goal-item ${g.status === 'at_risk' ? 'at-risk' : g.status === 'off_track' ? 'off-track' : ''}">
      <strong>${g.title}</strong>
      <p>${g.description || ''}</p>
      <small>Status: ${g.status} • Type: ${g.type}</small>
    </div>
  `).join('') || '<p>No goals set</p>'}

  ${revisions.length > 0 ? `
    <div class="page-break"></div>
    <h2>Version History</h2>
    <table>
      <thead>
        <tr>
          <th>Version</th>
          <th>Label</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        ${revisions.map(r => `
          <tr>
            <td><span class="version-badge">V${r.version}</span></td>
            <td>${r.label || 'Untitled'}</td>
            <td>${new Date(r.created_at).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <div style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #E5E7EB; text-align: center; color: #6B7280; font-size: 0.875rem;">
    <p>Generated by Clinic Clarity Builder • ${new Date().toLocaleDateString()}</p>
  </div>
</body>
</html>
  `.trim();
}
