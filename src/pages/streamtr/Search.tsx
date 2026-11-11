import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, Film, Flame, Play, Search as SearchIcon, SlidersHorizontal, ThumbsUp, Tv, X } from "lucide-react";
import { Seo } from "@/components/streamtr/Seo";
import { VideoHoverPreview } from "@/components/streamtr/VideoHoverPreview";
import { useApp } from "@/contexts/AppContext";
import type { Title } from "@/data/content";
import { useAllTitles } from "@/hooks/useContent";
import { Button } from "@/components/ui/button";
import { formatCompactCount, getLikeCount, getViewCount } from "@/lib/engagement";

const PAGE_SIZE = 24;
const ALL_GENRES = "Tümü";
type TypeFilter = "all" | "film" | "dizi";
type SortMode = "relevance" | "views" | "newest" | "popular";

const TYPE_FILTERS: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "film", label: "Video" },
  { value: "dizi", label: "Seri" },
];

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "relevance", label: "Akıllı sıralama" },
  { value: "views", label: "En çok izlenen" },
  { value: "newest", label: "En yeni" },
  { value: "popular", label: "En beğenilen" },
];

function normalize(value: string) {
  return value.toLocaleLowerCase("tr").trim();
}

function getInitialTypeFilter(value: string | null): TypeFilter {
  return TYPE_FILTERS.some((option) => option.value === value) ? (value as TypeFilter) : "all";
}

function getInitialSortMode(value: string | null): SortMode {
  return SORT_OPTIONS.some((option) => option.value === value) ? (value as SortMode) : "relevance";
}

function getMatchScore(title: Title, query: string) {
  const q = normalize(query);
  if (!q) return 0;

  const itemTitle = normalize(title.title);
  const description = normalize(title.description);
  const genres = title.genres.map(normalize);

  let score = 0;
  if (itemTitle === q) score += 120;
  if (itemTitle.startsWith(q)) score += 80;
  if (itemTitle.includes(q)) score += 50;
  if (genres.some((genre) => genre === q)) score += 45;
  if (genres.some((genre) => genre.includes(q))) score += 30;
  if (description.includes(q)) score += 15;
  return score;
}

function TypeIcon({ value }: { value: TypeFilter }) {
  if (value === "film") return <Film className="h-4 w-4" />;
  if (value === "dizi") return <Tv className="h-4 w-4" />;
  return <Flame className="h-4 w-4" />;
}

function SearchResultCard({ item }: { item: Title }) {
  const { likedTitles } = useApp();
  const [previewing, setPreviewing] = useState(false);
  const [artworkFailed, setArtworkFailed] = useState(false);
  const image = item.backdrop || item.poster || "/placeholder.svg";
  const hasImage = Boolean(image && image !== "/placeholder.svg" && !artworkFailed);
  const liked = likedTitles.includes(item.id);
  const watchPath = `/izle/${item.id}`;

  return (
    <article
      className="group min-w-0"
      onMouseEnter={() => setPreviewing(true)}
      onMouseLeave={() => setPreviewing(false)}
      onFocus={() => setPreviewing(true)}
      onBlur={() => setPreviewing(false)}
    >
      <Link to={watchPath} className="block">
        <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-secondary shadow-[0_16px_34px_rgba(0,0,0,0.2)]">
          {hasImage ? (
            <img
              src={image}
              alt={item.title}
              loading="lazy"
              onError={() => setArtworkFailed(true)}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,rgba(244,63,94,0.20),rgba(24,24,29,0.96)_48%,rgba(9,9,13,1))]">
              <div className="grid place-items-center gap-2 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white text-zinc-950 shadow-[0_16px_36px_rgba(0,0,0,0.28)]">
                  <Play className="h-5 w-5 fill-current" />
                </div>
                <span className="rounded-md border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-normal text-white/80 backdrop-blur">
                  Embed
                </span>
              </div>
            </div>
          )}
          <VideoHoverPreview item={item} active={previewing} />
          <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black/58 via-black/0 to-black/0 opacity-80" />
          <div className="pointer-events-none absolute bottom-2 right-2 z-30 rounded-md bg-black/70 px-2 py-1 text-xs font-bold text-white/90 backdrop-blur">
            {item.duration || "12:00"}
          </div>
          <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center opacity-0 transition group-hover:opacity-100">
            <div className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white text-zinc-950 shadow-[0_16px_36px_rgba(0,0,0,0.28)]">
              <Play className="h-5 w-5 fill-current" />
            </div>
          </div>
        </div>
      </Link>

      <div className="min-w-0 pt-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span className="truncate">{item.genres[0] || item.rating}</span>
          <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/45" />
          <span className="flex shrink-0 items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {formatCompactCount(getViewCount(item))}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <ThumbsUp className={`h-3.5 w-3.5 ${liked ? "fill-primary text-primary" : ""}`} />
            {formatCompactCount(getLikeCount(item, liked))}
          </span>
        </div>
        <Link to={watchPath} className="mt-1 line-clamp-2 text-sm font-bold leading-5 text-foreground/95 transition hover:text-primary">
          {item.title}
        </Link>
      </div>
    </article>
  );
}

