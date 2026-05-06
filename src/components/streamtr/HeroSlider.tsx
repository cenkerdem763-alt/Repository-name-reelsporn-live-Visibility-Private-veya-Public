import { useEffect, useState } from "react";
import { Info, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFeaturedTitles } from "@/hooks/useContent";

export function HeroSlider() {
  const { data: slides = [] } = useFeaturedTitles();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) {
    return <section className="relative h-[88vh] min-h-[560px] w-full bg-card animate-pulse" />;
  }
  const slide = slides[i % slides.length];

  return (
    <section className="relative h-[88vh] min-h-[560px] w-full overflow-hidden">
      {slides.map((s, idx) => (
        <img
          key={s.id}
          src={s.backdrop}
          alt={s.title}
          width={1920}
          height={1080}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${idx === i ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute inset-0 gradient-hero-side" />
      <div className="absolute inset-0 gradient-hero" />

      <div key={slide.id} className="relative z-10 flex h-full items-end md:items-center px-4 md:px-10 pb-24 md:pb-0 animate-fade-in-up">
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-primary font-bold tracking-widest uppercase">★ ReelsPorn Özel</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-shadow-hero">
            {slide.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-foreground/90">
            <span className="text-emerald-400 font-semibold">%{slide.match} eşleşme</span>
            <span>{slide.year}</span>
            <span className="border border-foreground/40 px-1.5 text-xs">{slide.rating}</span>
            <span>{slide.duration}</span>
          </div>
          <p className="text-base md:text-lg text-foreground/90 line-clamp-3 max-w-xl text-shadow-hero">
            {slide.description}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90 font-bold">
              <Link to={`/izle/${slide.id}`}><Play className="mr-2 h-5 w-5 fill-background" /> Oynat</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="bg-secondary/80 hover:bg-secondary backdrop-blur font-bold">
              <Link to={`/icerik/${slide.id}`}><Info className="mr-2 h-5 w-5" /> Daha Fazla Bilgi</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-32 md:bottom-10 right-6 z-10 flex gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            className={`h-1 rounded-full transition-all ${idx === i ? "w-8 bg-primary" : "w-4 bg-foreground/40"}`}
            aria-label={`Slayt ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
