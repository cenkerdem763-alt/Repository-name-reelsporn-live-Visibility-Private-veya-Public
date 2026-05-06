import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Heart, Info, Play, Plus, Volume2, VolumeX } from "lucide-react";
import { fallbackTitles, type Title } from "@/data/content";
import { useApp } from "@/contexts/AppContext";

const demoVideos = [
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "https://www.w3schools.com/html/mov_bbb.mp4",
];

export function ReelsFeed({ items }: { items: Title[] }) {
  const { favorites, toggleFavorite, watchlist, toggleWatchlist } = useApp();
  const articleRefs = useRef<(HTMLElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const sourceItems = items.length ? items : fallbackTitles;
  const feedItems = sourceItems.slice(0, 2).map((item, index) => ({
    ...item,
    videoUrl: demoVideos[index],
  }));

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
      if (index === activeIndex) {
        video.play().catch(() => undefined);
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [activeIndex, muted, feedItems.length]);

  return (
    <section className="md:hidden h-[100dvh] overflow-y-auto snap-y snap-mandatory overscroll-contain scroll-smooth bg-black scrollbar-hide">
      {feedItems.map((item, index) => {
        const videoSrc = item.videoUrl || item.trailerUrl;
        const inList = watchlist.includes(item.id);
        const isFavorite = favorites.includes(item.id);

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
            <div className="absolute inset-x-0 top-16 z-10 flex items-center justify-between px-5">
              <div className="text-xl font-black tracking-tight text-primary">
                Reels<span className="text-white">Porn</span>
              </div>
              <button
                type="button"
                onClick={() => setMuted((value) => !value)}
                className="grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm"
                aria-label={muted ? "Sesi aç" : "Sesi kapat"}
              >
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>

            <div className="absolute right-4 bottom-28 z-10 flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => toggleFavorite(item.id)}
                className="grid h-12 w-12 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm"
                aria-label="Favorilere ekle"
              >
                <Heart className={`h-6 w-6 ${isFavorite ? "fill-primary text-primary" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => toggleWatchlist(item.id)}
                className="grid h-12 w-12 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm"
                aria-label={inList ? "Listeden çıkar" : "Listeme ekle"}
              >
                {inList ? <Check className="h-6 w-6 text-primary" /> : <Plus className="h-6 w-6" />}
              </button>
              <Link
                to={`/icerik/${item.id}`}
                className="grid h-12 w-12 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm"
                aria-label="Detay"
              >
                <Info className="h-6 w-6" />
              </Link>
              <Link
                to={`/izle/${item.id}`}
                className="grid h-12 w-12 place-items-center rounded-full bg-white text-black shadow-lg shadow-black/30"
                aria-label="Oynat"
              >
                <Play className="h-6 w-6 fill-current" />
              </Link>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-10 p-5 pb-8 pr-20">
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
    </section>
  );
}
