// Type definitions + DB mapping for content
import type { Tables } from "@/integrations/supabase/types";

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
};

export type Row = { title: string; items: Title[] };

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

export const fallbackTitles: Title[] = [
  {
    id: "istanbul-geceleri",
    title: "Istanbul Geceleri",
    poster: "/content/poster-1.jpg",
    backdrop: "/content/hero-1.jpg",
    year: 2026,
    duration: "2s 08dk",
    rating: "16+",
    genres: ["Dram", "Gerilim", "Suç"],
    description: "Şehrin ışıltılı yüzünün ardında saklanan sırlar, tek bir gecede herkesi başka bir yola sürükler.",
    match: 98,
    type: "dizi",
    videoUrl: sampleVideoUrl,
    featured: true,
  },
  {
    id: "kuzey-hatti",
    title: "Kuzey Hatti",
    poster: "/content/poster-2.jpg",
    backdrop: "/content/hero-2.jpg",
    year: 2025,
    duration: "1s 54dk",
    rating: "13+",
    genres: ["Aksiyon", "Macera"],
    description: "Eski bir dostluk, zorlu bir rota ve geri dönüşü olmayan bir karar.",
    match: 95,
    type: "film",
    videoUrl: sampleVideoUrl,
    featured: true,
  },
  {
    id: "son-durak",
    title: "Son Durak",
    poster: "/content/poster-3.jpg",
    backdrop: "/content/hero-3.jpg",
    year: 2026,
    duration: "1s 42dk",
    rating: "16+",
    genres: ["Gizem", "Gerilim"],
    description: "Kaybolan bir yolcunun ardından başlayan arayış, kasabanın unutulmuş geçmişini ortaya çıkarır.",
    match: 93,
    type: "film",
    videoUrl: sampleVideoUrl,
    featured: true,
  },
  {
    id: "mavi-saat",
    title: "Mavi Saat",
    poster: "/content/poster-4.jpg",
    backdrop: "/content/hero-1.jpg",
    year: 2024,
    duration: "8 Bölüm",
    rating: "13+",
    genres: ["Romantik", "Dram"],
    description: "İki farklı hayat, günün en sessiz saatinde aynı sahilde kesişir.",
    match: 91,
    type: "dizi",
    videoUrl: sampleVideoUrl,
  },
  {
    id: "golge-oyunu",
    title: "Golge Oyunu",
    poster: "/content/poster-5.jpg",
    backdrop: "/content/hero-2.jpg",
    year: 2025,
    duration: "10 Bölüm",
    rating: "18+",
    genres: ["Suç", "Politik", "Dram"],
    description: "Gücün el değiştirdiği bir şehirde herkes kendi hamlesini gizler.",
    match: 90,
    type: "dizi",
    videoUrl: sampleVideoUrl,
  },
  {
    id: "yeni-rota",
    title: "Yeni Rota",
    poster: "/content/poster-6.jpg",
    backdrop: "/content/hero-3.jpg",
    year: 2026,
    duration: "1s 36dk",
    rating: "7+",
    genres: ["Aile", "Komedi"],
    description: "Plansız başlayan bir yolculuk, aileyi beklenmedik bir maceranın ortasına bırakır.",
    match: 88,
    type: "film",
    videoUrl: sampleVideoUrl,
  },
  {
    id: "sessiz-kiyi",
    title: "Sessiz Kiyi",
    poster: "/content/poster-7.jpg",
    backdrop: "/content/hero-1.jpg",
    year: 2024,
    duration: "1s 49dk",
    rating: "13+",
    genres: ["Dram", "Gizem"],
    description: "Kıyıya vuran tek bir not, yıllardır saklanan bir hikayeyi yeniden başlatır.",
    match: 86,
    type: "film",
    videoUrl: sampleVideoUrl,
  },
  {
    id: "zirve",
    title: "Zirve",
    poster: "/content/poster-8.jpg",
    backdrop: "/content/hero-2.jpg",
    year: 2025,
    duration: "6 Bölüm",
    rating: "13+",
    genres: ["Belgesel", "Spor"],
    description: "Başarıya giden yolun görünmeyen bedellerini anlatan yüksek tempolu bir seri.",
    match: 84,
    type: "dizi",
    videoUrl: sampleVideoUrl,
  },
];

export const fallbackRows: Row[] = [
  { title: "Bugün Öne Çıkanlar", items: fallbackTitles.slice(0, 6) },
  { title: "Filmler", items: fallbackTitles.filter((item) => item.type === "film") },
  { title: "Diziler", items: fallbackTitles.filter((item) => item.type === "dizi") },
];

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
    description: r.description,
    match: r.match_score,
    type: (r.type as "film" | "dizi"),
    trailerUrl: r.trailer_url ?? undefined,
    videoUrl: r.video_url ?? undefined,
    featured: r.featured,
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
  const source = video.embedUrl || video.videoUrl || video.trailerUrl;
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
    previewUrl: video.previewUrl || (/\.(mp4|webm|ogg)(\?|#|$)/i.test(source) ? source : undefined),
    previewStart: video.previewStart || 0,
    featured: video.featured ?? index < 6,
  };
}

export async function fetchJsonTitles(): Promise<Title[]> {
  const response = await fetch("/videos.json", { cache: "no-cache" });
  if (!response.ok) return fallbackTitles;

  const data = await response.json();
  if (!Array.isArray(data)) return fallbackTitles;

  const titles = data
    .map((video, index) => mapJsonVideo(video, index))
    .filter((video): video is Title => Boolean(video));

  return titles.length ? titles : fallbackTitles;
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
