import { useEffect, useRef } from "react";

type HlsInstance = { attachMedia: (video:HTMLVideoElement)=>void; loadSource:(src:string)=>void; destroy:()=>void };
type HlsConstructor = { new():HlsInstance; isSupported:()=>boolean };
declare global { interface Window { Hls?: HlsConstructor } }
let scriptPromise: Promise<void>|null=null;
function loadHls() {
  if(window.Hls) return Promise.resolve();
  if(!scriptPromise) scriptPromise=new Promise<void>((resolve,reject)=>{
    const script=document.createElement('script'); script.src='https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js';
    script.async=true;script.onload=()=>resolve();script.onerror=()=>reject(new Error('HLS player yüklenemedi'));document.head.appendChild(script);
  });
  return scriptPromise;
}
export function StreamVideo({src,poster,active,muted=true,paused=false,onError,className=''}:{src:string;poster?:string;active:boolean;muted?:boolean;paused?:boolean;onError?:()=>void;className?:string}) {
 const ref=useRef<HTMLVideoElement>(null);
 useEffect(()=>{
  const video=ref.current;if(!video || !src)return;
  let cancelled=false;let hls:HlsInstance|undefined;
  if(/\.m3u8(?:[?#]|$)/i.test(src) && !video.canPlayType('application/vnd.apple.mpegurl')){
    loadHls().then(()=>{if(cancelled)return;const Hls=window.Hls;if(!Hls?.isSupported()){onError?.();return;}hls=new Hls();hls.attachMedia(video);hls.loadSource(src);}).catch(()=>{if(!cancelled)onError?.();});
  }else video.src=src;
  return()=>{cancelled=true;video.pause();hls?.destroy();video.removeAttribute('src');video.load();};
 },[src]);
 useEffect(()=>{const video=ref.current;if(!video)return;video.muted=muted;if(active&&!paused)video.play().catch(()=>{});else video.pause();},[active,paused,muted,src]);
 return <video ref={ref} poster={poster} playsInline loop muted={muted} autoPlay={active} preload={active?'auto':'none'} onError={onError} onLoadedMetadata={()=>{if(active&&!paused)ref.current?.play().catch(()=>{});}} className={className}/>;
}
