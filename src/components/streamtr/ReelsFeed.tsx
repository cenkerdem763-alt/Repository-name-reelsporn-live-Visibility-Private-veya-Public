import { useEffect, useRef, useState } from "react";
import { Radio, Volume2, VolumeX } from "lucide-react";
import { fallbackTitles, type Title } from "@/data/content";

const demoVideos = [
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "https://www.w3schools.com/html/mov_bbb.mp4",
];

export function ReelsFeed({ items }: { items: Title[] }) {
  const articleRefs = useRef<(HTMLElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const touchStartX = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [section, setSection] = useState<"reels" | "live">("reels");
  const [muted, setMuted] = useState(true);
  const sourceItems = [...items, ...fallbackTitles].slice(0, 2);
  const feedItems = sourceItems.slice(0, 2).map((item, index) => ({
    ...item,
    videoUrl: demoVideos[index],
  }));
  const liveBackdrop = feedItems[0]?.backdrop || fallbackTitles[0].backdrop;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset.index);
        if (!Number.isNaN(index)) setActiveIndex(index);
      },
      { threshold: [0.6, 0.85] }
    );

    articleRefs.current.forEach((article) => {
      if (article) observer.observe(article);
    });

    return () => observer.disconnect();
  }, [feedItems.length]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      video.muted = muted;
      if (section === "reels" && index === activeIndex) {
        video.play().catch(() => undefined);
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [activeIndex, muted, feedItems.length, section]);

  const handleTouchEnd = (x: number) => {
    const delta = x - touchStartX.current;
    if (Math.abs(delta) < 55) return;
    if (delta < 0) setSection("live");
    if (delta > 0) setSection("reels");
  };

  return (
    <section
      className="relative md:hidden bg-black"
      onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? 0; }}
      onTouchEnd={(event) => { handleTouchEnd(event.changedTouches[0]?.clientX ?? 0); }}
    >
      <div className="fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-black/75 via-black/35 to-transparent px-5 pb-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <div className="shrink-0 text-xl font-black tracking-tight text-primary">
              Reels<span className="text-white">Porn</span>
            </div>
            <span className="truncate text-xs font-semibold text-white/80">
              Türkiye de Tek ve İlk Reels Porno Sitesi
            </span>
          </div>
          {section === "reels" ? (
              <button
                type="button"
                onClick={() => setMuted((value) => !value)}
                className="grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm"
                aria-label={muted ? "Sesi aç" : "Sesi kapat"}
              >
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
          ) : (
            <span className="h-10 w-10" aria-hidden="true" />
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 items-center text-sm font-bold text-white">
          <button
            type="button"
            onClick={() => setSection("live")}
            className={`relative justify-self-start ${section === "live" ? "text-white" : "text-white/70"}`}
          >
            Canlı Yayın
            {section === "live" && (
              <span className="absolute -bottom-2 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-primary" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setSection("reels")}
            className={`relative justify-self-center ${section === "reels" ? "text-white" : "text-white/70"}`}
          >
            Reels
            {section === "reels" && (
              <span className="absolute -bottom-2 left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-primary" />
            )}
          </button>
          <span aria-hidden="true" />
        </div>
      </div>

      {section === "live" ? (
        <div className="relative h-[100dvh] overflow-hidden bg-black text-white">
          <img src={liveBackdrop} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="mb-6 grid h-20 w-20 place-items-center rounded-full border border-primary/50 bg-primary/15 text-primary shadow-[0_0_60px_hsl(var(--primary)/0.35)]">
              <Radio className="h-9 w-9" />
            </div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">
              Canlı Yayın
            </p>
            <h2 className="text-3xl font-black leading-tight">
              Off Stream
            </h2>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/75">
              Yeni yayın başladığında burada görünecek.
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-[200dvh] snap-y snap-mandatory">
        {feedItems.map((item, index) => {
          const videoSrc = item.videoUrl || item.trailerUrl;

          return (
            <article
              key={item.id}
              ref={(el) => { articleRefs.current[index] = el; }}
              data-index={index}
              className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-black text-white"
            >
              {videoSrc ? (
                <video
                  ref={(el) => { videoRefs.current[index] = el; }}
                  src={videoSrc}
                  poster={item.backdrop || item.poster}
                  playsInline
                  muted={muted}
                  autoPlay={index === activeIndex}
                  loop
                  preload={index < 2 ? "auto" : "metadata"}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <img
                  src={item.backdrop || item.poster}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/90" />

            <div className="absolute inset-x-0 bottom-0 z-10 p-5 pb-8">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                <span>%{item.match} eşleşme</span>
                <span className="h-1 w-1 rounded-full bg-white/50" />
                <span>{item.type === "film" ? "Film" : "Dizi"}</span>
              </div>
              <h2 className="text-4xl font-black leading-none tracking-tight">{item.title}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/80">
                <span>{item.year}</span>
                <span className="rounded-full border border-white/25 px-2 py-1">{item.duration}</span>
                <span>{item.rating}</span>
              </div>
              <p className="mt-4 max-w-[18rem] text-sm leading-6 text-white/88 line-clamp-3">
                {item.description}
              </p>
            </div>

            <div className="absolute left-5 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
              {feedItems.map((dot) => (
                <span
                  key={dot.id}
                  className={`h-1.5 w-1.5 rounded-full transition ${dot.id === item.id ? "bg-white" : "bg-white/35"}`}
                />
              ))}
            </div>
          </article>
            );
        })}
        </div>
      )}
    </section>
  );
}
