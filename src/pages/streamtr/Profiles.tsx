import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

const COLORS = [
  "from-red-500 to-orange-500",
  "from-blue-500 to-purple-500",
  "from-green-500 to-teal-500",
  "from-amber-500 to-yellow-500",
  "from-pink-500 to-rose-500",
  "from-indigo-500 to-cyan-500",
];

export default function Profiles() {
  const { user, watchProfiles, setProfile, createWatchProfile, loading } = useApp();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [kids, setKids] = useState(false);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Yükleniyor...</div>;
  if (!user) { nav("/giris"); return null; }

  const onCreate = async () => {
    if (!name.trim()) return;
    try {
      await createWatchProfile(name.trim(), color, kids);
      setName(""); setKids(false); setOpen(false);
    } catch (error) {
      console.error("Profile create error:", error);
      toast({
        title: "Profil oluşturulamadı",
        description: (error as any)?.message || "Bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="text-center space-y-10 animate-fade-in">
        <h1 className="text-3xl md:text-5xl font-semibold">Kim İzliyor?</h1>
        <div className="flex flex-wrap justify-center gap-4 md:gap-8">
          {watchProfiles.map((p) => (
            <button key={p.id} onClick={() => { setProfile(p); nav("/"); }} className="group flex flex-col items-center gap-3">
              <div className={`h-24 w-24 md:h-36 md:w-36 rounded-md bg-gradient-to-br ${p.color} grid place-items-center text-3xl md:text-5xl font-black group-hover:ring-4 ring-foreground transition`}>
                {p.name[0]?.toUpperCase()}
              </div>
              <span className="text-muted-foreground group-hover:text-foreground transition">
                {p.name}{p.kids ? " 👶" : ""}
              </span>
            </button>
          ))}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="flex flex-col items-center gap-3 group">
                <div className="h-24 w-24 md:h-36 md:w-36 rounded-md border-2 border-dashed border-border grid place-items-center text-muted-foreground group-hover:border-foreground group-hover:text-foreground transition">
                  <Plus className="h-10 w-10" />
                </div>
                <span className="text-muted-foreground">Profil Ekle</span>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Yeni Profil</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>İsim</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="örn. Ahmet" />
                </div>
                <div>
                  <Label className="mb-2 block">Renk</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setColor(c)}
                        className={`h-10 w-10 rounded bg-gradient-to-br ${c} ${color === c ? "ring-2 ring-foreground" : ""}`} />
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={kids} onCheckedChange={(v) => setKids(!!v)} />
                  <span className="text-sm">Çocuk profili</span>
                </label>
                <Button onClick={onCreate} className="w-full">Oluştur</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
