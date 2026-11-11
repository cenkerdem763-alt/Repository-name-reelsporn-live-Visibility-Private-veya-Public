const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_HTML_BYTES = 500_000;
const FETCH_TIMEOUT_MS = 8_000;

type Metadata = {
  title?: string;
  description?: string;
  poster?: string;
  genres?: string[];
  preview?: string;
  previewFrames?: string[];
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

function getAttribute(tag: string, name: string) {
  const pattern = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");
  return tag.match(pattern)?.[1];
}

function findMeta(html: string, names: string[]) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const name of names) {
    const tag = tags.find((item) => {
      const property = getAttribute(item, "property") || getAttribute(item, "name") || getAttribute(item, "itemprop");
      return property?.toLowerCase() === name.toLowerCase();
    });
    const content = tag ? getAttribute(tag, "content") : "";
    if (content) return decodeHtml(content);
  }
  return "";
}

function findTitle(html: string) {
  const metaTitle = findMeta(html, ["og:title", "twitter:title", "title"]);
  if (metaTitle) return metaTitle;

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? decodeHtml(title) : "";
}

function splitTags(value: string) {
  return value
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function findTags(html: string) {
  const tags = new Set<string>();
  const keywords = findMeta(html, ["keywords", "news_keywords"]);
  splitTags(keywords).forEach((tag) => tags.add(tag));

  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  metaTags.forEach((tag) => {
    const property = getAttribute(tag, "property") || getAttribute(tag, "name");
    if (!property || !["article:tag", "video:tag"].includes(property.toLowerCase())) return;
    const content = getAttribute(tag, "content");
    if (content) tags.add(decodeHtml(content));
  });

  return [...tags].slice(0, 12);
}

function absolutize(value: string, baseUrl: string) {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function findEpornerThumbs(html: string) {
  const normalizedHtml = html.replace(/\\\//g, "/");
  return unique(normalizedHtml.match(/https?:\/\/[^"'<>\s]*eporner\.com\/thumbs\/[^"'<>\s]+\/\d+_\d+\.jpg/gi) || []);
}

function getEpornerPreviewFramesFromSources(sources: string[]) {
  const sourceList = unique(sources);
  const staticBase = sourceList
    .map((source) => source.match(/(https?:\/\/[^"']*eporner\.com\/thumbs\/[^"']+\/)\d+_\d+\.jpg/i)?.[1])
    .find(Boolean);

  if (staticBase) {
    return Array.from({ length: 10 }, (_, index) => `${staticBase}${index + 1}_240.jpg`);
  }

  const id = sourceList
    .map((source) =>
      source.match(/eporner\.com\/thumbs\/[^"']+\/(\d+)\/\d+_\d+\.jpg/i)?.[1] ||
      source.match(/imggen\.eporner\.com\/(\d+)\//i)?.[1]
    )
    .find(Boolean);

  return id ? Array.from({ length: 10 }, (_, index) => `https://imggen.eporner.com/${id}/1280/720/${index + 1}.jpg`) : [];
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
  if (contentLength > MAX_HTML_BYTES) throw new Error("Source response is too large");

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
    }

    const { url } = await req.json();
    if (typeof url !== "string") {
      return Response.json({ error: "Valid http(s) url is required" }, { status: 400, headers: corsHeaders });
    }

    const safeUrl = assertSafeUrl(url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(safeUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VizyonKeyfiMetadataBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return Response.json({ error: `Source returned ${response.status}` }, { status: 502, headers: corsHeaders });
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return Response.json({ error: "Source is not an HTML page" }, { status: 415, headers: corsHeaders });
    }

    const html = await readLimitedText(response);
    let preview =
      absolutize(
        findMeta(html, [
          "og:video",
          "og:video:url",
          "og:video:secure_url",
          "twitter:player:stream",
          "video",
        ]),
        safeUrl
      ) || "";

    if (!preview) {
      const mp4Match = html.match(/https?:\/\/[^\s"'<>]+?\.(mp4|m3u8|webm)/i);

      if (mp4Match?.[0]) {
        preview = absolutize(mp4Match[0], safeUrl);
      }
    }
    const poster = absolutize(findMeta(html, ["og:image", "twitter:image", "thumbnail", "thumbnailUrl"]), safeUrl);
    const previewFrames = getEpornerPreviewFramesFromSources([
      safeUrl,
      poster,
      preview,
      ...findEpornerThumbs(html),
    ]);

    const metadata: Metadata = {
      title: findTitle(html) || undefined,
      description: findMeta(html, ["og:description", "twitter:description", "description"]) || undefined,
      poster: poster || undefined,
      genres: findTags(html),
      preview: preview || undefined,
      previewFrames: previewFrames.length ? previewFrames : undefined,
    };

    return Response.json(metadata, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Metadata fetch failed";
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
