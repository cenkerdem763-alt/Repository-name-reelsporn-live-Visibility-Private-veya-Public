import { useNavigate, useParams } from "react-router-dom";
import { Check, Heart, Play, Plus, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { ContentRow } from "@/components/streamtr/ContentRow";
import { useTitle, useAllTitles } from "@/hooks/useContent";

export default function Detail() {
  const { id = "" } = useParams();
  const { data: item, isLoading } = useTitle(id);
  const { data: titles = [] } = useAllTitles();
  const nav = useNavigate();
  const { favorites, toggleFavorite, watchlist, toggleWatchlist } = useApp();
  if (isLoading) return <div className="pt-32 px-10 text-muted-foreground">Yükleniyor...</div>;
  if (!item) return <div className="pt-32 px-10">İçerik bulunamadı.</div>;
  const fav = favorites.includes(item.id);
  const inList = watchlist.includes(item.id);
  const similar = titles.filter((t) => t.id !== item.id).slice(0, 6);

  return (
    <article className="pb-12">
      <section className="relative h-[70vh] min-h-[480px]">
        <img src={item.backdrop} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 gradient-hero-side" />
        <div className="relative z-10 h-full flex items-end px-4 md:px-10 pb-10">
          <div className="max-w-2xl space-y-4 animate-fade-in-up">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-shadow-hero">{item.title}</h1>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-emerald-400 font-semibold">%{item.match} eşleşme</span>
              <span>{item.year}</span>
              <span className="border border-foreground/40 px-1.5 text-xs">{item.rating}</span>
              <span>{item.duration}</span>
              <span className="uppercase tracking-wider text-xs px-2 py-0.5 rounded bg-primary/20 text-primary font-semibold">{item.type}</span>
            </div>
            <p className="text-base md:text-lg max-w-xl text-foreground/90 text-shadow-hero">{item.description}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button size="lg" onClick={() => nav(`/izle/${item.id}`)} className="bg-foreground text-background hover:bg-foreground/90 font-bold">
                <Play className="mr-2 h-5 w-5 fill-background" /> Oynat
              </Button>
              <Button size="lg" variant="secondary" onClick={() => toggleWatchlist(item.id)} className="bg-secondary/80 hover:bg-secondary backdrop-blur">
                {inList ? <Check className="mr-2 h-5 w-5" /> : <Plus className="mr-2 h-5 w-5" />}
                {inList ? "Listemde" : "Listeme Ekle"}
              </Button>
              <Button size="icon" variant="secondary" onClick={() => toggleFavorite(item.id)} className="rounded-full bg-secondary/80 hover:bg-secondary backdrop-blur" aria-label="Favorilere ekle">
                <Heart className={`h-5 w-5 ${fav ? "fill-primary text-primary" : ""}`} />
              </Button>
              <Button size="icon" variant="secondary" className="rounded-full bg-secondary/80 hover:bg-secondary backdrop-blur" aria-label="Paylaş">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 md:px-10 mt-8 grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-2">
          <div><span className="text-muted-foreground">Türler: </span>{item.genres.join(", ")}</div>
          <div><span className="text-muted-foreground">Yapım: </span>{item.year} • ReelsPorn Originals</div>
          <div><span className="text-muted-foreground">Altyazı: </span>Türkçe, İngilizce, Arapça</div>
          <div><span className="text-muted-foreground">Ses: </span>Türkçe 5.1, İngilizce 5.1</div>
        </div>
      </section>

      <div className="mt-10">
        <ContentRow title="Benzer İçerikler" items={similar} />
      </div>
    </article>
  );
}
