import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ContentCard } from "@/components/streamtr/ContentCard";
import { useAllTitles } from "@/hooks/useContent";
import { Button } from "@/components/ui/button";

const labels: Record<string, string> = {
  diziler: "Kobra", filmler: "Filmler", yeni: "Yeni & Popüler",
};
const PAGE_SIZE = 36;

export default function Browse() {
  const kind = useLocation().pathname.replace("/", "") || "filmler";
  const label = labels[kind] ?? "Keşfet";
  const { data: titles = [] } = useAllTitles();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const list = useMemo(() => {
    if (kind === "diziler") return titles.filter((t) => t.type === "dizi");
    if (kind === "filmler") return titles.filter((t) => t.type === "film");
    return [...titles].sort((a, b) => b.year - a.year);
  }, [kind, titles]);
  const visibleItems = list.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [kind]);

  return (
    <div className="pt-24 px-4 md:px-10 pb-20">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">{label}</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {visibleItems.map((t) => <ContentCard key={t.id} item={t} />)}
      </div>
      {visibleCount < list.length && (
        <div className="mt-10 flex justify-center">
          <Button variant="secondary" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
            Daha fazla göster
          </Button>
        </div>
      )}
    </div>
  );
}
