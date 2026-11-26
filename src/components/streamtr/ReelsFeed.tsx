import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Compass, Heart, Home, ListFilter, Play, Search, Share2, Volume2, VolumeX, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import type { Title } from "@/data/content";
import { getDirectPlaybackSource } from "@/lib/playbackSource";
import { StreamVideo } from "./StreamVideo";

type Category = "Tümü" | string;
const glass = "border border-white/15 bg-black/45 shadow-[0_12px_34px_rgba(0,0,0,.22)] backdrop-blur-xl";
function IconAction({ label, children, onClick, active = false }: {label:string;children:React.ReactNode;onClick:()=>void;active?:boolean}) {
  return <button type="button" aria-label={label} onClick={onClick} className="flex flex-col items-center gap-1.5 text-[10px] font-semibold tracking-wide text-white drop-shadow-lg">
    <span className={`grid h-12 w-12 place-items-center rounded-full ${glass} transition active:scale-90 ${active ? "text-[#ff315f]" : "text-white"}`}>{children}</span>{label}</button>;
}
export function ReelsFeed({ items }: { items: Title[] }) {
  const navigate = useNavigate();
  const { likedTitles, toggleLike, favorites, toggleFavorite } = useApp();
  const [category,setCategory] = useState<Category>("Tümü");
  const [active,setActive] = useState(0);
  const [muted,setMuted] = useState(true);
  const [paused,setPaused] = useState(false);
  const [sheet,setSheet] = useState(false);
  const [errors,setErrors] = useState<Record<string,boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLElement|null)[]>([]);
  const groups = useMemo(()=>["Tümü",...new Set(items.flatMap(i=>i.genres).filter(Boolean))].slice(0,12),[items]);
  const feed = useMemo(()=>items.filter(i=>category === "Tümü" || i.genres.includes(category)).filter(i=>Boolean(getDirectPlaybackSource(i))).slice(0,40),[items,category]);
  useEffect(()=>{setActive(0);setPaused(false);scrollRef.current?.scrollTo({top:0});},[category]);
  useEffect(()=>{
    const root=scrollRef.current;if(!root)return;
    const io=new IntersectionObserver(entries=>{
      const best=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(best){const next=Number((best.target as HTMLElement).dataset.index);if(Number.isFinite(next)){setActive(next);setPaused(false);}}
    },{root,threshold:[0.6,0.75,0.95]});
    cardsRef.current.forEach(el=>el&&io.observe(el));return()=>io.disconnect();
  },[feed]);
  const share=async(item:Title)=>{
    const url=`${window.location.origin}/icerik/${encodeURIComponent(item.id)}`;
    try { if(navigator.share) await navigator.share({title:item.title,url});else await navigator.clipboard.writeText(url); }catch { /* User cancelled */ }
  };
  return <section className="relative isolate h-[100dvh] overflow-hidden bg-[#040407] text-white md:hidden" aria-label="Dikey video akışı">
    <div ref={scrollRef} className="h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain scrollbar-hide" style={{scrollSnapType:"y mandatory"}}>
      {feed.length === 0 ? <div className="relative grid h-full place-items-center px-7 text-center">
        <div className="absolute inset-0 opacity-80 bg-[radial-gradient(ellipse_at_45%_24%,rgba(255,39,88,.22),transparent_50%),linear-gradient(160deg,#15121a,#040407_70%)]" />
        <div className="relative max-w-sm"><div className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] border border-[#ff315f]/30 bg-[#ff315f]/15 shadow-[0_25px_80px_rgba(255,30,86,.17)]"><Play className="h-9 w-9 fill-[#ff315f] text-[#ff315f]" /></div>
        <h2 className="mt-7 text-[28px] font-black tracking-tight">Yeni akış hazırlanıyor</h2><p className="mt-3 text-[15px] leading-6 text-white/55">Yeni yayın kaynakları eklendiğinde videolar burada tam ekran oynayacak. Dikey kaydır, keşfet ve kaydet.</p>
        <button onClick={()=>navigate('/ara')} className="mt-7 rounded-2xl bg-[#ff315f] px-6 py-3 text-sm font-bold shadow-[0_12px_35px_rgba(255,49,95,.3)]">Keşfet</button></div>
      </div> : feed.map((item,index)=>{
        const selected=index===active;
        const src=getDirectPlaybackSource(item);
        const cover=item.backdrop||item.poster||"/placeholder.svg";
        const liked=likedTitles.includes(item.id),saved=favorites.includes(item.id);
        return <article key={item.id} ref={el=>{cardsRef.current[index]=el;}} data-index={index} className="relative h-[100dvh] snap-start snap-always overflow-hidden bg-[#050505]" aria-label={item.title}>
          <img src={cover} alt="" loading={index<2?"eager":"lazy"} className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-3xl" />
          {!errors[item.id] && Math.abs(index-active)<=1 ? <StreamVideo key={item.id} src={src} poster={cover} active={selected && !sheet} muted={muted} paused={paused} onError={()=>setErrors(prev=>({...prev,[item.id]:true}))} className="absolute inset-0 h-full w-full object-contain" /> : errors[item.id] ? <div className="absolute inset-0 grid place-items-center px-10 text-center text-white/60"><span>Bu yayın şu anda oynatılamıyor.</span></div> : <img src={cover} alt="" className="absolute inset-0 h-full w-full object-contain" />}
          <button type="button" aria-label={paused?"Videoyu oynat":"Videoyu duraklat"} className="absolute inset-0 z-10" onClick={()=>setPaused(p=>!p)} />
          <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(180deg,rgba(0,0,0,.46),transparent_25%,transparent_49%,rgba(0,0,0,.86)_100%)]" />
          {selected&&paused&&<div className="pointer-events-none absolute left-1/2 top-1/2 z-30 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 backdrop-blur-lg"><Play className="ml-1 h-9 w-9 fill-white" /></div>}
          <div className="pointer-events-none absolute inset-x-0 bottom-[calc(5.3rem+env(safe-area-inset-bottom))] z-30 flex items-end justify-between gap-3 px-4">
            <div className="min-w-0 max-w-[calc(100%-5rem)] pb-2">
              <div className="mb-3 flex items-center gap-2"><span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-bold tracking-widest backdrop-blur-lg">18+ • HD</span><span className="text-xs text-white/70">{item.duration}</span></div>
              <h2 className="line-clamp-2 text-[22px] font-extrabold leading-[1.18] tracking-tight drop-shadow-xl">{item.title}</h2>
              <p className="mt-2 line-clamp-2 max-w-[290px] text-[13px] leading-5 text-white/75">{item.description}</p>
              <div className="mt-3 flex gap-2 overflow-hidden">{item.genres.slice(0,2).map(g=><span key={g} className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold backdrop-blur-md">#{g.replace(/ /g, "")}</span>)}</div>
            </div>
            <div className="pointer-events-auto flex shrink-0 flex-col gap-4 pb-1">
              <IconAction label="Beğen" active={liked} onClick={()=>void toggleLike(item.id)}><Heart className={`h-6 w-6 ${liked?"fill-current":""}`} /></IconAction>
              <IconAction label="Kaydet" active={saved} onClick={()=>void toggleFavorite(item.id)}><Bookmark className={`h-6 w-6 ${saved?"fill-current":""}`} /></IconAction>
              <IconAction label="Paylaş" onClick={()=>void share(item)}><Share2 className="h-5 w-5" /></IconAction>
              <IconAction label={muted?"Sesi aç":"Sesi kapat"} onClick={()=>setMuted(v=>!v)}>{muted?<VolumeX className="h-5 w-5" />:<Volume2 className="h-5 w-5" />}</IconAction>
            </div>
          </div>
        </article>;
      })}
    </div>
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 px-4 pt-[max(env(safe-area-inset-top),12px)]">
      <div className="pointer-events-auto flex h-14 items-center justify-between">
        <div className="flex items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#ff315f] shadow-[0_10px_24px_rgba(255,49,95,.35)]"><Play className="h-4 w-4 fill-white" /></div><span className="text-[22px] font-black tracking-tight">Reels<span className="text-[#ff315f]">Porn</span></span></div>
        <button onClick={()=>setSheet(true)} aria-label="Kategorileri aç" className={`grid h-10 w-10 place-items-center rounded-full ${glass}`}><ListFilter className="h-5 w-5" /></button>
      </div>
      <div className="pointer-events-auto mt-2 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">{groups.slice(0,7).map(g=><button key={g} onClick={()=>setCategory(g)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${g===category?"bg-white text-black":"border border-white/15 bg-black/30 text-white/75 backdrop-blur"}`}>{g}</button>)}</div>
    </div>
    <nav className="absolute inset-x-0 bottom-0 z-40 flex h-[calc(4.6rem+env(safe-area-inset-bottom))] items-start justify-around border-t border-white/10 bg-black/75 px-2 pt-3 backdrop-blur-2xl" aria-label="Mobil menü">
      {[{name:"Ana Sayfa",icon:Home,go:()=>{setCategory('Tümü');scrollRef.current?.scrollTo({top:0,behavior:'smooth'});}},{name:"Keşfet",icon:Compass,go:()=>setSheet(true)},{name:"Ara",icon:Search,go:()=>navigate('/ara')},{name:"Listem",icon:Bookmark,go:()=>navigate('/listem')}].map(x=><button key={x.name} onClick={x.go} className="flex min-w-16 flex-col items-center gap-1 text-[10px] font-medium text-white/80 active:scale-95"><x.icon className="h-[22px] w-[22px]" />{x.name}</button>)}
    </nav>
    {sheet&&<div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm" onClick={()=>setSheet(false)}><div onClick={e=>e.stopPropagation()} className="absolute inset-x-0 bottom-0 rounded-t-[32px] border-t border-white/15 bg-[#141319] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl"><div className="mx-auto mb-5 h-1 w-12 rounded-full bg-white/20"/><div className="flex items-center justify-between"><h2 className="text-xl font-extrabold">Keşfet</h2><button className="rounded-full bg-white/10 p-2" onClick={()=>setSheet(false)} aria-label="Kapat"><X className="h-5 w-5"/></button></div><p className="mt-2 text-sm text-white/50">İzlemek istediğin kategoriyi seç.</p><div className="mt-6 grid grid-cols-2 gap-2">{groups.map(g=><button key={g} onClick={()=>{setCategory(g);setSheet(false);}} className={`rounded-2xl border px-4 py-4 text-left text-sm font-bold ${g===category?"border-[#ff315f] bg-[#ff315f]/20":"border-white/10 bg-white/5"}`}>{g}</button>)}</div></div></div>}
  </section>;
}
