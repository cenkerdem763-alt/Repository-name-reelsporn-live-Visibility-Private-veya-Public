import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const MAX_CHUNK_SIZE = 2 * 1024 * 1024;
const ALLOWED_HOSTS = new Set(["gvideo.eporner.com"]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

function parseRange(value: string | null, size = MAX_CHUNK_SIZE) {
  const match = value?.match(/bytes=(\d+)-(\d*)/i);
  const start = match ? Number(match[1]) : 0;
  const requestedEnd = match?.[2] ? Number(match[2]) : start + size - 1;
  const end = Math.min(requestedEnd, start + size - 1);
  return { start, end };
}

function getTarget(req: Request) {
  const value = new URL(req.url).searchParams.get("src");
  if (!value) return null;

  try {
    const target = new URL(value);
    if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) return null;
    if (!/\.mp4$/i.test(target.pathname)) return null;
    return target;
  } catch {
    return null;
  }
}

function getEpornerVideoId(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  const file = parts.at(-1) || "";
  return file.match(/^([A-Za-z0-9]+)\.mp4$/)?.[1] || parts.at(-2) || "";
}

function getSetCookieValues(headers: Headers) {
  const maybeHeaders = headers as Headers & { getSetCookie?: () => string[] };
  const values = maybeHeaders.getSetCookie?.();
  if (values?.length) return values;
  const value = headers.get("set-cookie");
  return value ? [value] : [];
}

async function getEpornerCookie(referer: string, userAgent: string) {
  try {
    const page = await fetch(referer, {
      headers: {
        "Accept": "text/html,application/xhtml+xml",
        "User-Agent": userAgent,
      },
    });
    return getSetCookieValues(page.headers)
      .map((cookie) => cookie.split(";")[0])
      .filter(Boolean)
      .join("; ");
  } catch {
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (!["GET", "HEAD"].includes(req.method)) {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const target = getTarget(req);
  if (!target) return new Response("Invalid video source", { status: 400, headers: corsHeaders });

  const { start, end } = parseRange(req.headers.get("range"));
  const videoId = getEpornerVideoId(target);
  const userAgent = req.headers.get("user-agent") ||
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const referer = videoId ? `https://www.eporner.com/embed/${videoId}/` : "https://www.eporner.com/";
  const cookie = await getEpornerCookie(referer, userAgent);
  const upstreamHeaders: Record<string, string> = {
    "Accept": "video/mp4,video/*;q=0.9,*/*;q=0.8",
    "Accept-Language": req.headers.get("accept-language") || "en-US,en;q=0.9",
    "Origin": "https://www.eporner.com",
    "Range": `bytes=${start}-${end}`,
    "Referer": referer,
    "User-Agent": userAgent,
  };
  if (cookie) upstreamHeaders.Cookie = cookie;

  const upstream = await fetch(target, {
    headers: upstreamHeaders,
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response("Video source unavailable", {
      status: upstream.status || 502,
      headers: corsHeaders,
    });
  }

  const headers = new Headers(corsHeaders);
  headers.set("Cache-Control", "public, max-age=300");
  headers.set("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
  headers.set("Content-Type", upstream.headers.get("content-type") || "video/mp4");
  const contentRange = upstream.headers.get("content-range");
  const contentLength = upstream.headers.get("content-length");
  if (contentRange) headers.set("Content-Range", contentRange);
  if (contentLength) headers.set("Content-Length", contentLength);

  return new Response(req.method === "HEAD" ? null : upstream.body, {
    status: upstream.status === 206 ? 206 : 200,
    headers,
  });
});
