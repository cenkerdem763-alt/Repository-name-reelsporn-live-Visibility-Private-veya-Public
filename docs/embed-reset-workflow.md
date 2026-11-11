# Embed Reset Workflow

Current rule: add only official embed URLs or iframe codes that are allowed to be embedded. Do not use direct MP4 links as the primary source.

## Test Batch

Start with 10-20 videos from one provider.

For each provider, verify:

- iframe loads on desktop and mobile
- video starts inside our fullscreen overlay
- provider does not force a new tab before playback
- poster/thumbnail is available or can be cached
- ads do not cover the whole player forever
- source remains stable after refresh

## Admin Import Format

Use Admin -> Toplu Embed.

One line per video:

```txt
Title | https://provider.example/embed/123 | https://provider.example/thumb.jpg | Category | https://provider.example/preview.mp4
```

Minimum valid line:

```txt
https://provider.example/embed/123
```

Supported watch-link conversion:

- Pornhub watch URL with `viewkey`
- XVideos `/video123...` URL
- XNXX `/video-abc...` URL
- xHamster `/videos/...` URL when the video id is present

When a provider has a share/embed button, prefer copying the official iframe code.

Supported normal link conversion:

```txt
https://www.pornhub.com/view_video.php?viewkey=ph123 -> https://www.pornhub.com/embed/ph123
https://www.xvideos.com/video123456/title -> https://www.xvideos.com/embedframe/123456
https://www.xnxx.com/video-abc123/title -> https://www.xnxx.com/embedframe/abc123
https://xhamster.com/videos/title-abc123 -> https://xhamster.com/embed/abc123
```

The importer stores official embed URLs. Do not use downloaded MP4 files or ripped media as the primary source.

Recommended default fields:

- source name: provider name
- title mode: Source + sıra
- genres: Yeni, Test
- rating: 18+
- auto metadata: on
- featured: off for test batch

## Publish Flow

1. Import 10-20 embeds as a test batch.
2. Open Home, Search, Detail, and Mobile Reels.
3. Run Kaynakları Kontrol Et in Admin.
4. Mark broken items unpublished.
5. When the provider is stable, import the larger batch.
