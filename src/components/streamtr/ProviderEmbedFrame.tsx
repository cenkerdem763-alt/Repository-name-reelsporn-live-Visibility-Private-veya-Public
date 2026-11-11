import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProviderEmbedMeta } from "@/lib/providerEmbed";

type ProviderEmbedFrameProps = {
  src: string;
  title: string;
  className?: string;
};

export function ProviderEmbedFrame({ src, title, className }: ProviderEmbedFrameProps) {
  const embed = getProviderEmbedMeta(src);
  const [frameVersion, setFrameVersion] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    setFrameVersion(0);
  }, [embed.src]);

  useEffect(() => {
    setLoaded(false);
    setSlow(false);
    const timeout = window.setTimeout(() => setSlow(true), 7000);
    return () => window.clearTimeout(timeout);
  }, [embed.src, frameVersion]);

  const reloadFrame = () => {
    setLoaded(false);
    setSlow(false);
    setFrameVersion((version) => version + 1);
  };

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-black", className)}>
      <iframe
        key={`${embed.src}-${frameVersion}`}
        src={embed.src}
        title={title}
        className="block h-full w-full border-0 bg-black"
        width={embed.width || 1280}
        height={embed.height || 720}
        loading="eager"
        referrerPolicy="origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        onLoad={() => setLoaded(true)}
        allowFullScreen
      />

      <div className="pointer-events-none absolute right-2 top-2 z-10 flex justify-end opacity-70 transition hover:opacity-100">
        <button
          type="button"
          onClick={reloadFrame}
          className="pointer-events-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-black/52 px-2.5 text-[11px] font-bold text-white shadow-[0_10px_28px_rgba(0,0,0,0.22)] backdrop-blur transition hover:bg-black/76"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loaded || slow ? "" : "animate-spin"}`} />
          {loaded ? "Yenile" : slow ? "Tekrar dene" : "Yükleniyor"}
        </button>
      </div>
    </div>
  );
}
