import {useEffect,useRef} from "react";
import {attachPlayback} from "@/lib/playerEngine";
export function StreamVideo({src,poster,active,muted=true,paused=false,onError,className=""}:{src:string;poster?:string;active:boolean;muted?:boolean;paused?:boolean;onError?:()=>void;className?:string}){
 const videoRef=useRef<HTMLVideoElement>(null);
 const callback=useRef(onError);callback.current=onError;
 useEffect(()=>{const video=videoRef.current;if(!video||!src)return;return attachPlayback(video,src,()=>callback.current?.());},[src]);
 useEffect(()=>{const video=videoRef.current;if(!video)return;video.muted=muted;if(active&&!paused)void video.play().catch(()=>{});else video.pause();},[active,paused,muted,src]);
 return <video ref={videoRef} poster={poster} playsInline loop muted={muted} preload={active?"auto":"none"} onError={()=>callback.current?.()}
 onCanPlay={()=>{if(active&&!paused)void videoRef.current?.play().catch(()=>{});}} className={className}/>;
}
