import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Eye, Heart, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareMenu } from "@/components/streamtr/ShareMenu";
import { Seo } from "@/components/streamtr/Seo";
import { VideoHoverPreview } from "@/components/streamtr/VideoHoverPreview";
import { ProviderEmbedFrame } from "@/components/streamtr/ProviderEmbedFrame";
import { useApp } from "@/contexts/AppContext";
import { useTitle, useAllTitles } from "@/hooks/useContent";
import { normalizePlayableSource, sampleVideoUrl, type Title } from "@/data/content";
import { formatCompactCount, getLikeCount, getLikeRate, getViewCount } from "@/lib/engagement";
import { getProviderEmbedMeta } from "@/lib/providerEmbed";
import { getDirectPlaybackSource, getEmbedPlaybackSource } from "@/lib/playbackSource";

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

const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://www.reelsporn.live").replace(/\/$/, "");

function absoluteUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function RelatedCard({ item, test }: { item: Title; test?: boolean }) {
  const image = item.backdrop || item.poster || "/placeholder.svg";
  const to = test ? "/admin" : `/icerik/${item.id}`;
  const [previewing, setPreviewing] = useState(false);

  return (
    <Link
      to={to}
      className="group grid grid-cols-[9rem_1fr] gap-3"
      onMouseEnter={() => setPreviewing(true)}
      onMouseLeave={() => setPreviewing(false)}
      onFocus={() => setPreviewing(true)}
      onBlur={() => setPreviewing(false)}
    >
      <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-secondary">
        <img src={image} alt={item.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
        {!test && <VideoHoverPreview item={item} active={previewing} />}
        {test && <div className="absolute inset-0 bg-black/40" />}
        <div className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
          {item.duration || "12:00"}
        </div>
        {test && (
          <div className="absolute left-2 top-2 rounded-md bg-primary/90 px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            TEST
          </div>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground/95 group-hover:text-primary">{item.title}</h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <span>{item.genres[0] || "ReelsPorn"}</span>
          <CheckCircle2 className="h-3 w-3 text-primary" />
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          {test ? "embed bekliyor" : formatCompactCount(getViewCount(item))}
        </div>
      </div>
    </Link>
  );
}

export default function Detail() {
  const { id = "" } = useParams();
  const { data: item, isLoading } = useTitle(id);
  const { data: titles = [] } = useAllTitles();
  const { favorites, likedTitles, toggleFavorite, toggleLike } = useApp();

  if (isLoading) return <div className="pt-32 px-10 text-muted-foreground">Yükleniyor...</div>;
  if (!item) return <div className="pt-32 px-10">İçerik bulunamadı.</div>;

  const fav = favorites.includes(item.id);
  const embedSource = getEmbedPlaybackSource(item);
  const rawVideoSrc = embedSource || getDirectPlaybackSource(item) || sampleVideoUrl;
  const videoSrc = normalizePlayableSource(rawVideoSrc) || sampleVideoUrl;
  const embed = Boolean(embedSource);
  const embedMeta = embed ? getProviderEmbedMeta(embedSource) : null;
  const cover = item.backdrop || item.poster || "/placeholder.svg";
  const related = titles.filter((title) => title.id !== item.id).slice(0, 10);
  const relatedItems = related.length ? related : relatedTestItems;
  const liked = likedTitles.includes(item.id);
  const viewCount = getViewCount(item);
  const likeCount = getLikeCount(item, liked);
  const likeRate = getLikeRate(item, liked);
  const shareUrl = typeof window === "undefined" ? `/icerik/${item.id}` : `${window.location.origin}/icerik/${item.id}`;
  const seoDescription = item.description || `${item.title} videosunu ReelsPorn'da hızlı ve kesintisiz izle.`;
  const seoPath = `/icerik/${item.id}`;
  const videoSchema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: item.title,
    description: seoDescription,
    thumbnailUrl: [absoluteUrl(cover)],
    uploadDate: `${Number.isFinite(item.year) ? item.year : new Date().getFullYear()}-01-01T00:00:00+03:00`,
    embedUrl: embed ? absoluteUrl(embedSource) : undefined,
    contentUrl: !embed ? absoluteUrl(videoSrc) : undefined,
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background)),hsl(240_9%_8%))] px-4 pb-16 pt-20 md:px-8">
      <Seo
        title={`${item.title} izle - ReelsPorn`}
        description={seoDescription}
        path={seoPath}
        image={cover}
        type="video.other"
        jsonLd={videoSchema}
      />
      <div className="mx-auto grid max-w-[1480px] gap-8 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <section className="min-w-0">
          <div className="overflow-hidden rounded-lg border border-white/10 bg-black shadow-[0_18px_48px_rgba(0,0,0,0.26)]">
            <div className="relative bg-black" style={{ aspectRatio: embedMeta?.aspectRatio || "16 / 9" }}>
              {embed ? (
                <ProviderEmbedFrame src={embedSource} title={item.title} />
              ) : (
                <video
                  src={videoSrc}
                  poster={cover}
                  controls
                  playsInline
                  className="h-full w-full bg-black"
                />
              )}
            </div>
          </div>

          <div className="mt-5 border-b border-white/10 pb-5">
            <h1 className="text-xl font-extrabold leading-tight md:text-2xl">{item.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {formatCompactCount(viewCount)} görüntülenme
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-4 w-4" />
                {formatCompactCount(likeCount)} beğeni
              </span>
              <span>{item.year}</span>
              <span>{item.duration || "Video"}</span>
              <span className="rounded border border-border px-1.5 py-0.5 text-xs">{item.rating || "18+"}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-stretch gap-4 border-b border-white/10 pb-5">
            <a
              href="https://www.sosyalbetturkey.com/"
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="relative flex min-h-16 basis-full items-center justify-center overflow-hidden rounded-md border border-dashed border-white/10 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.14),rgba(255,255,255,0.024)_42%,rgba(255,255,255,0.012))] px-4 shadow-[inset_0_0_28px_rgba(244,63,94,0.06)] transition hover:border-primary/30 hover:bg-white/[0.035] md:min-w-[18rem] md:flex-1 md:basis-0"
              aria-label="Reklam alanını aç"
            >
              <div className="absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-primary/30 blur-sm" />
              <div className="relative flex flex-col items-center">
                <span className="text-3xl font-black uppercase tracking-[0.34em] text-white drop-shadow-[0_0_10px_rgba(244,63,94,0.95)] md:text-4xl">
                  C.E
                </span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/42">
                  Reklam Alanı
                </span>
              </div>
            </a>

            <div className="grid w-full grid-cols-3 gap-2 md:flex md:w-auto md:items-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toggleLike(item.id)}
                className={`gap-2 px-2 md:px-3 ${liked ? "bg-primary/18 text-primary hover:bg-primary/24" : ""}`}
              >
                <ThumbsUp className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                <span className="hidden sm:inline">{liked ? "Beğenildi" : "Beğen"}</span>
                <span className="sm:hidden">{formatCompactCount(likeCount)}</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={() => toggleFavorite(item.id)} className="gap-2 px-2 md:px-3">
                <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} />
                {fav ? "Favoride" : "Favori"}
              </Button>
              <ShareMenu title={item.title} url={shareUrl} className="w-full px-2 md:w-auto md:px-3" />
            </div>

            <div className="basis-full rounded-md border border-white/10 bg-white/[0.025] px-3 py-3 md:flex md:items-center md:gap-4">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground md:w-40">
                <span>Beğeni oranı</span>
                <span className="text-primary">%{likeRate}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10 md:mt-0 md:flex-1">
                <div className="h-full rounded-full bg-primary" style={{ width: `${likeRate}%` }} />
              </div>
              <div className="mt-2 text-xs font-semibold text-muted-foreground md:mt-0">
                {formatCompactCount(likeCount)} kişi beğendi
              </div>
            </div>
          </div>
        </section>

        <aside className="min-w-0">
          <h2 className="mb-4 text-lg font-extrabold">Benzer videolar</h2>
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
