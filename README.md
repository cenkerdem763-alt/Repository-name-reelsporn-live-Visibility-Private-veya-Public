# ReelsPorn — Mobile Reels / Direct IPTV Playback

The legacy AdultEmbed API, third-party iframe player components, video-proxy routes, source scrapers, and browser-check proxies have been removed from this project archive.

## Getting started

```sh
npm install
npm run build
npm run dev
```

For Vercel, set `VITE_CONTENT_SOURCE=iptv` and deploy the new code to the project serving `www.reelsporn.live`. Remove the previous `VITE_CONTENT_SOURCE=adultembed` variable. `public/videos.json` is intentionally empty until you supply video streams you are authorized to publish. The site shows a designed empty state until content is added.

## Video input

Either add data to `public/videos.json` (for static catalogue), or manage the existing Supabase `titles` table using `/admin` (requires an admin role). The static feed is selected with `VITE_CONTENT_SOURCE=iptv`; to read database rows instead select `VITE_CONTENT_SOURCE=supabase`.

Example **format only** (replace example URLs with your own licensed streams):

```json
[
  {
    "id": "short-001",
    "title": "Kısa Video 01",
    "description": "Dikey video",
    "videoUrl": "https://media.example.com/short-001.m3u8",
    "poster": "https://media.example.com/short-001.jpg",
    "duration": "0:25",
    "categories": ["Yeni", "Kısa Video"],
    "featured": true
  }
]
```

Supported: HTTPS direct video URLs ending in `.mp4`, `.webm`, `.ogg`, and HLS `.m3u8`, plus same-origin `/videos/...` paths. An IPTV channel-list `.m3u` is **not** a playable HLS stream and needs separate parsing. Streams must support HTTPS, CORS, and appropriate playback rights.

HLS plays natively on Safari/iOS; for other compatible browsers, the client loads `hls.js` via jsDelivr at runtime. That CDN must be reachable by viewers. No old embed or proxy endpoints are needed.

## Mobile UI

Full-screen `100dvh` vertical snap scrolling, premium dark styling, category picker, muted autoplay, tap to pause, audio toggle, like/bookmark/share actions, and bottom navigation. Only the active and neighboring videos mount as playback elements to reduce network usage.

## Security/deployment housekeeping

Never commit `.env` or service-role/API secrets. Rotate any secrets previously shared in chat. Removing Supabase Edge Function source folders from this archive does **not** delete functions already deployed to Supabase; delete obsolete deployed functions separately from the dashboard/CLI. Apply the SQL migration to unschedule the old maintenance cron job. Keep the correct Vercel project/domain; do not delete unrelated projects blindly.
