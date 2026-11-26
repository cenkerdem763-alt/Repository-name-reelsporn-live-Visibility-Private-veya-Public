# Video source setup

Use the `ReelsPorn Studio` admin page with a direct MP4/WebM/OGG or HLS `.m3u8` URL. An external iframe/player URL is not supported. For local/static content, populate `public/videos.json` following the README schema or put media under `public/videos/`.

Use HTTPS and streams that you have rights to publish. For HLS, the playlist and its segments must permit CORS requests from the site origin. The frontend uses native Safari HLS playback and hls.js for compatible non-Safari browsers.

To select the static JSON catalogue: `VITE_CONTENT_SOURCE=iptv`. To use the existing database and `/admin` uploads: `VITE_CONTENT_SOURCE=supabase`.
