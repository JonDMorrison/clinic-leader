import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  let emailLowerGlobal = "";
  let passwordGlobal = "";

  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // auth check
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "";
    const { data: me, error: meErr } = await supa.auth.getUser(token);
    if (meErr || !me?.user) throw new Error("Unauthorized");

    const { data: myRole } = await supa
      .from("user_roles")
      .select("role")
      .eq("user_id", me.user.id)
      .single();
    if (!myRole || !["owner", "director"].includes(myRole.role)) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { email, password, organization_id, role, full_name, department } = await req.json();
    if (!email || !organization_id || !role || !full_name) {
      throw new Error("Missing required fields");
    }

    const emailLower = String(email).trim().toLowerCase();
    emailLowerGlobal = emailLower;
    passwordGlobal = String(password || "");
    console.log("Password received:", passwordGlobal ? "YES (length:" + passwordGlobal.length + ")" : "NO");
    const department_id = department ?? null;

    // helper: find existing auth user by email (paged)
    const findAuthUserByEmail = async (target: string) => {
      let page = 1; const perPage = 1000;
      while (true) {
        const { data, error } = await supa.auth.admin.listUsers({ page, perPage });
        if (error) { console.warn("listUsers error p", page, error.message); break; }
        const hit = data?.users?.find((u: any) => (u.email || "").toLowerCase() === target);
        if (hit) return hit;
        if (!data?.nextPage || data.nextPage === page) break;
        page = data.nextPage;
      }
      return null;
    };

    const attachToOrg = async (authUserId: string) => {
      // Update password if provided
      if (passwordGlobal) {
        console.log("Updating password for existing user:", authUserId);
        const { error: pwErr } = await supa.auth.admin.updateUserById(
          authUserId,
          { password: passwordGlobal }
        );
        if (pwErr) {
          console.error("Password update failed:", pwErr.message);
          throw new Error(`Failed to update password: ${pwErr.message}`);
        }
        console.log("Password updated successfully");
      }

      // sync users
      const { data: existing, error: findErr } = await supa
        .from("users").select("id").eq("email", emailLower).single();
      if (findErr && (findErr as any).code !== "PGRST116") {
        console.warn("profile lookup warn:", findErr.message);
      }
      if (existing?.id) {
        const { error: updErr } = await supa
          .from("users")
          .update({ full_name, team_id: organization_id, department_id, role })
          .eq("id", existing.id);
        if (updErr) throw new Error(`Failed to update user profile: ${updErr.message}`);
      } else {
        const { error: insErr } = await supa
          .from("users")
          .insert({ id: authUserId, email: emailLower, full_name, team_id: organization_id, department_id, role });
        if (insErr) throw new Error(`Failed to create user profile: ${insErr.message}`);
      }
      // upsert role
      const { error: roleErr } = await supa
        .from("user_roles")
        .upsert({ user_id: authUserId, role }, { onConflict: "user_id,role" });
      if (roleErr) throw new Error(`Failed to assign role: ${roleErr.message}`);

      await supa.from("audit_log").insert({
        actor_id: me.user.id,
        action: "admin_add_user_attach",
        entity: "user",
        entity_id: authUserId,
        payload: { email: emailLower, organization_id, role }
      });

      return new Response(JSON.stringify({
        success: true,
        user_id: authUserId,
        message: `Attached ${emailLower} to org with role ${role}`
      }), { headers: cors });
    };

    // 1) Check if user already exists in auth
    const existing = await findAuthUserByEmail(emailLower);
    if (existing?.id) {
      console.log("existing auth user found:", existing.id);
      return await attachToOrg(existing.id);
    }

    // 2) Try to create user directly (if password provided)
    let createdUserId: string | null = null;
    if (passwordGlobal) {
      const created = await supa.auth.admin.createUser({
        email: emailLower,
        password: passwordGlobal,
        email_confirm: true,
        user_metadata: { full_name }
      });
      if (!created.error && created.data?.user?.id) {
        createdUserId = created.data.user.id as string;
      } else {
        console.error("createUser failed:", created.error);
        // If user already exists, try to find and attach them
        const retry = await findAuthUserByEmail(emailLower);
        if (retry?.id) {
          console.log("found existing user on retry:", retry.id);
          return await attachToOrg(retry.id);
        }
      }
    }

    if (createdUserId) {
      console.log("auth user created:", createdUserId);
      return await attachToOrg(createdUserId);
    }

    // 3) Generate signup link as fallback
    const link = await supa.auth.admin.generateLink({
      type: "signup",
      email: emailLower,
      password: passwordGlobal || undefined,
      options: { data: { full_name } }
    } as any);
    if (!link.error && link.data?.properties?.action_link) {
      console.log("signup link generated");
      return new Response(JSON.stringify({
        success: false,
        pending: true,
        signup_link: link.data.properties.action_link,
        message: "Share this link. After they complete signup, run this again to attach."
      }), { headers: cors });
    }
    if (link.error && (link.error as any)?.message?.toLowerCase?.().includes("already")) {
      const again = await findAuthUserByEmail(emailLower);
      if (again?.id) return await attachToOrg(again.id);
    }

    // 4) Invite as last fallback
    const invited = await supa.auth.admin.inviteUserByEmail(emailLower, { data: { full_name } } as any);
    if (!invited.error && invited.data?.user?.id) {
      console.log("invite sent:", invited.data.user.id);
      return new Response(JSON.stringify({
        success: false,
        pending: true,
        invite_sent: true,
        message: "Invite sent. After signup, run this again to attach role and org."
      }), { headers: cors });
    }
    if (invited.error && (invited.error as any)?.message?.toLowerCase?.().includes("already")) {
      const again = await findAuthUserByEmail(emailLower);
      if (again?.id) return await attachToOrg(again.id);
    }

    // Final fallback
    return new Response(JSON.stringify({
      success: false,
      pending: true,
      message: "Could not auto-create user. Use signup link or invite."
    }), { headers: cors });

  } catch (e: any) {
    console.error("admin-add-user fatal:", e?.message || e);
    return new Response(JSON.stringify({
      success: false,
      pending: true,
      message: e?.message || "Temporary issue. Try invite or signup link."
    }), { status: 200, headers: cors });
  }
});
