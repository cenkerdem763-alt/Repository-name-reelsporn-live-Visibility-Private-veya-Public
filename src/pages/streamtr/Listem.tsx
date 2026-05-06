import { useApp } from "@/contexts/AppContext";
import { ContentCard } from "@/components/streamtr/ContentCard";
import { useAllTitles } from "@/hooks/useContent";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Listem() {
  const { user, watchlist, favorites } = useApp();
  const { data: titles = [] } = useAllTitles();
  const list = titles.filter((t) => watchlist.includes(t.id));
  const favs = titles.filter((t) => favorites.includes(t.id));

  if (!user) {
    return (
      <div className="pt-32 px-4 md:px-10 pb-20 max-w-xl">
        <h1 className="text-3xl font-bold mb-4">Listem</h1>
        <p className="text-muted-foreground mb-6">
          Liste ve favorilerini kaydetmek için giriş yapabilirsin. İçerikleri gezmek ve izlemek için giriş zorunlu değil.
        </p>
        <Button asChild>
          <Link to="/giris">Giriş Yap</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-24 px-4 md:px-10 pb-20 space-y-12">
      <section>
        <h1 className="text-3xl font-bold mb-6">Listem</h1>
        {list.length === 0 ? (
          <p className="text-muted-foreground">Henüz listenizde içerik yok. + ile içerik ekleyebilirsiniz.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {list.map((t) => <ContentCard key={t.id} item={t} />)}
          </div>
        )}
      </section>
      <section>
        <h2 className="text-2xl font-bold mb-6">Favoriler</h2>
        {favs.length === 0 ? (
          <p className="text-muted-foreground">Henüz favorilediğin içerik yok.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {favs.map((t) => <ContentCard key={t.id} item={t} />)}
          </div>
        )}
      </section>
    </div>
  );
}
