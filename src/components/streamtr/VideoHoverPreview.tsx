import { useEffect, useRef, useState } from "react";
import type { Title } from "@/data/content";
import { supabase } from "@/integrations/supabase/client";
import { getDirectPreviewSource, getEmbedPlaybackSource } from "@/lib/playbackSource";

const PREVIEW_SECONDS = 5;
const metadataCache = new Map<string, VideoMetadata | null>();

type VideoMetadata = {
  poster?: string;
  preview?: string;
  previewFrames?: string[];
};

function getEmbedSrc(value: string) {
  return value.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1] || value;
}

function isDirectPreviewVideo(value: string | undefined | null) {
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(value || "");
}

function getMetadataSource(item: Title) {
  return getEmbedPlaybackSource(item);
}

function seekToPreviewStart(video: HTMLVideoElement, previewStart: number) {
  try {
    video.currentTime = previewStart;
  } catch {
    // Some browsers only allow seeking once metadata is ready.
  }
}

async function fetchVideoMetadata(source: string) {
  const normalizedSource = getEmbedSrc(source);
  if (metadataCache.has(normalizedSource)) {
    return metadataCache.get(normalizedSource);
  }

  try {
    const { data, error } = await supabase.functions.invoke<VideoMetadata>("fetch-video-metadata", {
      body: { url: normalizedSource },
    });
    const metadata = !error && data ? data : null;
    metadataCache.set(normalizedSource, metadata);
    return metadata;
  } catch {
    metadataCache.set(normalizedSource, null);
    return null;
  }
}

export function VideoHoverPreview({ item, active }: { item: Title; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [resolvedPreview, setResolvedPreview] = useState("");
  const [metadataPoster, setMetadataPoster] = useState("");
  const [metadataFrames, setMetadataFrames] = useState<string[]>([]);
  const [hasActivated, setHasActivated] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const framePreview = metadataFrames.length ? metadataFrames : getEpornerPreviewFrames(item, metadataPoster);
  const directPreview = getDirectPreviewSource(item);
  const metadataSource = getMetadataSource(item);
  const previewSource = directPreview || resolvedPreview;
  const previewStart = item.previewStart || 0;

  useEffect(() => {
    setResolvedPreview("");
    setMetadataPoster("");
    setMetadataFrames([]);
    setHasActivated(false);
    setVideoFailed(false);
  }, [item.id]);

  useEffect(() => {
    if (active) setHasActivated(true);
  }, [active]);

  useEffect(() => {
    setVideoFailed(false);
  }, [previewSource]);

  useEffect(() => {
    let cancelled = false;
    if (!active || directPreview || !metadataSource || framePreview.length) return;

    fetchVideoMetadata(metadataSource).then((metadata) => {
      if (cancelled || !metadata) return;

      if (metadata.poster) {
        setMetadataPoster(metadata.poster);
      }

      if (metadata.previewFrames?.length) {
        setMetadataFrames(metadata.previewFrames);
      }

      if (isDirectPreviewVideo(metadata.preview)) {
        setResolvedPreview(metadata.preview!);
        setVideoFailed(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [active, directPreview, framePreview.length, metadataSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !previewSource || videoFailed) return;

    seekToPreviewStart(video, previewStart);

    if (active) {
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [active, previewSource, previewStart, videoFailed]);

  if (active && previewSource && !videoFailed) {
    return (
      <video
        key={`${previewSource}-${previewStart}`}
        ref={videoRef}
        src={previewSource}
        autoPlay
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={(event) => {
          seekToPreviewStart(event.currentTarget, previewStart);
        }}
        onCanPlay={(event) => {
          event.currentTarget.play().catch(() => undefined);
        }}
        onTimeUpdate={(event) => {
          if (event.currentTarget.currentTime >= previewStart + PREVIEW_SECONDS) {
            seekToPreviewStart(event.currentTarget, previewStart);
          }
        }}
        onEnded={(event) => {
          seekToPreviewStart(event.currentTarget, previewStart);
          event.currentTarget.play().catch(() => undefined);
        }}
        onError={() => {
          setVideoFailed(true);
        }}
        className="pointer-events-none absolute inset-0 z-10 h-full w-full object-cover"
        aria-hidden="true"
      />
    );
  }

  if (framePreview.length && (active || hasActivated)) {
    return (
      <div
        className={`provider-preview-strip pointer-events-none absolute inset-0 z-10 transition-opacity duration-150 ${active ? "opacity-100" : "opacity-0"}`}
        data-active={active ? "true" : "false"}
        aria-hidden="true"
      >
        {framePreview.map((frame, index) => (
          <img
            key={frame}
            src={frame}
            alt=""
            loading={index === 0 ? "eager" : "lazy"}
            className="provider-preview-frame absolute inset-0 h-full w-full object-cover"
            style={{ animationDelay: `${index * 0.5}s` }}
          />
        ))}
      </div>
    );
  }

  if (!active) return null;

  return null;
}

function getEpornerPreviewFrames(item: Title, metadataPoster = "") {
  return getEpornerPreviewFramesFromSources([item.poster, item.backdrop, metadataPoster, item.previewUrl, item.trailerUrl, item.videoUrl]);
}

function getEpornerPreviewFramesFromSources(sources: Array<string | undefined>) {
  const sourceList = sources.filter(Boolean) as string[];
  const staticBase = sourceList
    .map((source) => source.match(/(https?:\/\/[^"']*eporner\.com\/thumbs\/[^"']+\/)\d+_\d+\.jpg/i)?.[1])
    .find(Boolean);

  if (staticBase) {
    return Array.from({ length: 10 }, (_, index) => `${staticBase}${index + 1}_240.jpg`);
  }

  const id = sourceList
    .map((source) =>
      source.match(/eporner\.com\/thumbs\/[^"']+\/(\d+)\/\d+_\d+\.jpg/i)?.[1] ||
      source.match(/imggen\.eporner\.com\/(\d+)\//i)?.[1]
    )
    .find(Boolean);

  return id ? Array.from({ length: 10 }, (_, index) => `https://imggen.eporner.com/${id}/1280/720/${index + 1}.jpg`) : [];
}
