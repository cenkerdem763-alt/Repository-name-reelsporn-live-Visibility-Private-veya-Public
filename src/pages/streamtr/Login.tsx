import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { getPasswordChecks, isKnownBreachedPassword, isStrongPassword } from "@/lib/passwordSecurity";
import { supabase } from "@/integrations/supabase/client";
import { TurnstileBox } from "@/components/streamtr/TurnstileBox";
import { CheckCircle2, Play, XCircle } from "lucide-react";
import hero from "@/assets/hero-1.jpg";

export default function Login() {
  const { signIn, signUp, resetPassword, updatePassword } = useApp();
  const nav = useNavigate();
  const [mode, setMode] = useState<"giris" | "kayit" | "sifre">("giris");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [busy, setBusy] = useState(false);
  const passwordChecks = getPasswordChecks(pwd, email);
  const isSignup = mode === "kayit";
  const isPasswordUpdate = mode === "sifre";

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("sifre");
        setPwd("");
        setConfirmPwd("");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pwd || (!email && !isPasswordUpdate)) return;
    if (!isPasswordUpdate && !captchaToken) {
      toast({ title: "Doğrulama gerekli", description: "Lütfen güvenlik doğrulamasını tamamla.", variant: "destructive" });
      return;
    }

    if (isSignup || isPasswordUpdate) {
      if (pwd !== confirmPwd) {
        toast({ title: "Şifreler eşleşmiyor", description: "Lütfen şifre tekrarını kontrol et.", variant: "destructive" });
        return;
      }
      if (!isStrongPassword(pwd, email)) {
        toast({ title: "Daha güçlü bir şifre gerekli", description: "Şifre güvenlik kurallarının tamamını karşılamalı.", variant: "destructive" });
        return;
      }
    }

    setBusy(true);

    try {
      const breached = await isKnownBreachedPassword(pwd);
      if (breached) {
        setBusy(false);
        toast({
          title: "Bu şifre güvenli değil",
          description: isSignup || isPasswordUpdate
            ? "Bu şifre daha önce veri ihlallerinde görülmüş. Lütfen benzersiz bir şifre kullan."
            : "Bu şifre daha önce veri ihlallerinde görülmüş. Lütfen şifreni sıfırla.",
          variant: "destructive",
        });
        return;
      }
    } catch {
      console.warn("Breached password check could not be completed.");
    }

    if (isPasswordUpdate) {
      const { error } = await updatePassword(pwd);
      setBusy(false);
      if (error) {
        toast({ title: "Şifre güncellenemedi", description: error, variant: "destructive" });
        return;
      }
      toast({ title: "Şifre güncellendi", description: "Yeni şifrenle güvenle devam edebilirsin." });
      nav("/");
      return;
    }

    const fn = mode === "giris" ? signIn : signUp;
    const { error } = await fn(email, pwd, captchaToken);
    setBusy(false);
    if (error) {
      toast({ title: "Hata", description: error, variant: "destructive" });
      return;
    }
    if (isSignup) {
      toast({ title: "Hesap oluşturuldu", description: "E-postanı doğrulamak için gelen kutunu kontrol et." });
      nav("/");
      return;
    }
    nav("/");
  };

  return (
    <div className="relative min-h-screen">
      <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-background/70" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="px-6 md:px-12 py-6">
          <div className="inline-flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-md border border-primary/30 bg-primary text-white shadow-[0_12px_30px_rgba(255,23,77,0.24)]">
              <Play className="h-4 w-4 fill-current" />
            </span>
            <span className="text-3xl font-black leading-none tracking-tight">
              <span className="text-foreground">Reels</span>
              <span className="text-primary">Porn</span>
            </span>
          </div>
        </header>
        <div className="flex-1 grid place-items-center px-4">
          <form onSubmit={onSubmit} className="w-full max-w-md rounded-lg bg-background/90 backdrop-blur p-8 md:p-12 space-y-5 animate-scale-in border border-border">
            <h1 className="text-3xl font-bold">{mode === "giris" ? "Giriş Yap" : mode === "kayit" ? "Üye Ol" : "Yeni Şifre"}</h1>
            <Input type="email" required={mode !== "sifre"} disabled={mode === "sifre"} value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete={isSignup ? "email" : "username"}
              placeholder="E-posta" className="h-12 bg-secondary border-border" />
            <Input type="password" required minLength={isSignup || isPasswordUpdate ? 12 : 1} value={pwd} onChange={(e) => setPwd(e.target.value)}
              autoComplete={isSignup || isPasswordUpdate ? "new-password" : "current-password"}
              placeholder={isSignup || isPasswordUpdate ? "Güçlü şifre" : "Şifre"} className="h-12 bg-secondary border-border" />
            {mode === "giris" && (
              <div className="-mt-2 flex justify-end">
                <button
                  type="button"
                  className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                  onClick={async () => {
                    if (!email) {
                      toast({ title: "E-posta gerekli", description: "Şifre sıfırlama için e-posta adresini yaz.", variant: "destructive" });
                      return;
                    }
                    if (!captchaToken) {
                      toast({ title: "Doğrulama gerekli", description: "Lütfen güvenlik doğrulamasını tamamla.", variant: "destructive" });
                      return;
                    }
                    setBusy(true);
                    const { error } = await resetPassword(email, captchaToken);
                    setBusy(false);
                    toast({
                      title: error ? "Sıfırlama gönderilemedi" : "Sıfırlama e-postası gönderildi",
                      description: error || "Gelen kutunu kontrol et.",
                      variant: error ? "destructive" : undefined,
                    });
                  }}
                >
                  Şifremi unuttum
                </button>
              </div>
            )}
            {(isSignup || isPasswordUpdate) && (
              <>
                <Input
                  type="password"
                  required
                  minLength={12}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Şifre tekrar"
                  className="h-12 bg-secondary border-border"
                />
                <div className="space-y-2 rounded-md border border-border bg-secondary/60 p-3 text-sm">
                  {passwordChecks.map((check) => (
                    <div key={check.label} className={check.passed ? "flex items-center gap-2 text-foreground" : "flex items-center gap-2 text-muted-foreground"}>
                      {check.passed ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4" />}
                      <span>{check.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {!isPasswordUpdate && <TurnstileBox onToken={setCaptchaToken} />}
            <Button type="submit" disabled={busy} className="w-full h-12 bg-primary hover:bg-primary/90 font-bold text-base">
              {busy ? "Lütfen bekle..." : mode === "giris" ? "Giriş Yap" : mode === "kayit" ? "Hesabı Oluştur" : "Şifreyi Güncelle"}
            </Button>
            {mode !== "sifre" && <div className="text-sm text-muted-foreground">
              {mode === "giris" ? "ReelsPorn'a yeni misin?" : "Zaten üye misin?"}{" "}
              <button type="button" onClick={() => { setMode(mode === "giris" ? "kayit" : "giris"); setPwd(""); setConfirmPwd(""); }} className="text-foreground hover:underline">
                {mode === "giris" ? "Şimdi kaydol" : "Giriş yap"}
              </button>
            </div>}
          </form>
        </div>
      </div>
    </div>
  );
}
