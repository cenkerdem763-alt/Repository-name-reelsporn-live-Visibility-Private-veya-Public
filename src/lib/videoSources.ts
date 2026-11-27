// Direct MP4/WebM/OGG/HLS media only; never accept iframe/embed pages.
const VIDEO_EXT = /\.(mp4|webm|ogg|m3u8)(?:[?#]|$)/i;
export function isDirectVideoSource(value: string | undefined | null) { return VIDEO_EXT.test(value || ""); }
export function normalizeDirectVideoSource(value: string | null | undefined) {
  const src = (value || "").trim();
  if (!src || !isDirectVideoSource(src)) return undefined;
  if (src.startsWith("/" ) && !src.startsWith("//")) return src;
  try { const u = new URL(src); return u.protocol === "https:" ? u.toString() : undefined; }
  catch { return undefined; }
}
