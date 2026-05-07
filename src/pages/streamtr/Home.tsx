import { Link } from "react-router-dom";
import { CheckCircle2, Eye, MoreVertical, Play, Plus } from "lucide-react";
import { useAllTitles } from "@/hooks/useContent";
import type { Title } from "@/data/content";

const categoryChips = ["Yeni", "Popüler", "HD", "Amatör", "Trend", "Türkçe", "Model", "Koleksiyon", "Öne Çıkan"];

const placeholderSlots = [
  { title: "Yeni video alanı", image: "/content/poster-1.jpg", tag: "Trend" },
  { title: "Model seçkisi alanı", image: "/content/poster-4.jpg", tag: "Yeni" },
  { title: "Öne çıkan video alanı", image: "/content/poster-7.jpg", tag: "Popüler" },
  { title: "Gece vitrini alanı", image: "/content/hero-1.jpg", tag: "HD" },
  { title: "Stüdyo video alanı", image: "/content/hero-3.jpg", tag: "Premium" },
  { title: "Koleksiyon alanı", image: "/content/poster-8.jpg", tag: "Seçki" },
  { title: "Yeni embed alanı", image: "/content/poster-2.jpg", tag: "Embed" },
  { title: "Vitrin video alanı", image: "/content/poster-5.jpg", tag: "Özel" },
];

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

function PlaceholderTile({ slot }: { slot: (typeof placeholderSlots)[number] }) {
  return (
    <article className="group min-w-0 overflow-hidden">
      <Link to="/admin" className="block">
        <div className="relative aspect-video overflow-hidden border border-dashed border-primary/35 bg-secondary">
          <img
            src={slot.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-55 grayscale-[0.25] transition duration-300 group-hover:scale-[1.03] group-hover:opacity-75"
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute left-2 top-2 rounded bg-background/80 px-2 py-0.5 text-[11px] font-bold text-foreground backdrop-blur">
            {slot.tag}
          </div>
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition group-hover:scale-110">
              <Plus className="h-5 w-5" />
            </div>
          </div>
        </div>
      </Link>
      <div className="pt-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">{slot.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">Admin panelden embed ekle</p>
      </div>
    </article>
  );
}

export default function Home() {
  const { data: titles = [] } = useAllTitles();
  const slotsToShow = Math.max(0, 24 - titles.length);

  return (
    <main className="min-h-screen bg-background pb-20">
      <section className="border-b border-primary/20 bg-[linear-gradient(135deg,rgba(239,68,68,0.16),rgba(24,24,27,0.96)_42%,rgba(9,9,11,1))] px-4 pb-6 pt-24 shadow-[0_18px_60px_rgba(0,0,0,0.22)] md:px-8">
        <div className="mx-auto max-w-[1480px]">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary/90">Keşfet</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground md:text-3xl">Kategori vitrini</h1>
            </div>
            <Link
              to="/admin"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Video Ekle
            </Link>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categoryChips.map((chip, index) => (
              <button
                key={chip}
                className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${
                  index === 0
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-white/10 bg-white/[0.08] text-foreground hover:border-primary/60 hover:bg-primary hover:text-primary-foreground"
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
          {titles.map((item) => (
            <VideoTile key={item.id} item={item} />
          ))}
          {placeholderSlots.slice(0, slotsToShow).map((slot) => (
            <PlaceholderTile key={slot.title} slot={slot} />
          ))}
        </section>
      </div>
    </main>
  );
}
