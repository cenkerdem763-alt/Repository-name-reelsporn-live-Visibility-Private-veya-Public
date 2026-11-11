import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CONTENT_BUCKET = "content";
const MAX_HTML_BYTES = 700_000;
const MAX_IMAGE_BYTES = 8_000_000;
const FETCH_TIMEOUT_MS = 10_000;
const DEFAULT_LIMIT = 50;
const STALE_DAYS = 7;

type Status = "healthy" | "cached" | "warning" | "broken";
type PlaybackStatus = "healthy" | "warning" | "broken";
type TitleRow = {
  id: string;
  title: string;
  poster_url: string;
  backdrop_url: string;
  poster_source_url: string | null;
  backdrop_source_url: string | null;
  video_url: string | null;
  trailer_url: string | null;
  publication_status: string;
};
type MaintenanceCounts = {
  processed: number;
  cached: number;
  healthy: number;
  warning: number;
  broken: number;
  unpublished: number;
};

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

async function insertMaintenanceRun(
  supabase: ReturnType<typeof createClient>,
  payload: {
    source: string;
    status: "success" | "error";
    startedAt: Date;
    counts: MaintenanceCounts;
    results: Array<Record<string, unknown>>;
    errorMessage?: string | null;
  },
) {
  const finishedAt = new Date();
  const { error } = await supabase.from("content_maintenance_runs").insert({
    source: payload.source,
    status: payload.status,
    started_at: payload.startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: finishedAt.getTime() - payload.startedAt.getTime(),
    processed_count: payload.counts.processed,
    cached_count: payload.counts.cached,
    healthy_count: payload.counts.healthy,
    warning_count: payload.counts.warning,
    broken_count: payload.counts.broken,
    unpublished_count: payload.counts.unpublished,
    error_message: payload.errorMessage || null,
    results: payload.results,
  });

  if (error) console.warn("Maintenance run could not be logged:", error.message);
}

function decodeJwtRole(authHeader: string) {
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const payload = token.split(".")[1];
  if (!payload) return "";
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  try {
    return JSON.parse(atob(padded))?.role || "";
  } catch {
    return "";
  }
}

function requireServiceRole(req: Request) {
  if (decodeJwtRole(req.headers.get("Authorization") || "") !== "service_role") {
    throw new Error("service_role authorization required");
  }
}

function extractIframeSrc(value: string) {
  return value.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1] || value;
}

function normalizeSource(value: string) {
  const source = extractIframeSrc(value).trim();
  const withProtocol = source.startsWith("//") ? `https:${source}` : source;

  try {
    const url = new URL(withProtocol);
    if (/(^|\.)eporner\.com$/i.test(url.hostname) && url.pathname.includes("/embed/") && !url.pathname.endsWith("/")) {
      url.pathname = `${url.pathname}/`;
      return url.toString();
    }
  } catch {
    return withProtocol;
  }

  return withProtocol;
}

function isDirectVideo(value: string) {
  return /\.(mp4|webm|ogg|m3u8)(\?|#|$)/i.test(value);
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

function assertSafeUrl(value: string) {
  const url = new URL(value.startsWith("//") ? `https:${value}` : value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http(s) urls are allowed");
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
    throw new Error("Local and private network urls are not allowed");
  }
  return url.toString();
}

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, {
    redirect: "follow",
    ...init,
    signal: controller.signal,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; VizyonKeyfiMaintenanceBot/1.0)",
      ...(init.headers || {}),
    },
  }).finally(() => clearTimeout(timeout));
}

async function readLimitedText(response: Response) {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_HTML_BYTES) throw new Error("Embed response is too large");

  const reader = response.body?.getReader();
  if (!reader) return response.text();

  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (received > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("Embed response is too large");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(received);
  let offset = 0;
  chunks.forEach((chunk) => {
    body.set(chunk, offset);
    offset += chunk.length;
  });
  return new TextDecoder().decode(body);
}

async function probeDirectVideo(url: string) {
  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "video/*,*/*;q=0.8",
      Range: "bytes=0-1",
    },
  });

  if (response.ok || response.status === 206) {
    return { status: "healthy" as PlaybackStatus, reason: "Video dosyası erişilebilir." };
  }

  return { status: "broken" as PlaybackStatus, reason: `Video dosyası ${response.status} döndü.` };
}

