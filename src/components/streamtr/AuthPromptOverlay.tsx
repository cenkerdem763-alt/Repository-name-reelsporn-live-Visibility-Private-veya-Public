import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Mail, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/contexts/AppContext";
import { toast } from "@/hooks/use-toast";
import { getPasswordChecks, isKnownBreachedPassword, isStrongPassword } from "@/lib/passwordSecurity";
import { TurnstileBox } from "@/components/streamtr/TurnstileBox";
import hero from "@/assets/hero-3.jpg";

type AuthMode = "signup" | "login";

export function AuthPromptOverlay({ onClose }: { onClose?: () => void }) {
  const { signIn, signUp, signInWithGoogle, signInWithX, resetPassword } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";
  const passwordChecks = getPasswordChecks(password, email);

  const sendPasswordReset = async () => {
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
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email || !password) return;
    if (!captchaToken) {
      toast({ title: "Doğrulama gerekli", description: "Lütfen güvenlik doğrulamasını tamamla.", variant: "destructive" });
      return;
    }

    if (isSignup) {
      if (password !== confirmPassword) {
        toast({ title: "Şifreler eşleşmiyor", description: "Lütfen şifre tekrarını kontrol et.", variant: "destructive" });
        return;
      }
      if (!isStrongPassword(password, email)) {
        toast({ title: "Daha güçlü bir şifre gerekli", description: "Şifre güvenlik kurallarının tamamını karşılamalı.", variant: "destructive" });
        return;
      }
    }

    setBusy(true);
    try {
      const breached = await isKnownBreachedPassword(password);
      if (breached) {
        toast({
          title: "Bu şifre güvenli değil",
          description: isSignup
            ? "Bu şifre daha önce veri ihlallerinde görülmüş. Lütfen benzersiz bir şifre kullan."
            : "Bu şifre daha önce veri ihlallerinde görülmüş. Lütfen şifreni sıfırla.",
          variant: "destructive",
        });
        setBusy(false);
        return;
      }
    } catch {
      console.warn("Breached password check could not be completed.");
    }

    const { error } = await (isSignup ? signUp(email, password, captchaToken) : signIn(email, password, captchaToken));
    setBusy(false);
    if (error) {
      toast({ title: "Hata", description: error, variant: "destructive" });
      return;
    }

    if (isSignup) {
      toast({ title: "Hesap oluşturuldu", description: "E-postanı doğrulamak için gelen kutunu kontrol et." });
      navigate("/");
      return;
    }

    toast({ title: "Giriş yapıldı" });
    navigate("/");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/82 px-4 backdrop-blur-md">
      <div className="relative w-full max-w-[430px] overflow-hidden rounded-lg border border-white/10 bg-card text-white shadow-[0_26px_80px_rgba(0,0,0,0.46)] ring-1 ring-primary/10">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/40 text-white shadow-lg backdrop-blur transition hover:bg-primary/90"
          aria-label="Kapat"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative h-[300px] overflow-hidden">
          <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.08),rgba(18,18,25,0.28)_46%,rgba(18,18,25,0.92))]" />
          <div className="absolute inset-x-0 bottom-8 px-6 text-center">
            <div className="relative mx-auto mb-2 inline-flex items-center gap-1">
              <span className="text-4xl font-extrabold leading-none tracking-tight text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.62)]">
                Reels
              </span>
              <span className="rounded-md bg-primary/90 px-1.5 py-0.5 text-3xl font-extrabold leading-none tracking-tight text-white shadow-[0_16px_34px_rgba(244,63,94,0.18)]">
                Porn
              </span>
            </div>
            <h2 className="text-[2rem] font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.62)]">
              {isSignup ? "Ücretsiz Üye Ol" : "Giriş Yap"}
            </h2>
          </div>
        </div>

        <div className="bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--background)))] px-6 pb-7 pt-6">
          {!showEmailForm ? (
            <div className="space-y-4">
              <div className="text-center text-sm font-semibold text-white/80">
                {isSignup ? "Şununla üye ol" : "Şununla giriş yap"}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    const { error } = await signInWithGoogle();
                    if (error) toast({ title: "Google giriş hatası", description: error, variant: "destructive" });
                  }}
                  className="grid h-12 place-items-center rounded-lg border border-white/10 bg-background text-xl font-bold transition hover:border-primary/50 hover:bg-secondary"
                  aria-label="Google ile devam et"
                >
                  <span className="font-black">
                    <span className="text-[#4285F4]">G</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const { error } = await signInWithX();
                    if (error) toast({ title: "X giriş hatası", description: error, variant: "destructive" });
                  }}
                  className="grid h-12 place-items-center rounded-lg border border-white/10 bg-background text-2xl font-light transition hover:border-primary/50 hover:bg-secondary"
                  aria-label="X ile devam et"
                >
                  X
                </button>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-sm font-semibold text-white/70">
                <span className="h-px bg-white/15" />
                <span>OR</span>
                <span className="h-px bg-white/15" />
              </div>

              <Button
                type="button"
                onClick={() => setShowEmailForm(true)}
                className="h-12 w-full rounded-lg bg-primary/90 text-base font-semibold text-white hover:bg-primary"
              >
                <Mail className="mr-2 h-5 w-5" />
                E-posta ve şifre ile {isSignup ? "üye ol" : "giriş yap"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setMode(isSignup ? "login" : "signup");
                  setShowEmailForm(true);
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="w-full text-sm font-semibold text-white/75 hover:text-primary"
              >
                {isSignup ? "Zaten hesabın var mı? " : "Hesabın yok mu? "}
                <span className="text-primary">{isSignup ? "Giriş yap" : "Üye ol"}</span>
              </button>
              <p className="mx-auto max-w-[320px] text-center text-xs font-semibold leading-5 text-white/70">
                Devam ederek kullanım şartlarını, gizlilik politikasını ve çerez kullanımını kabul etmiş olursun.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <Input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete={isSignup ? "email" : "username"}
                placeholder="E-posta"
                className="h-12 rounded-lg border-white/10 bg-background text-white"
              />
              <Input
                type="password"
                required
                minLength={isSignup ? 12 : 1}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder={isSignup ? "Güçlü şifre" : "Şifre"}
                className="h-12 rounded-lg border-white/10 bg-background text-white"
              />
              {!isSignup && (
                <div className="-mt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={sendPasswordReset}
                    disabled={busy}
                    className="text-sm font-semibold text-white/65 transition hover:text-primary disabled:pointer-events-none disabled:opacity-50"
                  >
                    Şifremi unuttum?
                  </button>
                </div>
              )}
              {isSignup && (
                <>
                  <Input
                    type="password"
                    required
                    minLength={12}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    placeholder="Şifre tekrar"
                    className="h-12 rounded-lg border-white/10 bg-background text-white"
                  />
                  <div className="space-y-1 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left text-xs">
                    {passwordChecks.map((check) => (
                      <div key={check.label} className={check.passed ? "flex items-center gap-2 text-white" : "flex items-center gap-2 text-white/50"}>
                        {check.passed ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <XCircle className="h-3.5 w-3.5" />}
                        <span>{check.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <TurnstileBox onToken={setCaptchaToken} />
              <Button type="submit" disabled={busy} className="h-12 w-full rounded-lg bg-primary/90 text-base font-semibold hover:bg-primary">
                {busy ? "Lütfen bekle..." : isSignup ? "Hesabı Oluştur" : "Giriş Yap"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setMode(isSignup ? "login" : "signup");
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="w-full text-sm font-semibold text-white/70 hover:text-primary"
              >
                {isSignup ? "Zaten hesabın var mı? Giriş yap" : "Hesabın yok mu? Üye ol"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
