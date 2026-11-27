// Shared MP4 / HLS playback for mobile Reels and the full-screen player.
// Pinned hls.js 1.7.4 is loaded only when a browser lacks native HLS playback.
type HlsInstance={attachMedia(video:HTMLVideoElement):void;loadSource(src:string):void;destroy():void;on(event:string,cb:(event:string,data:{fatal?:boolean})=>void):void};
type HlsClass={new(config?:Record<string,unknown>):HlsInstance;isSupported():boolean;Events:{ERROR:string}};
declare global { interface Window { Hls?:HlsClass } }
let loader:Promise<HlsClass>|undefined;
const loadHls=()=>{
 if(window.Hls)return Promise.resolve(window.Hls);
 if(!loader)loader=new Promise<HlsClass>((resolve,reject)=>{
  const script=document.createElement("script");
  script.src="https://cdn.jsdelivr.net/npm/hls.js@1.7.4/dist/hls.min.js";
  script.async=true;script.crossOrigin="anonymous";
  script.onload=()=>window.Hls?resolve(window.Hls):reject(new Error("HLS unavailable"));
  script.onerror=()=>reject(new Error("HLS download failed"));
  document.head.appendChild(script);
 }).catch((error:unknown)=>{loader=undefined;throw error;});
 return loader;
};
export function attachPlayback(video:HTMLVideoElement,source:string,onError:()=>void):()=>void{
 let cancelled=false;let hls:HlsInstance|undefined;
 if(!source){onError();return()=>{};}
 if(!/\.m3u8(?:[?#]|$)/i.test(source)||video.canPlayType("application/vnd.apple.mpegurl")){
   video.src=source;
 }else{
   void loadHls().then(Hls=>{
     if(cancelled)return;
     if(!Hls.isSupported()){onError();return;}
     hls=new Hls({enableWorker:true,backBufferLength:30,maxBufferLength:20});
     hls.on(Hls.Events.ERROR,(_e,data)=>{if(data.fatal&&!cancelled)onError();});
     hls.attachMedia(video);hls.loadSource(source);
   }).catch(()=>{if(!cancelled)onError();});
 }
 return()=>{cancelled=true;video.pause();hls?.destroy();video.removeAttribute("src");video.load();};
}
