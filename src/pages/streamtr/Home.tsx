import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Eye, Heart, MoreVertical, Play, ThumbsUp } from "lucide-react";
import { AuthPromptOverlay } from "@/components/streamtr/AuthPromptOverlay";
import { ReelsFeed } from "@/components/streamtr/ReelsFeed";
import { Seo } from "@/components/streamtr/Seo";
import { ShareMenu } from "@/components/streamtr/ShareMenu";
import { VideoHoverPreview } from "@/components/streamtr/VideoHoverPreview";
import { useApp } from "@/contexts/AppContext";
import { useAllTitles } from "@/hooks/useContent";
import type { Title } from "@/data/content";
import { formatCompactCount, getLikeCount, getViewCount } from "@/lib/engagement";

const WEEKLY_BEST_CHIP = "Haftanın En İyileri";
const categoryChips = [WEEKLY_BEST_CHIP, "Türkçe Reels", "Amatör", "Trend Reels", "Yeni", "Popüler", "HD", "Kısa Video", "Model", "Koleksiyon"];
const PAGE_SIZE = 24;
const AUTH_PROMPT_DISMISSED_KEY = "reelsporn.authPromptDismissedUntil";
const AUTH_PROMPT_DISMISS_MS = 1000 * 60 * 60 * 24 * 7;

function normalizeChip(value: string) {
  return value.toLocaleLowerCase("tr");
}

function getItemsForChip(titles: Title[], chip: string) {
  const normalized = normalizeChip(chip);

  if (chip === WEEKLY_BEST_CHIP) {
    return [...titles].sort((a, b) => getViewCount(b) - getViewCount(a) || getLikeCount(b) - getLikeCount(a));
  }
  if (chip === "Yeni") return [...titles].sort((a, b) => b.year - a.year);
  if (chip === "Popüler") return [...titles].sort((a, b) => getViewCount(b) - getViewCount(a));
  if (chip === "Trend Reels") return [...titles].sort((a, b) => getViewCount(b) - getViewCount(a) || getLikeCount(b) - getLikeCount(a));

  const filtered = titles.filter((item) =>
    item.genres.some((genre) => normalizeChip(genre).includes(normalized)) ||
    normalizeChip(item.rating).includes(normalized) ||
    normalizeChip(item.title).includes(normalized)
  );

  return filtered.length ? filtered : titles;
}

