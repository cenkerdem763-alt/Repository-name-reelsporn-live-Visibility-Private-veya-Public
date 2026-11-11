# Guvenlik kontrol listesi

## Supabase Auth ayarlari

Dashboard uzerinden `Authentication > Settings` altinda su ayarlari acik olmali:

- Minimum sifre uzunlugu: en az 12 karakter.
- Gerekli karakterler: kucuk harf, buyuk harf, rakam ve sembol.
- Leaked password protection: acik. Supabase bu kontrolde Have I Been Pwned Pwned Passwords API kullanir.
- E-posta dogrulama: acik.
- Bot and Abuse Protection: hCaptcha veya Cloudflare Turnstile ile CAPTCHA acik.
- Rate Limits: signup, OTP, verify ve token refresh limitleri prod trafik seviyesine gore daraltilmis.
- MFA: destekleniyorsa hesap ayarlarinda kullaniciya TOTP MFA kurulumu sunulmali.

## Sosyal giris

Dashboard uzerinden `Authentication > Providers` altinda su provider'lar acik olmali:

- Google: Google Cloud OAuth client ID ve client secret girilmeli.
- X: X Developer Portal OAuth 2.0 client ID ve client secret girilmeli.

Callback URL iki provider tarafinda da izinli olmalidir:

```text
https://xaoimbvdfctwvxviqppo.supabase.co/auth/v1/callback
```

Supabase URL ayarlari:

- Site URL: `https://www.reelsporn.live`
- Redirect URL allow list: `https://www.reelsporn.live/**`

## Uygulama tarafinda eklenenler

- Kayit ekraninda 12+ karakter, buyuk/kucuk harf, rakam, sembol ve yaygin kelime kontrolu var.
- Kayit ekraninda sifre tekrari var.
- Yeni kayit sifresi, sifrenin kendisi gonderilmeden k-anonim SHA-1 prefix kontroluyle ihlal listesine bakiliyor.
- Login ve signup inputlari dogru `autocomplete` degerleriyle ayarlandi.
- Sifre sifirlama maili icin `request-password-reset` Edge Function eklendi. Supabase recovery linkini uretir, maili Resend uzerinden bizim HTML sablonumuzla yollar.
- Metadata Edge Function sadece POST kabul eder, local/private URL'leri reddeder, HTML boyutunu sinirlar ve timeout kullanir.

## Ozel sifre sifirlama maili

Supabase secret olarak su degerler tanimli olmali:

- `RESEND_API_KEY`: Resend API key.
- `MAIL_FROM`: Ornek `ReelsPorn <noreply@reelsporn.live>`.
- `SITE_URL`: `https://www.reelsporn.live`.

Deploy:

```bash
npx supabase secrets set RESEND_API_KEY=... MAIL_FROM="ReelsPorn <noreply@reelsporn.live>" SITE_URL="https://www.reelsporn.live"
npx supabase functions deploy request-password-reset
```

## Not

Google/Chrome'un "Kayitli sifrelerinizi kontrol edin" uyarisi tarayici seviyesinde calisir. Uygulama bunu kapatamaz; hedef, kullanicinin ihlale dusmus veya zayif sifreyle hesap olusturmasini engellemektir.
