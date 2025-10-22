import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface KPI {
  id: string;
  name: string;
  target: number | null;
  direction: string;
  owner_id: string | null;
  users?: {
    full_name: string;
    team_id: string | null;
  } | null;
}

interface KPIReading {
  week_start: string;
  value: number;
  kpi_id: string;
}

interface Doc {
  id: string;
  title: string;
  requires_ack: boolean;
  owner_id: string | null;
  users?: {
    full_name: string;
    team_id: string | null;
  } | null;
  acknowledgements?: Array<{ user_id: string }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    console.log('Starting weekly rules engine...');

    const issuesCreated: string[] = [];

    // Get current and previous week dates
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    currentWeekStart.setHours(0, 0, 0, 0);

    const prevWeekStart = new Date(currentWeekStart);
    prevWeekStart.setDate(currentWeekStart.getDate() - 7);

    const currentWeekStr = currentWeekStart.toISOString().split('T')[0];
    const prevWeekStr = prevWeekStart.toISOString().split('T')[0];

    console.log(`Checking weeks: ${prevWeekStr} and ${currentWeekStr}`);

    // ========== RULE 1: KPI Misses Target 2 Weeks in a Row ==========
    const { data: kpis, error: kpiError } = await supabaseClient
      .from('kpis')
      .select('*, users(full_name, team_id)')
      .eq('active', true)
      .not('target', 'is', null);

    if (kpiError) {
      console.error('Error fetching KPIs:', kpiError);
    } else {
      console.log(`Found ${kpis?.length || 0} active KPIs with targets`);

      for (const kpi of (kpis as KPI[]) || []) {
        // Get readings for both weeks
        const { data: readings, error: readingError } = await supabaseClient
          .from('kpi_readings')
          .select('*')
          .eq('kpi_id', kpi.id)
          .in('week_start', [prevWeekStr, currentWeekStr])
          .order('week_start');

        if (readingError) {
          console.error(`Error fetching readings for KPI ${kpi.id}:`, readingError);
          continue;
        }

        const readingsTyped = readings as KPIReading[];

        if (!readingsTyped || readingsTyped.length < 2) {
          console.log(`KPI ${kpi.name}: Not enough readings`);
          continue;
        }

        const prevWeekReading = readingsTyped.find((r) => r.week_start === prevWeekStr);
        const currentWeekReading = readingsTyped.find((r) => r.week_start === currentWeekStr);

        if (!prevWeekReading || !currentWeekReading || !kpi.target) {
          continue;
        }

        // Check if both weeks missed target based on direction
        const prevMissed = checkKPIMiss(prevWeekReading.value, kpi.target, kpi.direction);
        const currentMissed = checkKPIMiss(currentWeekReading.value, kpi.target, kpi.direction);

        if (prevMissed && currentMissed) {
          console.log(`KPI ${kpi.name}: Missed target 2 weeks in a row`);

          // Check if issue already exists for this KPI recently
          const { data: existingIssues } = await supabaseClient
            .from('issues')
            .select('id')
            .eq('status', 'open')
            .ilike('context', `%KPI ID: ${kpi.id}%`)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

          if (existingIssues && existingIssues.length > 0) {
            console.log(`KPI ${kpi.name}: Issue already exists, skipping`);
            continue;
          }

          // Get clinic director
          const { data: director } = await supabaseClient
            .from('users')
            .select('id, team_id')
            .or('role.eq.director,role.eq.owner')
            .limit(1)
            .maybeSingle();

          const { error: issueError } = await supabaseClient
            .from('issues')
            .insert({
              title: `KPI Alert: ${kpi.name} missed target 2 weeks`,
              context: `KPI "${kpi.name}" has missed its target for 2 consecutive weeks.\n\nTarget: ${kpi.target} (${kpi.direction})\nPrevious week (${prevWeekStr}): ${prevWeekReading.value}\nCurrent week (${currentWeekStr}): ${currentWeekReading.value}\n\nKPI ID: ${kpi.id}`,
              priority: 2,
              owner_id: kpi.owner_id || director?.id || null,
              team_id: kpi.users?.team_id || director?.team_id || null,
              status: 'open',
            });

          if (issueError) {
            console.error(`Error creating issue for KPI ${kpi.name}:`, issueError);
          } else {
            issuesCreated.push(`KPI: ${kpi.name}`);
            console.log(`Created issue for KPI ${kpi.name}`);
          }
        }
      }
    }

