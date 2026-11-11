const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_SOURCE_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 10_000;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

type SourceEntry = {
  url: string;
  title?: string;
  description?: string;
  poster?: string;
  preview?: string;
  genres?: string[];
};

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " "));
}

function getAttribute(tag: string, name: string) {
  const pattern = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");
  return tag.match(pattern)?.[1] || "";
}

function absolutize(value: string, baseUrl: string) {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function uniqueByUrl(entries: SourceEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = entry.url.replace(/\/+$/, "");
    if (!entry.url || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function splitTags(value: string) {
  return value
    .split(/[,;|#]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function isVideoLikeUrl(value: string) {
  return /\/(embed|video|watch|view|player)\b/i.test(value) || /\.(mp4|webm|m3u8)(\?|#|$)/i.test(value);
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

async function readLimitedText(response: Response) {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_SOURCE_BYTES) throw new Error("Source response is too large");

  const reader = response.body?.getReader();
  if (!reader) return response.text();

  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (received > MAX_SOURCE_BYTES) {
      await reader.cancel();
      throw new Error("Source response is too large");
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

function parseJsonSource(text: string, baseUrl: string) {
  const data = JSON.parse(text);
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.videos)
        ? data.videos
        : [];

  return list
    .map((item): SourceEntry | null => {
      const rawUrl = item?.embedUrl || item?.videoUrl || item?.url || item?.link || item?.src;
      if (typeof rawUrl !== "string") return null;
      const url = absolutize(rawUrl, baseUrl);
      const rawPoster = item?.poster || item?.posterUrl || item?.poster_url || item?.thumbnail || item?.thumbnailUrl || item?.image;
      const rawPreview = item?.previewUrl || item?.preview_url || item?.preview || item?.trailerUrl || item?.trailer_url;
      const rawGenres = item?.genres || item?.categories || item?.tags;
      return {
        url,
        title: typeof item?.title === "string" ? item.title : undefined,
        description: typeof item?.description === "string" ? item.description : undefined,
        poster: typeof rawPoster === "string" ? absolutize(rawPoster, baseUrl) : undefined,
        preview: typeof rawPreview === "string" ? absolutize(rawPreview, baseUrl) : undefined,
        genres: Array.isArray(rawGenres)
          ? rawGenres.filter((value: unknown) => typeof value === "string").slice(0, 12)
          : typeof rawGenres === "string"
            ? splitTags(rawGenres)
            : typeof item?.category === "string"
              ? [item.category]
              : undefined,
      };
    })
    .filter((entry): entry is SourceEntry => Boolean(entry?.url));
}

function parseXmlSource(text: string, baseUrl: string) {
  const entries: SourceEntry[] = [];
  const itemBlocks = text.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];

  itemBlocks.forEach((block) => {
    const title = stripTags(block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
    const description = stripTags(
      block.match(/<description\b[^>]*>([\s\S]*?)<\/description>/i)?.[1] ||
      block.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ||
      block.match(/<content\b[^>]*>([\s\S]*?)<\/content>/i)?.[1] ||
      ""
    );
    const linkTag = block.match(/<link\b[^>]*>/i)?.[0] || "";
    const hrefLink = getAttribute(linkTag, "href");
    const textLink = stripTags(block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i)?.[1] || "");
    const enclosure = block.match(/<enclosure\b[^>]*>/i)?.[0] || "";
    const mediaContent = block.match(/<media:content\b[^>]*>/i)?.[0] || "";
    const mediaPlayer = block.match(/<media:player\b[^>]*>/i)?.[0] || "";
    const thumbnail = block.match(/<media:thumbnail\b[^>]*>/i)?.[0] || "";
    const url =
      getAttribute(enclosure, "url") ||
      getAttribute(mediaContent, "url") ||
      getAttribute(mediaPlayer, "url") ||
      hrefLink ||
      textLink;

    if (!url) return;
    const categories = (block.match(/<category\b[^>]*>([\s\S]*?)<\/category>/gi) || [])
      .map((tag) => stripTags(tag))
      .filter(Boolean)
      .slice(0, 12);

    entries.push({
      url: absolutize(url, baseUrl),
      title: title || undefined,
      description: description || undefined,
      poster: absolutize(getAttribute(thumbnail, "url"), baseUrl) || undefined,
      genres: categories.length ? categories : undefined,
    });
  });

  const sitemapLocs = text.match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi) || [];
  sitemapLocs.forEach((tag) => {
    const url = stripTags(tag);
    if (url) entries.push({ url: absolutize(url, baseUrl) });
  });

  return entries;
}

function parseHtmlSource(text: string, baseUrl: string) {
  const entries: SourceEntry[] = [];
  const anchors = text.match(/<a\b[^>]*>/gi) || [];
  const iframes = text.match(/<iframe\b[^>]*>/gi) || [];
  const videos = text.match(/<(video|source)\b[^>]*>/gi) || [];

  [...iframes, ...videos].forEach((tag) => {
    const src = getAttribute(tag, "src");
    if (src) {
      entries.push({
        url: absolutize(src, baseUrl),
        poster: absolutize(getAttribute(tag, "poster"), baseUrl) || undefined,
      });
    }
  });

  anchors.forEach((tag) => {
    const href = getAttribute(tag, "href");
    if (!href) return;
    const url = absolutize(href, baseUrl);
    if (isVideoLikeUrl(url)) {
      entries.push({
        url,
        title: decodeHtml(getAttribute(tag, "title") || getAttribute(tag, "aria-label") || ""),
      });
    }
  });

  return entries;
}

function filterEntries(entries: SourceEntry[], include: string, limit: number) {
  const includePattern = include.trim();
  const filtered = includePattern
    ? entries.filter((entry) => entry.url.toLowerCase().includes(includePattern.toLowerCase()))
    : entries;

  return uniqueByUrl(filtered).slice(0, limit);
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
    const url = typeof body?.url === "string" ? body.url : "";
    const include = typeof body?.include === "string" ? body.include : "";
    const limit = Math.min(Math.max(Number(body?.limit || DEFAULT_LIMIT), 1), MAX_LIMIT);
    if (!url) {
      return Response.json({ error: "Valid source url is required" }, { status: 400, headers: corsHeaders });
    }

    const safeUrl = assertSafeUrl(url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(safeUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VizyonKeyfiSourceBot/1.0)",
        Accept: "application/json,application/rss+xml,application/xml,text/xml,text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return Response.json({ error: `Source returned ${response.status}` }, { status: 502, headers: corsHeaders });
    }

    const contentType = response.headers.get("content-type") || "";
    const text = await readLimitedText(response);
    let entries: SourceEntry[] = [];

    if (contentType.includes("json") || text.trim().startsWith("[") || text.trim().startsWith("{")) {
      entries = parseJsonSource(text, safeUrl);
    } else if (contentType.includes("xml") || text.trim().startsWith("<?xml") || /<(rss|feed|urlset)\b/i.test(text)) {
      entries = parseXmlSource(text, safeUrl);
    } else {
      entries = parseHtmlSource(text, safeUrl);
    }

    return Response.json({ entries: filterEntries(entries, include, limit) }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Source fetch failed";
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
