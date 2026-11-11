const DIRECT_VIDEO_RE = /\.(mp4|webm|ogg|m3u8)(\?|#|$)/i;

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export function extractIframeSrc(value: string) {
  return decodeHtml(value.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1] || value);
}

export function extractIframeNumber(value: string, attr: "width" | "height") {
  const match = value.match(new RegExp(`${attr}=["']?(\\d+)`, "i"));
  return match ? Number(match[1]) : undefined;
}

export function normalizeProviderSource(value: string | null | undefined) {
  const source = extractIframeSrc(value || "").trim();
  if (!source) return undefined;

  const withProtocol = source.startsWith("//") ? `https:${source}` : source;

  try {
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();

    if (/(^|\.)eporner\.com$/i.test(url.hostname)) {
      const pageId = url.pathname.match(/\/video-([^/]+)/i)?.[1];
      if (pageId) return `https://www.eporner.com/embed/${pageId}/`;

      if (url.pathname.includes("/embed/") && !url.pathname.endsWith("/")) {
        url.pathname = `${url.pathname}/`;
        return url.toString();
      }
    }

    if (host.endsWith("pornhub.com")) {
      const viewKey =
        url.searchParams.get("viewkey") ||
        url.pathname.match(/\/embed\/([^/?#]+)/i)?.[1] ||
        url.pathname.match(/\/view_video\.php\/?([^/?#]+)/i)?.[1];
      if (viewKey) return `https://www.pornhub.com/embed/${viewKey}`;
    }

    if (host.endsWith("xvideos.com")) {
      const videoId =
        url.pathname.match(/\/embedframe\/([^/?#]+)/i)?.[1] ||
        url.pathname.match(/\/video\.?([a-z0-9]+)/i)?.[1];
      if (videoId) return `https://www.xvideos.com/embedframe/${videoId}`;
    }

    if (host.endsWith("xnxx.com")) {
      const videoId =
        url.pathname.match(/\/embedframe\/([^/?#]+)/i)?.[1] ||
        url.pathname.match(/\/video-([a-z0-9]+)/i)?.[1] ||
        url.pathname.match(/\/video\.?([a-z0-9]+)/i)?.[1];
      if (videoId) return `https://www.xnxx.com/embedframe/${videoId}`;
    }

    if (host.includes("xhamster.")) {
      const videoId =
        url.searchParams.get("video") ||
        url.pathname.match(/\/embed\/([^/?#]+)/i)?.[1] ||
        url.pathname.match(/\/videos\/.+?-([a-z0-9]+)\/?$/i)?.[1];
      if (videoId) return `https://xhamster.com/embed/${videoId}`;
    }
  } catch {
    return withProtocol;
  }

  return withProtocol;
}

export function isDirectVideoSource(value: string | undefined | null) {
  return DIRECT_VIDEO_RE.test(value || "");
}

export function isProviderEmbedSource(value: string) {
  const source = value.trim();
  if (source.startsWith("<iframe")) return true;
  if (source.includes("/embed/") || source.includes("/embedframe/")) return true;
  return !isDirectVideoSource(source);
}
