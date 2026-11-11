import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_IMAGE_BYTES = 8_000_000;
const FETCH_TIMEOUT_MS = 10_000;
const CONTENT_BUCKET = "content";

type ArtworkKind = "poster" | "backdrop";
type ArtworkStatus = "healthy" | "cached" | "warning" | "broken";

type ArtworkResult = {
  kind: ArtworkKind;
  status: ArtworkStatus;
  url: string;
  sourceUrl?: string;
  reason?: string;
};

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

function safeRemoteUrl(value: string) {
  const url = new URL(value.startsWith("//") ? `https:${value}` : value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http(s) artwork urls are allowed");
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.startsWith("[") ||
    isPrivateIpv4(hostname)
  ) {
    throw new Error("Local and private network artwork urls are not allowed");
  }
  return url.toString();
}

function isRelativeOrAlreadyManaged(value: string, supabaseUrl: string) {
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.toString().startsWith(`${supabaseUrl}/storage/v1/object/public/${CONTENT_BUCKET}/`);
  } catch {
    return false;
  }
}

function extensionFrom(contentType: string, url: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("avif")) return "avif";
  const pathExt = new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  return pathExt && ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(pathExt) ? pathExt : "jpg";
}

async function fetchImage(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const response = await fetch(url, {
    redirect: "follow",
    signal: controller.signal,
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; VizyonKeyfiArtworkBot/1.0)",
    },
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) throw new Error(`Artwork returned ${response.status}`);

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error(`Artwork is not an image (${contentType || "unknown content type"})`);
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_IMAGE_BYTES) throw new Error("Artwork is too large");

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("Artwork is too large");
  if (!buffer.byteLength) throw new Error("Artwork is empty");

  return { buffer, contentType };
}

async function requireAdmin(req: Request, supabaseUrl: string, anonKey: string, serviceKey: string) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) throw new Error("Missing authorization header");

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const serviceClient = createClient(supabaseUrl, serviceKey);

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) throw new Error("Admin session could not be verified");

  const { data: role, error: roleError } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !role) throw new Error("Admin role required");
  return serviceClient;
}

async function cacheArtwork(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  titleId: string,
  kind: ArtworkKind,
  rawUrl: string,
): Promise<ArtworkResult> {
  const sourceUrl = rawUrl.trim();
  if (!sourceUrl) {
    return { kind, status: "broken", url: "", reason: `${kind} URL yok.` };
  }

  if (isRelativeOrAlreadyManaged(sourceUrl, supabaseUrl)) {
    return { kind, status: "healthy", url: sourceUrl, sourceUrl };
  }

  try {
    const remoteUrl = safeRemoteUrl(sourceUrl);
    const image = await fetchImage(remoteUrl);
    const ext = extensionFrom(image.contentType, remoteUrl);
    const safeTitleId = titleId.replace(/[^a-z0-9_-]/gi, "-").slice(0, 96);
    const path = `titles/${safeTitleId}/${kind}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(CONTENT_BUCKET)
      .upload(path, new Blob([image.buffer], { type: image.contentType }), {
        contentType: image.contentType,
        cacheControl: "31536000",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(CONTENT_BUCKET).getPublicUrl(path);
    return { kind, status: "cached", url: data.publicUrl, sourceUrl: remoteUrl };
  } catch (error) {
    return {
      kind,
      status: "broken",
      url: "",
      sourceUrl,
      reason: error instanceof Error ? error.message : "Artwork could not be cached",
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Supabase function environment is missing" }, 500);
    }

    const supabase = await requireAdmin(req, supabaseUrl, anonKey, serviceKey);
    const body = await req.json();
    const titleId = typeof body?.titleId === "string" ? body.titleId.trim() : "";
    const posterUrl = typeof body?.posterUrl === "string" ? body.posterUrl.trim() : "";
    const backdropUrl = typeof body?.backdropUrl === "string" ? body.backdropUrl.trim() : "";
    const publishOnSuccess = body?.publishOnSuccess === true;
    if (!titleId) return json({ error: "titleId is required" }, 400);

    const poster = await cacheArtwork(supabase, supabaseUrl, titleId, "poster", posterUrl);
    const backdropSource = backdropUrl || posterUrl;
    const backdrop =
      backdropSource === posterUrl && poster.url
        ? { kind: "backdrop" as const, status: poster.status, url: poster.url, sourceUrl: poster.sourceUrl, reason: poster.reason }
        : await cacheArtwork(supabase, supabaseUrl, titleId, "backdrop", backdropSource);

    const status: ArtworkStatus =
      poster.status === "broken"
        ? "broken"
        : backdrop.status === "broken"
          ? "warning"
          : poster.status === "cached" || backdrop.status === "cached"
            ? "cached"
            : "healthy";
    const reasons = [poster.reason, backdrop.reason].filter(Boolean).join(" ");
    const now = new Date().toISOString();
    const updatePayload: Record<string, string | null> = {
      poster_url: poster.url || posterUrl,
      backdrop_url: backdrop.url || poster.url || backdropUrl || posterUrl,
      poster_source_url: poster.sourceUrl || posterUrl || null,
      backdrop_source_url: backdrop.sourceUrl || backdropUrl || poster.sourceUrl || posterUrl || null,
      artwork_status: status,
      artwork_checked_at: now,
      artwork_cached_at: status === "cached" ? now : null,
      artwork_error: reasons || null,
    };

    if (status === "broken") {
      updatePayload.publication_status = "unpublished";
    } else if (publishOnSuccess) {
      updatePayload.publication_status = "published";
    }

    const { error } = await supabase.from("titles").update(updatePayload).eq("id", titleId);
    if (error) return json({ error: error.message }, 500);

    return json({
      status,
      checkedAt: now,
      poster,
      backdrop,
      publicationStatus: updatePayload.publication_status,
      reason: reasons || (status === "cached" ? "Artwork cached in storage." : "Artwork is reachable."),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Artwork management failed";
    const status = message.includes("Admin") || message.includes("authorization") ? 403 : 500;
    return json({ error: message }, status);
  }
});
