import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Title } from "@/data/content";
import { ContentCard } from "./ContentCard";

export function ContentRow({ title, items, progressMap }: { title: string; items: Title[]; progressMap?: Record<string, number> }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <section className="relative px-4 md:px-10 py-4 group/row">
      <h2 className="text-lg md:text-xl font-bold mb-3 tracking-tight">{title}</h2>
      <div className="relative">
        <button
          onClick={() => scroll(-1)}
          className="hidden md:grid place-items-center absolute left-0 top-0 z-20 h-full w-12 bg-background/60 opacity-0 group-hover/row:opacity-100 transition rounded-l-md"
          aria-label="Geri kaydır"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
        <div ref={ref} className="flex gap-3 overflow-x-auto scrollbar-hide pb-12 -mb-12">
          {items.map((it) => (
            <ContentCard key={it.id} item={it} progress={progressMap?.[it.id]} />
          ))}
        </div>
        <button
          onClick={() => scroll(1)}
          className="hidden md:grid place-items-center absolute right-0 top-0 z-20 h-full w-12 bg-background/60 opacity-0 group-hover/row:opacity-100 transition rounded-r-md"
          aria-label="İleri kaydır"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      </div>
    </section>
  );
}
