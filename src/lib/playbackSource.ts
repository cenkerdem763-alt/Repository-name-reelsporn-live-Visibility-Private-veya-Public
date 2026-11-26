import { normalizePlayableSource, type Title } from "@/data/content";
export function isDirectVideoSource(value: string | null | undefined) { return /\.(mp4|webm|ogg|m3u8)(?:[?#]|$)/i.test(value || ""); }
export function getDirectPlaybackSource(item: Title) { return [item.videoUrl, item.trailerUrl].map(normalizePlayableSource).find(Boolean) || ""; }
export function getDirectPreviewSource(item: Title) { return [item.previewUrl, item.videoUrl].map(normalizePlayableSource).find(Boolean) || ""; }
