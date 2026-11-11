import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function verifyTurnstile(token: string, remoteIp: string | null) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) throw new Error("TURNSTILE_SECRET_KEY is not configured");

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (remoteIp) form.append("remoteip", remoteIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  if (!response.ok) return false;

  const result = await response.json();
  return result.success === true;
}

async function sendEmail(to: string, resetUrl: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("MAIL_FROM") || "ReelsPorn <noreply@reelsporn.live>";
  if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured");

  const safeUrl = escapeHtml(resetUrl);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Şifreni yenile",
      html: `
        <div style="font-family:Arial,sans-serif;background:#0b0b0b;color:#fff;padding:32px">
          <div style="max-width:520px;margin:0 auto;background:#151515;border:1px solid #2a2a2a;border-radius:10px;padding:28px">
            <h1 style="margin:0 0 12px;font-size:24px">Şifreni yenile</h1>
            <p style="color:#cfcfcf;line-height:1.5">Hesabın için şifre yenileme isteği aldık. Yeni şifre belirlemek için aşağıdaki butona tıkla.</p>
            <p style="margin:28px 0">
              <a href="${safeUrl}" style="display:inline-block;background:#ef2b2d;color:#fff;text-decoration:none;font-weight:700;border-radius:8px;padding:14px 20px">Şifreyi yenile</a>
            </p>
            <p style="color:#999;font-size:13px;line-height:1.5">Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin. Link kısa süre içinde geçersiz olur.</p>
            <p style="color:#777;font-size:12px;word-break:break-all">${safeUrl}</p>
          </div>
        </div>
      `,
      text: `Şifreni yenilemek için bu bağlantıyı aç: ${resetUrl}`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Email provider failed: ${details}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  try {
    const { email, captchaToken } = await req.json();
    if (typeof email !== "string" || !isValidEmail(email)) {
      return Response.json({ error: "Valid email is required" }, { status: 400, headers: corsHeaders });
    }
    if (typeof captchaToken !== "string" || !captchaToken) {
      return Response.json({ error: "Captcha token is required" }, { status: 400, headers: corsHeaders });
    }

    const verified = await verifyTurnstile(captchaToken, req.headers.get("cf-connecting-ip"));
    if (!verified) {
      return Response.json({ error: "Captcha verification failed" }, { status: 403, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const siteUrl = (Deno.env.get("SITE_URL") || "https://www.reelsporn.live").replace(/\/$/, "");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase admin credentials are not configured");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${siteUrl}/giris` },
    });

    if (error) throw error;
    const actionLink = data.properties?.action_link;
    if (!actionLink) throw new Error("Password reset link could not be generated");

    await sendEmail(email, actionLink);

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("Password reset mail failed:", error);
    return Response.json({ error: "Password reset mail could not be sent" }, { status: 500, headers: corsHeaders });
  }
});
