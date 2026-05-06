import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { PlayCircle } from "lucide-react";
import hero from "@/assets/hero-1.jpg";

export default function Login() {
  const { signIn, signUp } = useApp();
  const nav = useNavigate();
  const [mode, setMode] = useState<"giris" | "kayit">("giris");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !pwd) return;
    setBusy(true);
    const fn = mode === "giris" ? signIn : signUp;
    const { error } = await fn(email, pwd);
    setBusy(false);
    if (error) {
      toast({ title: "Hata", description: error, variant: "destructive" });
      return;
    }
    if (mode === "kayit") {
      toast({ title: "Hesabın oluşturuldu", description: "E-postanı doğrulamak için gelen kutunu kontrol et." });
    }
    nav("/profiller");
  };

  return (
    <div className="relative min-h-screen">
      <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-background/70" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="px-6 md:px-12 py-6">
          <div className="inline-flex items-center gap-2 text-3xl font-black tracking-tighter text-primary">
            <PlayCircle className="h-8 w-8 fill-primary/20" />
            Reels<span className="text-foreground">Porn</span>
          </div>
        </header>
        <div className="flex-1 grid place-items-center px-4">
          <form onSubmit={onSubmit} className="w-full max-w-md rounded-lg bg-background/85 backdrop-blur p-8 md:p-12 space-y-5 animate-scale-in border border-border">
            <h1 className="text-3xl font-bold">{mode === "giris" ? "Giriş Yap" : "Üye Ol"}</h1>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta" className="h-12 bg-secondary border-border" />
            <Input type="password" required minLength={6} value={pwd} onChange={(e) => setPwd(e.target.value)}
              placeholder="Şifre (en az 6 karakter)" className="h-12 bg-secondary border-border" />
            <Button type="submit" disabled={busy} className="w-full h-12 bg-primary hover:bg-primary/90 font-bold text-base">
              {busy ? "Lütfen bekle..." : mode === "giris" ? "Giriş Yap" : "Hesabı Oluştur"}
            </Button>
            <div className="text-sm text-muted-foreground">
              {mode === "giris" ? "ReelsPorn'a yeni misin?" : "Zaten üye misin?"}{" "}
              <button type="button" onClick={() => setMode(mode === "giris" ? "kayit" : "giris")} className="text-foreground hover:underline">
                {mode === "giris" ? "Şimdi kaydol" : "Giriş yap"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
