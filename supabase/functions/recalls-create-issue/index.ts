import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's data
    const { data: userData } = await supabase
      .from('users')
      .select('id, team_id')
      .eq('id', user.id)
      .single();

    if (!userData?.team_id) {
      throw new Error('User has no organization');
    }

    // Parse request body
    const { pastDue, dueToday, upcoming } = await req.json();

    console.log('Creating recall backlog issue for team:', userData.team_id);
    console.log('Metrics:', { pastDue, dueToday, upcoming });

    // Create issue
    const { data: issue, error: issueError } = await supabase
      .from('issues')
      .insert({
        title: 'Recall Backlog Over Threshold',
        context: `The recall backlog has exceeded the threshold and requires attention.

**Current Metrics:**
- Past Due: ${pastDue}
- Due Today: ${dueToday}
- Upcoming: ${upcoming}

Please review the [Recalls Dashboard](/recalls) and assign follow-up tasks to clear the backlog.`,
        team_id: userData.team_id,
        status: 'open',
        priority: pastDue > 20 ? 1 : 2, // High priority if >20 past due
      })
      .select()
      .single();

    if (issueError) {
      console.error('Error creating issue:', issueError);
      throw issueError;
    }

    console.log('Issue created successfully:', issue.id);

    return new Response(
      JSON.stringify({ success: true, issue }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in recalls-create-issue function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
