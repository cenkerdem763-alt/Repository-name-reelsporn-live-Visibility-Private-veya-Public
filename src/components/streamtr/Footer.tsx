import { Link } from "react-router-dom";
import { BadgeInfo, BookOpen, Megaphone, ShieldCheck } from "lucide-react";
import { seoArticles } from "@/data/seoArticles";

const footerLinks = [
  {
    label: "Rehber",
    to: "/rehber",
    description: "SEO ve kategori",
    icon: BookOpen,
    className: "border-primary/20 bg-primary/[0.06] text-primary hover:border-primary/42 hover:bg-primary/[0.11]",
  },
  {
    label: "Reklam ve İletişim",
    to: "/reklam-iletisim",
    description: "İş birlikleri",
    icon: Megaphone,
    className: "border-primary/22 bg-primary/[0.075] text-primary hover:border-primary/45 hover:bg-primary/[0.12]",
  },
  {
    label: "Hakkımızda",
    to: "/hakkimizda",
    description: "Platform bilgisi",
    icon: BadgeInfo,
    className: "border-white/12 bg-white/[0.045] text-white hover:border-white/24 hover:bg-white/[0.075]",
  },
  {
    label: "Gizlilik",
    to: "/gizlilik",
    description: "Veri politikası",
    icon: ShieldCheck,
    className: "border-emerald-400/18 bg-emerald-400/[0.055] text-emerald-300 hover:border-emerald-300/34 hover:bg-emerald-400/[0.095]",
  },
];

const categoryLinks = [
  { label: "Türkçe Reels", to: "/turkce" },
  { label: "Amatör Reels", to: "/amator" },
  { label: "Trend Reels", to: "/trend" },
  { label: "Yeni 18+ Videolar", to: "/yeni" },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border px-4 py-10 text-sm text-muted-foreground md:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {footerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`group flex min-h-20 items-center gap-3 rounded-md border px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition ${link.className}`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-current/18 bg-black/18 transition group-hover:scale-[1.03]">
                <link.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-foreground">{link.label}</span>
                <span className="mt-0.5 block text-xs font-semibold text-current/70">{link.description}</span>
              </span>
            </Link>
          ))}
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 pt-5 text-xs font-semibold text-muted-foreground">
          {categoryLinks.map((link) => (
            <Link key={link.to} to={link.to} className="transition hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-muted-foreground">
          {seoArticles.map((article) => (
            <Link key={article.slug} to={`/rehber/${article.slug}`} className="transition hover:text-foreground">
              {article.title}
            </Link>
          ))}
        </nav>
        <p className="text-xs">© {new Date().getFullYear()} ReelsPorn. Tüm hakları saklıdır.</p>
      </div>
    </footer>
  );
}
