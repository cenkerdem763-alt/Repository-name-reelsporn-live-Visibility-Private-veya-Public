import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Film, Users, BarChart3, Tag, ShieldAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAllTitles } from "@/hooks/useContent";
import { useApp } from "@/contexts/AppContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { Title } from "@/data/content";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function getEmbedSource(value: string) {
  return value.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1] || value;
}

function normalizeSource(value: string | undefined) {
  return getEmbedSource(value || "").trim().replace(/\/+$/, "");
}

type BulkEntry = {
  raw: string;
  source: string;
  title?: string;
  poster?: string;
  genres?: string[];
};

function getHostLabel(value: string) {
  try {
    const host = new URL(getEmbedSource(value)).hostname.replace(/^www\./, "");
    return host.split(".")[0] || "Kaynak";
  } catch {
    return "Kaynak";
  }
}

function parseBulkLines(value: string) {
  const seen = new Set<string>();

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): BulkEntry => {
      const parts = line.split("|").map((part) => part.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return {
          raw: parts[1],
          source: normalizeSource(parts[1]),
          title: parts[0],
          poster: parts[2],
          genres: parts[3]?.split(",").map((genre) => genre.trim()).filter(Boolean),
        };
      }

      return {
        raw: line,
        source: normalizeSource(line),
      };
    })
    .filter((entry) => {
      const source = entry.source;
      if (!source || seen.has(source)) return false;
      seen.add(source);
      return true;
    });
}

