import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Film, Users, BarChart3, Tag, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { useAllTitles } from "@/hooks/useContent";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { Title } from "@/data/content";

export default function Admin() {
  const { user } = useApp();
  const qc = useQueryClient();
  const { data: items = [] } = useAllTitles();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"icerik" | "kullanici" | "kategori" | "istatistik">("icerik");
  const [editing, setEditing] = useState<Title | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const stats = [
    { label: "Toplam İçerik", value: items.length, icon: Film },
    { label: "Aktif Kullanıcı", value: "—", icon: Users },
    { label: "Aylık İzlenme", value: "—", icon: BarChart3 },
    { label: "Kategori", value: 8, icon: Tag },
  ];

  const save = async (form: FormData) => {
    const id = editing?.id || (form.get("title") as string).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) + "-" + Date.now().toString(36);
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

  const remove = async (id: string) => {
    if (!confirm("Bu içeriği silmek istediğinden emin misin?")) return;
    const { error } = await supabase.from("titles").delete().eq("id", id);
    if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["titles"] });
    qc.invalidateQueries({ queryKey: ["content-rows"] });
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
              <Input name="video_url" defaultValue={editing?.videoUrl} placeholder="Video URL (.mp4)" />
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
