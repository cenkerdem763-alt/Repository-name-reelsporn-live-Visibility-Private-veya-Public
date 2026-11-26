import { useEffect, useRef } from "react";
import type { Title } from "@/data/content";
import { getDirectPreviewSource } from "@/lib/playbackSource";
export function VideoHoverPreview({ item, active }: { item: Title; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const src = getDirectPreviewSource(item);
  useEffect(() => { const v = ref.current; if (!v) return; if (active) v.play().catch(() => {}); else { v.pause(); v.currentTime = 0; } }, [active, src]);
  if (!src || /\.m3u8(?:[?#]|$)/i.test(src)) return null;
  return <video ref={ref} src={src} muted loop playsInline preload="none" poster={item.poster} className="absolute inset-0 h-full w-full object-cover" />;
}
