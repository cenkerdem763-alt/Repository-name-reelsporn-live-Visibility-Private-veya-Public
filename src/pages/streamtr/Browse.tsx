import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { ContentCard } from "@/components/streamtr/ContentCard";
import { useAllTitles } from "@/hooks/useContent";

const labels: Record<string, string> = {
  diziler: "Kobra", filmler: "Filmler", yeni: "Yeni & Popüler",
};

export default function Browse() {
  const kind = useLocation().pathname.replace("/", "") || "filmler";
  const label = labels[kind] ?? "Keşfet";
  const { data: titles = [] } = useAllTitles();
  const list = useMemo(() => {
    if (kind === "diziler") return titles.filter((t) => t.type === "dizi");
    if (kind === "filmler") return titles.filter((t) => t.type === "film");
    return [...titles].sort((a, b) => b.year - a.year);
  }, [kind, titles]);

  return (
    <div className="pt-24 px-4 md:px-10 pb-20">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">{label}</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {list.map((t) => <ContentCard key={t.id} item={t} />)}
      </div>
    </div>
  );
}
