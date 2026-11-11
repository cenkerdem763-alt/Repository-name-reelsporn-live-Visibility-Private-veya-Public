import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { Seo } from "@/components/streamtr/Seo";

const pages = {
  "reklam-iletisim": {
    title: "Reklam ve İletişim",
    description: "Türkçe reels ve 18+ trafik odaklı reklam iş birlikleri için bize ulaşabilirsin.",
    sections: [
      {
        title: "Reklam Alanları",
        body: "Video detay sayfası, ana sayfa ve kategori akışlarında yetişkin trafik odaklı reklam yerleşimleri hazırlanabilir.",
      },
      {
        title: "İletişim",
        body: "Reklam, teknik destek veya içerik talepleri için e-posta üzerinden dönüş yapılır.",
      },
    ],
    cta: "reklam@reelsporn.live",
  },
  hakkimizda: {
    title: "Hakkımızda",
    description: "ReelsPorn, Türkçe reels porno ve 18+ video keşif deneyimi üzerine kurulu bir platformdur.",
    sections: [
      {
        title: "Platform",
        body: "Amacımız Türkçe 18+ videoları sade, hızlı ve mobil öncelikli bir keşif deneyimiyle sunmak.",
      },
      {
        title: "Deneyim",
        body: "Reels akışı, kategori filtreleri ve detay sayfaları yetişkin kullanıcıların hızlı keşif alışkanlığına göre tasarlanır.",
      },
      {
        title: "İçerik İlkesi",
        body: "Platform yalnızca 18+ ve rızaya dayalı yetişkin içerik anlayışıyla ilerler; rıza dışı veya mahremiyet ihlali içeren içerikler desteklenmez.",
      },
    ],
  },
  gizlilik: {
    title: "Gizlilik",
    description: "18+ video deneyiminde kullanıcı gizliliğini korumak ve siteyi güvenli tutmak için temel veri ilkelerimizi özetliyoruz.",
    sections: [
      {
        title: "Veri Kullanımı",
        body: "Site deneyimini geliştirmek, oturum yönetimi sağlamak ve temel güvenlik kontrollerini yürütmek için gerekli veriler işlenebilir.",
      },
      {
        title: "Üçüncü Taraflar",
        body: "Embed video sağlayıcıları, reklam bağlantıları ve analiz araçları kendi gizlilik politikalarına göre veri işleyebilir.",
      },
    ],
  },
} as const;

type PageKey = keyof typeof pages;

export default function InfoPage() {
  const { slug = "hakkimizda" } = useParams();
  const page = pages[(slug as PageKey)] || pages.hakkimizda;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background)),hsl(240_9%_8%))] px-4 pb-20 pt-24 md:px-10">
      <Seo title={`${page.title} - ReelsPorn`} description={page.description} path={`/${slug}`} />
      <section className="mx-auto max-w-3xl">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Ana sayfa
        </Link>

        <div className="border-b border-white/10 pb-8">
          <h1 className="text-3xl font-extrabold tracking-normal md:text-5xl">{page.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            {page.description}
          </p>
        </div>

        <div className="mt-8 space-y-7">
          {page.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-extrabold">{section.title}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>

        {"cta" in page && (
          <a
            href={`mailto:${page.cta}`}
            className="mt-10 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
          >
            <Mail className="h-4 w-4" />
            {page.cta}
          </a>
        )}
      </section>
    </main>
  );
}
