import { Readable } from "node:stream";

const MAX_CHUNK_SIZE = 2 * 1024 * 1024;
const ALLOWED_HOSTS = new Set(["gvideo.eporner.com"]);

function getEpornerVideoId(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  const file = parts.at(-1) || "";
  const fromFile = file.match(/^([A-Za-z0-9]+)\.mp4$/)?.[1];
  return fromFile || parts.at(-2) || "";
}

function getSetCookieValues(headers) {
  if (typeof headers.getSetCookie === "function") {
    const values = headers.getSetCookie();
    if (values.length) return values;
  }
  const value = headers.get("set-cookie");
  return value ? [value] : [];
}

async function getEpornerCookie(referer, userAgent) {
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

function parseRange(value, size = MAX_CHUNK_SIZE) {
  const match = value?.match(/bytes=(\d+)-(\d*)/i);
  const start = match ? Number(match[1]) : 0;
  const requestedEnd = match?.[2] ? Number(match[2]) : start + size - 1;
  const end = Math.min(requestedEnd, start + size - 1);
  return { start, end };
}

function getProxyUrl(req) {
  const rawUrl = req.query?.src;
  const value = Array.isArray(rawUrl) ? rawUrl[0] : rawUrl;
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) return null;
    if (!/\.mp4$/i.test(url.pathname)) return null;
    return url;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method || "")) {
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const target = getProxyUrl(req);
  if (!target) {
    res.statusCode = 400;
    res.end("Invalid video source");
    return;
  }

  const { start, end } = parseRange(req.headers.range);
  const videoId = getEpornerVideoId(target);
  const referer = videoId ? `https://www.eporner.com/embed/${videoId}/` : "https://www.eporner.com/";
  const userAgent = req.headers["user-agent"] || "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const cookie = await getEpornerCookie(referer, userAgent);
  const upstreamHeaders = {
    "Accept": "video/mp4,video/*;q=0.9,*/*;q=0.8",
    "Accept-Language": req.headers["accept-language"] || "en-US,en;q=0.9",
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
    res.statusCode = upstream.status || 502;
    res.end("Video source unavailable");
    return;
  }

  res.statusCode = upstream.status === 206 ? 206 : 200;
  res.setHeader("Cache-Control", "public, max-age=300");
  res.setHeader("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
  res.setHeader("Content-Type", upstream.headers.get("content-type") || "video/mp4");

  const contentRange = upstream.headers.get("content-range");
  const contentLength = upstream.headers.get("content-length");
  if (contentRange) res.setHeader("Content-Range", contentRange);
  if (contentLength) res.setHeader("Content-Length", contentLength);

  if (req.method === "HEAD" || !upstream.body) {
    res.end();
    return;
  }

  Readable.fromWeb(upstream.body).pipe(res);
}
