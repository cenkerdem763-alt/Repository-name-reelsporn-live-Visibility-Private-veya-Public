import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogIn, LogOut, PlayCircle, Search, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { user, profile, logout, setProfile } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/95 backdrop-blur-md shadow-lg" : "bg-gradient-to-b from-background/90 to-transparent"
      }`}
    >
      <div className="flex h-16 items-center gap-8 px-4 md:px-10">
        <Link to="/" className="inline-flex items-center gap-2 text-2xl font-black tracking-tighter text-primary">
          <PlayCircle className="h-7 w-7 fill-primary/20" />
          Reels<span className="text-foreground">Porn</span>
        </Link>

        <div className="ml-auto flex items-center gap-2 md:gap-4">
          <button
            onClick={() => navigate("/ara")}
            className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition"
            aria-label="Ara"
          >
            <Search className="h-5 w-5" />
          </button>
          <button className="hidden sm:block rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition" aria-label="Bildirimler">
            <Bell className="h-5 w-5" />
          </button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 outline-none group">
                <div className={`h-8 w-8 rounded bg-gradient-to-br ${profile?.color ?? "from-primary to-primary-glow"} grid place-items-center text-xs font-bold`}>
                  {profile?.name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <ChevronDown className="hidden md:block h-4 w-4 text-muted-foreground group-hover:rotate-180 transition-transform" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
                <DropdownMenuItem onClick={() => { setProfile(null); navigate("/profiller"); }}>
                  <User className="mr-2 h-4 w-4" /> Profil Değiştir
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/listem")}>Listem</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin")}>Yönetim Paneli</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { logout(); navigate("/"); }}>
                  <LogOut className="mr-2 h-4 w-4" /> Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => navigate("/giris")}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <LogIn className="h-4 w-4" />
              Giriş Yap
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
