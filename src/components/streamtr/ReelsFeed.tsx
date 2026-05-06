import { Link } from "react-router-dom";
import { Play, Info } from "lucide-react";
import type { Title } from "@/data/content";

export function ReelsFeed({ items }: { items: Title[] }) {
  return (
    <section className="md:hidden h-screen overflow-y-auto snap-y snap-mandatory scroll-smooth">
      {items.map((item) => (
        <article key={item.id} className="relative h-screen snap-start w-full">
          <img
            src={item.backdrop || item.poster}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-x-0 bottom-0 p-5 pb-10 bg-gradient-to-t from-black/95 via-black/20 to-transparent">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400 font-semibold mb-2">
              %{item.match} eşleşme
            </p>
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">{item.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/80 uppercase tracking-[0.2em]">
              <span>{item.year}</span>
              <span className="rounded-full border border-white/20 px-2 py-1">{item.duration}</span>
              <span>{item.rating}</span>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-foreground/90 line-clamp-3">
              {item.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={`/izle/${item.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black shadow-lg shadow-black/30 transition hover:bg-white/90"
              >
                <Play className="h-4 w-4" />
                Oynat
              </Link>
              <Link
                to={`/icerik/${item.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <Info className="h-4 w-4" />
                Detay
              </Link>
            </div>
          </div>
          <div className="pointer-events-none absolute right-4 top-6 flex flex-col gap-3">
            <span className="rounded-full border border-white/20 bg-black/40 px-3 py-2 text-xs uppercase tracking-[0.15em] text-white/90">
              {item.type === "film" ? "Film" : "Dizi"}
            </span>
          </div>
        </article>
      ))}
    </section>
  );
}