    // ========== RULE 2: Doc Acknowledgment <95% by Friday 3pm ==========
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    const isFridayAfternoon = dayOfWeek === 5 && hour >= 15;

    if (isFridayAfternoon) {
      console.log('Checking document acknowledgment rates (Friday afternoon)');

      const { data: docs, error: docError } = await supabaseClient
        .from('docs')
        .select('*, users(full_name, team_id), acknowledgements(user_id)')
        .eq('requires_ack', true)
        .eq('status', 'approved');

      if (docError) {
        console.error('Error fetching docs:', docError);
      } else {
        const { data: totalUsers, error: usersError } = await supabaseClient
          .from('users')
          .select('id', { count: 'exact' });

        if (usersError) {
          console.error('Error fetching users:', usersError);
        } else {
          const userCount = totalUsers?.length || 0;

          for (const doc of (docs as Doc[]) || []) {
            const ackCount = doc.acknowledgements?.length || 0;
            const ackRate = userCount > 0 ? (ackCount / userCount) * 100 : 0;

            if (ackRate < 95) {
              console.log(`Doc ${doc.title}: Acknowledgment rate ${ackRate.toFixed(1)}%`);

              // Check if issue already exists for this doc this week
              const { data: existingIssues } = await supabaseClient
                .from('issues')
                .select('id')
                .eq('status', 'open')
                .ilike('context', `%Doc ID: ${doc.id}%`)
                .gte('created_at', currentWeekStart.toISOString());

              if (existingIssues && existingIssues.length > 0) {
                console.log(`Doc ${doc.title}: Issue already exists, skipping`);
                continue;
              }

              // Get clinic director
              const { data: director } = await supabaseClient
                .from('users')
                .select('id, team_id')
                .or('role.eq.director,role.eq.owner')
                .limit(1)
                .maybeSingle();

              const { error: issueError } = await supabaseClient
                .from('issues')
                .insert({
                  title: `Doc Alert: "${doc.title}" needs more acknowledgments`,
                  context: `Document "${doc.title}" has only ${ackRate.toFixed(1)}% acknowledgment rate (${ackCount}/${userCount} users).\n\nTarget: 95% by Friday 3pm\nCurrent: ${ackRate.toFixed(1)}%\n\nDoc ID: ${doc.id}`,
                  priority: 2,
                  owner_id: director?.id || doc.owner_id || null,
                  team_id: director?.team_id || doc.users?.team_id || null,
                  status: 'open',
                });

              if (issueError) {
                console.error(`Error creating issue for doc ${doc.title}:`, issueError);
              } else {
                issuesCreated.push(`Doc: ${doc.title}`);
                console.log(`Created issue for doc ${doc.title}`);
              }
            } else {
              console.log(`Doc ${doc.title}: Acknowledgment rate ${ackRate.toFixed(1)}% - OK`);
            }
          }
        }
      }
    } else {
      console.log(`Not Friday afternoon (day: ${dayOfWeek}, hour: ${hour}), skipping doc checks`);
    }

    console.log(`Rules engine completed. Created ${issuesCreated.length} issues.`);

    return new Response(
      JSON.stringify({
        success: true,
        issuesCreated: issuesCreated.length,
        issues: issuesCreated,
        checkedWeeks: {
          previous: prevWeekStr,
          current: currentWeekStr,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Rules engine error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

function checkKPIMiss(value: number, target: number, direction: string): boolean {
  switch (direction) {
    case '>=':
      return value < target;
    case '<=':
      return value > target;
    case '==':
      return value !== target;
    default:
      return false;
  }
}
