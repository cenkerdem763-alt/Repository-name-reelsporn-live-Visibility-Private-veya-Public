import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { ContentCard } from "@/components/streamtr/ContentCard";
import { useAllTitles } from "@/hooks/useContent";

export default function Search() {
  const { data: titles = [] } = useAllTitles();
  const [q, setQ] = useState("");
  useEffect(() => { document.getElementById("searchbox")?.focus(); }, []);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return titles.filter((t) =>
      t.title.toLowerCase().includes(s) ||
      t.genres.some((g) => g.toLowerCase().includes(s)) ||
      t.description.toLowerCase().includes(s)
    );
  }, [q, titles]);

  return (
    <div className="pt-24 px-4 md:px-10 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <SearchIcon className="h-6 w-6 text-muted-foreground" />
          <input
            id="searchbox"
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Dizi, film veya tür ara..."
            className="flex-1 bg-transparent outline-none text-xl placeholder:text-muted-foreground"
          />
        </div>
        <div className="mt-3 text-sm text-muted-foreground">
          {q ? `${results.length} sonuç` : "Aramaya başla — örn. 'aksiyon', 'İstanbul'"}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {(q ? results : titles).map((t) => <ContentCard key={t.id} item={t} />)}
      </div>
    </div>
  );
}
