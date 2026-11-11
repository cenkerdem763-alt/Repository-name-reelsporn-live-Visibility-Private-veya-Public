import { normalizePlayableSource, type Title } from "@/data/content";
import { isProviderEmbedSource } from "@/lib/providerEmbed";

const DIRECT_VIDEO_RE = /\.(mp4|webm|ogg)(\?|#|$)/i;
const BLOCKED_DIRECT_HOSTS = [/^gvideo\.eporner\.com$/i, /(^|\.)static-[^.]+-cdn\.eporner\.com$/i];

export function isDirectVideoSource(value: string | undefined | null) {
  return DIRECT_VIDEO_RE.test(value || "");
}

function normalizeSource(value: string | undefined | null) {
  return normalizePlayableSource(value) || value?.trim() || "";
}

function getSources(item: Title) {
  return [item.videoUrl, item.trailerUrl, item.previewUrl].map(normalizeSource).filter(Boolean);
}

function isBlockedDirectSource(source: string) {
  try {
    const url = new URL(source);
    return BLOCKED_DIRECT_HOSTS.some((host) => host.test(url.hostname));
  } catch {
    return false;
  }
}

export function getEmbedPlaybackSource(item: Title) {
  return getSources(item).find((source) => !isDirectVideoSource(source) && isProviderEmbedSource(source)) || "";
}

export function getDirectPlaybackSource(item: Title) {
  return getSources(item).find((source) => isDirectVideoSource(source) && !isBlockedDirectSource(source)) || "";
}

export function getDirectPreviewSource(item: Title) {
  const sources = [item.previewUrl, item.trailerUrl, item.videoUrl].map(normalizeSource).filter(Boolean);
  return sources.find((source) => isDirectVideoSource(source) && !isBlockedDirectSource(source)) || "";
}

export function getProviderWatchUrl(item: Title) {
  const source = getEmbedPlaybackSource(item) || normalizeSource(item.videoUrl);
  if (!source) return "";

  try {
    const url = new URL(source);
    const embedId = url.pathname.match(/\/embed\/([^/]+)/i)?.[1];
    return /(^|\.)eporner\.com$/i.test(url.hostname) && embedId ? `https://www.eporner.com/video-${embedId}/` : source;
  } catch {
    return source;
  }
}
