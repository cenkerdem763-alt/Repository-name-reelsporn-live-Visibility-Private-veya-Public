import { extractIframeNumber, isProviderEmbedSource, normalizeProviderSource } from "@/lib/videoSources";

export function getProviderEmbedSrc(value: string) {
  return normalizeProviderSource(value) || "";
}

export function getProviderEmbedMeta(value: string) {
  const src = getProviderEmbedSrc(value);
  const width = extractIframeNumber(value, "width");
  const height = extractIframeNumber(value, "height");
  const hasRatio = Boolean(width && height);

  return {
    src,
    width,
    height,
    aspectRatio: hasRatio ? `${width} / ${height}` : "16 / 9",
    isPortrait: hasRatio ? height! > width! : false,
  };
}

export { isProviderEmbedSource };
