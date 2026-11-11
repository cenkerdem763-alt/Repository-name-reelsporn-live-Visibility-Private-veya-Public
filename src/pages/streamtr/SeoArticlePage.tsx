import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Clock3, ShieldCheck } from "lucide-react";
import { Seo } from "@/components/streamtr/Seo";
import { getSeoArticle, seoArticles, type SeoArticle } from "@/data/seoArticles";

const SITE_URL = "https://www.reelsporn.live";

function ArticleCard({ article }: { article: SeoArticle }) {
  return (
    <Link
      to={`/rehber/${article.slug}`}
      className="group block rounded-md border border-white/10 bg-white/[0.045] p-5 transition hover:border-primary/40 hover:bg-primary/[0.075]"
    >
      <div className="flex items-center gap-2 text-xs font-black uppercase text-primary">
        <BookOpen className="h-4 w-4" />
        {article.eyebrow}
      </div>
      <h2 className="mt-3 text-lg font-black leading-6 text-white transition group-hover:text-primary">
        {article.title}
      </h2>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/62">{article.description}</p>
      <div className="mt-4 flex items-center gap-2 text-xs font-bold text-white/44">
        <Clock3 className="h-3.5 w-3.5" />
        {article.readingTime}
      </div>
    </Link>
  );
}

function RehberIndex() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#080808_0%,#050505_48%,#020202_100%)] px-4 pb-20 pt-24 md:px-10">
      <Seo
        title="ReelsPorn Rehber - Türkçe Reels Porno SEO ve Kategori Bilgileri"
        description="Türkçe reels porno, amatör reels, trend akış ve mobil 18+ video deneyimi için hazırlanmış ReelsPorn rehber sayfaları."
        path="/rehber"
      />
      <section className="mx-auto max-w-5xl">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-white/55 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Ana sayfa
        </Link>

        <div className="border-b border-primary/20 pb-8">
          <p className="text-xs font-black uppercase text-primary">ReelsPorn rehber</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight text-white md:text-5xl">
            Türkçe reels porno ve mobil 18+ video rehberi
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/64 md:text-lg">
            Bu alan kategori yapısını, mobil reels deneyimini ve video SEO temellerini açıklar. İçerikler arama motoru için değil,
            gerçek kullanıcıların kategorileri daha net anlaması için görünür şekilde tutulur.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {seoArticles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </section>
    </main>
  );
}

export default function SeoArticlePage() {
  const { slug } = useParams();

  if (!slug) return <RehberIndex />;

  const article = getSeoArticle(slug);
  if (!article) return <Navigate to="/rehber" replace />;

  const related = seoArticles.filter((item) => item.slug !== article.slug).slice(0, 3);
  const articleUrl = `${SITE_URL}/rehber/${article.slug}`;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#080808_0%,#050505_44%,#020202_100%)] px-4 pb-20 pt-24 md:px-10">
      <Seo
        title={`${article.title} - ReelsPorn Rehber`}
        description={article.description}
        path={`/rehber/${article.slug}`}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.description,
          datePublished: article.updatedAt,
          dateModified: article.updatedAt,
          inLanguage: "tr",
          author: { "@type": "Organization", name: "ReelsPorn" },
          publisher: { "@type": "Organization", name: "ReelsPorn" },
          mainEntityOfPage: articleUrl,
        }}
      />

      <article className="mx-auto max-w-4xl">
        <Link to="/rehber" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-white/55 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Rehbere dön
        </Link>

        <header className="border-b border-primary/20 pb-8">
          <p className="text-xs font-black uppercase text-primary">{article.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-white md:text-5xl">{article.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/64 md:text-lg">{article.description}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-bold text-white/50">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.045] px-3 py-2">
              <Clock3 className="h-3.5 w-3.5" />
              {article.readingTime}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.045] px-3 py-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              Güncel: {article.updatedAt}
            </span>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          {article.highlights.map((highlight) => (
            <span key={highlight} className="rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-black text-primary">
              {highlight}
            </span>
          ))}
        </div>

        <div className="mt-10 space-y-9">
          {article.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-2xl font-black text-white">{section.title}</h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-white/66">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-12 border-t border-white/10 pt-8">
          <p className="text-xs font-black uppercase text-primary">İlgili rehberler</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {related.map((item) => (
              <ArticleCard key={item.slug} article={item} />
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}
