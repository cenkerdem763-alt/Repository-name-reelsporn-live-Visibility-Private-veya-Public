import type { Title } from "@/data/content";

function seedFromId(id: string) {
  return id.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 7), 0);
}

export function formatCompactCount(count: number) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1)}M`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K`;
  return String(count);
}

export function getViewCount(item: Pick<Title, "id" | "match">) {
  const seed = seedFromId(item.id);
  return 24_000 + ((seed * 97 + item.match * 811) % 940_000);
}

export function getLikeCount(item: Pick<Title, "id" | "match">, liked = false) {
  const seed = seedFromId(item.id);
  const viewCount = getViewCount(item);
  const ratio = 0.041 + ((seed % 38) / 1000);
  return Math.max(980, Math.round(viewCount * ratio)) + (liked ? 1 : 0);
}

export function getLikeRate(item: Pick<Title, "id" | "match">, liked = false) {
  const viewCount = getViewCount(item);
  const likeCount = getLikeCount(item, liked);
  return Math.min(98, Math.max(82, Math.round((likeCount / viewCount) * 1400)));
}
