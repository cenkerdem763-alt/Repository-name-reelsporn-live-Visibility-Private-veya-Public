import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Clock3, Grid2X2, Play, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProviderEmbedFrame } from "@/components/streamtr/ProviderEmbedFrame";
import type { Title } from "@/data/content";
import { getDirectPlaybackSource, getDirectPreviewSource, getEmbedPlaybackSource, getProviderWatchUrl } from "@/lib/playbackSource";
import { VideoHoverPreview } from "./VideoHoverPreview";

const sections = ["reels", "categories"] as const;
type MobileSection = typeof sections[number];
const ALL_CATEGORIES = "Tümü";
const MAX_REELS = 12;

function getReelVideoSource(item: Title) {
  return getDirectPreviewSource(item) || undefined;
}

function getReelPlaybackSources(item: Title) {
  const embedSource = getEmbedPlaybackSource(item);
  const directSource = getDirectPlaybackSource(item);
  return { embedSource, directSource };
}

function MobileLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`grid place-items-center rounded-md border border-primary/30 bg-primary text-white shadow-[0_12px_30px_rgba(255,23,77,0.22)] ${
          compact ? "h-8 w-8" : "h-10 w-10"
        }`}
      >
        <Play className={`${compact ? "h-4 w-4" : "h-5 w-5"} fill-current`} />
      </span>
      <span className={`${compact ? "text-2xl" : "text-3xl"} font-black leading-none tracking-tight text-white`}>
        Reels<span className="text-primary">Porn</span>
      </span>
    </div>
  );
}

