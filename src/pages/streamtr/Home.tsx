import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Eye, MoreVertical, Play } from "lucide-react";
import { ReelsFeed } from "@/components/streamtr/ReelsFeed";
import { useAllTitles } from "@/hooks/useContent";
import type { Title } from "@/data/content";

const categoryChips = ["Yeni", "Popüler", "HD", "Amatör", "Trend", "Türkçe", "Model", "Koleksiyon", "Öne Çıkan"];
const PAGE_SIZE = 24;

function metricFromId(id: string) {
  const total = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `${Math.max(12, total % 980)}K`;
}

function VideoTile({ item }: { item: Title }) {
  const image = item.backdrop || item.poster || "/placeholder.svg";

  return (
    <article className="group min-w-0 overflow-hidden">
      <Link to={`/icerik/${item.id}`} className="block">
        <div className="relative aspect-video overflow-hidden bg-secondary">
          <img
            src={image}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
          <div className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-white">
            {item.duration || "12:00"}
          </div>
          <div className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
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
                {metricFromId(item.id)}
              </span>
            </div>
            <Link to={`/icerik/${item.id}`} className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-foreground hover:text-primary">
              {item.title}
            </Link>
          </div>
          <button className="mt-4 grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Video seçenekleri">
            <MoreVertical className="h-4 w-4" />
          </button>
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
  const { data: titles = [] } = useAllTitles();
  const [searchParams, setSearchParams] = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(titles.length / PAGE_SIZE));
  const requestedPage = Number(searchParams.get("page") || "1");
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages);
  const pageItems = titles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setSearchParams(nextPage === 1 ? {} : { page: String(nextPage) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <ReelsFeed items={titles} />
      <main className="hidden min-h-screen bg-background pb-20 lg:block">
      <section className="border-b border-red-950/60 bg-[linear-gradient(135deg,rgba(127,29,29,0.34),rgba(24,24,27,0.98)_40%,rgba(7,7,8,1))] px-4 pb-5 pt-20 shadow-[0_18px_60px_rgba(0,0,0,0.24)] md:px-8">
        <div className="mx-auto max-w-[1480px]">
          <nav className="flex gap-2 overflow-x-auto pb-1 pt-1 scrollbar-hide">
            {categoryChips.map((chip, index) => (
              <button
                key={chip}
                className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${
                  index === 0
                    ? "border-red-400 bg-red-500 text-white shadow-[0_0_26px_rgba(239,68,68,0.24)]"
                    : "border-white/10 bg-zinc-900/80 text-zinc-100 hover:border-red-400/70 hover:bg-red-500 hover:text-white"
                }`}
              >
                {chip}
              </button>
            ))}
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-[1480px] px-4 pt-6 md:px-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <h1 className="text-xl font-black tracking-tight md:text-2xl">Popüler videolar</h1>
        </header>

        <section className="grid grid-cols-1 gap-x-3 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pageItems.map((item) => (
            <VideoTile key={item.id} item={item} />
          ))}
        </section>

        {totalPages > 1 && (
          <nav className="mt-12 flex flex-wrap items-center justify-center gap-2" aria-label="Sayfalar">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-12 rounded-md bg-zinc-900 px-6 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600 disabled:opacity-60"
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
                    className={`h-12 min-w-12 rounded-md px-4 text-sm font-black transition ${
                      page === currentPage
                        ? "bg-primary text-primary-foreground shadow-[0_0_24px_rgba(239,68,68,0.28)]"
                        : "bg-zinc-900 text-zinc-200 hover:bg-primary hover:text-primary-foreground"
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
              className="h-12 rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-zinc-900 disabled:text-zinc-600 disabled:opacity-60"
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
