import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Check, Play, ThumbsUp } from "lucide-react";
import type { Title } from "@/data/content";
import { useApp } from "@/contexts/AppContext";
import { formatCompactCount, getLikeCount } from "@/lib/engagement";
import { VideoHoverPreview } from "./VideoHoverPreview";

export function ContentCard({ item, progress }: { item: Title; progress?: number }) {
  const { likedTitles, toggleLike, watchlist, toggleWatchlist } = useApp();
  const inList = watchlist.includes(item.id);
  const liked = likedTitles.includes(item.id);
  const likeCount = getLikeCount(item, liked);
  const [previewing, setPreviewing] = useState(false);
  const [artworkFailed, setArtworkFailed] = useState(false);
  const hasArtwork = item.poster && item.poster !== "/placeholder.svg";

  if (!hasArtwork || artworkFailed) return null;

  return (
    <div
      className="group relative flex-shrink-0 w-[160px] sm:w-[200px] md:w-[230px] transition-transform duration-300 hover:scale-110 hover:z-20"
      onMouseEnter={() => setPreviewing(true)}
      onMouseLeave={() => setPreviewing(false)}
      onFocus={() => setPreviewing(true)}
      onBlur={() => setPreviewing(false)}
    >
      <Link to={`/icerik/${item.id}`} className="block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-muted shadow-card">
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            width={460}
            height={690}
            onError={() => setArtworkFailed(true)}
            className="h-full w-full object-cover"
          />
          <VideoHoverPreview item={item} active={previewing} />
          {progress !== undefined && (
            <div className="absolute inset-x-0 bottom-0 z-20 h-1 bg-foreground/20">
              <div className="h-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
        </div>
      </Link>

      <div className="absolute inset-x-0 top-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-30">
        <div className="mt-2 rounded-md bg-card p-3 shadow-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Link to={`/izle/${item.id}`} className="h-8 w-8 grid place-items-center rounded-full bg-foreground text-background hover:bg-foreground/80">
              <Play className="h-4 w-4 fill-current" />
            </Link>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); toggleWatchlist(item.id); }}
              className="h-8 w-8 grid place-items-center rounded-full border border-foreground/40 hover:border-foreground transition"
              aria-label={inList ? "Listeden çıkar" : "Listeme ekle"}
            >
              {inList ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); toggleLike(item.id); }}
              className={`h-8 w-8 grid place-items-center rounded-full border transition ${
                liked ? "border-primary text-primary" : "border-foreground/40 hover:border-foreground"
              }`}
              aria-label={liked ? "Beğeniyi kaldır" : "Beğen"}
            >
              <ThumbsUp className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            </button>
          </div>
          <div className="text-xs text-foreground font-semibold truncate">{item.title}</div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
            <span className="text-emerald-400 font-semibold">%{item.match}</span>
            <span className="border border-muted-foreground/40 px-1">{item.rating}</span>
            <span>{item.duration}</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <ThumbsUp className={`h-3 w-3 ${liked ? "fill-primary text-primary" : ""}`} />
            {formatCompactCount(likeCount)} beğeni
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground truncate">
            {item.genres.slice(0, 3).join(" • ")}
          </div>
        </div>
      </div>
    </div>
  );
}