function MobileReelViewer({
  item,
  onClose,
}: {
  item: Title;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [nativeFailed, setNativeFailed] = useState(false);
  const [nativeReady, setNativeReady] = useState(false);
  const [forceDirect, setForceDirect] = useState(false);
  const { embedSource, directSource } = getReelPlaybackSources(item);
  const providerWatchUrl = getProviderWatchUrl(item);
  const useEmbed = Boolean(embedSource && (!forceDirect || nativeFailed || !directSource));
  const cover = item.backdrop || item.poster || "/placeholder.svg";

  useEffect(() => {
    setNativeFailed(false);
    setNativeReady(false);
    setForceDirect(false);
  }, [item.id]);

  useEffect(() => {
    if (useEmbed || !directSource || !embedSource || !forceDirect) return;
    const timeout = window.setTimeout(() => {
      if (!nativeReady) setNativeFailed(true);
    }, 6000);
    return () => window.clearTimeout(timeout);
  }, [directSource, embedSource, forceDirect, nativeReady, useEmbed]);

  useEffect(() => {
    if (useEmbed || !videoRef.current) return;
    videoRef.current.play().catch(() => undefined);
  }, [directSource, useEmbed]);

  return (
    <div
      className="fixed inset-0 z-[120] bg-black text-white md:hidden"
      role="dialog"
      aria-modal="true"
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
    >
      <div className="absolute inset-0">
        {useEmbed && embedSource ? (
          <ProviderEmbedFrame src={embedSource} title={item.title} className="h-full w-full" />
        ) : (
          <div className="relative h-full w-full bg-black">
            {!nativeReady && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45 blur-sm" />}
            <video
              ref={videoRef}
              src={directSource}
              poster={cover}
              controls
              autoPlay
              playsInline
              preload="auto"
              className="relative z-10 h-full w-full bg-black object-contain"
              onLoadedMetadata={() => setNativeReady(true)}
              onCanPlay={() => setNativeReady(true)}
              onError={() => {
                if (embedSource) setNativeFailed(true);
              }}
              onStalled={() => {
                if (embedSource && !nativeReady) setNativeFailed(true);
              }}
            />
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/90 via-black/40 to-transparent px-3 pb-10 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md active:scale-95"
            aria-label="Kapat"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 pt-1">
            <h2 className="line-clamp-2 text-sm font-extrabold leading-5 text-white">{item.title}</h2>
            <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-white/66">
              <span>{item.duration || "Video"}</span>
              <span className="h-1 w-1 rounded-full bg-white/40" />
              <span>{item.genres[0] || "ReelsPorn"}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md active:scale-95"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/30 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16">
        <div className="pointer-events-auto flex items-center justify-end gap-2">
            {directSource && embedSource && (
              <button
                type="button"
                onClick={() => {
                  setNativeFailed(false);
                  setNativeReady(false);
                  setForceDirect((current) => !current);
                }}
                className="h-11 rounded-md border border-white/10 bg-black/40 px-4 text-sm font-bold text-white backdrop-blur-md active:scale-95"
              >
                {useEmbed ? "Direkt" : "Embed"}
              </button>
            )}
            {providerWatchUrl && (
              <a
                href={providerWatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center rounded-md bg-white px-4 text-sm font-extrabold text-zinc-950 active:scale-95"
              >
                Kaynakta aç
              </a>
            )}
        </div>
      </div>
    </div>
  );
}

export function ReelsFeed({ items }: { items: Title[] }) {
  const navigate = useNavigate();
  const reelsViewportRef = useRef<HTMLDivElement | null>(null);
  const articleRefs = useRef<(HTMLElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lastScrollY = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [section, setSection] = useState<MobileSection>("reels");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [failedVideoIds, setFailedVideoIds] = useState<Set<string>>(() => new Set());
  const [failedArtworkIds, setFailedArtworkIds] = useState<Set<string>>(() => new Set());
  const [viewerItem, setViewerItem] = useState<Title | null>(null);
  const sourceItems = useMemo(() => items, [items]);
  const visibleSourceItems = useMemo(
    () =>
      sourceItems.filter((item) => {
        return !failedArtworkIds.has(item.id);
      }),
    [failedArtworkIds, sourceItems]
  );
  const categoryStats = useMemo(() => {
    const stats = new Map<string, { name: string; count: number; image: string; items: Title[] }>();

    visibleSourceItems.forEach((item) => {
      const genres = item.genres.length ? item.genres : ["Video"];
      genres.forEach((genre) => {
        const current = stats.get(genre) || {
          name: genre,
          count: 0,
          image: item.backdrop || item.poster || "/placeholder.svg",
          items: [],
        };
        current.count += 1;
        current.items.push(item);
        stats.set(genre, current);
      });
    });

    const sorted = [...stats.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr"));
    return [
      {
        name: ALL_CATEGORIES,
        count: visibleSourceItems.length,
        image: visibleSourceItems[0]?.backdrop || visibleSourceItems[0]?.poster || "/content/categories-cover.png",
        items: visibleSourceItems,
      },
      ...sorted,
    ].slice(0, 13);
  }, [visibleSourceItems]);
  const feedItems = useMemo(() => {
    const filtered =
      selectedCategory === ALL_CATEGORIES
        ? visibleSourceItems
        : visibleSourceItems.filter((item) => (item.genres.length ? item.genres : ["Video"]).includes(selectedCategory));

    return (filtered.length ? filtered : visibleSourceItems).slice(0, MAX_REELS);
  }, [selectedCategory, visibleSourceItems]);
  const activeCategory = selectedCategory === ALL_CATEGORIES ? "Reels" : selectedCategory;

  const hideBrokenArtwork = (id: string) => {
    setFailedArtworkIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const updateViewport = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (section !== "reels") {
      setShowHeader(true);
      return;
    }

    const viewport = reelsViewportRef.current;
    if (!viewport) return;

    lastScrollY.current = viewport.scrollTop;
    const handleScroll = () => {
      const currentY = viewport.scrollTop;
      const delta = currentY - lastScrollY.current;

      if (currentY < 16 || delta < -14) setShowHeader(true);
      if (delta > 18 && currentY > 80) setShowHeader(false);
      lastScrollY.current = currentY;
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [section]);

  useEffect(() => {
    const root = reelsViewportRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset.index);
        if (!Number.isNaN(index)) setActiveIndex(index);
      },
      { root, threshold: [0.62, 0.86] }
    );

    articleRefs.current.forEach((article) => {
      if (article) observer.observe(article);
    });

    return () => observer.disconnect();
  }, [feedItems, section]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      const item = feedItems[index];
      if (!video) return;
      video.muted = true;
      if (!viewerItem && section === "reels" && index === activeIndex && item) {
        video.play().catch(() => undefined);
      } else {
        video.pause();
        if (index !== activeIndex || section !== "reels") {
          video.currentTime = 0;
        }
      }
    });
  }, [activeIndex, feedItems, section, viewerItem]);

  useEffect(() => {
    if (activeIndex >= feedItems.length) {
      setActiveIndex(Math.max(0, feedItems.length - 1));
    }
  }, [activeIndex, feedItems.length]);

  useEffect(() => {
    setActiveIndex(0);
    articleRefs.current = [];
    videoRefs.current = [];
    reelsViewportRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [selectedCategory]);

  useEffect(() => {
    if (!viewerItem) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [viewerItem]);

  useEffect(() => {
    if (!viewerItem) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewerItem(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [viewerItem]);

  const handleTouchMove = (x: number, y: number) => {
    const delta = x - touchStartX.current;
    const verticalDelta = y - touchStartY.current;
    if (Math.abs(delta) < 12) return;
    if (Math.abs(delta) < Math.abs(verticalDelta) * 1.25) return;
    const currentIndex = sections.indexOf(section);

    const nextDrag =
      delta > 0
        ? Math.max(0, Math.min(currentIndex * viewportWidth, delta))
        : Math.min(0, Math.max(-((sections.length - 1 - currentIndex) * viewportWidth), delta));

    setIsDragging(true);
    setDragX(nextDrag);
  };

  const handleTouchEnd = (x: number, y: number) => {
    const delta = x - touchStartX.current;
    const verticalDelta = y - touchStartY.current;
    setIsDragging(false);
    setDragX(0);
    if (Math.abs(delta) < 120) return;
    if (Math.abs(delta) < Math.abs(verticalDelta) * 1.6) return;
    const currentIndex = sections.indexOf(section);
    const nextIndex = delta > 0 ? currentIndex - 1 : currentIndex + 1;
    const nextSection = sections[nextIndex];
    if (nextSection) changeSection(nextSection);
  };

  const changeSection = (next: MobileSection) => {
    setSection(next);
    setDragX(0);
    setIsDragging(false);
    reelsViewportRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectCategory = (category: string) => {
    setSelectedCategory(category);
    changeSection("reels");
  };

  const openVideo = (item: Title) => {
    setViewerItem(item);
  };

  if (!visibleSourceItems.length) {
    return (
      <section className="relative grid h-[100dvh] place-items-center overflow-hidden bg-background px-5 text-center text-white md:hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,23,77,0.18),transparent_34%),linear-gradient(180deg,rgba(12,12,12,0.96),rgba(2,2,2,1))]" />
        <div className="relative z-10 w-full max-w-sm">
          <MobileLogo />
          <div className="mx-auto mt-7 grid h-16 w-16 place-items-center rounded-md border border-primary/30 bg-primary/10 text-primary shadow-[0_18px_54px_rgba(255,23,77,0.16)]">
            <Play className="h-7 w-7 fill-current" />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold tracking-normal">Yayın akışı yenileniyor</h1>
          <p className="mt-3 text-sm leading-6 text-white/64">
            Kaynaklar tek tek doğrulanıyor. Yeni reels listesi hazır olduğunda burada açılacak.
          </p>
          <div className="mx-auto mt-6 flex max-w-xs justify-center gap-2 text-[11px] font-bold text-white/66">
            <span className="rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-1.5">Embed testi</span>
            <span className="rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-1.5">Mobil kontrol</span>
          </div>
          <div className="mt-7">
            <button
              type="button"
              onClick={() => navigate("/ara")}
              className="h-11 rounded-md border border-white/10 bg-white/[0.07] px-5 text-sm font-bold text-white active:scale-95"
            >
              Aramayı aç
            </button>
          </div>
        </div>
      </section>
    );
  }

  const baseX = -(sections.indexOf(section) * viewportWidth);
  const trackX = baseX + dragX;

  return (
    <section
      className="relative h-[100dvh] overflow-hidden bg-black md:hidden"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? 0;
        touchStartY.current = event.touches[0]?.clientY ?? 0;
      }}
      onTouchMove={(event) => {
        handleTouchMove(event.touches[0]?.clientX ?? 0, event.touches[0]?.clientY ?? 0);
      }}
      onTouchEnd={(event) => {
        handleTouchEnd(event.changedTouches[0]?.clientX ?? 0, event.changedTouches[0]?.clientY ?? 0);
      }}
    >
      {viewerItem && (
        <MobileReelViewer
          item={viewerItem}
          onClose={() => setViewerItem(null)}
        />
      )}

      <button
        type="button"
        onClick={() => changeSection(section === "categories" ? "reels" : "categories")}
        className={`fixed right-4 top-[max(0.85rem,env(safe-area-inset-top))] z-40 inline-flex h-10 items-center gap-2 rounded-md border border-primary/25 bg-black/70 px-3 text-xs font-black text-white shadow-[0_14px_34px_rgba(0,0,0,0.34)] backdrop-blur-md transition-all duration-300 active:scale-95 ${
          showHeader ? "pointer-events-none translate-y-2 opacity-0" : "translate-y-0 opacity-100"
        }`}
        aria-label={section === "categories" ? "Reels akışına dön" : "Kategorileri aç"}
      >
        <Grid2X2 className="h-4 w-4 text-primary" />
        {section === "categories" ? "Reels" : "Kategoriler"}
      </button>

      <div
        className={`fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-black/55 via-black/18 to-transparent px-4 pb-4 pt-[max(0.85rem,env(safe-area-inset-top))] transition-all duration-500 ease-out ${
          showHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <MobileLogo compact />
            <p className="mt-1 max-w-[18rem] truncate text-[11px] font-bold tracking-normal text-primary/90">
              {activeCategory} akışı
            </p>
          </div>
          <button
            type="button"
            onClick={() => changeSection("categories")}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-primary/25 bg-primary/10 px-3 text-xs font-black text-white/90 shadow-[0_12px_30px_rgba(255,23,77,0.12)] backdrop-blur-md active:scale-95"
            aria-label="Kategorileri aç"
          >
            <Grid2X2 className="h-4 w-4 text-primary" />
            Kategoriler
          </button>
        </div>

        <div
          className="mt-4 flex touch-pan-x gap-2 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide"
          style={{ touchAction: "pan-x" }}
          onTouchStart={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
          onTouchEnd={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          {categoryStats.slice(0, 8).map((category) => (
            <button
              key={category.name}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                selectCategory(category.name);
              }}
              className={`h-9 shrink-0 rounded-md border px-3 text-xs font-bold transition ${
                selectedCategory === category.name
                  ? "border-primary/50 bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(255,23,77,0.22)]"
                  : "border-white/10 bg-black/50 text-white/75 backdrop-blur-md"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`flex h-full w-[200vw] will-change-transform ${isDragging ? "" : "transition-transform duration-500 ease-out"}`}
        style={{ transform: `translate3d(${trackX}px, 0, 0)` }}
      >
        <div ref={reelsViewportRef} className="h-[100dvh] w-screen shrink-0 snap-y snap-mandatory overflow-y-auto scroll-smooth scrollbar-hide">
          {feedItems.map((item, index) => {
            const active = section === "reels" && index === activeIndex;
            const image = item.backdrop || item.poster || "/placeholder.svg";
            const hasImage = image !== "/placeholder.svg";
            const videoSrc = getReelVideoSource(item);
            const showNativeVideo = Boolean(videoSrc && !failedVideoIds.has(item.id));
            const duration = item.duration || "12:00";
            const progress = ((index + 1) / feedItems.length) * 100;

            return (
              <article
                key={item.id}
                ref={(el) => { articleRefs.current[index] = el; }}
                data-index={index}
                className="relative isolate h-[100dvh] w-full snap-start snap-always overflow-hidden bg-black text-white"
              >
                {hasImage ? (
                  <img
                    src={image}
                    alt={item.title}
                    onError={() => hideBrokenArtwork(item.id)}
                    className={`absolute inset-0 h-full w-full object-cover transition duration-700 ${
                      active ? "scale-100 opacity-70" : "scale-105 opacity-45"
                    }`}
                  />
                ) : (
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,23,77,0.22),rgba(12,12,12,0.98)_48%,rgba(2,2,2,1))]" />
                )}

                {showNativeVideo ? (
                  <video
                    ref={(el) => { videoRefs.current[index] = el; }}
                    src={videoSrc}
                    poster={image}
                    playsInline
                    muted
                    autoPlay={active}
                    loop
                    preload={index < 2 ? "auto" : "metadata"}
                    className="pointer-events-none absolute inset-0 z-10 h-full w-full object-cover"
                    onError={() => {
                      setFailedVideoIds((current) => new Set(current).add(item.id));
                    }}
                  />
                ) : (
                  <VideoHoverPreview item={item} active={active} />
                )}

                <button
                  type="button"
                  onClick={() => openVideo(item)}
                  className="absolute inset-0 z-20 cursor-pointer"
                  aria-label={`${item.title} izle`}
                />

                <div className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(180deg,rgba(0,0,0,0.36)_0%,rgba(0,0,0,0.05)_28%,rgba(0,0,0,0.10)_54%,rgba(0,0,0,0.86)_100%)]" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-30 w-28 bg-gradient-to-l from-black/44 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-1/2 bg-[linear-gradient(to_top,rgba(0,0,0,0.96),rgba(0,0,0,0.48)_56%,transparent)]" />

                <div className="absolute right-3 bottom-[max(7rem,calc(env(safe-area-inset-bottom)+7rem))] z-50 flex flex-col items-center gap-3">
                  <span className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10px] font-black text-white/82 backdrop-blur-md">
                    {index + 1}/{feedItems.length}
                  </span>
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-primary/30 bg-black/45 text-[11px] font-black text-primary shadow-[0_16px_38px_rgba(0,0,0,0.34)] backdrop-blur-md">
                    {item.rating || "18+"}
                  </span>
                </div>

                {!showNativeVideo && (
                  <div className="pointer-events-none absolute left-1/2 top-1/2 z-40 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-primary/40 bg-primary text-white shadow-[0_20px_54px_rgba(255,23,77,0.34)] backdrop-blur-md">
                    <Play className="h-7 w-7 fill-current" />
                  </div>
                )}

                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-4 pb-[max(1.15rem,env(safe-area-inset-bottom))]">
                  <div className="mb-2 flex max-w-[calc(100vw-5.6rem)] items-center">
                    <span className="inline-flex h-7 items-center gap-1.5 rounded-sm bg-black/72 px-2.5 text-[11px] font-black text-white shadow-[0_8px_22px_rgba(0,0,0,0.34)] backdrop-blur-sm">
                      <Clock3 className="h-3.5 w-3.5" />
                      {duration}
                    </span>
                  </div>
                  <h2 className="max-w-[calc(100vw-5.7rem)] text-[clamp(1.35rem,6.4vw,2.05rem)] font-black leading-[1.06] tracking-normal text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.65)]">
                    {item.title}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 max-w-[calc(100vw-6.5rem)] text-[13px] font-medium leading-5 text-white/70">
                    {item.description}
                  </p>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/12">
                    <span
                      className="block h-full rounded-full bg-primary shadow-[0_0_18px_rgba(255,23,77,0.62)] transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

              </article>
            );
          })}
        </div>

        <div className="relative h-[100dvh] w-screen shrink-0 overflow-y-auto bg-black text-white scrollbar-hide">
          <img src={categoryStats[0]?.image || "/content/categories-cover.png"} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.76),rgba(0,0,0,0.92)_48%,rgba(0,0,0,0.98))]" />
          <div className="relative z-10 min-h-full px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-36">
            <h2 className="text-3xl font-extrabold tracking-normal">Kategoriler</h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-white/66">
              Türkçe reels akışını kategoriye göre daralt.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              {categoryStats.map((category) => (
                <button
                  key={category.name}
                  type="button"
                  onClick={() => selectCategory(category.name)}
                  className={`group relative min-h-[8.8rem] overflow-hidden rounded-md border p-3 text-left transition active:scale-[0.98] ${
                    selectedCategory === category.name
                      ? "border-primary/60 bg-primary/20"
                      : "border-white/10 bg-white/[0.075]"
                  }`}
                >
                  <img src={category.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35 transition group-active:scale-[1.02]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <span className="relative z-10 inline-flex rounded-sm bg-black/50 px-2 py-1 text-[11px] font-bold text-white/75 backdrop-blur">
                    {category.count} video
                  </span>
                  <span className="relative z-10 mt-10 block text-lg font-extrabold leading-tight text-white">
                    {category.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
