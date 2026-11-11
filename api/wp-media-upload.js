const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;

function getEnv(name, fallbackName = "") {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : "");
}

function getWordPressApiUrl() {
  const rawUrl = getEnv("WORDPRESS_API_URL", "VITE_WORDPRESS_API_URL").replace(/\/$/, "");
  if (!rawUrl) return "";
  return rawUrl.endsWith("/wp-json") ? rawUrl : `${rawUrl}/wp-json`;
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function sanitizeFileName(value) {
  const fallback = `recording-${Date.now()}.webm`;
  const raw = Array.isArray(value) ? value[0] : value || fallback;
  const cleaned = String(raw)
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return cleaned || fallback;
}

async function getSupabaseUser(token) {
  const supabaseUrl = getEnv("SUPABASE_URL", "VITE_SUPABASE_URL").replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin env is missing.");
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;
  return response.json();
}

async function userIsAdmin(userId) {
  const supabaseUrl = getEnv("SUPABASE_URL", "VITE_SUPABASE_URL").replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const url = new URL(`${supabaseUrl}/rest/v1/user_roles`);
  url.searchParams.set("select", "role");
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("role", "eq.admin");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) return false;
  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function assertAdmin(req) {
  const token = getBearerToken(req);
  if (!token) return false;

  const user = await getSupabaseUser(token);
  if (!user?.id) return false;

  return userIsAdmin(user.id);
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-File-Name");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const wpApiUrl = getWordPressApiUrl();
  const wpUsername = process.env.WORDPRESS_USERNAME || "";
  const wpPassword = process.env.WORDPRESS_APPLICATION_PASSWORD || process.env.WORDPRESS_APP_PASSWORD || "";

  if (!wpApiUrl || !wpUsername || !wpPassword) {
    sendJson(res, 500, { error: "WordPress media upload env is missing." });
    return;
  }

  try {
    const isAdmin = await assertAdmin(req);
    if (!isAdmin) {
      sendJson(res, 403, { error: "Admin permission required." });
      return;
    }
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Admin check failed." });
    return;
  }

  const maxBytes = Number(process.env.WP_MEDIA_UPLOAD_MAX_BYTES || DEFAULT_MAX_BYTES);
  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength && contentLength > maxBytes) {
    sendJson(res, 413, { error: "Video file is too large." });
    return;
  }

  const contentType = req.headers["content-type"] || "video/webm";
  const mediaType = String(contentType).split(";")[0].trim().toLowerCase();
  if (!/^video\/(webm|mp4|quicktime)$/i.test(mediaType)) {
    sendJson(res, 415, { error: "Unsupported video type." });
    return;
  }

  const fileName = sanitizeFileName(req.headers["x-file-name"]);
  const auth = Buffer.from(`${wpUsername}:${wpPassword}`).toString("base64");

  try {
    const upstream = await fetch(`${wpApiUrl}/wp/v2/media`, {
      method: "POST",
      headers: {
        authorization: `Basic ${auth}`,
        "content-disposition": `attachment; filename="${fileName}"`,
        "content-type": mediaType,
      },
      body: req,
      duplex: "half",
    });

    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      sendJson(res, upstream.status || 502, {
        error: payload?.message || "WordPress media upload failed.",
      });
      return;
    }

    sendJson(res, 200, {
      id: payload.id,
      url: payload.source_url || payload.guid?.rendered || "",
      mimeType: payload.mime_type || mediaType,
    });
  } catch (error) {
    sendJson(res, 502, {
      error: error instanceof Error ? error.message : "WordPress media upload failed.",
    });
  }
}
