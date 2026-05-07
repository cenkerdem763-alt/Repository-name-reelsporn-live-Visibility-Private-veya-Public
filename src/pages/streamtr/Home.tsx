import { Link } from "react-router-dom";
import { Play, Plus, Sparkles } from "lucide-react";
import { useAllTitles } from "@/hooks/useContent";
import type { Title } from "@/data/content";

const placeholderSlots = [
  { title: "Yeni video alanı", image: "/content/poster-1.jpg", tag: "Trend" },
  { title: "Model seçkisi", image: "/content/poster-4.jpg", tag: "Yeni" },
  { title: "Öne çıkan sahne", image: "/content/poster-7.jpg", tag: "Popüler" },
  { title: "Gece vitrini", image: "/content/hero-1.jpg", tag: "HD" },
  { title: "Stüdyo alanı", image: "/content/hero-3.jpg", tag: "Premium" },
  { title: "Koleksiyon alanı", image: "/content/poster-8.jpg", tag: "Seçki" },
  { title: "Yeni embed alanı", image: "/content/poster-2.jpg", tag: "Embed" },
  { title: "Vitrin alanı", image: "/content/poster-5.jpg", tag: "Özel" },
];

function VideoTile({ item }: { item: Title }) {
  const image = item.backdrop || item.poster || "/placeholder.svg";

  return (
    <article className="group min-w-0">
      <Link to={`/icerik/${item.id}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-md bg-secondary shadow-card">
          <img
            src={image}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-90" />
          <div className="absolute left-3 top-3 rounded bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
            {item.rating || "18+"}
          </div>
          <div className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Play className="h-6 w-6 fill-current" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-3">
            <h3 className="truncate text-sm font-bold text-white">{item.title}</h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-white/75">
              <span>{item.duration || "Video"}</span>
              {item.genres[0] && <span className="truncate">{item.genres[0]}</span>}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

function PlaceholderTile({ slot }: { slot: (typeof placeholderSlots)[number] }) {
  return (
    <article className="group min-w-0">
      <Link to="/admin" className="block">
        <div className="relative aspect-square overflow-hidden rounded-md border border-dashed border-primary/35 bg-secondary shadow-card">
          <img
            src={slot.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-55 grayscale-[0.25] transition duration-300 group-hover:scale-105 group-hover:opacity-75"
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute left-3 top-3 rounded bg-background/80 px-2 py-0.5 text-[11px] font-bold text-foreground backdrop-blur">
            {slot.tag}
          </div>
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition group-hover:scale-110">
              <Plus className="h-6 w-6" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-3">
            <h3 className="truncate text-sm font-bold text-white">{slot.title}</h3>
            <p className="mt-1 truncate text-xs text-white/70">Admin panelden embed ekle</p>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default function Home() {
  const { data: titles = [] } = useAllTitles();
  const slotsToShow = Math.max(0, 24 - titles.length);

  return (
    <main className="min-h-screen px-4 pb-20 pt-24 md:px-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
            <Sparkles className="h-4 w-4" />
            Güncel vitrin
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">Videolar</h1>
        </div>
        <Link
          to="/admin"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Video Ekle
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {titles.map((item) => (
          <VideoTile key={item.id} item={item} />
        ))}
        {placeholderSlots.slice(0, slotsToShow).map((slot) => (
          <PlaceholderTile key={slot.title} slot={slot} />
        ))}
      </section>
    </main>
  );
}
