import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, practice_name, email, jane_link } = await req.json();

    if (!name || !practice_name || !email) {
      return new Response(
        JSON.stringify({ error: "Name, practice name, and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Store submission
    const { error: dbError } = await supabase
      .from("waitlist_submissions")
      .insert({ name, practice_name, email, jane_link: jane_link || null });

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Send notification email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "ClinicLeader <noreply@clinicleader.com>",
          to: ["jon@goodclear.ca"],
          subject: `New Tester Signup: ${name} from ${practice_name}`,
          html: `
            <h2>New ClinicLeader Tester Signup</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Practice:</strong> ${practice_name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Jane Link:</strong> ${jane_link || "Not provided"}</p>
          `,
        }),
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
