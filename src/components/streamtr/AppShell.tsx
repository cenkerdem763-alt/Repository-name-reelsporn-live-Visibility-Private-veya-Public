import { Outlet } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function AppShell() {
  const { loading } = useApp();

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-0">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
