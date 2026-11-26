import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, RefreshCw, Server, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Host = { id: string; name: string; base_url: string; priority: number; enabled: boolean };
const table = () => supabase.from("stream_hosts" as never);
function safeHost(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.hash) return null;
    return url.toString().replace(/\\/$/, "");
  } catch { return null; }
}
export function HostServers() {
  const [hosts,setHosts] = useState<Host[]>([]);
  const [name,setName] = useState("");
  const [address,setAddress] = useState("");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [testing,setTesting] = useState<string | null>(null);
  const load = async () => {
    const {data,error} = await table().select("*").order("priority",{ascending:true});
    if(error){setMessage("Host tablosu okunamadi. Supabase migration uygulanmali: "+error.message);return;}
    setHosts((data || []) as unknown as Host[]);
  };
  useEffect(()=>{void load();},[]);
  const add=async()=>{
    const url=safeHost(address);
    if(!url){setMessage("Gecerli bir HTTPS host adresi gir.");return;}
    if(!name.trim()){setMessage("Host adi gerekli.");return;}
    setBusy(true);
    const {error}=await table().insert({name:name.trim().slice(0,80),base_url:url,priority:hosts.length,enabled:true} as never);
    setBusy(false);
    if(error){setMessage(error.message);return;}
    setName("");setAddress("");setMessage("Host eklendi.");await load();
  };
  const remove=async(host:Host)=>{
    if(!window.confirm(host.name+" silinsin mi?"))return;
    const {error}=await table().delete().eq("id",host.id);
    if(error){setMessage(error.message);return;}
    await load();
  };
  const move=async(index:number,delta:number)=>{
    const other=index+delta;if(other<0||other>=hosts.length)return;
    const first=hosts[index],second=hosts[other];setBusy(true);
    const a=await table().update({priority:second.priority} as never).eq("id",first.id);
    const b=await table().update({priority:first.priority} as never).eq("id",second.id);
    setBusy(false);
    if(a.error||b.error){setMessage((a.error||b.error)?.message||"Siralama hatasi");return;}
    await load();
  };
  const toggle=async(host:Host)=>{
    const {error}=await table().update({enabled:!host.enabled} as never).eq("id",host.id);
    if(error){setMessage(error.message);return;}await load();
  };
  const test=async(host:Host)=>{
    setTesting(host.id);
    try {
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),6000);
      try {
        const res=await fetch(host.base_url,{method:"HEAD",mode:"cors",signal:controller.signal,cache:"no-store"});
        setMessage(host.name+": HTTP "+res.status+(res.ok?" - erisilebilir":" - sunucu hata verdi"));
      } finally {clearTimeout(timer);}
    } catch {
      setMessage(host.name+": tarayici testi dogrulanamadi (CORS veya baglanti). Bu tek basina sunucunun kapali oldugunu gostermez.");
    } finally {setTesting(null);}
  };
  return <section className="mb-7 rounded-2xl border border-white/10 bg-white/[.035] p-5">
    <div className="flex items-start gap-3"><Server className="mt-1 h-5 w-5 text-[#ff315f]"/><div><h2 className="text-base font-bold">Host sunuculari</h2><p className="mt-1 text-xs leading-5 text-white/50">HTTPS host adreslerini kaydet, baglantilarini kontrol et ve oncelik sirasi belirle. Yayin listesi entegrasyonu sonraki asamadir; adres eklemek tek basina video aktarmaz.</p></div></div>
    <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
      <input aria-label="Host adi" placeholder="Host adi" className="min-w-0 rounded-xl border border-white/15 bg-[#14141b] px-3 py-3 text-sm text-white" value={name} onChange={e=>setName(e.target.value)}/>
      <input aria-label="HTTPS sunucu adresi" type="url" placeholder="https://media.example.com" className="min-w-0 rounded-xl border border-white/15 bg-[#14141b] px-3 py-3 text-sm text-white" value={address} onChange={e=>setAddress(e.target.value)}/>
      <button type="button" disabled={busy} onClick={()=>void add()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff315f] px-4 py-3 text-sm font-bold disabled:opacity-50"><Plus size={16}/> Adres ekle</button>
    </div>
    {message&&<p role="status" className="mt-3 text-xs text-amber-200">{message}</p>}
    <div className="mt-4 space-y-2">{hosts.map((host,i)=><div key={host.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="min-w-[170px] flex-1"><div className="text-sm font-semibold">{host.name}</div><div className="break-all text-xs text-white/50">{host.base_url}</div></div>
      <label className="flex items-center gap-1 text-xs text-white/70"><input type="checkbox" checked={host.enabled} onChange={()=>void toggle(host)}/> Aktif</label>
      <button aria-label="Hostu test et" type="button" disabled={testing===host.id} onClick={()=>void test(host)} className="rounded-lg border border-white/15 p-2 text-xs"><RefreshCw size={15}/></button>
      <button aria-label="Yukari tasi" disabled={busy||i===0} type="button" onClick={()=>void move(i,-1)} className="rounded-lg border border-white/15 p-2 disabled:opacity-30"><ArrowUp size={15}/></button>
      <button aria-label="Asagi tasi" disabled={busy||i===hosts.length-1} type="button" onClick={()=>void move(i,1)} className="rounded-lg border border-white/15 p-2 disabled:opacity-30"><ArrowDown size={15}/></button>
      <button aria-label="Hostu sil" type="button" onClick={()=>void remove(host)} className="rounded-lg border border-white/15 p-2 text-red-300"><Trash2 size={15}/></button>
    </div>)}</div>
  </section>;
}
