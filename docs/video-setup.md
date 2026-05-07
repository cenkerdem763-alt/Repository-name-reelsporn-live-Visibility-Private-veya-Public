# Video ekleme notlari

Baslangicta az video ile test etmek icin yerel dosyalari `public/videos` klasorune koyabilirsin veya izinli embed kodlarini admin panelinden ekleyebilirsin.

Ornek:

- `public/videos/ornek-1.mp4`
- Admin panelindeki Video URL alani: `/videos/ornek-1.mp4`

Embed icin:

- Video URL alanina direkt embed URL yazabilirsin: `https://site.test/embed/123`
- Ya da iframe kodunu komple yapistirabilirsin: `<iframe src="https://site.test/embed/123"></iframe>`

Poster ve arka plan icin de ayni mantik calisir:

- `public/content/ornek-poster.jpg`
- Poster URL: `/content/ornek-poster.jpg`

Buyume notu:

- Ana sayfa ve liste sayfalari ayni anda binlerce kart basmamali.
- Video player sadece kullanici videoya girdiginde calismali.
- Gercek yayin icin videolari proje klasorunde tutmak yerine S3, Cloudflare R2, Bunny veya benzeri bir storage/CDN tarafina tasimak gerekir.
- Yetiskin icerikte yalnizca yasal, izinli ve tum katilimcilari yetiskin olan icerikler kullanilmali; yas dogrulama, telif/DMCA ve moderasyon akisi bastan planlanmali.
