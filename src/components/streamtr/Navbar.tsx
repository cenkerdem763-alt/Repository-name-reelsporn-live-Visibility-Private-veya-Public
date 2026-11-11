import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Play, Search, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { user, profile, logout } = useApp();
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
        scrolled ? "border-b border-primary/20 bg-black/90 shadow-[0_14px_44px_rgba(0,0,0,0.42)] backdrop-blur-xl" : "bg-gradient-to-b from-black/95 via-black/70 to-transparent"
      }`}
    >
      <div className="grid h-16 grid-cols-[auto_1fr_auto] items-center gap-4 px-4 md:px-10">
        <Link to="/" className="inline-flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-primary/30 bg-primary text-white shadow-[0_12px_30px_rgba(255,23,77,0.24)]">
            <Play className="h-4 w-4 fill-current" />
          </span>
          <span className="text-[1.45rem] font-black leading-none tracking-tight">
            <span className="text-foreground">Reels</span>
            <span className="text-primary">Porn</span>
          </span>
        </Link>

        <div className="flex justify-center">
          <button
            onClick={() => navigate("/ara")}
            className="flex h-10 w-full max-w-[540px] items-center gap-3 rounded-md border border-primary/20 bg-black/60 px-4 text-left text-sm text-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_34px_rgba(0,0,0,0.25)] backdrop-blur transition hover:border-primary/50 hover:bg-card hover:text-foreground"
            aria-label="Ara"
          >
            <Search className="h-5 w-5 shrink-0" />
            <span className="hidden sm:block">Türkçe reels, amatör veya kategori ara</span>
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
              onClick={() => window.dispatchEvent(new Event("open-auth-prompt"))}
              className="grid h-10 w-10 place-items-center rounded-md border border-primary/25 bg-primary/10 text-zinc-100 shadow-[0_12px_30px_rgba(255,23,77,0.14)] backdrop-blur transition hover:border-primary/60 hover:bg-primary hover:text-white"
              aria-label="Giriş yap"
            >
              <UserCircle className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
