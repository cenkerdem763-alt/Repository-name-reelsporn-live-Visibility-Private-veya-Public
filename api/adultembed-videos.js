// Server-side AdultEmbed catalogue adapter. Public v1 endpoints require no API key.
// Never expose account keys to Vite/browser bundles.
const SOURCE = 'https://adultembed.com/api/v1/search';
const SITE = 'https://www.reelsporn.live';

function durationText(seconds) {
  const n = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
}

function safeUrl(value) {
  if (typeof value !== 'string') return '';
  try {
    const u = new URL(value);
    return u.protocol === 'https:' ? u.toString() : '';
  } catch { return ''; }
}

export function mapAdultEmbedResult(v) {
  if (!v || !Number.isSafeInteger(Number(v.id)) || !v.title) return null;
  const id = String(v.id);
  const embed = safeUrl(v.embed?.url) || `https://adultembed.com/player/embed/${id}/`;
  // Do not accept off-domain player redirects from arbitrary upstream data.
  if (!['adultembed.com', 'pornalizer.app'].includes(new URL(embed).hostname)) return null;
  const poster = safeUrl(v.thumbnail?.url || v.thumbnail || v.thumbnails?.[0]?.url || v.thumb || v.poster);
  const categories = (Array.isArray(v.categories) ? v.categories : [])
    .map((c) => typeof c === 'string' ? c : c?.name)
    .filter((name) => typeof name === 'string' && name.length > 0)
    .slice(0, 5);
  const translated = v.translation && typeof v.translation === 'object' ? v.translation : {};
  const seconds = Number(v.duration_seconds) || (typeof v.duration === 'number' ? v.duration : 0);
  return {
    id: `adultembed-${id}`,
    title: String(translated.title || v.title).slice(0, 180),
    description: String(translated.description || v.description || '').slice(0, 600),
    thumbnail: poster || '/placeholder.svg',
    backdrop: poster || '/placeholder.svg',
    embedUrl: embed,
    duration: seconds ? durationText(seconds) : (typeof v.duration === 'string' ? v.duration : 'Kısa video'),
    categories: ['Kısa Video', ...categories],
    year: Number(String(v.published_at || '').slice(0,4)) || new Date().getFullYear(),
    featured: true,
    rating: '18+',
    type: 'film',
  };
}

export async function getAdultEmbedVideos(fetcher = fetch) {
  const url = new URL(SOURCE);
  url.searchParams.set('sort', 'shortest');
  url.searchParams.set('min_duration', '10');
  url.searchParams.set('max_duration', '60');
  url.searchParams.set('per_page', '12');
  url.searchParams.set('lang', 'tr');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher(url, { headers: { 'Accept': 'application/json', 'X-Site-URL': SITE }, signal: controller.signal });
    if (!response.ok) throw new Error(`Upstream HTTP ${response.status}`);
    const body = await response.json();
    if (!Array.isArray(body.results)) throw new Error('Unexpected AdultEmbed response');
    return body.results.map(mapAdultEmbedResult).filter(Boolean).slice(0, 4);
  } finally { clearTimeout(timer); }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }); }
  try {
    const videos = await getAdultEmbedVideos();
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json(videos);
  } catch (error) {
    console.error('AdultEmbed upstream unavailable:', error.message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Video kaynağı geçici olarak kullanılamıyor' });
  }
}
