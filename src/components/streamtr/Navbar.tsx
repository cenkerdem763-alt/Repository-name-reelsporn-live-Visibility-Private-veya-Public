import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, LogIn, LogOut, Search, User } from "lucide-react";
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
      <div className="grid h-16 grid-cols-[auto_1fr_auto] items-center gap-4 px-4 md:px-10">
        <Link to="/" className="group inline-flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-primary/40 bg-primary text-xl font-black leading-none text-primary-foreground shadow-[0_0_22px_rgba(239,68,68,0.24)] transition group-hover:border-primary group-hover:bg-primary/90">
            R
          </span>
          <span className="text-[1.55rem] font-black leading-none tracking-tight">
            <span className="text-primary">Reels</span>
            <span className="text-foreground">Porn</span>
          </span>
        </Link>

        <div className="flex justify-center">
          <button
            onClick={() => navigate("/ara")}
            className="flex h-10 w-full max-w-[520px] items-center gap-3 rounded-full border border-border bg-secondary/80 px-4 text-left text-sm text-muted-foreground transition hover:border-primary/50 hover:bg-secondary hover:text-foreground"
            aria-label="Ara"
          >
            <Search className="h-5 w-5 shrink-0" />
            <span className="hidden sm:block">Video, kategori veya etiket ara</span>
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2 md:gap-4">
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
