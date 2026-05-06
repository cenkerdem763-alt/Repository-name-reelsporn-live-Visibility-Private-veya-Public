import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { AppShell } from "@/components/streamtr/AppShell";
import Login from "./pages/streamtr/Login";
import Profiles from "./pages/streamtr/Profiles";
import Home from "./pages/streamtr/Home";
import Detail from "./pages/streamtr/Detail";
import Player from "./pages/streamtr/Player";
import Search from "./pages/streamtr/Search";
import Listem from "./pages/streamtr/Listem";
import Browse from "./pages/streamtr/Browse";
import Admin from "./pages/streamtr/Admin";
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
            <Route path="/profiller" element={<Profiles />} />
            <Route path="/izle/:id" element={<Player />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/icerik/:id" element={<Detail />} />
              <Route path="/ara" element={<Search />} />
              <Route path="/listem" element={<Listem />} />
              <Route path="/diziler" element={<Browse />} />
              <Route path="/filmler" element={<Browse />} />
              <Route path="/yeni" element={<Browse />} />
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
