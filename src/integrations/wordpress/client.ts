import type { Row, Title } from "@/data/content";

type WpRendered = { rendered?: string };
type WpMedia = { source_url?: string; media_details?: { sizes?: Record<string, { source_url?: string }> } };
type WpTerm = { name?: string };

type WpPost = {
  id: number;
  slug?: string;
  date?: string;
  title?: WpRendered;
  excerpt?: WpRendered;
  content?: WpRendered;
  featured_media?: number;
  acf?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  _embedded?: {
    "wp:featuredmedia"?: WpMedia[];
    "wp:term"?: WpTerm[][];
  };
};

const WP_API_URL = import.meta.env.VITE_WORDPRESS_API_URL?.replace(/\/$/, "") || "";
const WP_CONTENT_TYPE = import.meta.env.VITE_WORDPRESS_CONTENT_TYPE || "posts";

export const hasWordPressConfig = Boolean(WP_API_URL);

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function getText(post: WpPost, key: "title" | "excerpt" | "content") {
  return stripHtml(post[key]?.rendered || "");
}

function getField(post: WpPost, key: string) {
  const value = post.acf?.[key] ?? post.meta?.[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

function getStringField(post: WpPost, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = getField(post, key);
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    if (value && typeof value === "object" && "url" in value && typeof value.url === "string") return value.url;
  }
  return fallback;
}

function getBooleanField(post: WpPost, keys: string[]) {
  return keys.some((key) => {
    const value = getField(post, key);
    return value === true || value === "true" || value === "1" || value === 1;
  });
}

function getGenres(post: WpPost) {
  const field = getField(post, "genres") ?? getField(post, "genre") ?? getField(post, "categories");
  if (Array.isArray(field)) return field.map(String).filter(Boolean);
  if (typeof field === "string" && field.trim()) return field.split(",").map((item) => item.trim()).filter(Boolean);

  return (post._embedded?.["wp:term"] || [])
    .flat()
    .map((term) => term.name)
    .filter(Boolean) as string[];
}

function getFeaturedImage(post: WpPost) {
  const media = post._embedded?.["wp:featuredmedia"]?.[0];
  return media?.media_details?.sizes?.large?.source_url || media?.source_url || "";
}

function mapWpPost(post: WpPost): Title {
  const title = getText(post, "title") || `Video ${post.id}`;
  const featuredImage = getFeaturedImage(post);
  const poster = getStringField(post, ["poster_url", "poster", "thumbnail_url", "thumbnail"], featuredImage || "/placeholder.svg");
  const backdrop = getStringField(post, ["backdrop_url", "backdrop", "cover_url", "cover"], poster);
  const rawType = getStringField(post, ["type", "content_type"], "film").toLowerCase();

  return {
    id: post.slug || String(post.id),
    title,
    poster,
    backdrop,
    year: Number(getStringField(post, ["year"], post.date ? post.date.slice(0, 4) : String(new Date().getFullYear()))),
    duration: getStringField(post, ["duration", "sure"], ""),
    rating: getStringField(post, ["rating", "age_rating"], "18+"),
    genres: getGenres(post),
    description: getStringField(post, ["description", "aciklama"], getText(post, "excerpt") || getText(post, "content")),
    match: Number(getStringField(post, ["match_score", "match"], "90")),
    type: rawType === "dizi" ? "dizi" : "film",
    trailerUrl: getStringField(post, ["trailer_url", "trailer"], undefined),
    videoUrl: getStringField(post, ["video_url", "embed_url", "embed", "iframe", "video"], ""),
    featured: getBooleanField(post, ["featured", "hero", "one_cikan"]),
  };
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${WP_API_URL}${path}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`WordPress API error ${response.status}: ${url}`);
  return response.json();
}

export async function fetchWordPressTitles(): Promise<Title[]> {
  const posts = await fetchJson<WpPost[]>(`/wp/v2/${WP_CONTENT_TYPE}?_embed=1&per_page=100`);
  return posts.map(mapWpPost);
}

export async function fetchWordPressTitle(id: string): Promise<Title | null> {
  const posts = await fetchJson<WpPost[]>(`/wp/v2/${WP_CONTENT_TYPE}?_embed=1&slug=${encodeURIComponent(id)}`);
  if (posts[0]) return mapWpPost(posts[0]);

  if (/^\d+$/.test(id)) {
    const post = await fetchJson<WpPost>(`/wp/v2/${WP_CONTENT_TYPE}/${id}?_embed=1`);
    return mapWpPost(post);
  }

  return null;
}

export function buildWordPressRows(titles: Title[]): Row[] {
  const featured = titles.filter((item) => item.featured).slice(0, 12);
  const newest = [...titles].sort((a, b) => b.year - a.year).slice(0, 24);
  const popular = [...titles].sort((a, b) => b.match - a.match).slice(0, 24);

  return [
    { title: "Öne Çıkanlar", items: featured.length ? featured : titles.slice(0, 12) },
    { title: "Yeni Videolar", items: newest },
    { title: "Popüler", items: popular },
  ].filter((row) => row.items.length);
}
