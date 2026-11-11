const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_HTML_BYTES = 700_000;
const FETCH_TIMEOUT_MS = 9_000;

type PlaybackStatus = "healthy" | "warning" | "broken";

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
  const url = new URL(value);
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
      "User-Agent": "Mozilla/5.0 (compatible; VizyonKeyfiPlaybackBot/1.0)",
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
    return {
      status: "healthy" as PlaybackStatus,
      reason: "Video dosyası erişilebilir.",
    };
  }

  return {
    status: "broken" as PlaybackStatus,
    reason: `Video dosyası ${response.status} döndü.`,
  };
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

async function checkEmbed(url: string, strictMediaCheck: boolean) {
  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    return {
      status: "broken" as PlaybackStatus,
      reason: `Embed sayfası ${response.status} döndü.`,
    };
  }

  const html = await readLimitedText(response);
  if (hasFatalProviderMessage(html)) {
    return {
      status: "broken" as PlaybackStatus,
      reason: "Kaynak video kaldırılmış veya erişime kapalı görünüyor.",
    };
  }

  const contentUrl = findContentUrl(html, url);
  if (contentUrl && strictMediaCheck) {
    try {
      const mediaResult = await probeDirectVideo(assertSafeUrl(contentUrl));
      return mediaResult.status === "broken"
        ? {
            status: "warning" as PlaybackStatus,
            reason: `${mediaResult.reason} Embed sayfası erişilebilir olduğu için pasife alınmadı.`,
          }
        : mediaResult;
    } catch (error) {
      return {
        status: "warning" as PlaybackStatus,
        reason: error instanceof Error
          ? `Video CDN bot kontrolünde erişilemiyor: ${error.message}. Embed sayfası erişilebilir olduğu için pasife alınmadı.`
          : "Video CDN bot kontrolünde erişilemiyor. Embed sayfası erişilebilir olduğu için pasife alınmadı.",
      };
    }
  }

  if (/<video\b|video-js|jwplayer|player|contentUrl|og:video/i.test(html)) {
    return {
      status: contentUrl ? "healthy" as PlaybackStatus : "warning" as PlaybackStatus,
      reason: contentUrl ? "Embed ve medya bilgisi bulundu." : "Embed bulundu ama medya dosyası doğrulanamadı.",
    };
  }

  return {
    status: "warning" as PlaybackStatus,
    reason: "Kaynak erişiliyor ama video player işareti zayıf.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
    }

    const body = await req.json();
    const rawUrl = typeof body?.url === "string" ? body.url : "";
    const strictMediaCheck = body?.strictMediaCheck === true;
    if (!rawUrl) {
      return Response.json({ error: "Valid source url is required" }, { status: 400, headers: corsHeaders });
    }

    const url = assertSafeUrl(normalizeSource(rawUrl));
    const result = isDirectVideo(url) ? await probeDirectVideo(url) : await checkEmbed(url, strictMediaCheck);

    return Response.json(
      {
        ...result,
        checkedUrl: url,
        checkedAt: new Date().toISOString(),
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Playback check failed";
    return Response.json(
      {
        status: "broken",
        reason: message,
        checkedAt: new Date().toISOString(),
      },
      { status: 200, headers: corsHeaders },
    );
  }
});
