import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Eye, Heart, Play, Share2, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { useTitle, useAllTitles } from "@/hooks/useContent";
import { sampleVideoUrl, type Title } from "@/data/content";

const relatedTestItems: Title[] = [
  {
    id: "test-related-1",
    title: "TEST video alanı 1",
    poster: "/content/poster-1.jpg",
    backdrop: "/content/hero-1.jpg",
    year: 2026,
    duration: "12:00",
    rating: "18+",
    genres: ["TEST"],
    description: "Embed eklenecek test alanı.",
    match: 90,
    type: "film",
  },
  {
    id: "test-related-2",
    title: "TEST video alanı 2",
    poster: "/content/poster-2.jpg",
    backdrop: "/content/hero-2.jpg",
    year: 2026,
    duration: "15:30",
    rating: "18+",
    genres: ["TEST"],
    description: "Embed eklenecek test alanı.",
    match: 90,
    type: "film",
  },
  {
    id: "test-related-3",
    title: "TEST video alanı 3",
    poster: "/content/poster-3.jpg",
    backdrop: "/content/hero-3.jpg",
    year: 2026,
    duration: "09:45",
    rating: "18+",
    genres: ["TEST"],
    description: "Embed eklenecek test alanı.",
    match: 90,
    type: "film",
  },
];

function getEmbedSrc(value: string) {
  return value.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1] || value;
}

function isEmbedSource(value: string) {
  const source = value.trim();
  if (source.startsWith("<iframe")) return true;
  if (source.includes("/embed/")) return true;
  return !/\.(mp4|webm|ogg|m3u8)(\?|#|$)/i.test(source);
}

function metricFromId(id: string) {
  const total = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `${Math.max(18, total % 980)}K`;
}

function RelatedCard({ item, test }: { item: Title; test?: boolean }) {
  const image = item.backdrop || item.poster || "/placeholder.svg";
  const to = test ? "/admin" : `/icerik/${item.id}`;

  return (
    <Link to={to} className="group grid grid-cols-[9rem_1fr] gap-3">
      <div className="relative aspect-video overflow-hidden rounded bg-secondary">
        <img src={image} alt={item.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
        {test && <div className="absolute inset-0 bg-black/45" />}
        <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          {item.duration || "12:00"}
        </div>
        {test && (
          <div className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-[10px] font-black text-primary-foreground">
            TEST
          </div>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-semibold leading-5 group-hover:text-primary">{item.title}</h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <span>{item.genres[0] || "ReelsPorn"}</span>
          <CheckCircle2 className="h-3 w-3 text-primary" />
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          {test ? "embed bekliyor" : metricFromId(item.id)}
        </div>
      </div>
    </Link>
  );
}

export default function Detail() {
  const { id = "" } = useParams();
  const { data: item, isLoading } = useTitle(id);
  const { data: titles = [] } = useAllTitles();
  const { favorites, toggleFavorite } = useApp();

  if (isLoading) return <div className="pt-32 px-10 text-muted-foreground">Yükleniyor...</div>;
  if (!item) return <div className="pt-32 px-10">İçerik bulunamadı.</div>;

  const fav = favorites.includes(item.id);
  const videoSrc = item.videoUrl || item.trailerUrl || sampleVideoUrl;
  const embed = isEmbedSource(videoSrc);
  const related = titles.filter((title) => title.id !== item.id).slice(0, 10);
  const relatedItems = related.length ? related : relatedTestItems;

  return (
    <main className="min-h-screen bg-background px-4 pb-16 pt-20 md:px-8">
      <div className="mx-auto grid max-w-[1480px] gap-8 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <section className="min-w-0">
          <div className="overflow-hidden rounded bg-black shadow-[0_18px_70px_rgba(0,0,0,0.35)]">
            <div className="relative aspect-video bg-black">
              {embed ? (
                <iframe
                  src={getEmbedSrc(videoSrc)}
                  title={item.title}
                  className="h-full w-full border-0"
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <video
                  src={videoSrc}
                  poster={item.backdrop || item.poster}
                  controls
                  playsInline
                  className="h-full w-full bg-black"
                />
              )}
            </div>
          </div>

          <div className="mt-5 border-b border-border pb-5">
            <h1 className="text-xl font-black leading-tight md:text-2xl">{item.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {metricFromId(item.id)} görüntülenme
              </span>
              <span>{item.year}</span>
              <span>{item.duration || "Video"}</span>
              <span className="rounded border border-border px-1.5 py-0.5 text-xs">{item.rating || "18+"}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold">
                <span>{item.genres[0] || "ReelsPorn"}</span>
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-1 line-clamp-2 max-w-3xl text-sm text-muted-foreground">
                {item.description || item.genres.join(", ")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" className="gap-2">
                <ThumbsUp className="h-4 w-4" />
                Beğen
              </Button>
              <Button variant="secondary" size="sm" onClick={() => toggleFavorite(item.id)} className="gap-2">
                <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} />
                Favori
              </Button>
              <Button variant="secondary" size="sm" className="gap-2">
                <Share2 className="h-4 w-4" />
                Paylaş
              </Button>
              <Button asChild size="sm" className="gap-2">
                <Link to={`/izle/${item.id}`}>
                  <Play className="h-4 w-4 fill-current" />
                  Tam ekran
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <aside className="min-w-0">
          <h2 className="mb-4 text-lg font-black">Benzer videolar</h2>
          <div className="space-y-4">
            {relatedItems.map((title) => (
              <RelatedCard key={title.id} item={title} test={title.id.startsWith("test-related-")} />
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