export default function Admin() {
  const { user } = useApp();
  const qc = useQueryClient();
  const { data: items = [] } = useAllTitles();
  const isAdmin = useIsAdmin();
  const [tab, setTab] = useState<"icerik" | "kullanici" | "kategori" | "istatistik">("icerik");
  const [editing, setEditing] = useState<Title | null>(null);
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  const stats = [
    { label: "Toplam İçerik", value: items.length, icon: Film },
    { label: "Aktif Kullanıcı", value: "—", icon: Users },
    { label: "Aylık İzlenme", value: "—", icon: BarChart3 },
    { label: "Kategori", value: 8, icon: Tag },
  ];

  const save = async (form: FormData) => {
    const id = editing?.id || `${slugify(form.get("title") as string) || "video"}-${Date.now().toString(36)}`;
    const payload = {
      id,
      title: String(form.get("title") || "Yeni İçerik"),
      description: String(form.get("description") || ""),
      year: Number(form.get("year") || 2025),
      duration: String(form.get("duration") || "1s 30dk"),
      rating: String(form.get("rating") || "13+"),
      type: (form.get("type") as "film" | "dizi") || "film",
      genres: String(form.get("genres") || "Dram").split(",").map((s) => s.trim()).filter(Boolean),
      poster_url: String(form.get("poster_url") || editing?.poster || ""),
      backdrop_url: String(form.get("backdrop_url") || editing?.backdrop || ""),
      video_url: String(form.get("video_url") || editing?.videoUrl || ""),
      trailer_url: String(form.get("video_url") || editing?.videoUrl || ""),
      featured: form.get("featured") === "on",
      match_score: editing?.match ?? 90,
    };
    const { error } = await supabase.from("titles").upsert(payload);
    if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["titles"] });
    qc.invalidateQueries({ queryKey: ["featured-titles"] });
    qc.invalidateQueries({ queryKey: ["content-rows"] });
    toast({ title: editing ? "Güncellendi" : "Eklendi" });
    setEditing(null); setOpen(false);
  };

  const bulkSave = async (form: FormData) => {
    const lines = parseBulkLines(String(form.get("embed_lines") || ""));
    if (!lines.length) {
      toast({ title: "Link yok", description: "En az bir embed URL veya iframe kodu ekle.", variant: "destructive" });
      return;
    }

    const existingSources = new Set(items.map((item) => normalizeSource(item.videoUrl || item.trailerUrl)));
    const newEntries = lines.filter((entry) => !existingSources.has(entry.source));

    if (!newEntries.length) {
      toast({ title: "Yeni içerik yok", description: "Bu embedlerin tamamı zaten ekli.", variant: "destructive" });
      return;
    }

    const sourceName = String(form.get("source_name") || "").trim();
    const titlePrefix = String(form.get("title_prefix") || "Video").trim() || "Video";
    const titleMode = String(form.get("title_mode") || "auto");
    const defaultGenres = String(form.get("genres") || "Yeni")
      .split(",")
      .map((genre) => genre.trim())
      .filter(Boolean);
    const defaultPoster = String(form.get("poster_url") || "").trim();
    const defaultBackdrop = String(form.get("backdrop_url") || defaultPoster).trim();
    const now = Date.now().toString(36);

    const payloads = newEntries.map((entry, index) => {
      const number = items.length + index + 1;
      const hostLabel = sourceName || getHostLabel(entry.source);
      const title =
        entry.title ||
        (titleMode === "source" ? `${hostLabel} Video ${number}` : `${titlePrefix} ${number}`);
      const id = `${slugify(title)}-${now}-${index}`;
      const poster = entry.poster || defaultPoster;

      return {
        id,
        title,
        description: String(form.get("description") || `${hostLabel} kaynağından embed içerik.`).trim(),
        year: Number(form.get("year") || new Date().getFullYear()),
        duration: String(form.get("duration") || "").trim(),
        rating: String(form.get("rating") || "18+").trim(),
        type: (form.get("type") as "film" | "dizi") || "film",
        genres: entry.genres?.length ? entry.genres : defaultGenres,
        poster_url: poster,
        backdrop_url: defaultBackdrop || poster,
        video_url: entry.raw,
        trailer_url: entry.raw,
        featured: form.get("featured") === "on",
        match_score: 90,
      };
    });

    setBulkSaving(true);
    const { error } = await supabase.from("titles").insert(payloads);
    setBulkSaving(false);

    if (error) {
      toast({ title: "Toplu ekleme hatası", description: error.message, variant: "destructive" });
      return;
    }

    await qc.invalidateQueries({ queryKey: ["titles"] });
    await qc.invalidateQueries({ queryKey: ["featured-titles"] });
    await qc.invalidateQueries({ queryKey: ["content-rows"] });
    toast({
      title: `${payloads.length} video eklendi`,
      description: lines.length - newEntries.length ? `${lines.length - newEntries.length} tekrar atlandı.` : undefined,
    });
    setBulkOpen(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Bu içeriği silmek istediğinden emin misin?")) return;
    const previousTitles = qc.getQueryData<Title[]>(["titles"]);
    qc.setQueryData<Title[]>(["titles"], (current) => current?.filter((item) => item.id !== id) ?? []);
    const { error, data } = await supabase.from("titles").delete().eq("id", id).select("id");
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
      qc.setQueryData(["titles"], previousTitles);
      qc.invalidateQueries({ queryKey: ["titles"] });
      return;
    }
    if (!data?.length) {
      toast({
        title: "Silinemedi",
        description: "Veritabanı kaydı silmedi. Admin rolü veya delete policy eksik olabilir.",
        variant: "destructive",
      });
      qc.setQueryData(["titles"], previousTitles);
      qc.invalidateQueries({ queryKey: ["titles"] });
      return;
    }

    const { data: stillExists, error: verifyError } = await supabase
      .from("titles")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (verifyError) {
      toast({ title: "Kontrol edilemedi", description: verifyError.message, variant: "destructive" });
      qc.setQueryData(["titles"], previousTitles);
      qc.invalidateQueries({ queryKey: ["titles"] });
      return;
    }
    if (stillExists) {
      toast({
        title: "Silinemedi",
        description: "Kayıt silme isteğinden sonra veritabanında hâlâ duruyor.",
        variant: "destructive",
      });
      qc.setQueryData(["titles"], previousTitles);
      qc.invalidateQueries({ queryKey: ["titles"] });
      return;
    }

    await qc.invalidateQueries({ queryKey: ["titles"] });
    await qc.invalidateQueries({ queryKey: ["title", id] });
    await qc.invalidateQueries({ queryKey: ["featured-titles"] });
    await qc.invalidateQueries({ queryKey: ["content-rows"] });
    toast({ title: "Silindi" });
  };

  if (isAdmin === null) {
    return <div className="pt-32 px-10 text-muted-foreground">Yetki kontrol ediliyor...</div>;
  }
  if (!isAdmin) {
    return (
      <div className="pt-32 px-10 max-w-xl mx-auto text-center space-y-4">
        <ShieldAlert className="h-14 w-14 text-primary mx-auto" />
        <h1 className="text-2xl font-bold">Yetkin yok</h1>
        <p className="text-muted-foreground">
          Yönetim paneline erişmek için <strong>admin</strong> rolüne ihtiyacın var.
          Bir yetkili sana rol vermelidir veya geliştirici aşağıdaki SQL ile ilk admini atayabilir.
        </p>
        <pre className="text-left text-xs bg-card border border-border rounded p-4 overflow-x-auto">
{`INSERT INTO public.user_roles (user_id, role)
VALUES ('${user?.id ?? "<KULLANICI_ID>"}', 'admin')
ON CONFLICT DO NOTHING;`}
        </pre>
      </div>
    );
  }

  return (
    <div className="pt-24 px-4 md:px-10 pb-20">
      <header className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Yönetim Paneli</h1>
          <p className="text-muted-foreground text-sm">İçerikleri ve platformu yönet</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <Upload className="mr-2 h-4 w-4" />Toplu Embed
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Toplu Embed Ekle</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); bulkSave(new FormData(e.currentTarget)); }} className="space-y-3">
                <Textarea
                  name="embed_lines"
                  placeholder={'Her satıra bir embed URL veya iframe kodu yapıştır.\nhttps://site.test/embed/123\nBaşlık | https://site.test/embed/456 | https://site.test/poster.jpg | Kategori'}
                  rows={9}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input name="source_name" placeholder="Kaynak site adı" />
                  <Input name="title_prefix" defaultValue="Video" placeholder="Başlık ön eki" />
                  <select name="title_mode" defaultValue="auto" className="h-10 rounded-md bg-input border border-border px-3">
                    <option value="auto">Başlık: Ön ek + sıra</option>
                    <option value="source">Başlık: Kaynak + sıra</option>
                  </select>
                  <Input name="year" type="number" defaultValue={new Date().getFullYear()} placeholder="Yıl" />
                  <Input name="duration" placeholder="Süre" />
                  <Input name="rating" defaultValue="18+" placeholder="Yaş Sınırı" />
                  <select name="type" defaultValue="film" className="h-10 rounded-md bg-input border border-border px-3">
                    <option value="film">Film</option><option value="dizi">Dizi</option>
                  </select>
                  <Input name="genres" defaultValue="Yeni" placeholder="Türler (virgülle)" />
                </div>
                <Textarea name="description" placeholder="Ortak açıklama" rows={2} />
                <Input name="poster_url" placeholder="Ortak poster URL" />
                <Input name="backdrop_url" placeholder="Ortak arka plan URL" />
                <label className="flex items-center gap-3">
                  <Switch name="featured" />
                  <span className="text-sm">Ana sayfa hero slider'da göster</span>
                </label>
                <DialogFooter>
                  <Button type="submit" disabled={bulkSaving} className="bg-primary hover:bg-primary/90">
                    {bulkSaving ? "Ekleniyor..." : "Toplu Ekle"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />Yeni İçerik
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "İçeriği Düzenle" : "Yeni İçerik Ekle"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }} className="space-y-3">
                <Input name="title" defaultValue={editing?.title} placeholder="Başlık" required />
                <Textarea name="description" defaultValue={editing?.description} placeholder="Açıklama" rows={3} />
                <div className="grid grid-cols-2 gap-3">
                  <Input name="year" type="number" defaultValue={editing?.year ?? 2025} placeholder="Yıl" />
                  <Input name="duration" defaultValue={editing?.duration} placeholder="Süre" />
                  <Input name="rating" defaultValue={editing?.rating ?? "13+"} placeholder="Yaş Sınırı" />
                  <select name="type" defaultValue={editing?.type ?? "film"} className="h-10 rounded-md bg-input border border-border px-3">
                    <option value="film">Film</option><option value="dizi">Dizi</option>
                  </select>
                </div>
                <Input name="genres" defaultValue={editing?.genres.join(", ")} placeholder="Türler (virgülle)" />
                <Input name="poster_url" defaultValue={editing?.poster} placeholder="Poster URL" />
                <Input name="backdrop_url" defaultValue={editing?.backdrop} placeholder="Arka plan URL" />
                <Textarea
                  name="video_url"
                  defaultValue={editing?.videoUrl}
                  placeholder='Video URL, embed URL veya iframe kodu. Örn: /videos/ornek.mp4 ya da <iframe src="..."></iframe>'
                  rows={3}
                />
                <label className="flex items-center gap-3">
                  <Switch name="featured" defaultChecked={editing?.featured} />
                  <span className="text-sm">Ana sayfa hero slider'da göster</span>
                </label>
                <DialogFooter>
                  <Button type="submit" className="bg-primary hover:bg-primary/90">Kaydet</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
              <s.icon className="h-8 w-8 text-primary" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {[["icerik","İçerikler"],["kullanici","Kullanıcılar"],["kategori","Kategoriler"],["istatistik","İstatistikler"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as typeof tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === k ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "icerik" && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">İçerik</th>
                <th className="p-3 hidden md:table-cell">Tür</th>
                <th className="p-3 hidden md:table-cell">Yıl</th>
                <th className="p-3 hidden lg:table-cell">Türler</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="p-3 flex items-center gap-3">
                    <img src={it.poster} alt="" className="h-12 w-9 object-cover rounded" />
                    <div className="font-medium">{it.title}</div>
                  </td>
                  <td className="p-3 hidden md:table-cell uppercase text-xs">{it.type}</td>
                  <td className="p-3 hidden md:table-cell">{it.year}</td>
                  <td className="p-3 hidden lg:table-cell text-muted-foreground text-sm">{it.genres.join(", ")}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(it); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab !== "icerik" && (
        <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
          Bu bölüm yakında.
        </div>
      )}
    </div>
  );
}
