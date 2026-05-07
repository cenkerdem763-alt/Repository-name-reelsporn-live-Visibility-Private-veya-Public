import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fallbackTitles, type Title } from "@/data/content";

const demoVideos = [
  "/content/reels-1.mp4",
  "/content/reels-2.mp4",
];
const fallbackDemoVideos = [
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "https://www.w3schools.com/html/mov_bbb.mp4",
];
const sections = ["live", "reels", "categories"] as const;
type MobileSection = typeof sections[number];
const categories = ["Amatör", "Türk", "Trend", "Yeni", "Popüler", "Canlıya Yakın"];

export function ReelsFeed({ items }: { items: Title[] }) {
  const navigate = useNavigate();
  const articleRefs = useRef<(HTMLElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lastScrollY = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [section, setSection] = useState<MobileSection>("reels");
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [muted, setMuted] = useState(true);
  const sourceItems = [...items, ...fallbackTitles].slice(0, 2);
  const feedItems = sourceItems.slice(0, 2).map((item, index) => ({
    ...item,
    videoUrl: demoVideos[index] || fallbackDemoVideos[index],
  }));
  const liveBackdrop = "/content/live-offstream-cover.png";
  const categoriesBackdrop = "/content/categories-cover.png";

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

    lastScrollY.current = window.scrollY;
    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (currentY < 12 || delta < -8) setShowHeader(true);
      if (delta > 8 && currentY > 40) setShowHeader(false);
      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [section]);

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const baseX = -(sections.indexOf(section) * viewportWidth);
  const trackX = baseX + dragX;

  return (
    <section
      className={`relative overflow-x-hidden bg-black lg:hidden ${section === "reels" ? "min-h-[200dvh]" : "h-[100dvh] overflow-y-hidden"}`}
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
      <div
        className={`fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-black/80 via-black/35 to-transparent px-5 pb-5 pt-[max(0.9rem,env(safe-area-inset-top))] transition-all duration-300 ease-out ${
          showHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-2xl font-black leading-none tracking-tight text-primary drop-shadow-[0_0_16px_rgba(239,68,68,0.45)]">
              Reels<span className="text-white">Porn</span>
            </div>
            <p className="mt-1 max-w-[18rem] truncate text-[11px] font-semibold tracking-wide text-rose-100/90">
              Türkiye'de Tek ve İlk Reels Porno Sitesi
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/ara")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/30 text-white/90 backdrop-blur-sm"
            aria-label="Ara"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 items-center text-sm font-bold text-white">
          <button
            type="button"
            onClick={() => changeSection("live")}
            className={`relative justify-self-start ${section === "live" ? "text-white" : "text-white/70"}`}
          >
            Canlı Yayın
            {section === "live" && (
              <span className="absolute -bottom-2 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-primary" />
            )}
          </button>
          <button
            type="button"
            onClick={() => changeSection("reels")}
            className={`relative justify-self-center ${section === "reels" ? "text-white" : "text-white/70"}`}
          >
            Reels
            {section === "reels" && (
              <span className="absolute -bottom-2 left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-primary" />
            )}
          </button>
          <button
            type="button"
            onClick={() => changeSection("categories")}
            className={`relative justify-self-end ${section === "categories" ? "text-white" : "text-white/70"}`}
          >
            Kategoriler
            {section === "categories" && (
              <span className="absolute -bottom-2 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-primary" />
            )}
          </button>
        </div>
      </div>

      <div
        className={`flex w-[300vw] will-change-transform ${isDragging ? "" : "transition-transform duration-500 ease-out"}`}
        style={{ transform: `translate3d(${trackX}px, 0, 0)` }}
      >
        <div className="relative h-[100dvh] w-screen shrink-0 overflow-hidden bg-black text-white">
          <img src={liveBackdrop} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-8 text-center">
            <h2 className="text-4xl font-black leading-tight text-rose-100 drop-shadow-[0_0_24px_rgba(244,63,94,0.55)]">
              Off Stream
            </h2>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/75">
              Yeni yayın başladığında burada görünecek.
            </p>
          </div>
        </div>

        <div className="min-h-[200dvh] w-screen shrink-0 snap-y snap-mandatory">
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
                    onError={(event) => {
                      const fallback = fallbackDemoVideos[index];
                      if (!fallback || event.currentTarget.src.includes(fallback)) return;
                      event.currentTarget.src = fallback;
                      event.currentTarget.load();
                      if (section === "reels" && index === activeIndex) {
                        event.currentTarget.play().catch(() => undefined);
                      }
                    }}
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
                  <h2 className="text-4xl font-black leading-none tracking-tight">{item.title}</h2>
                </div>

              </article>
            );
          })}
        </div>

        <div className="relative h-[100dvh] w-screen shrink-0 overflow-hidden bg-black text-white">
          <img src={categoriesBackdrop} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative z-10 flex h-full flex-col justify-center px-5 pt-28">
            <h2 className="text-3xl font-black tracking-tight">Kategoriler</h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-white/70">
              İzlemek istediğin akışı hızlıca seç.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-5 text-left text-sm font-bold text-white shadow-lg shadow-black/20 backdrop-blur-md"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