function VideoTile({ item, onArtworkError }: { item: Title; onArtworkError: (id: string) => void }) {
  const { favorites, likedTitles, toggleFavorite, toggleLike } = useApp();
  const image = item.backdrop || item.poster || "/placeholder.svg";
  const hasImage = image !== "/placeholder.svg";
  const [previewing, setPreviewing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fav = favorites.includes(item.id);
  const liked = likedTitles.includes(item.id);
  const likeCount = getLikeCount(item, liked);
  const shareUrl = typeof window === "undefined" ? `/icerik/${item.id}` : `${window.location.origin}/icerik/${item.id}`;

  return (
    <article
      className="group relative min-w-0 overflow-visible"
      onMouseEnter={() => setPreviewing(true)}
      onMouseLeave={() => setPreviewing(false)}
      onFocus={() => setPreviewing(true)}
      onBlur={() => setPreviewing(false)}
    >
      <Link to={`/icerik/${item.id}`} className="block">
        <div className="relative aspect-video overflow-hidden rounded-md border border-primary/20 bg-[#090909] shadow-[0_18px_42px_rgba(0,0,0,0.42)] transition group-hover:border-primary/40 group-hover:shadow-[0_22px_48px_rgba(255,23,77,0.12)]">
          {hasImage ? (
            <img
              src={image}
              alt={item.title}
              loading="lazy"
              onError={() => onArtworkError(item.id)}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,rgba(255,23,77,0.26),rgba(16,16,16,0.98)_48%,rgba(3,3,3,1))]">
              <div className="grid place-items-center gap-2 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full border border-primary/30 bg-primary text-white shadow-[0_16px_40px_rgba(255,23,77,0.24)]">
                  <Play className="h-5 w-5 fill-current" />
                </div>
                <span className="rounded-md border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-normal text-white/80 backdrop-blur">
                  Embed
                </span>
              </div>
            </div>
          )}
          <VideoHoverPreview item={item} active={previewing} />
          <div className="pointer-events-none absolute inset-0 z-20 bg-black/0 transition group-hover:bg-black/10" />
          <div className="pointer-events-none absolute bottom-2 right-2 z-30 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white/90 backdrop-blur">
            {item.duration || "12:00"}
          </div>
          <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center opacity-0 transition group-hover:opacity-100">
            <div className="grid h-11 w-11 place-items-center rounded-full border border-primary/40 bg-primary text-white shadow-[0_16px_42px_rgba(255,23,77,0.26)]">
              <Play className="h-5 w-5 fill-current" />
            </div>
          </div>
        </div>
      </Link>
      <div className="pt-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="truncate">{item.genres[0] || "ReelsPorn"}</span>
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="ml-auto flex shrink-0 items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {formatCompactCount(getViewCount(item))}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <ThumbsUp className={`h-3.5 w-3.5 ${liked ? "fill-primary text-primary" : ""}`} />
                {formatCompactCount(likeCount)}
              </span>
            </div>
            <Link to={`/icerik/${item.id}`} className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-foreground/95 hover:text-primary">
              {item.title}
            </Link>
          </div>
          <div className="relative mt-4 shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label="Video seçenekleri"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-9 z-40 w-44 rounded-md border border-primary/20 bg-black/95 p-1.5 text-sm shadow-[0_18px_44px_rgba(0,0,0,0.48)]">
                <Link
                  to={`/izle/${item.id}`}
                  className="flex items-center gap-2 rounded-sm px-3 py-2 text-foreground transition hover:bg-accent"
                >
                  <Play className="h-4 w-4 fill-current" />
                  İzle
                </Link>
                <button
                  type="button"
                  onClick={() => toggleFavorite(item.id)}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-foreground transition hover:bg-accent"
                >
                  <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} />
                  {fav ? "Favoriden çıkar" : "Favoriye ekle"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleLike(item.id)}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-foreground transition hover:bg-accent"
                >
                  <ThumbsUp className={`h-4 w-4 ${liked ? "fill-primary text-primary" : ""}`} />
                  {liked ? "Beğeniyi kaldır" : "Beğen"}
                </button>
                <ShareMenu title={item.title} url={shareUrl} variant="menu-item" onShared={() => setMenuOpen(false)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set([1, 2, currentPage - 1, currentPage, currentPage + 1, totalPages]);
  return [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

export default function Home() {
  const { user } = useApp();
  const { data: titles = [] } = useAllTitles();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedChip, setSelectedChip] = useState(categoryChips[0]);
  const [authPromptClosed, setAuthPromptClosed] = useState(() => {
    const dismissedUntil = Number(localStorage.getItem(AUTH_PROMPT_DISMISSED_KEY) || 0);
    return dismissedUntil > Date.now();
  });
  const [failedArtworkIds, setFailedArtworkIds] = useState<Set<string>>(() => new Set());
  const visibleTitles = titles.filter((title) => !failedArtworkIds.has(title.id));
  const filteredTitles = getItemsForChip(visibleTitles, selectedChip);
  const sectionTitle = selectedChip === WEEKLY_BEST_CHIP ? WEEKLY_BEST_CHIP : `${selectedChip} videolar`;
  const totalPages = Math.max(1, Math.ceil(filteredTitles.length / PAGE_SIZE));
  const requestedPage = Number(searchParams.get("page") || "1");
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages);
  const pageItems = filteredTitles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setSearchParams(nextPage === 1 ? {} : { page: String(nextPage) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hideBrokenArtwork = (id: string) => {
    setFailedArtworkIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const openPrompt = () => {
      localStorage.removeItem(AUTH_PROMPT_DISMISSED_KEY);
      setAuthPromptClosed(false);
    };
    window.addEventListener("open-auth-prompt", openPrompt);
    return () => window.removeEventListener("open-auth-prompt", openPrompt);
  }, []);

  const closeAuthPrompt = () => {
    localStorage.setItem(AUTH_PROMPT_DISMISSED_KEY, String(Date.now() + AUTH_PROMPT_DISMISS_MS));
    setAuthPromptClosed(true);
  };

  return (
    <>
      <Seo
        title="ReelsPorn - Türkçe Reels Porno ve 18+ Video"
        description="Türkçe reels porno, amatör videolar, trend 18+ içerikler ve kısa video akışını ReelsPorn'da keşfet."
        path="/"
      />
      <ReelsFeed items={visibleTitles} />
      {!user && !authPromptClosed && (
        <div className="hidden md:block">
          <AuthPromptOverlay onClose={closeAuthPrompt} />
        </div>
      )}
      <main className="hidden min-h-screen bg-[linear-gradient(180deg,#080808_0%,#050505_44%,#020202_100%)] pb-20 md:block">
      <section className="border-b border-primary/20 bg-[linear-gradient(180deg,rgba(255,23,77,0.18),rgba(12,12,12,0.98)_44%,rgba(3,3,3,1))] px-4 pb-5 pt-20 shadow-[0_18px_48px_rgba(0,0,0,0.34)] md:px-8">
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-primary">18+ Türkçe web kataloğu</p>
              <div className="mt-1 text-4xl font-black leading-none tracking-tight text-white">
                Reels<span className="text-primary">Porn</span>
              </div>
              <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-white/60">
                Türkçe reels porno, amatör ve trend 18+ içerikler için daha koyu ve hızlı katalog.
              </p>
            </div>
            <div className="inline-flex h-10 items-center gap-2 rounded-md border border-primary/25 bg-primary/10 px-3 text-xs font-black uppercase text-primary shadow-[0_16px_36px_rgba(255,23,77,0.12)]">
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_18px_rgba(255,23,77,0.72)]" />
              Temiz kaynak bekleniyor
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1 pt-1 scrollbar-hide">
            {categoryChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setSelectedChip(chip);
                  setSearchParams({});
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${
                  selectedChip === chip
                    ? "border-primary/60 bg-primary text-white shadow-[0_12px_32px_rgba(255,23,77,0.22)]"
                    : "border-white/10 bg-black/40 text-zinc-300 hover:border-primary/40 hover:bg-primary/10 hover:text-white"
                }`}
              >
                {chip}
              </button>
            ))}
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-[1480px] px-4 pt-6 md:px-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-primary/20 pb-4">
          <h1 className="text-xl font-black tracking-tight text-white md:text-2xl">{sectionTitle}</h1>
        </header>

        <section className="grid grid-cols-1 gap-x-3 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pageItems.map((item) => (
            <VideoTile key={item.id} item={item} onArtworkError={hideBrokenArtwork} />
          ))}
        </section>

        {!pageItems.length && (
          <section className="relative grid min-h-[34rem] place-items-center overflow-hidden rounded-md border border-primary/25 bg-[linear-gradient(135deg,rgba(255,23,77,0.20),rgba(12,12,12,0.98)_42%,rgba(2,2,2,1))] px-6 text-center shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
            <div className="absolute inset-x-0 top-0 h-px bg-primary/70" />
            <div className="absolute inset-x-10 bottom-0 h-px bg-primary/20" />
            <div className="max-w-xl">
              <div className="text-4xl font-black leading-none tracking-normal text-white">
                Reels<span className="text-primary">Porn</span>
              </div>
              <div className="mx-auto mt-8 grid h-16 w-16 place-items-center rounded-md border border-primary/30 bg-primary/10 text-primary shadow-[0_18px_54px_rgba(255,23,77,0.16)]">
                <Play className="h-6 w-6 fill-current" />
              </div>
              <h2 className="mt-6 text-3xl font-black tracking-tight text-white">Katalog yenileniyor</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/64">
                Eski kaynaklar kaldırıldı. Yeni embed kaynakları mobil ve masaüstünde doğrulandıktan sonra katalog tekrar yayına alınacak.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-2 text-xs font-bold text-white/68">
                <span className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-primary">Kaynak testi</span>
                <span className="rounded-md border border-white/10 bg-black/40 px-3 py-2">Mobil player kontrolü</span>
                <span className="rounded-md border border-white/10 bg-black/40 px-3 py-2">Temiz katalog</span>
              </div>
            </div>
          </section>
        )}

        {totalPages > 1 && (
          <nav className="mt-12 flex flex-wrap items-center justify-center gap-2" aria-label="Sayfalar">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-11 rounded-md border border-white/10 bg-card px-5 text-sm font-semibold text-zinc-300 transition hover:bg-secondary disabled:cursor-not-allowed disabled:text-zinc-600 disabled:opacity-60"
            >
              Prev
            </button>
            {pageNumbers.map((page, index) => {
              const previousPage = pageNumbers[index - 1];
              const showGap = previousPage && page - previousPage > 1;

              return (
                <div key={page} className="flex items-center gap-2">
                  {showGap && <span className="px-2 text-muted-foreground">...</span>}
                  <button
                    type="button"
                    onClick={() => goToPage(page)}
                    className={`h-11 min-w-11 rounded-md px-4 text-sm font-bold transition ${
                      page === currentPage
                        ? "bg-primary/90 text-primary-foreground shadow-[0_12px_32px_rgba(255,23,77,0.18)]"
                        : "border border-white/10 bg-card text-zinc-200 hover:bg-secondary hover:text-white"
                    }`}
                    aria-current={page === currentPage ? "page" : undefined}
                  >
                    {page}
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-11 rounded-md bg-primary/90 px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary disabled:cursor-not-allowed disabled:bg-card disabled:text-zinc-600 disabled:opacity-60"
            >
              Next
            </button>
          </nav>
        )}
      </div>
      </main>
    </>
  );
}
