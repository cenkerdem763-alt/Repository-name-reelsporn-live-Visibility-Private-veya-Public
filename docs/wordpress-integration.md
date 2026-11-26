# WordPress REST integration (optional)

WordPress can still provide metadata, titles, images and a **direct** playable video URL via `video_url`. Third-party iframe/player code is no longer supported. Set `VITE_CONTENT_SOURCE=wordpress` only if you intentionally use WordPress as your catalogue source. The WordPress `_embed=1` REST query parameter refers to WP's own expanded metadata fields and is not a third-party video player.
