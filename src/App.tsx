import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { AppShell } from "@/components/streamtr/AppShell";
import Login from "./pages/streamtr/Login";
import Home from "./pages/streamtr/Home";
import Detail from "./pages/streamtr/Detail";
import Player from "./pages/streamtr/Player";
import Search from "./pages/streamtr/Search";
import Listem from "./pages/streamtr/Listem";
import Browse from "./pages/streamtr/Browse";
import Admin from "./pages/streamtr/Admin";
import InfoPage from "./pages/streamtr/InfoPage";
import SeoArticlePage from "./pages/streamtr/SeoArticlePage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppProvider>
          <Routes>
            <Route path="/giris" element={<Login />} />
            <Route path="/eposta-kontrol" element={<Navigate to="/" replace />} />
            <Route path="/profiller" element={<Navigate to="/" replace />} />
            <Route path="/izle/:id" element={<Player />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/icerik/:id" element={<Detail />} />
              <Route path="/ara" element={<Search />} />
              <Route path="/listem" element={<Listem />} />
              <Route path="/turkce" element={<Browse />} />
              <Route path="/amator" element={<Browse />} />
              <Route path="/trend" element={<Browse />} />
              <Route path="/yeni" element={<Browse />} />
              <Route path="/rehber" element={<SeoArticlePage />} />
              <Route path="/rehber/:slug" element={<SeoArticlePage />} />
              <Route path="/diziler" element={<Navigate to="/amator" replace />} />
              <Route path="/filmler" element={<Navigate to="/turkce" replace />} />
              <Route path="/reklam-iletisim" element={<InfoPage />} />
              <Route path="/hakkimizda" element={<InfoPage />} />
              <Route path="/gizlilik" element={<InfoPage />} />
              <Route path="/admin" element={<Admin />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
