// Type definitions + DB mapping for content
import type { Tables } from "@/integrations/supabase/types";
import { normalizeProviderSource } from "@/lib/videoSources";

export type Title = {
  id: string;
  title: string;
  poster: string;
  backdrop: string;
  year: number;
  duration: string;
  rating: string;
  genres: string[];
  description: string;
  match: number;
  type: "film" | "dizi";
  trailerUrl?: string;
  videoUrl?: string;
  previewUrl?: string;
  previewStart?: number;
  featured?: boolean;
  publicationStatus?: "published" | "unpublished" | "draft";
  playbackStatus?: "unchecked" | "healthy" | "warning" | "broken";
  playbackCheckedAt?: string | null;
  playbackError?: string | null;
  artworkStatus?: "unchecked" | "healthy" | "cached" | "warning" | "broken";
  artworkCheckedAt?: string | null;
  artworkCachedAt?: string | null;
  artworkError?: string | null;
  posterSourceUrl?: string | null;
  backdropSourceUrl?: string | null;
};

export type Row = { title: string; items: Title[] };

function isDirectPreviewVideo(value: string | null | undefined) {
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(value || "");
}

export function normalizePlayableSource(value: string | null | undefined) {
  return normalizeProviderSource(value);
}

type JsonVideo = {
  id?: string;
  title?: string;
  category?: string;
  categories?: string[];
  thumbnail?: string;
  poster?: string;
  backdrop?: string;
  duration?: string;
  rating?: string;
  year?: number;
  description?: string;
  embedUrl?: string;
  videoUrl?: string;
  trailerUrl?: string;
  previewUrl?: string;
  previewStart?: number;
  featured?: boolean;
  type?: "film" | "dizi";
};

export const sampleVideoUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export const fallbackTitles: Title[] = [];

export const fallbackRows: Row[] = [];

export const temporaryTestTitles: Title[] = [
  {
    id: "test-turkce-reels-01",
    title: "Türkçe Reels Önizleme",
    poster: "/content/poster-1.jpg",
    backdrop: "/content/hero-1.jpg",
    year: 2026,
    duration: "0:12",
    rating: "18+",
    genres: ["Türkçe Reels", "Trend", "HD"],
    description: "Mobil akış testi için geçici kısa video.",
    match: 98,
    type: "film",
    videoUrl: sampleVideoUrl,
    previewUrl: sampleVideoUrl,
    featured: true,
  },
  {
    id: "test-amator-reels-02",
    title: "Amatör Kısa Reels",
    poster: "/content/poster-2.jpg",
    backdrop: "/content/hero-2.jpg",
    year: 2026,
    duration: "0:15",
    rating: "18+",
    genres: ["Amatör", "Yeni", "Reels"],
    description: "Kaydırma ve mobil oynatma testi için geçici içerik.",
    match: 95,
    type: "film",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    previewUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    featured: true,
  },
  {
    id: "test-trend-reels-03",
    title: "Trend Reels Testi",
    poster: "/content/poster-3.jpg",
    backdrop: "/content/hero-3.jpg",
    year: 2026,
    duration: "0:10",
    rating: "18+",
    genres: ["Trend Reels", "Popüler", "Kısa Video"],
    description: "Akış, beğeni ve kategori geçişini test etmek için geçici video.",
    match: 93,
    type: "film",
    videoUrl: sampleVideoUrl,
    previewUrl: sampleVideoUrl,
    featured: true,
  },
];

function cleanDescription(value: string) {
  return /kayna[ğg](ı|i)ndan embed i[çc]erik\.?$/i.test(value.trim()) ? "" : value;
}

export function mapTitle(r: Tables<"titles">): Title {
  return {
    id: r.id,
    title: r.title,
    poster: r.poster_url || "/placeholder.svg",
    backdrop: r.backdrop_url || r.poster_url || "/placeholder.svg",
    year: r.year,
    duration: r.duration,
    rating: r.rating,
    genres: r.genres ?? [],
    description: cleanDescription(r.description),
    match: r.match_score,
    type: (r.type as "film" | "dizi"),
    trailerUrl: normalizePlayableSource(r.trailer_url),
    videoUrl: normalizePlayableSource(r.video_url) || r.video_url?.trim() || undefined,
    previewUrl: isDirectPreviewVideo(r.trailer_url) && r.trailer_url !== r.video_url ? r.trailer_url ?? undefined : undefined,
    previewStart: 0,
    featured: r.featured,
    publicationStatus: (r.publication_status as Title["publicationStatus"]) || "published",
    playbackStatus: (r.playback_status as Title["playbackStatus"]) || "unchecked",
    playbackCheckedAt: r.playback_checked_at,
    playbackError: r.playback_error,
    artworkStatus: (r.artwork_status as Title["artworkStatus"]) || "unchecked",
    artworkCheckedAt: r.artwork_checked_at,
    artworkCachedAt: r.artwork_cached_at,
    artworkError: r.artwork_error,
    posterSourceUrl: r.poster_source_url,
    backdropSourceUrl: r.backdrop_source_url,
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mapJsonVideo(video: JsonVideo, index: number): Title | null {
  const title = video.title?.trim();
  const source = normalizePlayableSource(video.embedUrl || video.videoUrl || video.trailerUrl);
  if (!title || !source) return null;

  const genres = video.categories?.length ? video.categories : [video.category || "Video"];
  const poster = video.poster || video.thumbnail || "/placeholder.svg";
  const backdrop = video.backdrop || video.thumbnail || poster;

  return {
    id: video.id || slugify(title) || `video-${index + 1}`,
    title,
    poster,
    backdrop,
    year: video.year || new Date().getFullYear(),
    duration: video.duration || "Video",
    rating: video.rating || "18+",
    genres,
    description: video.description || genres.join(", "),
    match: 95,
    type: video.type || "film",
    videoUrl: source,
    previewUrl: video.previewUrl || (isDirectPreviewVideo(source) ? source : undefined),
    previewStart: video.previewStart || 0,
    featured: video.featured ?? index < 6,
  };
}

export async function fetchJsonTitles(): Promise<Title[]> {
  const response = await fetch("/videos.json", { cache: "no-cache" });
  if (!response.ok) return [];

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  const titles = data
    .map((video, index) => mapJsonVideo(video, index))
    .filter((video): video is Title => Boolean(video));

  return titles;
}

export function buildRowsFromTitles(titles: Title[]): Row[] {
  const genres = [...new Set(titles.flatMap((title) => title.genres).filter(Boolean))].slice(0, 4);
  const genreRows = genres.map((genre) => ({
    title: genre,
    items: titles.filter((title) => title.genres.includes(genre)),
  }));

  return [
    { title: "Bugün Öne Çıkanlar", items: titles.filter((title) => title.featured).slice(0, 12) || titles.slice(0, 12) },
    ...genreRows,
  ].filter((row) => row.items.length);
}
