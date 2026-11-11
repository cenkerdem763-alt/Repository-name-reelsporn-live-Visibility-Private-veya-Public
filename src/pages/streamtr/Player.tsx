import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, BadgeCheck, Clock3, Eye, Heart, Maximize, Minimize, Pause, Play, Settings, SkipBack, SkipForward,
  Subtitles, ThumbsUp, Volume2, VolumeX,
} from "lucide-react";
import { ProviderEmbedFrame } from "@/components/streamtr/ProviderEmbedFrame";
import { ShareMenu } from "@/components/streamtr/ShareMenu";
import { useApp } from "@/contexts/AppContext";
import { useAllTitles, useTitle } from "@/hooks/useContent";
import { normalizePlayableSource, sampleVideoUrl, type Title } from "@/data/content";
import { formatCompactCount, getLikeCount, getViewCount } from "@/lib/engagement";
import { getProviderEmbedMeta } from "@/lib/providerEmbed";
import { getDirectPlaybackSource, getEmbedPlaybackSource } from "@/lib/playbackSource";

const subtitleTracks = [
  { lang: "off", label: "Kapalı" },
  { lang: "tr", label: "Türkçe" },
  { lang: "en", label: "İngilizce" },
];

const playbackRates = [0.75, 1, 1.25, 1.5, 2];

const trSample = [
  { from: 2, to: 6, text: "Hoş geldiniz, hikayemiz başlıyor..." },
  { from: 7, to: 12, text: "Bu, unutamayacağınız bir yolculuk olacak." },
  { from: 14, to: 20, text: "İstanbul'un sokakları sırlarla dolu." },
];