export default function Search() {
  const { data: titles = [] } = useAllTitles();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(getInitialTypeFilter(searchParams.get("type")));
  const [selectedGenre, setSelectedGenre] = useState(searchParams.get("genre") || ALL_GENRES);
  const [sortMode, setSortMode] = useState<SortMode>(getInitialSortMode(searchParams.get("sort")));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (q.trim()) params.q = q.trim();
    if (typeFilter !== "all") params.type = typeFilter;
    if (selectedGenre !== ALL_GENRES) params.genre = selectedGenre;
    if (sortMode !== "relevance") params.sort = sortMode;
    setSearchParams(params, { replace: true });
  }, [q, selectedGenre, setSearchParams, sortMode, typeFilter]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [q, selectedGenre, sortMode, typeFilter]);

  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    titles.flatMap((title) => title.genres).filter(Boolean).forEach((genre) => {
      counts.set(genre, (counts.get(genre) || 0) + 1);
    });

    return [
      ALL_GENRES,
      ...[...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"))
        .slice(0, 12)
        .map(([genre]) => genre),
    ];
  }, [titles]);

  const query = normalize(q);
  const isSearching = Boolean(query);

  const list = useMemo(() => {
    const filtered = titles.filter((title) => {
      const matchesType = typeFilter === "all" || title.type === typeFilter;
      const matchesGenre = selectedGenre === ALL_GENRES || title.genres.includes(selectedGenre);
      const score = getMatchScore(title, query);
      const matchesQuery = !query || score > 0;
      return matchesType && matchesGenre && matchesQuery;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "views") return getViewCount(b) - getViewCount(a);
      if (sortMode === "newest") return b.year - a.year;
      if (sortMode === "popular") return getLikeCount(b) - getLikeCount(a);
      return isSearching
        ? getMatchScore(b, query) - getMatchScore(a, query) || getViewCount(b) - getViewCount(a)
        : getViewCount(b) - getViewCount(a);
    });
  }, [isSearching, query, selectedGenre, sortMode, titles, typeFilter]);

  const visibleItems = list.slice(0, visibleCount);
  const hasFilters = Boolean(q.trim()) || typeFilter !== "all" || selectedGenre !== ALL_GENRES || sortMode !== "relevance";
  const heading = isSearching
    ? `"${q.trim()}" araması`
    : selectedGenre !== ALL_GENRES
      ? selectedGenre
      : "En Çok İzlenenler";
  const resultLabel = isSearching ? `${list.length} eşleşme` : `${list.length} video`;

  const clearFilters = () => {
    setQ("");
    setTypeFilter("all");
    setSelectedGenre(ALL_GENRES);
    setSortMode("relevance");
    inputRef.current?.focus();
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#080808_0%,#050505_42%,#020202_100%)] pb-20 pt-20">
      <Seo
        title="Türkçe Reels Porno Arama - ReelsPorn"
        description="ReelsPorn arama sayfasında Türkçe reels porno, amatör video ve trend 18+ içerikleri keşfet."
        path="/ara"
        robots="noindex,follow"
      />
      <section className="border-b border-primary/20 bg-[linear-gradient(180deg,rgba(255,23,77,0.12),rgba(8,8,8,0.98)_58%,hsl(var(--background)))] px-4 py-5 md:px-8">
        <div className="mx-auto max-w-[1480px]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              id="searchbox"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Türkçe reels, amatör veya kategori ara"
              className="h-16 w-full rounded-md border border-primary/20 bg-black/50 pl-12 pr-14 text-lg font-bold text-foreground shadow-[0_16px_44px_rgba(0,0,0,0.34)] outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:bg-black/60 focus:ring-4 focus:ring-primary/10 md:text-2xl"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Aramayı temizle"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {genres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  className={`h-9 shrink-0 rounded-md border px-3 text-xs font-bold transition ${
                    selectedGenre === genre
                      ? "border-primary/50 bg-primary/90 text-primary-foreground"
                      : "border-white/10 bg-white/[0.045] text-zinc-300 hover:border-primary/30 hover:bg-white/[0.075] hover:text-white"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid grid-cols-3 rounded-lg border border-white/10 bg-white/[0.045] p-1">
                {TYPE_FILTERS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTypeFilter(value)}
                    className={`flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold transition ${
                      typeFilter === value
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <TypeIcon value={value} />
                    {label}
                  </button>
                ))}
              </div>

              <label className="relative flex h-12 min-w-[13rem] items-center rounded-lg border border-white/10 bg-white/[0.045] px-3">
                <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="h-full flex-1 appearance-none bg-transparent text-sm font-bold outline-none"
                  aria-label="Sıralama"
                >
                  {SORT_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 pt-6 md:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-tight md:text-2xl">{heading}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted-foreground">
              <span>{resultLabel}</span>
              {!isSearching && <span className="flex items-center gap-1 text-primary"><Flame className="h-3.5 w-3.5" /> izlenmeye göre</span>}
            </div>
          </div>
          {hasFilters && (
            <Button variant="secondary" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />
              Temizle
            </Button>
          )}
        </div>

        {visibleItems.length ? (
          <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleItems.map((title) => (
              <SearchResultCard key={title.id} item={title} />
            ))}
          </div>
        ) : (
          <div className="grid min-h-[22rem] place-items-center rounded-lg border border-dashed border-white/12 bg-white/[0.025] px-6 text-center">
            <div>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-md border border-white/10 bg-card text-muted-foreground">
                <SearchIcon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-extrabold">Sonuç yok</h2>
              <p className="mt-2 text-sm text-muted-foreground">Filtreleri daraltan bir eşleşme bulunamadı.</p>
              {hasFilters && (
                <Button variant="secondary" className="mt-5" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Temizle
                </Button>
              )}
            </div>
          </div>
        )}

        {visibleCount < list.length && (
          <div className="mt-10 flex justify-center">
            <Button variant="secondary" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
              Daha fazla göster
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