function findContentUrl(html: string, baseUrl: string) {
  const candidates = [
    html.match(/"contentUrl"\s*:\s*"([^"]+)"/i)?.[1],
    html.match(/contentUrl['"]?\s*[:=]\s*['"]([^'"]+)/i)?.[1],
    html.match(/https?:\/\/[^"'<>\s]+?\.(mp4|m3u8|webm)(\?[^"'<>\s]*)?/i)?.[0],
  ];
  const dataVid = html.match(/data-vid=["']([^"']+)["']/i)?.[1];
  if (dataVid && /eporner\.com/i.test(baseUrl)) {
    candidates.push(`https://gvideo.eporner.com/${dataVid}`);
  }

  const candidate = candidates.find(Boolean);
  if (!candidate) return "";

  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return candidate;
  }
}

function hasFatalProviderMessage(html: string) {
  return /video (has been )?(removed|deleted)|not found|no longer available|dmca|copyright complaint|private video|this video is unavailable/i.test(html);
}

async function checkPlayback(rawSource: string) {
  try {
    const url = assertSafeUrl(normalizeSource(rawSource));
    if (isDirectVideo(url)) return probeDirectVideo(url);

    const response = await fetchWithTimeout(url, {
      headers: { Accept: "text/html,application/xhtml+xml" },
    });

    if (!response.ok) {
      return { status: "broken" as PlaybackStatus, reason: `Embed sayfası ${response.status} döndü.` };
    }

    const html = await readLimitedText(response);
    if (hasFatalProviderMessage(html)) {
      return { status: "broken" as PlaybackStatus, reason: "Kaynak video kaldırılmış veya erişime kapalı görünüyor." };
    }

    const contentUrl = findContentUrl(html, url);
    if (/<video\b|video-js|jwplayer|player|contentUrl|og:video/i.test(html)) {
      return {
        status: contentUrl ? "healthy" as PlaybackStatus : "warning" as PlaybackStatus,
        reason: contentUrl ? "Embed ve medya bilgisi bulundu." : "Embed bulundu ama medya dosyası doğrulanamadı.",
      };
    }

    return { status: "warning" as PlaybackStatus, reason: "Kaynak erişiliyor ama video player işareti zayıf." };
  } catch (error) {
    return { status: "broken" as PlaybackStatus, reason: error instanceof Error ? error.message : "Kaynak kontrol edilemedi." };
  }
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
  const ext = new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  return ext && ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext) ? ext : "jpg";
}