function fmt(s: number) {
  if (!isFinite(s)) return "0:00";
  const hour = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (hour > 0) return `${hour}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function getNormalizedSource(value: string | undefined | null) {
  return normalizePlayableSource(value) || value?.trim() || "";
}

function PlayerIconButton({
  children,
  label,
  onClick,
  active,
  className = "",
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.08] text-white/90 backdrop-blur-md transition hover:bg-white/[0.14] active:scale-95 ${
        active ? "border-primary/50 text-primary" : ""
      } ${className}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function GenrePills({ genres }: { genres: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {genres.slice(0, 4).map((genre) => (
        <span key={genre} className="rounded-md border border-white/10 bg-white/[0.08] px-2.5 py-1 text-xs font-semibold text-white/78 backdrop-blur">
          {genre}
        </span>
      ))}
    </div>
  );
}

function RelatedRail({ items }: { items: Title[] }) {
  if (!items.length) return null;

  return (
    <aside className="hidden min-w-0 xl:block">
      <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1">
        <h2 className="mb-4 text-base font-extrabold text-white">Sıradaki videolar</h2>
        <div className="space-y-3">
          {items.slice(0, 8).map((related) => {
            const image = related.backdrop || related.poster || "/placeholder.svg";

            return (
              <Link
                key={related.id}
                to={`/izle/${related.id}`}
                className="group grid grid-cols-[7.5rem_1fr] gap-3 rounded-md border border-white/10 bg-white/[0.045] p-2 transition hover:border-primary/35 hover:bg-white/[0.075]"
              >
                <div className="relative aspect-video overflow-hidden rounded-sm bg-secondary">
                  <img src={image} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                  <div className="absolute bottom-1 right-1 rounded-sm bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {related.duration || "Video"}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="line-clamp-2 text-sm font-semibold leading-5 text-white/92 group-hover:text-primary">{related.title}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-white/54">
                    <Eye className="h-3.5 w-3.5" />
                    {formatCompactCount(getViewCount(related))}
                  </div>
                  <div className="mt-1 truncate text-xs text-white/46">{related.genres.slice(0, 2).join(" / ") || "Video"}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export default function Player() {
  const { id = "" } = useParams();
  const { data: item, isLoading } = useTitle(id);
  const { data: titles = [] } = useAllTitles();
  const nav = useNavigate();
  const { favorites, likedTitles, toggleFavorite, toggleLike, updateProgress } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [fs, setFs] = useState(false);
  const [sub, setSub] = useState("tr");
  const [rate, setRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const fav = item ? favorites.includes(item.id) : false;
  const liked = item ? likedTitles.includes(item.id) : false;

  const related = useMemo(() => {
    if (!item) return [];
    const primaryGenre = item.genres[0];
    const byGenre = primaryGenre
      ? titles.filter((title) => title.id !== item.id && title.genres.includes(primaryGenre))
      : [];
    const fallback = titles.filter((title) => title.id !== item.id && !byGenre.some((relatedTitle) => relatedTitle.id === title.id));
    return [...byGenre, ...fallback].slice(0, 8);
  }, [item, titles]);

  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const onTime = () => {
      setTime(v.currentTime);
      if (v.duration) updateProgress(id, v.currentTime / v.duration);
    };
    const onLoaded = () => setDuration(v.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onVolume = () => {
      setMuted(v.muted || v.volume === 0);
      setVolume(v.volume);
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("volumechange", onVolume);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("volumechange", onVolume);
    };
  }, [id, updateProgress]);

  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const resetHide = () => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowControls(false), 3500);
  };

  useEffect(() => {
    resetHide();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.play().catch(() => undefined); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };
  const toggleMute = () => { const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); };
  const changeVolume = (nextVolume: number) => {
    const v = videoRef.current; if (!v) return;
    v.volume = Math.min(1, Math.max(0, nextVolume));
    v.muted = nextVolume === 0;
  };
  const seek = (s: number) => { const v = videoRef.current; if (!v) return; v.currentTime = Math.max(0, Math.min((v.duration||0), v.currentTime + s)); };
  const seekTo = (t: number) => { const v = videoRef.current; if (!v) return; v.currentTime = t; };
  const changeRate = (nextRate: number) => {
    const v = videoRef.current; if (!v) return;
    v.playbackRate = nextRate;
    setRate(nextRate);
  };
  const toggleFs = () => {
    if (!document.fullscreenElement) wrapRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };
  if (isLoading) return <div className="grid h-screen place-items-center bg-black p-10 text-foreground">Yükleniyor...</div>;
  if (!item) return <div className="grid min-h-screen place-items-center bg-background p-10">İçerik bulunamadı.</div>;
  const currentSub = sub !== "off" && sub === "tr" ? trSample.find((c) => time >= c.from && time <= c.to) : null;
  const embedSource = getEmbedPlaybackSource(item);
  const directVideoSrc = getDirectPlaybackSource(item);
  const rawVideoSrc = embedSource || directVideoSrc || sampleVideoUrl;
  const videoSrc = getNormalizedSource(rawVideoSrc) || sampleVideoUrl;
  const embed = Boolean(embedSource);
  const embedMeta = embed ? getProviderEmbedMeta(embedSource) : null;
  const cover = item.backdrop || item.poster || "/placeholder.svg";
  const viewCount = getViewCount(item);
  const likeCount = getLikeCount(item, liked);
  const shareUrl = typeof window === "undefined" ? `/icerik/${item.id}` : `${window.location.origin}/icerik/${item.id}`;
  const embedFrameStyle = embedMeta?.isPortrait
    ? {
        height: "min(76vh, calc(100svh - 9rem))",
        maxHeight: "calc(100svh - 8rem)",
      }
    : {
        aspectRatio: embedMeta?.aspectRatio || "16 / 9",
        maxHeight: "calc(100svh - 10rem)",
      };

  if (embed) {
    return (
      <main ref={wrapRef} className="min-h-screen bg-[linear-gradient(180deg,#030305,#111116_52%,#09090c)] text-white">
        <div className="sticky top-0 z-30 border-b border-white/10 bg-black/78 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:px-6">
          <div className="mx-auto flex min-h-16 max-w-[1560px] items-center justify-between gap-3">
            <button onClick={() => nav(-1)} className="flex min-w-0 items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-white/[0.06]">
              <ArrowLeft className="h-5 w-5 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold md:text-base">{item.title}</span>
                <span className="hidden text-xs text-white/54 sm:block">{item.duration || "Video"} / {item.rating || "18+"}</span>
              </span>
            </button>
            <div className="flex items-center gap-2">
              <PlayerIconButton label={liked ? "Beğeniyi kaldır" : "Beğen"} onClick={() => toggleLike(item.id)} active={liked}>
                <ThumbsUp className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
              </PlayerIconButton>
              <PlayerIconButton label={fav ? "Favoriden çıkar" : "Favori"} onClick={() => toggleFavorite(item.id)} active={fav}>
                <Heart className={`h-5 w-5 ${fav ? "fill-current" : ""}`} />
              </PlayerIconButton>
              <ShareMenu title={item.title} url={shareUrl} variant="icon" className="h-11 w-11" />
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-[1560px] gap-6 px-0 pb-10 md:px-6 md:pt-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
          <section className="min-w-0">
            <div className="flex w-full items-start justify-center bg-black md:rounded-md md:border md:border-white/10 md:bg-white/[0.035] md:p-3 md:shadow-[0_22px_70px_rgba(0,0,0,0.34)]">
              <div
                className={`w-full overflow-hidden bg-black md:rounded-md ${embedMeta?.isPortrait ? "max-w-[480px]" : "max-w-6xl"}`}
                style={embedFrameStyle}
              >
                <ProviderEmbedFrame src={embedSource} title={item.title} />
              </div>
            </div>

            <div className="px-4 pt-5 md:px-0">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/70">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-1">
                  <Eye className="h-3.5 w-3.5" />
                  {formatCompactCount(viewCount)} görüntülenme
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-1">
                  <ThumbsUp className={`h-3.5 w-3.5 ${liked ? "fill-primary text-primary" : ""}`} />
                  {formatCompactCount(likeCount)} beğeni
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {item.duration || "Video"}
                </span>
                <span className="rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-1">{item.rating || "18+"}</span>
              </div>
              <h1 className="max-w-4xl text-2xl font-extrabold leading-tight text-white md:text-3xl">{item.title}</h1>
              <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-white/78">
                <span>{item.genres[0] || "ReelsPorn"}</span>
                <BadgeCheck className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-white/64 md:text-base">
                {item.description || item.genres.join(", ")}
              </p>
              <div className="mt-4">
                <GenrePills genres={item.genres} />
              </div>
            </div>
          </section>

          <RelatedRail items={related} />
        </div>
      </main>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 z-[100] grid select-none place-items-center bg-black text-white"
      onMouseMove={resetHide}
      onClick={(e) => { if (e.target === e.currentTarget) togglePlay(); }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        src={videoSrc}
        poster={cover}
        className="h-full w-full object-contain"
        onClick={togglePlay}
      />

      {currentSub && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 max-w-[82%] -translate-x-1/2 rounded-md bg-black/72 px-4 py-2 text-center text-base font-semibold text-white shadow-[0_14px_42px_rgba(0,0,0,0.3)] backdrop-blur md:text-2xl">
          {currentSub.text}
        </div>
      )}

      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/88 via-black/42 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/92 via-black/54 to-transparent" />

        <div className="pointer-events-auto absolute left-3 right-3 top-[max(0.75rem,env(safe-area-inset-top))] flex items-start justify-between gap-3 md:left-6 md:right-6">
          <button onClick={() => nav(-1)} className="flex min-w-0 items-center gap-3 rounded-md bg-black/30 px-3 py-2 text-left backdrop-blur-md transition hover:bg-white/[0.08]">
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold md:text-base">{item.title}</span>
              <span className="hidden text-xs text-white/58 sm:block">{item.duration || "Video"} / {item.rating || "18+"}</span>
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <PlayerIconButton label={liked ? "Beğeniyi kaldır" : "Beğen"} onClick={() => toggleLike(item.id)} active={liked} className="h-10 w-10">
              <ThumbsUp className={`h-[18px] w-[18px] ${liked ? "fill-current" : ""}`} />
            </PlayerIconButton>
            <PlayerIconButton label={fav ? "Favoriden çıkar" : "Favori"} onClick={() => toggleFavorite(item.id)} active={fav} className="h-10 w-10">
              <Heart className={`h-[18px] w-[18px] ${fav ? "fill-current" : ""}`} />
            </PlayerIconButton>
            <ShareMenu title={item.title} url={shareUrl} variant="icon" className="hidden h-10 w-10 sm:grid" />
          </div>
        </div>

        <div className="pointer-events-auto absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-4 md:flex">
          <PlayerIconButton label="10 saniye geri" onClick={() => seek(-10)} className="h-14 w-14 rounded-full">
            <SkipBack className="h-6 w-6" />
          </PlayerIconButton>
          <button
            type="button"
            onClick={togglePlay}
            className="grid h-20 w-20 place-items-center rounded-full border border-white/20 bg-white/92 text-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.34)] transition hover:bg-white active:scale-95"
            aria-label={playing ? "Duraklat" : "Oynat"}
          >
            {playing ? <Pause className="h-9 w-9 fill-current" /> : <Play className="h-9 w-9 fill-current" />}
          </button>
          <PlayerIconButton label="10 saniye ileri" onClick={() => seek(10)} className="h-14 w-14 rounded-full">
            <SkipForward className="h-6 w-6" />
          </PlayerIconButton>
        </div>

        <div className="pointer-events-auto absolute inset-x-0 bottom-0 space-y-3 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:pb-6">
          <div className="hidden max-w-3xl md:block">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/68">
              <span>{item.genres[0] || "ReelsPorn"}</span>
              <span>/</span>
              <span>{item.year}</span>
              <span>/</span>
              <span>{formatCompactCount(viewCount)} görüntülenme</span>
              <span>/</span>
              <span>{formatCompactCount(likeCount)} beğeni</span>
            </div>
            <h1 className="line-clamp-1 text-xl font-extrabold leading-tight text-white">{item.title}</h1>
          </div>
          <input
            type="range" min={0} max={duration || 0} value={time}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="h-2 w-full cursor-pointer accent-primary"
            aria-label="İlerleme"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
              <PlayerIconButton label={playing ? "Duraklat" : "Oynat"} onClick={togglePlay}>
                {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
              </PlayerIconButton>
              <PlayerIconButton label="10 saniye geri" onClick={() => seek(-10)} className="hidden sm:grid">
                <SkipBack className="h-5 w-5" />
              </PlayerIconButton>
              <PlayerIconButton label="10 saniye ileri" onClick={() => seek(10)} className="hidden sm:grid">
                <SkipForward className="h-5 w-5" />
              </PlayerIconButton>
              <PlayerIconButton label={muted ? "Sesi aç" : "Sessize al"} onClick={toggleMute}>
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </PlayerIconButton>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                className="hidden h-2 w-24 cursor-pointer accent-primary lg:block"
                aria-label="Ses seviyesi"
              />
              <span className="ml-1 shrink-0 text-xs tabular-nums text-white/76 md:text-sm">{fmt(time)} / {fmt(duration)}</span>
            </div>
            <div className="relative flex shrink-0 items-center gap-1.5 md:gap-2">
              <PlayerIconButton label="Ayarlar" onClick={() => setShowSettings((v) => !v)}>
                <Settings className="h-5 w-5" />
              </PlayerIconButton>
              <PlayerIconButton label="Altyazı" onClick={() => setSub(sub === "off" ? "tr" : "off")} active={sub !== "off"} className="hidden sm:grid">
                <Subtitles className="h-5 w-5" />
              </PlayerIconButton>
              <PlayerIconButton label="Tam ekran" onClick={toggleFs}>
                {fs ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </PlayerIconButton>
              {showSettings && (
                <div className="absolute bottom-14 right-0 w-60 rounded-md border border-white/10 bg-zinc-950/96 p-2 shadow-[0_18px_54px_rgba(0,0,0,0.38)] backdrop-blur-xl animate-scale-in">
                  <div className="px-2 py-1 text-xs font-bold text-white/46">Oynatma hızı</div>
                  <div className="grid grid-cols-5 gap-1 pb-2">
                    {playbackRates.map((nextRate) => (
                      <button
                        key={nextRate}
                        type="button"
                        onClick={() => changeRate(nextRate)}
                        className={`h-9 rounded-sm text-xs font-bold transition ${
                          rate === nextRate ? "bg-primary text-primary-foreground" : "bg-white/[0.06] text-white/72 hover:bg-white/[0.1]"
                        }`}
                      >
                        {nextRate}x
                      </button>
                    ))}
                  </div>
                  <div className="px-2 py-1 text-xs font-bold text-white/46">Altyazı</div>
                  {subtitleTracks.map((s) => (
                    <button
                      key={s.lang}
                      onClick={() => { setSub(s.lang); setShowSettings(false); }}
                      className={`w-full rounded-sm px-3 py-2 text-left text-sm transition hover:bg-white/[0.08] ${sub === s.lang ? "text-primary" : "text-white/76"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
