import { useMemo } from "react";
import { HeroSlider } from "@/components/streamtr/HeroSlider";
import { ContentRow } from "@/components/streamtr/ContentRow";
import { ReelsFeed } from "@/components/streamtr/ReelsFeed";
import { useApp } from "@/contexts/AppContext";
import { useAllTitles, useContentRows } from "@/hooks/useContent";

export default function Home() {
  const { continueWatching } = useApp();
  const { data: titles = [] } = useAllTitles();
  const { data: rows = [] } = useContentRows();

  const cwItems = useMemo(
    () => continueWatching.map((p) => titles.find((t) => t.id === p.id)).filter(Boolean) as typeof titles,
    [continueWatching, titles]
  );
  const progressMap = useMemo(
    () => Object.fromEntries(continueWatching.map((p) => [p.id, p.progress])),
    [continueWatching]
  );

  return (
    <>
      <ReelsFeed items={titles} />
      <div className="hidden md:block">
        <HeroSlider />
        <div className="relative -mt-32 z-10 space-y-2">
          {cwItems.length > 0 && (
            <ContentRow title="İzlemeye Devam Et" items={cwItems} progressMap={progressMap} />
          )}
          {rows.map((r) => (
            <ContentRow key={r.title} title={r.title} items={r.items} />
          ))}
        </div>
      </div>
    </>
  );
}
