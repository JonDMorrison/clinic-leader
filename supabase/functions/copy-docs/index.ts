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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { sourceTeamId, targetTeamId } = await req.json();

    if (!sourceTeamId || !targetTeamId) {
      return new Response(
        JSON.stringify({ error: "sourceTeamId and targetTeamId are required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get source team users
    const { data: sourceUsers, error: sourceError } = await supabase
      .from('users')
      .select('id')
      .eq('team_id', sourceTeamId);

    if (sourceError) throw sourceError;

    const sourceUserIds = sourceUsers.map(u => u.id);

    // Get target team owner/director
    const { data: targetUsers, error: targetError } = await supabase
      .from('users')
      .select('id, role')
      .eq('team_id', targetTeamId)
      .in('role', ['owner', 'director'])
      .limit(1)
      .single();

    if (targetError) throw targetError;

    // Get all docs from source team
    const { data: sourceDocs, error: docsError } = await supabase
      .from('docs')
      .select('*')
      .in('owner_id', sourceUserIds);

    if (docsError) throw docsError;

    if (!sourceDocs || sourceDocs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No documents found in source team", copied: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Copy docs to target team
    const newDocs = sourceDocs.map(doc => ({
      title: doc.title,
      body: doc.body,
      kind: doc.kind,
      status: doc.status,
      owner_id: targetUsers.id,
      requires_ack: doc.requires_ack,
      version: 1, // Reset version for new org
    }));

    const { data: insertedDocs, error: insertError } = await supabase
      .from('docs')
      .insert(newDocs)
      .select();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        message: "Documents copied successfully",
        copied: insertedDocs?.length || 0,
        documents: insertedDocs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error copying documents:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
