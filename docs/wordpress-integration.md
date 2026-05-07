# WordPress entegrasyonu

Bu proje WordPress'i admin panel / icerik kaynagi olarak kullanabilir. React site tasarimi ayni kalir, videolar WordPress REST API'den gelir.

## .env ayari

WordPress kurulduktan sonra `.env` icine ekle:

```env
VITE_WORDPRESS_API_URL="https://reelsporn.live/wp-json"
VITE_WORDPRESS_CONTENT_TYPE="posts"
```

Custom post type kullanirsan:

```env
VITE_WORDPRESS_CONTENT_TYPE="videos"
```

## WordPress alanlari

Her video icin standart post basligi ve aciklamasi okunur. Ek alanlar icin ACF veya REST'e acilan meta alanlari kullanabilirsin.

Desteklenen alan adlari:

- `poster_url`, `poster`, `thumbnail_url`, `thumbnail`
- `backdrop_url`, `backdrop`, `cover_url`, `cover`
- `video_url`, `embed_url`, `embed`, `iframe`, `video`
- `duration`, `sure`
- `rating`, `age_rating`
- `genres`, `genre`, `categories`
- `featured`, `hero`, `one_cikan`
- `year`
- `type`, `content_type`

`video_url` alanina direkt iframe kodu veya embed URL koyabilirsin.

Ornek:

```html
<iframe src="https://ornek-site.test/embed/123"></iframe>
```

## REST API kontrolu

Tarayicida su adres acilmali:

```txt
https://reelsporn.live/wp-json/wp/v2/posts?_embed=1&per_page=10
```

Custom post type icin:

```txt
https://reelsporn.live/wp-json/wp/v2/videos?_embed=1&per_page=10
```

Yasal not: yalnizca izinli, telif sorunu olmayan ve tum katilimcilari yetiskin olan icerikler kullanilmali.
