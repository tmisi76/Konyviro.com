import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[INVITE-COLLABORATOR] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Hiányzó autentikáció" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Érvénytelen token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const inviter = userData.user;

    const body = await req.json().catch(() => ({}));
    const { project_id, email, role } = body as { project_id?: string; email?: string; role?: string };

    if (!project_id || !email || !role) {
      return new Response(JSON.stringify({ error: "Hiányzó mezők" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return new Response(JSON.stringify({ error: "Érvénytelen email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["reader", "editor", "admin"].includes(role)) {
      return new Response(JSON.stringify({ error: "Érvénytelen szerepkör" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify project ownership
    const { data: project, error: projectErr } = await supabaseAdmin
      .from("projects")
      .select("id, title, user_id")
      .eq("id", project_id)
      .maybeSingle();
    if (projectErr || !project) {
      return new Response(JSON.stringify({ error: "Projekt nem található" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (project.user_id !== inviter.id) {
      return new Response(JSON.stringify({ error: "Csak a tulajdonos hívhat meg" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find existing user by email via admin API
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = usersList?.users.find(u => u.email?.toLowerCase() === normalizedEmail);

    let collaboratorUserId = existing?.id;
    let acceptedAt: string | null = null;

    // If user already exists, attach immediately (auto-accept)
    if (collaboratorUserId) {
      acceptedAt = new Date().toISOString();
    } else {
      // Use a placeholder user_id; row is updated when user signs up. Since user_id is NOT NULL,
      // we generate a UUID placeholder and store invited_email. They must register with the same email,
      // and a separate flow could resolve them. For simplicity, require existing users for now.
      return new Response(JSON.stringify({
        error: "A meghívott emailhez nincs regisztrált felhasználó. Kérd meg, hogy regisztráljon először.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Prevent inviting the owner themselves
    if (collaboratorUserId === project.user_id) {
      return new Response(JSON.stringify({ error: "A tulajdonos nem hívható meg" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert collaborator
    const { error: insertErr } = await supabaseAdmin
      .from("project_collaborators")
      .upsert({
        project_id,
        user_id: collaboratorUserId,
        invited_email: normalizedEmail,
        invited_by: inviter.id,
        role,
        accepted_at: acceptedAt,
      }, { onConflict: "project_id,user_id" });

    if (insertErr) {
      log("Insert error", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send notification email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const inviterName = inviter.user_metadata?.full_name || inviter.email || "Egy szerző";
      const roleLabel = role === "admin" ? "Adminisztrátor" : role === "editor" ? "Szerkesztő" : "Olvasó";
      const projectUrl = `https://konyviro.com/project/${project_id}`;
      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
          <h2 style="color:#7c3aed">Meghívó egy könyv projektbe</h2>
          <p><strong>${inviterName}</strong> meghívott a <strong>"${project.title}"</strong> könyv projektbe a KönyvÍró-n.</p>
          <p>Szerepkör: <strong>${roleLabel}</strong></p>
          <p style="margin:32px 0">
            <a href="${projectUrl}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Projekt megnyitása</a>
          </p>
          <p style="color:#666;font-size:13px">Jelentkezz be a KönyvÍró fiókodba a projekthez való hozzáféréshez.</p>
        </div>
      `;
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "KönyvÍró <noreply@konyviro.com>",
            to: [normalizedEmail],
            subject: `Meghívó: "${project.title}" projekt`,
            html,
          }),
        });
      } catch (e) {
        log("Email send failed (non-fatal)", e);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log("Unexpected error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Ismeretlen hiba" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});