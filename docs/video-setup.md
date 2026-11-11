# Video ekleme notlari

Baslangicta az video ile test etmek icin yerel dosyalari `public/videos` klasorune koyabilirsin veya izinli embed kodlarini admin panelinden ekleyebilirsin.

Ornek:

- `public/videos/ornek-1.mp4`
- Admin panelindeki Video URL alani: `/videos/ornek-1.mp4`

Embed icin:

- Video URL alanina direkt embed URL yazabilirsin: `https://site.test/embed/123`
- Ya da iframe kodunu komple yapistirabilirsin: `<iframe src="https://site.test/embed/123"></iframe>`
- Toplu Embed ekraninda `Embed sayfasindan baslik ve taglari cek` aciksa, sistem her link icin Supabase Edge Function uzerinden sayfa metadatasini okumaya calisir.
- Otomatik cekme, kaynak sayfada `og:title`, `description`, `keywords`, `article:tag`, `video:tag` veya `og:image` gibi alanlar varsa baslik, aciklama, tag ve poster bilgisini doldurur.
- Hover onizleme icin iframe oynatilmaya calisilmaz. Direkt MP4/WebM onizleme varsa video etiketi kullanilir; yoksa desteklenen kaynaklarda poster/thumbnail frame dizisi sessiz animasyon olarak gosterilir.
- Bu ozellik icin function deploy edilmelidir: `supabase functions deploy fetch-video-metadata`

Otomatik kaynak tarama:

- Admin panelindeki `Otomatik Kaynak` butonu RSS, Atom, sitemap, JSON feed veya izinli HTML liste sayfalarindan video/embed linklerini cekip toplu olarak `titles` tablosuna ekler.
- Kaynak URL ornekleri: `https://site.test/rss.xml`, `https://site.test/sitemap.xml`, `https://site.test/videos.json`, `https://site.test/videos`.
- `Filtre` alanina `/embed/`, `/video/` veya kaynakta ortak gecen bir kelime yazarsan sadece o linkler eklenir.
- JSON feed icin desteklenen baslica alanlar: `items`, `videos`, `url`, `embedUrl`, `videoUrl`, `title`, `description`, `poster`, `thumbnail`, `previewUrl`, `genres`, `categories`, `tags`.
- Kaynak tarama icin ikinci function da deploy edilmelidir: `supabase functions deploy fetch-video-source`
- Otomatik tarama yalnizca izinli/partner kaynaklarda, telif ve yas uygunlugu kontrol edilmis icerikler icin kullanilmalidir. Gerekirse bu akisi n8n veya Supabase cron ile periyodik calistirip admin onayina dusurebilirsin.

Poster ve arka plan icin de ayni mantik calisir:

- `public/content/ornek-poster.jpg`
- Poster URL: `/content/ornek-poster.jpg`

Gorsel sagligi ve storage sabitleme:

- Admin panelindeki `Gorselleri Sabitle` butonu poster/backdrop URL'lerini kontrol eder.
- Uzak gorsel erisilebilirse `content` Supabase Storage bucket'ina kopyalanir ve kayit artik storage URL'sini kullanir.
- Poster erisilemezse kaydin `artwork_status` degeri `broken`, `publication_status` degeri `unpublished` olur; kullanici tarafinda gorunmez.
- Tekil kayitta gorsel ikonuna basarak sadece o videonun posterini onarabilirsin.
- Bu ozellik icin function deploy edilmelidir: `supabase functions deploy manage-title-artwork`

Otomatik bakim:

- `run-content-maintenance` Edge Function video kaynagi ve gorselleri periyodik kontrol eder.
- `content-maintenance-daily` cron job'u her gun 03:23 UTC'de calisir ve en fazla 50 kaydi isler.
- Cron, service-role anahtarini repo icinde tutmaz; `content_maintenance_service_role_key` adli Supabase Vault secret'ini kullanir.
- Bozuk video veya poster bulunursa kayit `publication_status = unpublished` olur.
- Her calisma `content_maintenance_runs` tablosuna yazilir ve admin panelindeki `Bakim` sekmesinde gorunur.
- Bu ozellik icin function deploy edilmelidir: `supabase functions deploy run-content-maintenance`

Buyume notu:

- Ana sayfa ve liste sayfalari ayni anda binlerce kart basmamali.
- Video player sadece kullanici videoya girdiginde calismali.
- Gercek yayin icin videolari proje klasorunde tutmak yerine S3, Cloudflare R2, Bunny veya benzeri bir storage/CDN tarafina tasimak gerekir.
- Yetiskin icerikte yalnizca yasal, izinli ve tum katilimcilari yetiskin olan icerikler kullanilmali; yas dogrulama, telif/DMCA ve moderasyon akisi bastan planlanmali.
