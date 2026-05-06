import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Maximize, Minimize, Pause, Play, Settings, SkipBack, SkipForward,
  Subtitles, Volume2, VolumeX,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useTitle } from "@/hooks/useContent";
import { sampleVideoUrl } from "@/data/content";

const subtitleTracks = [
  { lang: "off", label: "Kapalı" },
  { lang: "tr", label: "Türkçe" },
  { lang: "en", label: "İngilizce" },
];

const trSample = [
  { from: 2, to: 6, text: "Hoş geldiniz, hikayemiz başlıyor..." },
  { from: 7, to: 12, text: "Bu, unutamayacağınız bir yolculuk olacak." },
  { from: 14, to: 20, text: "İstanbul'un sokakları sırlarla dolu." },
];

export default function Player() {
  const { id = "" } = useParams();
  const { data: item, isLoading } = useTitle(id);
  const nav = useNavigate();
  const { updateProgress } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [fs, setFs] = useState(false);
  const [sub, setSub] = useState("tr");
  const [showSettings, setShowSettings] = useState(false);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const onTime = () => {
      setTime(v.currentTime);
      if (v.duration) updateProgress(id, v.currentTime / v.duration);
    };
    const onLoaded = () => setDuration(v.duration || 0);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onLoaded);
    return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("loadedmetadata", onLoaded); };
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

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };
  const toggleMute = () => { const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); };
  const seek = (s: number) => { const v = videoRef.current; if (!v) return; v.currentTime = Math.max(0, Math.min((v.duration||0), v.currentTime + s)); };
  const seekTo = (t: number) => { const v = videoRef.current; if (!v) return; v.currentTime = t; };
  const toggleFs = () => {
    if (!document.fullscreenElement) wrapRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (isLoading) return <div className="p-10 text-foreground bg-black h-screen grid place-items-center">Yükleniyor...</div>;
  if (!item) return <div className="p-10">İçerik bulunamadı.</div>;
  const currentSub = sub !== "off" && sub === "tr" ? trSample.find((c) => time >= c.from && time <= c.to) : null;
  const videoSrc = item.videoUrl || item.trailerUrl || sampleVideoUrl;

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 z-[100] bg-black grid place-items-center select-none"
      onMouseMove={resetHide}
      onClick={(e) => { if (e.target === e.currentTarget) togglePlay(); }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        src={videoSrc}
        className="h-full w-full object-contain"
        onClick={togglePlay}
      />

      {currentSub && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 max-w-[80%] text-center px-4 py-2 rounded bg-background/70 text-foreground text-lg md:text-2xl font-medium pointer-events-none">
          {currentSub.text}
        </div>
      )}

      <div className={`absolute inset-0 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"} pointer-events-none`}>
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/80 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black/90 to-transparent" />

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-foreground pointer-events-auto">
          <button onClick={() => nav(-1)} className="flex items-center gap-2 hover:opacity-80">
            <ArrowLeft className="h-6 w-6" /> <span className="font-semibold">{item.title}</span>
          </button>
        </div>

        <div className="absolute bottom-0 inset-x-0 px-6 pb-6 space-y-3 pointer-events-auto">
          <input
            type="range" min={0} max={duration || 0} value={time}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="w-full accent-primary cursor-pointer"
            aria-label="İlerleme"
          />
          <div className="flex items-center justify-between text-foreground">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="p-2 hover:scale-110 transition" aria-label={playing ? "Duraklat" : "Oynat"}>
                {playing ? <Pause className="h-7 w-7 fill-current" /> : <Play className="h-7 w-7 fill-current" />}
              </button>
              <button onClick={() => seek(-10)} className="p-2 hover:scale-110 transition" aria-label="10sn geri"><SkipBack className="h-6 w-6" /></button>
              <button onClick={() => seek(10)} className="p-2 hover:scale-110 transition" aria-label="10sn ileri"><SkipForward className="h-6 w-6" /></button>
              <button onClick={toggleMute} className="p-2 hover:scale-110 transition" aria-label="Ses">
                {muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
              </button>
              <span className="text-sm tabular-nums text-foreground/80">{fmt(time)} / {fmt(duration)}</span>
            </div>
            <div className="flex items-center gap-2 relative">
              <button onClick={() => setShowSettings((v) => !v)} className="p-2 hover:scale-110 transition" aria-label="Ayarlar"><Settings className="h-6 w-6" /></button>
              <button onClick={() => setSub(sub === "off" ? "tr" : "off")} className={`p-2 hover:scale-110 transition ${sub !== "off" ? "text-primary" : ""}`} aria-label="Altyazı">
                <Subtitles className="h-6 w-6" />
              </button>
              <button onClick={toggleFs} className="p-2 hover:scale-110 transition" aria-label="Tam ekran">
                {fs ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
              </button>
              {showSettings && (
                <div className="absolute bottom-12 right-0 w-56 rounded-md bg-popover border border-border p-2 animate-scale-in">
                  <div className="px-2 py-1 text-xs text-muted-foreground uppercase tracking-wider">Altyazı</div>
                  {subtitleTracks.map((s) => (
                    <button
                      key={s.lang}
                      onClick={() => { setSub(s.lang); setShowSettings(false); }}
                      className={`w-full text-left px-3 py-2 rounded hover:bg-accent text-sm ${sub === s.lang ? "text-primary" : ""}`}
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