async function fetchImage(url: string) {
  const response = await fetchWithTimeout(url, {
    headers: { Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8" },
  });

  if (!response.ok) throw new Error(`Artwork returned ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error(`Artwork is not an image (${contentType || "unknown content type"})`);
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_IMAGE_BYTES) throw new Error("Artwork is too large");

  const buffer = await response.arrayBuffer();
  if (!buffer.byteLength) throw new Error("Artwork is empty");
  if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("Artwork is too large");

  return { buffer, contentType };
}

async function cacheArtwork(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  titleId: string,
  kind: "poster" | "backdrop",
  rawUrl: string,
) {
  const sourceUrl = rawUrl.trim();
  if (!sourceUrl) return { status: "broken" as Status, url: "", sourceUrl, reason: `${kind} URL yok.` };
  if (isRelativeOrAlreadyManaged(sourceUrl, supabaseUrl)) {
    return { status: "cached" as Status, url: sourceUrl, sourceUrl };
  }

  try {
    const remoteUrl = assertSafeUrl(sourceUrl);
    const image = await fetchImage(remoteUrl);
    const ext = extensionFrom(image.contentType, remoteUrl);
    const safeTitleId = titleId.replace(/[^a-z0-9_-]/gi, "-").slice(0, 96);
    const path = `titles/${safeTitleId}/${kind}.${ext}`;
    const { error } = await supabase.storage
      .from(CONTENT_BUCKET)
      .upload(path, new Blob([image.buffer], { type: image.contentType }), {
        contentType: image.contentType,
        cacheControl: "31536000",
        upsert: true,
      });

    if (error) throw error;
    const { data } = supabase.storage.from(CONTENT_BUCKET).getPublicUrl(path);
    return { status: "cached" as Status, url: data.publicUrl, sourceUrl: remoteUrl };
  } catch (error) {
    return {
      status: "broken" as Status,
      url: "",
      sourceUrl,
      reason: error instanceof Error ? error.message : "Artwork kontrol edilemedi.",
    };
  }
}

async function checkAndCacheArtwork(supabase: ReturnType<typeof createClient>, supabaseUrl: string, item: TitleRow) {
  const posterSource = item.poster_source_url || item.poster_url || "";
  const backdropSource = item.backdrop_source_url || item.backdrop_url || posterSource;
  const poster = await cacheArtwork(supabase, supabaseUrl, item.id, "poster", posterSource);
  const backdrop =
    backdropSource === posterSource && poster.url
      ? { ...poster }
      : await cacheArtwork(supabase, supabaseUrl, item.id, "backdrop", backdropSource);
  const status: Status =
    poster.status === "broken"
      ? "broken"
      : backdrop.status === "broken"
        ? "warning"
        : "cached";

  return {
    status,
    poster,
    backdrop,
    reason: [poster.reason, backdrop.reason].filter(Boolean).join(" ") || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = new Date();
  const counts: MaintenanceCounts = { processed: 0, cached: 0, healthy: 0, warning: 0, broken: 0, unpublished: 0 };
  const results: Array<Record<string, unknown>> = [];
  let source = "manual";
  let supabase: ReturnType<typeof createClient> | null = null;

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    requireServiceRole(req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase function environment is missing" }, 500);

    const body = await req.json().catch(() => ({}));
    source = typeof body?.source === "string" && body.source.trim() ? body.source.trim().slice(0, 60) : "manual";
    const limit = Math.min(Math.max(Number(body?.limit || DEFAULT_LIMIT), 1), 100);
    const publishOnSuccess = body?.publishOnSuccess === true;
    const staleBefore = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: items, error } = await supabase
      .from("titles")
      .select("id,title,poster_url,backdrop_url,poster_source_url,backdrop_source_url,video_url,trailer_url,publication_status")
      .neq("publication_status", "draft")
      .or(
        [
          "artwork_status.in.(unchecked,warning)",
          "artwork_checked_at.is.null",
          `artwork_checked_at.lt.${staleBefore}`,
          "playback_status.in.(unchecked,warning)",
          "playback_checked_at.is.null",
          `playback_checked_at.lt.${staleBefore}`,
        ].join(","),
      )
      .order("updated_at", { ascending: true })
      .limit(limit);

    if (error) return json({ error: error.message }, 500);

    for (const item of (items || []) as TitleRow[]) {
      const now = new Date().toISOString();
      const playback = item.video_url || item.trailer_url
        ? await checkPlayback(item.video_url || item.trailer_url || "")
        : { status: "broken" as PlaybackStatus, reason: "Video/embed URL yok." };
      const artwork = await checkAndCacheArtwork(supabase, supabaseUrl, item);
      const shouldUnpublish = playback.status === "broken" || artwork.status === "broken";
      const nextPublicationStatus = shouldUnpublish
        ? "unpublished"
        : publishOnSuccess && item.publication_status !== "draft"
          ? "published"
          : item.publication_status;

      const { error: updateError } = await supabase
        .from("titles")
        .update({
          playback_status: playback.status,
          playback_checked_at: now,
          playback_error: playback.reason || null,
          poster_url: artwork.poster.url || item.poster_url,
          backdrop_url: artwork.backdrop.url || artwork.poster.url || item.backdrop_url,
          poster_source_url: artwork.poster.sourceUrl || item.poster_source_url || item.poster_url || null,
          backdrop_source_url: artwork.backdrop.sourceUrl || item.backdrop_source_url || item.backdrop_url || null,
          artwork_status: artwork.status,
          artwork_checked_at: now,
          artwork_cached_at: artwork.status === "cached" ? now : null,
          artwork_error: artwork.reason,
          publication_status: nextPublicationStatus,
        })
        .eq("id", item.id);

      if (updateError) throw updateError;

      counts.processed += 1;
      counts[playback.status] += 1;
      if (artwork.status === "cached") counts.cached += 1;
      if (artwork.status === "warning") counts.warning += 1;
      if (artwork.status === "broken") counts.broken += 1;
      if (shouldUnpublish) counts.unpublished += 1;
      results.push({ id: item.id, playback: playback.status, artwork: artwork.status, publication: nextPublicationStatus });
    }

    await insertMaintenanceRun(supabase, {
      source,
      status: "success",
      startedAt,
      counts,
      results,
    });

    return json({ ok: true, counts, results, checkedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Maintenance failed";
    if (supabase) {
      await insertMaintenanceRun(supabase, {
        source,
        status: "error",
        startedAt,
        counts,
        results,
        errorMessage: message,
      });
    }
    return json({ ok: false, error: message }, message.includes("service_role") ? 403 : 500);
  }
});
