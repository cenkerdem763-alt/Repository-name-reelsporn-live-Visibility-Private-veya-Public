import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ContentCard } from "@/components/streamtr/ContentCard";
import { Seo } from "@/components/streamtr/Seo";
import { useAllTitles } from "@/hooks/useContent";
import { Button } from "@/components/ui/button";
import { getLikeCount, getViewCount } from "@/lib/engagement";

const labels: Record<string, string> = {
  turkce: "Türkçe Reels",
  amator: "Amatör Reels",
  trend: "Trend Reels",
  yeni: "Yeni 18+ Videolar",
  diziler: "Amatör Reels",
  filmler: "Türkçe Reels",
};
const PAGE_SIZE = 36;

const seoCopy: Record<string, { description: string; heading: string; paragraphs: string[]; highlights: string[] }> = {
  turkce: {
    description: "Türkçe reels porno ve 18+ kısa video içeriklerini tek akışta hızlı keşfet.",
    heading: "Türkçe reels porno arşivi",
    paragraphs: [
      "Türkçe Reels kategorisi, yerli 18+ kısa video arayan kullanıcılar için düzenli ve hızlı taranabilir bir katalog olarak hazırlanır. ReelsPorn içinde bu sayfa; Türkçe başlıklar, kısa video formatı, mobil izleme alışkanlığı ve popüler reels akışı etrafında şekillenir.",
      "Katalog büyüdükçe bu bölümde yeni eklenen Türkçe reels içerikleri, en çok izlenen videolar ve öne çıkan kategoriler daha net ayrılır. Amaç, kullanıcıyı gereksiz sayfalar arasında dolaştırmadan aradığı Türkçe 18+ videoya hızlı ulaştırmak ve her içeriği temiz başlıklarla sunmaktır.",
    ],
    highlights: ["Türkçe reels porno", "Yerli 18+ video", "Mobil kısa video"],
  },
  amator: {
    description: "Amatör reels kategorisinde Türkçe 18+ kısa videoları ve yeni eklenen içerikleri keşfet.",
    heading: "Amatör reels videoları",
    paragraphs: [
      "Amatör Reels sayfası, daha doğal ve kısa formatta 18+ video arayan kullanıcılar için oluşturulan kategori alanıdır. Bu bölümde amaç; amatör başlıkları, Türkçe reels içeriklerini ve yeni eklenen kısa videoları karışmadan listelemektir.",
      "ReelsPorn içinde amatör kategori metinleri ve içerik yapısı, Google'ın sayfanın konusunu anlamasına yardımcı olurken kullanıcıya da daha anlaşılır bir gezinme sağlar. Gerçek içerikler eklendikçe bu alan; popüler amatör videolar, yeni reels akışları ve ilgili alt kategorilerle güçlenecek.",
    ],
    highlights: ["Amatör reels", "Türkçe amatör video", "Yeni 18+ içerik"],
  },
  trend: {
    description: "Trend reels ve popüler 18+ video içeriklerini izlenme ilgisine göre keşfet.",
    heading: "Trend 18+ reels akışı",
    paragraphs: [
      "Trend Reels kategorisi, ReelsPorn içindeki en çok ilgi gören kısa video içeriklerini öne çıkarmak için hazırlanır. Bu sayfa; popüler reels, hızlı izlenen 18+ videolar ve güncel kategori hareketlerini tek yerde toplar.",
      "Trend sayfasının düzenli güncellenmesi, hem kullanıcı deneyimi hem de SEO için önemlidir. Yeni videolar geldikçe izlenme, beğeni ve kategori uyumuna göre içerikler daha doğru sıralanır; böylece ziyaretçiler en canlı akışı daha hızlı bulur.",
    ],
    highlights: ["Trend reels", "Popüler 18+ video", "En çok izlenenler"],
  },
  yeni: {
    description: "Yeni eklenen Türkçe reels porno ve 18+ kısa video içeriklerini güncel akışta takip et.",
    heading: "Yeni eklenen 18+ videolar",
    paragraphs: [
      "Yeni 18+ Videolar sayfası, ReelsPorn'a eklenen son içerikleri takip etmek için oluşturulan güncel akıştır. Kullanıcılar bu bölümde yeni Türkçe reels videolarını, taze amatör içerikleri ve son eklenen kısa videoları daha hızlı keşfedebilir.",
      "Yeni içerik sayfası düzenli beslendiğinde Google'a sitenin aktif olduğunu gösterir. Bu yüzden gerçek video akışı başladığında her yeni içerik; net başlık, açıklama, kategori ve görsel bilgisiyle bu bölümde görünür hale gelecek.",
    ],
    highlights: ["Yeni 18+ videolar", "Son eklenen reels", "Güncel Türkçe içerik"],
  },
};

function normalize(value: string) {
  return value.toLocaleLowerCase("tr");
}

function matchesAny(title: { title: string; genres: string[] }, words: string[]) {
  const haystack = normalize([title.title, ...title.genres].join(" "));
  return words.some((word) => haystack.includes(normalize(word)));
}

export default function Browse() {
  const kind = useLocation().pathname.replace("/", "") || "turkce";
  const label = labels[kind] ?? "Keşfet";
  const copy = seoCopy[kind] ?? seoCopy.turkce;
  const { data: titles = [] } = useAllTitles();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const list = useMemo(() => {
    if (kind === "turkce" || kind === "filmler") {
      const filtered = titles.filter((title) => matchesAny(title, ["türkçe", "turkce", "turkish", "yerli"]));
      return filtered.length ? filtered : titles;
    }
    if (kind === "amator" || kind === "diziler") {
      const filtered = titles.filter((title) => matchesAny(title, ["amatör", "amator", "amateur"]));
      return filtered.length ? filtered : titles;
    }
    if (kind === "trend") return [...titles].sort((a, b) => getViewCount(b) - getViewCount(a) || getLikeCount(b) - getLikeCount(a));
    return [...titles].sort((a, b) => b.year - a.year);
  }, [kind, titles]);
  const visibleItems = list.slice(0, visibleCount);
  const description = copy.description;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [kind]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#080808_0%,#050505_42%,#020202_100%)] px-4 pb-20 pt-24 md:px-10">
      <Seo title={`${label} - ReelsPorn`} description={description} path={`/${kind}`} />
      <div className="mb-8 border-b border-primary/20 pb-5">
        <p className="text-xs font-black uppercase text-primary">ReelsPorn kategori</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-white md:text-4xl">{label}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">{description}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {visibleItems.map((t) => <ContentCard key={t.id} item={t} />)}
      </div>
      {visibleCount < list.length && (
        <div className="mt-10 flex justify-center">
          <Button variant="secondary" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
            Daha fazla göster
          </Button>
        </div>
      )}
      <section className="mt-14 max-w-4xl border-t border-primary/20 pt-7">
        <p className="text-xs font-black uppercase text-primary">Kategori rehberi</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-white">{copy.heading}</h2>
        <div className="mt-4 space-y-4 text-sm leading-7 text-white/64">
          {copy.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {copy.highlights.map((highlight) => (
            <span key={highlight} className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
              {highlight}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
