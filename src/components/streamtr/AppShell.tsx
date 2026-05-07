import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function AppShell() {
  const { loading } = useApp();
  const location = useLocation();
  const isHome = location.pathname === "/";

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className={isHome ? "hidden md:block" : ""}>
        <Navbar />
      </div>
      <main className="pt-0">
        <Outlet />
      </main>
      <div className={isHome ? "hidden md:block" : ""}>
        <Footer />
      </div>
    </div>
  );
}
